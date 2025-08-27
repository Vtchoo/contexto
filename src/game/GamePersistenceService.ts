import { getGamesRepository, getGameGuessesRepository } from '../repositories/GamesRepository'
import { Game, GameMode } from '../models/Game'
import { GameGuess } from '../models/GameGuess'
import { Guess } from './interface'

export class GamePersistenceService {
    private static readonly INACTIVITY_SAVE_INTERVAL = 5000 // 5 seconds
    private static readonly GUESSES_SAVE_THRESHOLD = 10 // Save every 10 guesses
    
    private saveTimers = new Map<string, NodeJS.Timeout>()
    private guessCounts = new Map<string, number>()

    /**
     * Save a game and its guesses to the database
     */
    async saveGame(
        gameId: string,
        contextoGameId: number,
        gameMode: GameMode,
        started: boolean,
        finished: boolean,
        allowTips: boolean,
        allowGiveUp: boolean,
        guesses: Map<string, Guess[]>
    ): Promise<void> {
        const gamesRepo = getGamesRepository()
        const guessesRepo = getGameGuessesRepository()

        try {
            // Find or create game
            let game = await gamesRepo.findOne({ where: { id: gameId } })
            
            if (!game) {
                game = new Game()
                game.id = gameId
                game.gameId = contextoGameId
                game.gameMode = gameMode
                game.allowTips = allowTips
                game.allowGiveUp = allowGiveUp
            }

            // Update game state
            game.started = started
            game.finished = finished

            await gamesRepo.save(game)

            // Save all guesses (we'll use upsert logic based on game + player + word combination)
            const allGuesses: Guess[] = []
            for (const [playerId, playerGuesses] of guesses) {
                allGuesses.push(...playerGuesses)
            }

            // Delete existing guesses for this game and re-insert (simpler than complex upsert)
            await guessesRepo.delete({ gameId })

            // Insert all current guesses
            for (const guess of allGuesses) {
                const gameGuess = new GameGuess()
                gameGuess.gameId = gameId
                gameGuess.addedBy = guess.addedBy
                gameGuess.word = guess.word
                gameGuess.lemma = guess.lemma || null
                gameGuess.distance = guess.distance || null
                gameGuess.error = guess.error || null
                gameGuess.hidden = guess.hidden || false

                await guessesRepo.save(gameGuess)
            }

            console.log(`Game ${gameId} saved successfully with ${allGuesses.length} guesses`)
        } catch (error) {
            console.error(`Error saving game ${gameId}:`, error)
            throw error
        }
    }

    /**
     * Load a game from the database
     */
    async loadGame(gameId: string): Promise<{
        game: Game,
        guesses: GameGuess[]
    } | null> {
        const gamesRepo = getGamesRepository()
        const guessesRepo = getGameGuessesRepository()

        try {
            const game = await gamesRepo.findOne({ where: { id: gameId } })
            if (!game) {
                return null
            }

            const guesses = await guessesRepo.find({ 
                where: { gameId },
                order: { createdAt: 'ASC' }
            })

            console.log(`Game ${gameId} loaded successfully with ${guesses.length} guesses`)
            return { game, guesses }
        } catch (error) {
            console.error(`Error loading game ${gameId}:`, error)
            throw error
        }
    }

    /**
     * Schedule a save operation after inactivity interval
     */
    scheduleInactivitySave(gameId: string, saveCallback: () => Promise<void>): void {
        // Clear existing timer
        if (this.saveTimers.has(gameId)) {
            clearTimeout(this.saveTimers.get(gameId)!)
        }

        // Set new timer
        const timer = setTimeout(async () => {
            try {
                await saveCallback()
                this.saveTimers.delete(gameId)
            } catch (error) {
                console.error(`Error in scheduled save for game ${gameId}:`, error)
            }
        }, GamePersistenceService.INACTIVITY_SAVE_INTERVAL)

        this.saveTimers.set(gameId, timer)
    }

    /**
     * Check if we should save based on guess count threshold
     */
    shouldSaveOnGuessCount(gameId: string): boolean {
        const currentCount = this.guessCounts.get(gameId) || 0
        const newCount = currentCount + 1
        this.guessCounts.set(gameId, newCount)

        return newCount % GamePersistenceService.GUESSES_SAVE_THRESHOLD === 0
    }

    /**
     * Force save and clear timers (when all players leave)
     */
    async forceSaveAndCleanup(gameId: string, saveCallback: () => Promise<void>): Promise<void> {
        // Clear any pending timer
        if (this.saveTimers.has(gameId)) {
            clearTimeout(this.saveTimers.get(gameId)!)
            this.saveTimers.delete(gameId)
        }

        // Clear guess count tracking
        this.guessCounts.delete(gameId)

        // Force save
        try {
            await saveCallback()
            console.log(`Game ${gameId} force saved and cleaned up`)
        } catch (error) {
            console.error(`Error in force save for game ${gameId}:`, error)
            throw error
        }
    }

    /**
     * Delete a game from database (for cleanup)
     */
    async deleteGame(gameId: string): Promise<void> {
        const gamesRepo = getGamesRepository()
        
        try {
            await gamesRepo.delete({ id: gameId })
            console.log(`Game ${gameId} deleted from database`)
        } catch (error) {
            console.error(`Error deleting game ${gameId}:`, error)
            throw error
        }
    }

    /**
     * Clean up any pending timers (for shutdown)
     */
    cleanup(): void {
        for (const timer of this.saveTimers.values()) {
            clearTimeout(timer)
        }
        this.saveTimers.clear()
        this.guessCounts.clear()
    }
}

export const gamePersistenceService = new GamePersistenceService()
