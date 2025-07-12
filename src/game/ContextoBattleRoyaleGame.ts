import { AxiosError } from 'axios'
import GameApi from './gameApi'
import { getTodaysGameId, halfTipDistance } from './utils/misc'
import snowflakeGenerator from '../utils/snowflake'
import { GameWord, Guess, IGame, PlayerScore } from './interface'
import type { ContextoManager } from './ContextoManager'

interface BattleRoyalePlayerProgress {
    playerId: string
    closestDistance: number
    closestWord: string
    guessCount: number
}

class ContextoBattleRoyaleGame implements IGame {

    private readonly manager: ContextoManager
    private readonly gameApi: ReturnType<typeof GameApi>

    public readonly id = snowflakeGenerator.generate()
    gameId: number
    players: string[] = []
    private playerGuesses: Map<string, Guess[]> = new Map() // Individual player guesses
    private usedWords: Set<string> = new Set() // Global set of words used by any player
    private usedLemmas: Set<string> = new Set() // Global set of lemmas used by any player
    finished = false
    private winner: PlayerScore | null = null

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
        // Remove player's guesses but keep used words in the global set
        this.playerGuesses.delete(playerId)
        
        // If the winner left, clear the winner
        if (this.winner && this.winner.playerId === playerId) {
            this.winner = null
            this.finished = false
        }
        
        // If no players left, the game can be considered finished
        if (this.players.length === 0) {
            this.finished = true
        }
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
        
