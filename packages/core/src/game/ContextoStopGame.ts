import { AxiosError } from 'axios'
import { GameState, GameWord, Guess } from './interface'
import type { ContextoManager } from './ContextoManager'
import { ContextoBaseGame } from './ContextoBaseGame'

class ContextoStopGame extends ContextoBaseGame {
    private playerGuesses: Map<string, Guess[]> = new Map() // Individual player guesses
    private winnerInfo: { playerId: string; guessCount: number; completedAt: Date } | null = null
    private pendingSubmissions = new Set<string>() // Track players currently submitting
    private submissionTimestamps = new Map<string, Date>() // Track submission order
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
        // Clean up pending submissions and timestamps
        this.pendingSubmissions.delete(playerId)
        // Clean up any submission timestamps for this player
        for (const [key] of this.submissionTimestamps) {
            if (key.startsWith(`${playerId}-`)) {
                this.submissionTimestamps.delete(key)
            }
        }
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

    // Atomic winner check using submission timestamp for fairness
    private checkAndSetWinner(playerId: string, word: string, submissionTime: Date): boolean {
        // Use winnerInfo as the atomic check - if it's already set, someone won
        if (this.winnerInfo !== null) {
            return false // Someone already won
        }
        
        // Check if there are any earlier submissions still pending
        // We need to ensure this is truly the FIRST submission to find the answer
        const submissionKey = `${playerId}-${word}`
        const currentSubmissionTime = this.submissionTimestamps.get(submissionKey)
        
        if (!currentSubmissionTime) {
            // This shouldn't happen, but safety check
            return false
        }
        
        // Check if any other pending submissions were made earlier
        for (const [key, timestamp] of this.submissionTimestamps) {
            if (key !== submissionKey && timestamp < currentSubmissionTime) {
                // There's an earlier submission still being processed
                // We need to wait and see if that one wins first
                return false
            }
        }
        
        // Get current guess count INCLUDING the winning guess that will be added
        const playerGuesses = this.playerGuesses.get(playerId) || []
        const correctGuessCount = playerGuesses.length + 1 // +1 for the winning guess about to be added
        
        // Atomic winner selection - set winnerInfo first as the lock
        this.winnerInfo = {
            playerId,
            guessCount: correctGuessCount,
            completedAt: currentSubmissionTime // Use actual submission time for fairness
        }
        this.finished = true
        
        return true
    }

    async tryWord(playerId: string, word: string): Promise<Guess> {
        // Capture submission timestamp immediately for fairness
        const submissionTime = new Date()
        const submissionKey = `${playerId}-${word}`
        
        // Atomic validation and submission registration
        if (!this.started) {
            throw new Error("Game has not been started yet. Use /start to begin the game.")
        }
        
        if (this.finished) {
            throw new Error(`Game has already finished`)
        }
        
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        // Check if player is already submitting a word to prevent concurrent submissions
        if (this.pendingSubmissions.has(playerId)) {
            throw new Error("Player is already submitting a word. Please wait.")
        }

        // Register this submission attempt with timestamp
        this.pendingSubmissions.add(playerId)
        this.submissionTimestamps.set(submissionKey, submissionTime)

        try {
            let guess: Guess

            // Try to get from cache first
            const cachedGuess = await this.processWordFromCache(playerId, word)
            if (cachedGuess) {
                guess = cachedGuess
            } else {
                // Get from API if not cached
                guess = await this.processWordFromAPI(playerId, word)
            }

            // CRITICAL: Check if game finished while we were processing
            // In Stop mode, only the first player to find the word should win
            if (this.finished) {
                // Game finished while we were processing - reject this guess
                throw new Error("Game finished while processing your guess. Someone else found the word first.")
            }

            // Check if this is a winning guess BEFORE adding to history
            const isWinningGuess = !guess.error && guess.distance === 0

            if (isWinningGuess) {
                // Attempt atomic winner determination BEFORE adding guess
                const wonGame = this.checkAndSetWinner(playerId, word, submissionTime)
                
                if (!wonGame) {
                    // Someone else already won - this should be treated as invalid
                    throw new Error("Game finished while processing your guess. Someone else found the word first.")
                }
            }

            // Only add the guess to history if we didn't lose the race
            this.addGuess(playerId, guess)
            
            return guess

        } finally {
            // Always clean up pending submission state
            this.pendingSubmissions.delete(playerId)
            this.submissionTimestamps.delete(submissionKey)
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

    // Get comprehensive ranking for all players
    private getAllPlayersRanking(): Array<{ playerId: string; guessCount: number; closestDistance?: number }> {
        return this.players.map(playerId => {
            const playerGuesses = this.playerGuesses.get(playerId) || []
            const validGuesses = playerGuesses.filter(guess => !guess.error)
            const closestDistance = validGuesses.reduce((min, guess) => {
                if (guess.distance !== undefined) {
                    if (min === undefined) return guess.distance
                    return Math.min(min, guess.distance)
                }
                return min
            }, undefined as number | undefined)
            
            return {
                playerId,
                guessCount: validGuesses.length,
                closestDistance
            }
        })
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

        // Use the comprehensive ranking method for consistency
        const ranking = this.getAllPlayersRanking()
    
        return {
            id: this.id,
            started: this.started,
            finished: this.finished,
            players: this.players,
            guesses: guesses,
            ranking: ranking
        }   
    }
}

export { ContextoStopGame }
