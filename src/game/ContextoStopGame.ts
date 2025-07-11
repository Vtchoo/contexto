import { AxiosError } from 'axios'
import GameApi from './gameApi'
import { getTodaysGameId } from './utils/misc'
import { v4 as uuid } from 'uuid'
import { GameWord, Guess, IGame, PlayerScore } from './interface'
import type { ContextoManager } from './ContextoManager'

class ContextoStopGame implements IGame {

    private readonly manager: ContextoManager
    private readonly gameApi: ReturnType<typeof GameApi>

    public readonly id = uuid()
    gameId: number
    players: string[] = []
    private playerGuesses: Map<string, Guess[]> = new Map() // Individual player guesses
    private winnerInfo: { playerId: string; guessCount: number; completedAt: Date } | null = null
    finished = false

    allowTips = false // No tips in stop mode
    allowGiveUp = true // Can give up (leaves room)

    started = false // Stop games start unstarted - must be explicitly started

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

    // Check if the game can be started (only if not started and has players)
    canStart(): boolean {
        return !this.started && this.players.length > 0
    }

    // Start the stop game
    startGame(): void {
        if (this.started) {
            throw new Error("Game has already been started")
        }
        if (this.players.length === 0) {
            throw new Error("Cannot start game with no players")
        }
        this.started = true
    }

    addPlayer(playerId: string) {
        if (this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is already in the game`)
        }
        if (this.finished) {
            throw new Error(`Game has already finished`)
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
        // Remove player's guesses
        this.playerGuesses.delete(playerId)
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

    // Get player's current guess count
    getGuessCount(playerId: string): number {
        const playerGuesses = this.playerGuesses.get(playerId) || []
        return playerGuesses.filter(guess => !guess.error).length
    }

    // Legacy getter for compatibility - total guesses across all players
    get guessCount(): number {
        let totalGuesses = 0
        for (const guesses of this.playerGuesses.values()) {
            totalGuesses += guesses.filter(guess => !guess.error).length
        }
        return totalGuesses
    }

    async tryWord(playerId: string, word: string): Promise<Guess> {
        if (!this.started) {
            throw new Error("Game has not been started yet. Use /start to begin the game.")
        }
        
        if (this.finished) {
            throw new Error(`Game has already finished`)
        }
        
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
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
            
            // Check if player found the word - END THE GAME!
            if (cachedWord.distance === 0) {
                const playerGuesses = this.playerGuesses.get(playerId) || []
                this.winnerInfo = {
                    playerId,
                    guessCount: playerGuesses.length,
                    completedAt: new Date()
                }
                this.finished = true
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

            // Check if player found the word - END THE GAME!
            if (data.distance === 0) {
                const playerGuesses = this.playerGuesses.get(playerId) || []
                this.winnerInfo = {
                    playerId,
                    guessCount: playerGuesses.length,
                    completedAt: new Date()
                }
                this.finished = true
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

    // Tips are disabled in stop mode
    async getTip(playerId: string): Promise<{ word: string; distance: number; error?: string }> {
        return {
            word: "",
            distance: -1,
            error: "Dicas não são permitidas no modo Stop"
        }
    }

    // Give up just removes the player from the game
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

    // Get winner info
    getWinner(): { playerId: string; guessCount: number; completedAt: Date } | null {
        return this.winnerInfo
    }

    // Get leaderboard ranked by closest guess distance
    getLeaderboard(): Array<{ playerId: string; closestDistance: number; closestWord: string; guessCount: number }> {
        const leaderboard: Array<{ playerId: string; closestDistance: number; closestWord: string; guessCount: number }> = []
        
        for (const playerId of this.players) {
            const playerGuesses = this.playerGuesses.get(playerId) || []
            const validGuesses = playerGuesses.filter(guess => !guess.error && guess.distance !== undefined)
            
            if (validGuesses.length > 0) {
                // Find closest guess
                const closestGuess = validGuesses.reduce((closest, current) => 
                    (current.distance! < closest.distance!) ? current : closest
                )
                
                leaderboard.push({
                    playerId,
                    closestDistance: closestGuess.distance!,
                    closestWord: closestGuess.word,
                    guessCount: validGuesses.length
                })
            } else {
                // Player with no valid guesses gets worst ranking
                leaderboard.push({
                    playerId,
                    closestDistance: 999999,
                    closestWord: "N/A",
                    guessCount: 0
                })
            }
        }
        
        // Sort by closest distance (ascending)
        return leaderboard.sort((a, b) => a.closestDistance - b.closestDistance)
    }

    // Get all players' progress for display during the game
    getAllPlayersProgress(): Array<{ playerId: string; closestDistance: number; closestWord: string }> {
        const progress: Array<{ playerId: string; closestDistance: number; closestWord: string }> = []
        
        for (const playerId of this.players) {
            const playerGuesses = this.playerGuesses.get(playerId) || []
            const validGuesses = playerGuesses.filter(guess => !guess.error && guess.distance !== undefined)
            
            if (validGuesses.length > 0) {
                // Find closest guess
                const closestGuess = validGuesses.reduce((closest, current) => 
                    (current.distance! < closest.distance!) ? current : closest
                )
                
                progress.push({
                    playerId,
                    closestDistance: closestGuess.distance!,
                    closestWord: closestGuess.word
                })
            }
        }
        
        // Sort by closest distance (ascending)
        return progress.sort((a, b) => a.closestDistance - b.closestDistance)
    }

    // Get game word (for displaying results after game ends)
    async getGameWord(): Promise<GameWord | null> {
        try {
            const response = await this.gameApi.giveUp()
            return {
                word: response.data.word,
                distance: 0
            }
        } catch (error) {
            console.error("Error getting game word:", error)
            return null
        }
    }

    // Check if game has a winner (someone found the answer)
    hasWinner(): boolean {
        return this.winnerInfo !== null
    }

    // Check if player can make guesses (game must be started)
    canMakeGuess(): boolean {
        return this.started && !this.finished
    }
}

export { ContextoStopGame }