        // Add word and lemma to global used sets if it's a valid guess
        if (!guess.error) {
            this.usedWords.add(guess.word.toLowerCase())
            if (guess.lemma) {
                this.usedLemmas.add(guess.lemma.toLowerCase())
            }
        }
    }

    // Check if word/lemma has been used by any player
    isWordUsed(word: string, lemma?: string): boolean {
        const wordLower = word.toLowerCase()
        const lemmaLower = lemma?.toLowerCase()
        
        return this.usedWords.has(wordLower) || 
               (lemmaLower ? this.usedLemmas.has(lemmaLower) : false)
    }

    // Get existing guess from player's personal guesses
    getExistingGuess(word: string, playerId: string): Guess | undefined {
        const playerGuesses = this.playerGuesses.get(playerId) || []
        return playerGuesses.find(guess => guess.word === word || guess.lemma === word)
    }

    // Get player's current guess count
    getGuessCount(playerId: string): number {
        const playerGuesses = this.playerGuesses.get(playerId) || []
        return playerGuesses.filter(guess => !guess.error).length
    }

    // Get player's current guess count (alias for compatibility)
    getPlayerGuessCount(playerId: string): number {
        return this.getGuessCount(playerId)
    }

    // Legacy getter for compatibility
    get guessCount(): number {
        let totalGuesses = 0
        for (const guesses of this.playerGuesses.values()) {
            totalGuesses += guesses.filter(guess => !guess.error).length
        }
        return totalGuesses
    }

    async tryWord(playerId: string, word: string): Promise<Guess> {
        if (this.finished) {
            throw new Error("The game has already finished")
        }
        
        if (!this.started) {
            throw new Error("The game has not started yet")
        }
        
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        // Check in the cached words first to get lemma
        const cachedWord = await this.manager.getCachedWord(this.gameId, word)
        let wordLemma = cachedWord?.lemma

        // If not cached, we need to make a temp API call to get the lemma for checking
        if (!cachedWord) {
            try {
                const { data } = await this.gameApi.play(word)
                wordLemma = data.lemma
            } catch (error) {
                // If API call fails, we'll handle it below in the main logic
            }
        }

        // Check if this word (or its lemma) has been used by any player
        if (this.isWordUsed(word, wordLemma)) {
            const guess: Guess = {
                word,
                addedBy: playerId,
                error: "Alguém já usou esta palavra"
            }
            // Don't add this to player's guesses since it's invalid
            return guess
        }

        // Check in the cached words for actual game logic
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
            
            // Check if player found the word and end the game
            if (cachedWord.distance === 0) {
                this.finished = true
                this.winner = {
                    playerId,
                    guessCount: this.getGuessCount(playerId),
                    completedAt: new Date()
                }
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

            // Check if player found the word and end the game
            if (data.distance === 0) {
                this.finished = true
                this.winner = {
                    playerId,
                    guessCount: this.getGuessCount(playerId),
                    completedAt: new Date()
                }
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

    // Get all players' progress for Battle Royale ranking display
    getAllPlayersProgress(): BattleRoyalePlayerProgress[] {
        return this.players.map(playerId => {
            const playerGuesses = this.playerGuesses.get(playerId) || []
            const validGuesses = playerGuesses.filter(guess => !guess.error && guess.distance !== undefined)
            
            let closestDistance = 999999
            let closestWord = ""
            
            if (validGuesses.length > 0) {
                const closest = validGuesses.reduce((prev, current) => 
                    (current.distance! < prev.distance!) ? current : prev
                )
                closestDistance = closest.distance!
                closestWord = closest.word
            }
            
            return {
                playerId,
                closestDistance,
                closestWord,
                guessCount: validGuesses.length
            }
        }).sort((a, b) => a.closestDistance - b.closestDistance) // Sort by closest distance
    }

    // Get leaderboard for final results
    getLeaderboard(): BattleRoyalePlayerProgress[] {
        return this.getAllPlayersProgress()
    }

    // Get winner
    getWinner(): PlayerScore | null {
        return this.winner
    }

    // Get the number of players in the game
    getPlayerCount(): number {
        return this.players.length
    }

    // Check if a player is the host (first player who created the room)
    isHost(playerId: string): boolean {
        console.log('Checking if player is host:', playerId, 'Current players:', this.players) // Debug log
        return this.players.length > 0 && this.players[0] === playerId
    }

    // Check if the game allows tips
    canUseTips(): boolean {
        return this.allowTips
    }

    // Check if the game allows giving up
    canGiveUp(): boolean {
        return this.allowGiveUp
    }

    // Check if the game can be started
    canStart(): boolean {
        return this.players.length > 0 && !this.started && !this.finished
    }

    // Get a tip for a specific player
    async getTip(playerId: string): Promise<{ word: string; distance: number; error?: string }> {
        if (!this.canUseTips()) {
            throw new Error("Tips are not allowed in this game")
        }

        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        if (this.finished) {
            throw new Error("The game has already finished")
        }

        try {
            // Convert player's guesses to the format expected by tip functions
            const playerGuesses = this.playerGuesses.get(playerId) || []
            const guessHistory = playerGuesses
                .filter(guess => !guess.error && guess.distance !== undefined)
                .map(guess => [guess.word, guess.distance])

            // Calculate tip distance using the game's easy difficulty rule (default)
            const tipDist = halfTipDistance(guessHistory)
            
            // Keep trying to get a tip that hasn't been used yet
            let attempts = 0
            const maxAttempts = 10
            
            while (attempts < maxAttempts) {
                // First, check if we already have a word at this exact distance in cache
                const cachedWordAtDistance = await this.manager.getCachedWordByDistance(this.gameId, tipDist + attempts)
                
                if (cachedWordAtDistance && !this.isWordUsed(cachedWordAtDistance.word, cachedWordAtDistance.lemma)) {
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
                try {
                    const { data } = await this.gameApi.tip(tipDist + attempts)
                    
                    // Check if this word has been used
                    if (!this.isWordUsed(data.word, data.lemma)) {
                        // Add the tip word as a guess to the player's personal list
                        const tipGuess: Guess = {
                            word: data.word,
                            lemma: data.lemma || data.word,
                            distance: data.distance,
                            addedBy: playerId
                        }
                        this.addGuess(playerId, tipGuess)
                        
                        // Cache the new tip word normally
                        await this.manager.cacheWord(this.gameId, {
                            word: data.word,
                            lemma: data.lemma,
                            distance: data.distance
                        })
                        
                        return {
                            word: data.word,
                            distance: data.distance
                        }
                    }
                } catch (apiError) {
                    // Continue to next attempt
                }
                
                attempts++
            }
            
            // If we couldn't find an unused tip after max attempts
            return {
                word: "",
                distance: -1,
                error: "Não foi possível encontrar uma dica não utilizada"
            }
        } catch (error) {
            return {
                word: "",
                distance: -1,
                error: "Não foi possível obter uma dica no momento"
            }
        }
    }

    // Give up and leave the game
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

    // Get the answer and end the game
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
                
                // Cache the answer normally
                await this.manager.cacheWord(this.gameId, {
                    word: data.word,
                    lemma: data.lemma,
                    distance: 0
                })
            }
            
            // End the game
            this.finished = true
            
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

    // Get the game word for displaying in broadcasts
    async getGameWord(): Promise<{ word: string; lemma?: string } | null> {
        try {
            // Check if we already have the answer (word with distance 0) in cache
            const cachedAnswer = await this.manager.getCachedWordByDistance(this.gameId, 0)
            
            if (cachedAnswer) {
                return {
                    word: cachedAnswer.word,
                    lemma: cachedAnswer.lemma
                }
            }
            
            // If not cached, fetch from API
            const { data } = await this.gameApi.giveUp()
            
            // Cache the answer
            await this.manager.cacheWord(this.gameId, {
                word: data.word,
                lemma: data.lemma,
                distance: 0
            })
            
            return {
                word: data.word,
                lemma: data.lemma
            }
        } catch (error) {
            return null
        }
    }
}

export { ContextoBattleRoyaleGame, type BattleRoyalePlayerProgress }
