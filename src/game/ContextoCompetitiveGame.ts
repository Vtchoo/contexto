import { AxiosError } from 'axios'
import GameApi from './gameApi'
import { getTodaysGameId, halfTipDistance } from './utils/misc'
import { v4 as uuid } from 'uuid'
import { GameWord, Guess, IGame, PlayerScore } from './interface'
import type { ContextoManager } from './ContextoManager'

class ContextoCompetitiveGame implements IGame {

    private readonly manager: ContextoManager
    private readonly gameApi: ReturnType<typeof GameApi>

    public readonly id = uuid()
    gameId: number
    players: string[] = []
    private playerGuesses: Map<string, Guess[]> = new Map() // Individual player guesses
    private playerCompletions: PlayerScore[] = [] // Track when players complete the word
    finished = false // Always false in competitive mode

    allowTips = true
    allowGiveUp = true

    started = false

    constructor(playerId: string, manager: ContextoManager, gameIdOrDate?: number | string | Date) {
        if (typeof gameIdOrDate === 'number') {
            this.gameId = gameIdOrDate
        } else if (gameIdOrDate instanceof Date) {
            // Convert date to game ID
            const today = new Date()
            const diffDays = Math.floor((today.getTime() - gameIdOrDate.getTime()) / (1000 * 60 * 60 * 24))
            this.gameId = getTodaysGameId() - diffDays
        } else {
            this.gameId = getTodaysGameId()
        }
        
        this.players.push(playerId)
        this.manager = manager
        this.gameApi = GameApi('pt-br', this.gameId)
        // Initialize empty guess array for the first player
        this.playerGuesses.set(playerId, [])
    }

    startGame() {
        this.started = true
    }

