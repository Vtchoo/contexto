import { AxiosError } from 'axios'
import { GameState, GameWord, Guess } from './interface'
import type { ContextoManager } from './ContextoManager'
import { ContextoBaseGame } from './ContextoBaseGame'

class ContextoStopGame extends ContextoBaseGame {
    private playerGuesses: Map<string, Guess[]> = new Map() // Individual player guesses
    private winnerInfo: { playerId: string; guessCount: number; completedAt: Date } | null = null
    finished = false

    constructor(playerId: string, manager: ContextoManager, gameIdOrDate?: number | string | Date) {
        super(playerId, manager, gameIdOrDate)
        
        // Stop game specific settings
        this.allowTips = false // No tips in stop mode
        this.allowGiveUp = true // Can give up (leaves room)
        this.started = false // Stop games start unstarted - must be explicitly started
        
        // Initialize empty guess array for the first player
        this.playerGuesses.set(playerId, [])
    }

    // Check if the game can be started (only if not started and has players)
    canStart(): boolean {
        return !this.started && this.players.length > 0
    }

    // Start the stop game - override base implementation
    startGame(): void {
        if (this.started) {
            throw new Error("Game has already been started")
        }
        if (this.players.length === 0) {
            throw new Error("Cannot start game with no players")
        }
        this.started = true
    }

    // Override addPlayer to initialize guess array
    addPlayer(playerId: string): void {
        if (this.finished) {
            throw new Error(`Game has already finished`)
        }
        super.addPlayer(playerId)
        // Initialize empty guess array for new player
        this.playerGuesses.set(playerId, [])
    }

    // Override removePlayer to clean up guess data
    removePlayer(playerId: string): void {
        super.removePlayer(playerId)
        // Remove player's guesses
        this.playerGuesses.delete(playerId)
    }

    // Implement abstract method for tip calculation (though tips are disabled)
    protected getGuessHistoryForTips(playerId: string): Array<[string, number]> {
        const playerGuesses = this.playerGuesses.get(playerId) || []
        return playerGuesses
            .filter(guess => !guess.error && guess.distance !== undefined)
            .map(guess => [guess.word, guess.distance!])
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

        // Try to get from cache first
        const cachedGuess = await this.processWordFromCache(playerId, word)
        if (cachedGuess) {
            this.addGuess(playerId, cachedGuess)
            
            // Check if player found the word - END THE GAME!
            if (!cachedGuess.error && cachedGuess.distance === 0) {
                const playerGuesses = this.playerGuesses.get(playerId) || []
                this.winnerInfo = {
                    playerId,
                    guessCount: playerGuesses.length,
                    completedAt: new Date()
                }
                this.finished = true
            }
            
            return cachedGuess
        }

        // Get from API if not cached
        const guess = await this.processWordFromAPI(playerId, word)
        this.addGuess(playerId, guess)

        // Check if player found the word - END THE GAME!
        if (!guess.error && guess.distance === 0) {
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

    getClosestGuesses(playerId: string, count?: number): GameWord[] {
        // Show only guesses made by the specific player
        const playerGuesses = this.playerGuesses.get(playerId) || []
        return playerGuesses
            .filter(guess => !guess.error) // Filter out invalid guesses
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)) // Sort by distance
            .slice(0, count ?? 10) // Limit to the closest guesses
    }

    // Get player's guess count - implement base class method
    getGuessCount(playerId?: string): number {
        if (playerId) {
            const playerGuesses = this.playerGuesses.get(playerId) || []
            return playerGuesses.filter(guess => !guess.error).length
        }
        // Legacy: total guesses across all players
        let totalGuesses = 0
        for (const guesses of this.playerGuesses.values()) {
            totalGuesses += guesses.filter(guess => !guess.error).length
        }
        return totalGuesses
    }

    // Override getTip to disable tips in stop mode
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

        this.removePlayer(playerId)
        return { success: true }
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
            const word = await this.getAnswerFromAPI()
            return {
                word,
                distance: 0
            }
        } catch (error) {
            console.error("Error getting game word:", error)
            return null
        }
    }

    // Additional methods specific to stop game

    // Get player's guess count (compatibility method)
    getPlayerGuessCount(playerId: string): number {
        return this.getGuessCount(playerId)
    }

    // Check if game has a winner (someone found the answer)
    hasWinner(): boolean {
        return this.winnerInfo !== null
    }

    // Check if player can make guesses (game must be started)
    canMakeGuess(): boolean {
        return this.started && !this.finished
    }

    getCurrentGameState(playerId: string): GameState {
        const playerGuesses = this.playerGuesses.get(playerId) || []
        const otherPlayersGuesses = Object.entries(this.playerGuesses)
            .filter(([id]) => id !== playerId)
            .map(([id, guesses]) => guesses.reduce((acc, guess) => {
                // get only the best guess for each player
                if (!acc || (guess.distance !== undefined && guess.distance < acc.distance)) {
                    return guess
                }
                return acc
            }, null as Guess | null))
            .filter(guess => guess !== null) // Filter out null guesses
            .map(guess => ({
                word: "",
                distance: guess?.distance,
                addedBy: guess?.addedBy || "",
                error: guess?.error,
                hidden: true,
            } as Guess))
            
        const guesses = [...playerGuesses, ...otherPlayersGuesses].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    
        return {
            id: this.id,
            started: this.started,
            finished: this.finished,
            players: this.players,
            guesses: guesses,
            ranking: Array.from(this.playerGuesses.entries()).map(([id, guesses]) => ({
                playerId: id,
                guessCount: (guesses || []).filter(guess => !guess.error).length,
                closestDistance: (guesses || []).reduce((min, guess) => {
                    if (!guess.error && guess.distance !== undefined) {
                        if (min === undefined) return guess.distance
                        return Math.min(min, guess.distance)
                    }
                    return min
                }, undefined as number | undefined),
            }))
        }   
    }
}

export { ContextoStopGame }
