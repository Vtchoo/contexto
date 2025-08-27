import { AxiosError } from 'axios'
import GameApi from './gameApi'
import { getTodaysGameId, halfTipDistance, nextTipDistance, randomTipDistance } from './utils/misc'
import snowflakeGenerator from '../utils/snowflake'
import { GameState, GameWord, Guess, IGame, GameRestorationOptions } from './interface'
import type { ContextoManager } from './ContextoManager'
import { ContextoBaseGame } from './ContextoBaseGame'

class ContextoDefaultGame extends ContextoBaseGame {
    private readonly guesses: Guess[] = [] // List of guesses made by all players

    private _finished = false // Whether the game is finished
    public get finished(): boolean {
        return this._finished
    }
    private set finished(value: boolean) {
        this._finished = value
        // this.manager.leaveCurrentGame(this.players[0]) // Assuming the first player is the one who started the game
    }

    public get guessCount(): number {
        return this.guesses.length
    }

    constructor(playerId: string, manager: ContextoManager, gameIdOrDate?: number | string | Date, restorationOptions?: GameRestorationOptions) {
        super(playerId, manager, gameIdOrDate, restorationOptions)
        
        // Set finished state from restoration options
        if (restorationOptions?.finished !== undefined) {
            this._finished = restorationOptions.finished
        }
        
        // Restore guesses if provided
        if (restorationOptions?.initialGuesses) {
            // For default games, flatten all player guesses into the single array
            for (const [playerId, playerGuesses] of restorationOptions.initialGuesses) {
                this.guesses.push(...playerGuesses)
            }
        }
        
        // Default games start immediately unless restoration says otherwise
        if (!restorationOptions?.started) {
            this.started = true
        }
    }

    removePlayer(playerId: string): void {
        super.removePlayer(playerId)
        
        // If the player was the last one, mark the game as finished
        if (this.players.length === 0) {
            this.finished = true
        }
    }

    addGuess(playerId: string, guess: Guess): void {
        // Check if the player is in the game
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        // Add the guess to the game
        this.guesses.push(guess)
        
        // Notify manager for persistence
        this.notifyGuessAdded()
    }

    getExistingGuess(word: string): Guess | undefined {
        return this.guesses.find(guess => guess.word === word || guess.lemma === word)
    }

    async tryWord(playerId: string, word: string): Promise<Guess> {
        if (this.finished) {
            throw new Error(`Game ${this.id} is already finished`)
        }

        // Check if the player is in the game
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        // Try to get word from cache first
        const cachedGuess = await this.processWordFromCache(playerId, word)
        if (cachedGuess) {
            if (!cachedGuess.error) {
                this.addGuess(playerId, cachedGuess)
            }
            if (cachedGuess.distance === 0) {
                this.finished = true // Mark the game as finished if the guess is correct
            }
            return cachedGuess
        }

        // Process word from API
        const guess = await this.processWordFromAPI(playerId, word)
        this.addGuess(playerId, guess)

        if (guess.distance === 0) {
            this.finished = true // Mark the game as finished if the guess is correct
        }

        return guess
    }

    getClosestGuesses(playerId: string, count = 10): GameWord[] {
        return this.guesses
            .filter(guess => !guess.error) // Filter out invalid guesses
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)) // Sort by distance
            .slice(0, count) // Limit to the closest guesses
    }

    getGuessCount(playerId?: string): number {
        // In default games, all players share the same guess count
        return this.guesses.filter(guess => !guess.error).length
    }

    protected getGuessHistoryForTips(playerId: string): Array<[string, number]> {
        // Convert guesses to the format expected by tip functions
        return this.guesses
            .filter(guess => !guess.error && guess.distance !== undefined)
            .map(guess => [guess.word, guess.distance!])
    }

    // Get a tip with specified difficulty level
    async getTipWithDifficulty(playerId: string, difficulty: 'easy' | 'medium' | 'hard' = 'easy'): Promise<{ word: string; distance: number; error?: string }> {
        if (!this.canUseTips()) {
            throw new Error("Tips are not allowed in this game")
        }

        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        if (this.finished) {
            throw new Error("Game is already finished")
        }

        // Get guess history for tip calculation
        const guessHistory = this.getGuessHistoryForTips(playerId)

        // Calculate tip distance based on difficulty
        let tipDistance: number
        switch (difficulty) {
            case 'medium':
                tipDistance = nextTipDistance(guessHistory)
                break
            case 'hard':
                tipDistance = randomTipDistance(guessHistory)
                break
            case 'easy':
            default:
                tipDistance = halfTipDistance(guessHistory)
                break
        }
        
        return this.processTipRequest(playerId, tipDistance)
    }

    // Override give up to end the game
    async giveUpAndGetAnswer(): Promise<{ word: string; error?: string }> {
        const result = await super.giveUpAndGetAnswer()
        if (!result.error) {
            this.finished = true
        }
        return result
    }

    getCurrentGameState(playerId: string): GameState {
        return {
            id: this.id,
            started: this.started,
            finished: this.finished,
            players: this.players,
            guesses: this.guesses
        }
    }
}

export { ContextoDefaultGame }