    addPlayer(playerId: string) {
        if (this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is already in the game`)
        }
        this.players.push(playerId)
        // Initialize empty guess array for new player
        this.playerGuesses.set(playerId, [])
    }

    removePlayer(playerId: string) {
        const index = this.players.indexOf(playerId)
        if (index === -1) {
            throw new Error(`Player ${playerId} is not in the game`)
        }
        this.players.splice(index, 1)
        // Remove player's guesses and completions
        this.playerGuesses.delete(playerId)
        this.playerCompletions = this.playerCompletions.filter(score => score.playerId !== playerId)
        // Note: Don't finish the game when players leave in competitive mode
    }

    addGuess(playerId: string, guess: Guess) {
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }
        
        // Get or create player's guess array
        let playerGuesses = this.playerGuesses.get(playerId)
        if (!playerGuesses) {
            playerGuesses = []
            this.playerGuesses.set(playerId, playerGuesses)
        }
        
        playerGuesses.push(guess)
    }

    // Get existing guess from player's personal guesses
    getExistingGuess(word: string, playerId: string): Guess | undefined {
        const playerGuesses = this.playerGuesses.get(playerId) || []
        return playerGuesses.find(guess => guess.word === word || guess.lemma === word)
    }

    // Get player's current guess count - requires playerId context in competitive mode
    getGuessCount(playerId: string): number {
        const playerGuesses = this.playerGuesses.get(playerId) || []
        return playerGuesses.filter(guess => !guess.error).length
    }

    // Legacy getter for compatibility - avoid using this in competitive mode
    get guessCount(): number {
        // This is ambiguous in competitive mode, but kept for backward compatibility
        let totalGuesses = 0
        for (const guesses of this.playerGuesses.values()) {
            totalGuesses += guesses.filter(guess => !guess.error).length
        }
        return totalGuesses
    }

    async tryWord(playerId: string, word: string): Promise<Guess> {
        // Note: No check for finished game in competitive mode - game runs indefinitely
        
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        // Check if player already completed the word
        const hasCompleted = this.playerCompletions.some(score => score.playerId === playerId)
        if (hasCompleted) {
            throw new Error(`Player ${playerId} has already found the word`)
        }

        // Check in the cached words first
        const cachedWord = await this.manager.getCachedWord(this.gameId, word)
        if (cachedWord) {
            if (cachedWord.error) {
                const guess: Guess = {
                    word,
                    addedBy: playerId,
                    error: cachedWord.error
                }
                this.addGuess(playerId, guess)
                return guess
            }

            const guess: Guess = {
                word,
                lemma: cachedWord.lemma,
                distance: cachedWord.distance,
                addedBy: playerId
            }
            this.addGuess(playerId, guess)
            
            // Check if player found the word
            if (cachedWord.distance === 0) {
                const playerGuesses = this.playerGuesses.get(playerId) || []
                this.playerCompletions.push({
                    playerId,
                    guessCount: playerGuesses.length,
                    completedAt: new Date()
                })
            }
            
            return guess
        }

        try {
            const { data } = await this.gameApi.play(word)
            const guess: Guess = {
                word,
                lemma: data.lemma,
                distance: data.distance,
                addedBy: playerId
            }
            this.addGuess(playerId, guess)

            // Check if player found the word - don't end game, just record completion
            if (data.distance === 0) {
                const playerGuesses = this.playerGuesses.get(playerId) || []
                this.playerCompletions.push({
                    playerId,
                    guessCount: playerGuesses.length,
                    completedAt: new Date()
                })
            }
            
            // Cache the word for quick access next time
            await this.manager.cacheWord(this.gameId, {
                word: data.word,
                lemma: data.lemma,
                distance: data.distance
            })
            return guess
        } catch (error) {
            if (error instanceof AxiosError) {
                const { error: message } = error.response?.data ?? {}
                if (message) {
                    const guess: Guess = {
                        word,
                        addedBy: playerId,
                        error: message
                    }
                    this.addGuess(playerId, guess)
                    await this.manager.cacheWord(this.gameId, { word, error: message })
                    return guess
                }
            }
            throw new Error(`Failed to play word "${word}": ${error.message}`)
        }
    }

    getClosestGuesses(playerId: string, count?: number): GameWord[] {
        // Show only guesses made by the specific player
        const playerGuesses = this.playerGuesses.get(playerId) || []
        return playerGuesses
            .filter(guess => !guess.error) // Filter out invalid guesses
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)) // Sort by distance
            .slice(0, count ?? 10) // Limit to the closest guesses
    }

    // Get player's guess count
    getPlayerGuessCount(playerId: string): number {
        return this.getGuessCount(playerId)
    }

    // Check if player has completed the word
    hasPlayerCompleted(playerId: string): boolean {
        return this.playerCompletions.some(score => score.playerId === playerId)
    }

    // Get player's completion info
    getPlayerCompletion(playerId: string): PlayerScore | undefined {
        return this.playerCompletions.find(score => score.playerId === playerId)
    }

    // Get leaderboard ranked by fewest guesses
    getLeaderboard(): PlayerScore[] {
        return [...this.playerCompletions]
            .sort((a, b) => {
                // Sort by guess count (ascending), then by completion time (ascending)
                if (a.guessCount !== b.guessCount) {
                    return a.guessCount - b.guessCount
                }
                return a.completedAt.getTime() - b.completedAt.getTime()
            })
    }

    // Get all players who haven't completed yet with their current guess count
    getActivePlayerStats(): Array<{ playerId: string; guessCount: number }> {
        return this.players
            .filter(playerId => !this.hasPlayerCompleted(playerId))
            .map(playerId => ({
                playerId,
                guessCount: this.getGuessCount(playerId)
            }))
    }

    // Get the number of players in the game
    getPlayerCount(): number {
        return this.players.length
    }

    // Check if the game allows tips
    canUseTips(): boolean {
        return this.allowTips
    }

    // Check if the game allows giving up
    canGiveUp(): boolean {
        return this.allowGiveUp
    }

    // Get a tip for a specific player in competitive mode
    async getTip(playerId: string): Promise<{ word: string; distance: number; error?: string }> {
        if (!this.canUseTips()) {
            throw new Error("Tips are not allowed in this game")
        }

        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        if (this.hasPlayerCompleted(playerId)) {
            throw new Error(`Player ${playerId} has already found the word`)
        }

        try {
            // Convert player's guesses to the format expected by tip functions
            const playerGuesses = this.playerGuesses.get(playerId) || []
            const guessHistory = playerGuesses
                .filter(guess => !guess.error && guess.distance !== undefined)
                .map(guess => [guess.word, guess.distance])

            // Calculate tip distance using the game's easy difficulty rule (default)
            const tipDist = halfTipDistance(guessHistory)
            
            // First, check if we already have a word at this exact distance in cache
            const cachedWordAtDistance = await this.manager.getCachedWordByDistance(this.gameId, tipDist)
            
            if (cachedWordAtDistance) {
                // Use the existing cached word at this distance as the tip
                const tipGuess: Guess = {
                    word: cachedWordAtDistance.word,
                    lemma: cachedWordAtDistance.lemma || cachedWordAtDistance.word,
                    distance: cachedWordAtDistance.distance!,
                    addedBy: playerId
                }
                this.addGuess(playerId, tipGuess)
                
                return {
                    word: cachedWordAtDistance.word,
                    distance: cachedWordAtDistance.distance!
                }
            }
            
            // If no cached word at this distance, fetch from API
            const { data } = await this.gameApi.tip(tipDist)
            
            // Add the tip word as a guess to the player's personal list
            const tipGuess: Guess = {
                word: data.word,
                lemma: data.lemma || data.word, // Use lemma from API or fallback to word
                distance: data.distance,
                addedBy: playerId
            }
            this.addGuess(playerId, tipGuess)
            
            // Cache the new tip word normally (it will be stored with its actual word as key)
            await this.manager.cacheWord(this.gameId, {
                word: data.word,
                lemma: data.lemma,
                distance: data.distance
            })
            
            return {
                word: data.word,
                distance: data.distance
            }
        } catch (error) {
            return {
                word: "",
                distance: -1,
                error: "Não foi possível obter uma dica no momento"
            }
        }
    }

    // Give up is not really applicable in competitive mode, but we can remove the player
    async giveUpAndLeave(playerId: string): Promise<{ success: boolean; error?: string }> {
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        try {
            this.removePlayer(playerId)
            return { success: true }
        } catch (error) {
            return {
                success: false,
                error: "Não foi possível sair do jogo no momento"
            }
        }
    }

    // Get the answer without ending the game (for competitive mode)
    async giveUpAndGetAnswer(): Promise<{ word: string; error?: string }> {
        if (!this.canGiveUp()) {
            throw new Error("Give up is not allowed in this game")
        }

        try {
            // Check if we already have the answer (word with distance 0) in cache
            const cachedAnswer = await this.manager.getCachedWordByDistance(this.gameId, 0)
            
            let answerWord: string
            
            if (cachedAnswer) {
                // Use cached answer
                answerWord = cachedAnswer.word
            } else {
                // Fetch from API and cache normally
                const { data } = await this.gameApi.giveUp()
                answerWord = data.word
                
                // Cache the answer normally (it will be stored with its actual word as key and distance 0)
                await this.manager.cacheWord(this.gameId, {
                    word: data.word,
                    lemma: data.lemma,
                    distance: 0
                })
            }
            
            // In competitive mode, don't end the game, just return the answer
            return {
                word: answerWord
            }
        } catch (error) {
            return {
                word: "",
                error: "Não foi possível obter a resposta no momento"
            }
        }
    }
}

export { ContextoCompetitiveGame }
