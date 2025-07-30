import { AxiosError } from 'axios'
import GameApi from './gameApi'
import { getTodaysGameId, halfTipDistance } from './utils/misc'
import snowflakeGenerator from '../utils/snowflake'
import { GameState, GameWord, Guess, IGame, PlayerScore } from './interface'
import type { ContextoManager } from './ContextoManager'
import { ContextoBaseGame } from './ContextoBaseGame'

class ContextoCompetitiveGame extends ContextoBaseGame {
    private playerGuesses: Map<string, Guess[]> = new Map() // Individual player guesses
    private playerCompletions: PlayerScore[] = [] // Track when players complete the word
    
    finished = false // Always false in competitive mode

    constructor(playerId: string, manager: ContextoManager, gameIdOrDate?: number | string | Date) {
        super(playerId, manager, gameIdOrDate)
        this.started = true
        // Initialize empty guess array for the first player
        this.playerGuesses.set(playerId, [])
    }

    addPlayer(playerId: string): void {
        super.addPlayer(playerId)
        // Initialize empty guess array for new player
        this.playerGuesses.set(playerId, [])
    }

    removePlayer(playerId: string): void {
        super.removePlayer(playerId)
        // Remove player's guesses and completions
        this.playerGuesses.delete(playerId)
        this.playerCompletions = this.playerCompletions.filter(score => score.playerId !== playerId)
        // Note: Don't finish the game when players leave in competitive mode
    }

    addGuess(playerId: string, guess: Guess): void {
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

        // Try to get word from cache first
        const cachedGuess = await this.processWordFromCache(playerId, word)
        if (cachedGuess) {
            this.addGuess(playerId, cachedGuess)
            
            // Check if player found the word
            if (!cachedGuess.error && cachedGuess.distance === 0) {
                const playerGuesses = this.playerGuesses.get(playerId) || []
                this.playerCompletions.push({
                    playerId,
                    guessCount: playerGuesses.length,
                    completedAt: new Date()
                })
            }
            
            return cachedGuess
        }

        // Process word from API
        const guess = await this.processWordFromAPI(playerId, word)
        this.addGuess(playerId, guess)

        // Check if player found the word - don't end game, just record completion
        if (guess.distance === 0) {
            const playerGuesses = this.playerGuesses.get(playerId) || []
            this.playerCompletions.push({
                playerId,
                guessCount: playerGuesses.length,
                completedAt: new Date()
            })
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

    protected getGuessHistoryForTips(playerId: string): Array<[string, number]> {
        // Convert player's guesses to the format expected by tip functions
        const playerGuesses = this.playerGuesses.get(playerId) || []
        return playerGuesses
            .filter(guess => !guess.error && guess.distance !== undefined)
            .map(guess => [guess.word, guess.distance!])
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

    // Override getTip to check for player completion
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

        // Use the base class implementation with competitive-specific guess history
        const guessHistory = this.getGuessHistoryForTips(playerId)
        const tipDistance = halfTipDistance(guessHistory)
        
        return this.processTipRequest(playerId, tipDistance)
    }

    // Give up is not really applicable in competitive mode, but we can remove the player
    async giveUpAndLeave(playerId: string): Promise<{ success: boolean; error?: string }> {
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        this.removePlayer(playerId)
        return { success: true }
    }

    // Override give up to not end the game (competitive mode)
    async giveUpAndGetAnswer(): Promise<{ word: string; error?: string }> {
        if (!this.canGiveUp()) {
            throw new Error("Give up is not allowed in this game")
        }

        try {
            const answerWord = await this.getAnswerFromAPI()
            // In competitive mode, don't end the game, just return the answer
            return { word: answerWord }
        } catch (error) {
            return {
                word: "",
                error: "Não foi possível obter a resposta no momento"
            }
        }
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
        }
    }
}

export { ContextoCompetitiveGame }
