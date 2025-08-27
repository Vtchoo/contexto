import { getTodaysGameId } from './utils/misc'
import { GameWord, IGame, Guess, GameRestorationOptions } from './interface'
import { getCachedWordsRepository } from '../repositories/CachedWordsRepository'
import { ContextoDefaultGame } from './ContextoDefaultGame'
import { ContextoCompetitiveGame } from './ContextoCompetitiveGame'
import { ContextoStopGame } from './ContextoStopGame'
import { ContextoBattleRoyaleGame } from './ContextoBattleRoyaleGame'
import GameApi from './gameApi'
import { getPrefetchedGamesRepository } from '../repositories/PrefetchedGamesRepository'
import { gamePersistenceService } from './GamePersistenceService'
import { GameMode } from '../models/Game'

class ContextoManager {

    private games: Map<string, IGame> = new Map()
    private playerGames: Map<string, string> = new Map() // playerId -> gameId , used to track which game a player is currently playing

    private memoryCache: Map<string, GameWord> = new Map() // In-memory cache for fast access during session

    public getCurrentOrCreateGame(playerId: string, gameType: 'default' | 'competitive' = 'default', gameIdOrDate?: number | Date) {
        let game = this.getCurrentPlayerGame(playerId)
        let justStarted = false
        if (!game) {
            // Only allow default and competitive games through this method
            // Stop games must be created explicitly through createNewGame
            // Always create a new private room for any game type
            game = this.createNewGame(playerId, gameType, gameIdOrDate)
            justStarted = true
        }
        return [game, justStarted] as const
    }

    public getCurrentPlayerGame(playerId: string): IGame | undefined {
        const gameId = this.playerGames.get(playerId)
        if (gameId) {
            return this.games.get(gameId)
        }
        return undefined
    }

    public createNewGame(playerId: string, gameType: 'default' | 'competitive' | 'stop' | 'battle-royale' = 'default', gameIdOrDate?: number | Date) {
        let game: IGame
        switch (gameType) {
            case 'competitive':
                game = new ContextoCompetitiveGame(playerId, this, gameIdOrDate)
                break
            case 'stop':
                game = new ContextoStopGame(playerId, this, gameIdOrDate)
                break
            case 'battle-royale':
                game = new ContextoBattleRoyaleGame(playerId, this, gameIdOrDate)
                break
            case 'default':
            default:
                game = new ContextoDefaultGame(playerId, this, gameIdOrDate)
        }

        if (!game)
            throw new Error("Failed to create game: Game is undefined")

        this.games.set(game.id, game)
        this.playerGames.set(playerId, game.id)
        this.prefetchClosestWords(game.gameId)
        
        // Schedule initial save for new game
        this.scheduleGameSave(game)
        
        return game
    }

    private async prefetchClosestWords(gameId: number) {

        // Prefetch words for the game ID
        // const queryRunner = dataSource.createQueryRunner()
        // const transaction = await queryRunner.startTransaction()

        try {
            const gameApi = GameApi(undefined, gameId)
            const gameWasPrefetched = await getPrefetchedGamesRepository().findOne({
                where: { id: gameId }
            })
            if (gameWasPrefetched) {
                console.log(`Game ${gameId} was already prefetched, skipping`)
                return
            }
            const { data }: any = await gameApi.getClosestWords()
            const words = data?.words
            if (!words || words.length === 0) {
                console.log(`No words found for game ${gameId}, skipping prefetch`)
                return
            }
            const repository = getCachedWordsRepository()
            const existingWords = await repository.find({
                where: { gameId },
                select: ['word']
            })
            const existingWordsSet = new Set(existingWords.map(w => w.word.toLowerCase()))
            // Filter out words that are already cached
            const newWords = words.filter((word: string) => !existingWordsSet.has(word.toLowerCase()))
            if (newWords.length === 0) {
                console.log(`All words for game ${gameId} are already cached, skipping prefetch`)
                return
            }
            await repository.save(newWords.map((word: string, index) => ({
                gameId,
                word: word,
                lemma: word,
                distance: index,
            })))

            // Mark this game as prefetched
            const prefetchedGameRepository = getPrefetchedGamesRepository()
            await prefetchedGameRepository.save({
                id: gameId,
            })
        } catch (error) {
            console.log(`Error prefetching words for game ${gameId}:`, error)
        }
    }

    // Unified method to join any game by ID
    public async joinGame(playerId: string, gameInstanceId: string): Promise<IGame> {
        // Check if player is already in a game
        const currentGame = this.getCurrentPlayerGame(playerId)
        if (currentGame) {
            if (currentGame.id === gameInstanceId) {
                return currentGame // Already in this game
            }
            // Leave current game first
            await this.leaveCurrentGame(playerId)
        }

        // Find the game by ID
        const gameInfo = await this.getGameInfo(gameInstanceId, playerId)
        if (!gameInfo.exists || !gameInfo.game) {
            throw new Error(`Game with ID ${gameInstanceId} not found`)
        }

        const game = gameInfo.game

        // Check if game is already finished
        // if (game.finished) {
        //     throw new Error("This game has already been completed")
        // }

        if (game.getPlayerCount() >= 20) {
            throw new Error("This game is full (max 20 players)")
        }

        // Add player to the game
        game.addPlayer(playerId)
        this.playerGames.set(playerId, game.id)
        
        // Schedule save after player joins
        this.scheduleGameSave(game)
        
        return game
    }

    // Unified method to get any game by ID
    public async getGameInfo(gameInstanceId: string, requestingPlayerId?: string): Promise<{ game: IGame | null; exists: boolean }> {
        // First check if game is already in memory
        const memoryGame = this.games.get(gameInstanceId)
        if (memoryGame) {
            return {
                game: memoryGame,
                exists: true
            }
        }

        // If not in memory, try loading from database
        try {
            const loadedGameData = await gamePersistenceService.loadGame(gameInstanceId)
            if (loadedGameData) {
                const game = await this.restoreGameFromDatabase(loadedGameData.game, loadedGameData.guesses, requestingPlayerId)
                return {
                    game,
                    exists: true
                }
            }
        } catch (error) {
            console.error(`Error loading game ${gameInstanceId} from database:`, error)
        }

        return {
            game: null,
            exists: false
        }
    }

    public async getCachedWord(gameId: number, word: string): Promise<GameWord | undefined> {
        const normalizedWord = word.toLowerCase()
        const cacheKey = `${gameId}-${normalizedWord}`
        
        // Check memory cache first for ultra-fast access
        const memoryResult = this.memoryCache.get(cacheKey)
        if (memoryResult) {
            return memoryResult
        }

        // Check database cache
        const repository = getCachedWordsRepository()
        const cachedWord = await repository.findOne({
            where: { gameId, word: normalizedWord }
        })

        if (cachedWord) {
            const dbResult: GameWord = {
                word: cachedWord.word,
                lemma: cachedWord.lemma,
                distance: cachedWord.distance,
                error: cachedWord.error
            }
            // Store in memory cache for faster subsequent access
            this.memoryCache.set(cacheKey, dbResult)
            return dbResult
        }

        return undefined
    }

    public async cacheWord(gameId: number, word: GameWord): Promise<void> {
        const normalizedWord = word.word.toLowerCase()
        const cacheKey = `${gameId}-${normalizedWord}`
        
        // Store in memory cache for immediate access
        this.memoryCache.set(cacheKey, word)
        
        // Store in database for persistence
        const repository = getCachedWordsRepository()
        
        try {
            // Try to insert new record
            await repository.save({
                gameId,
                word: normalizedWord,
                lemma: word.lemma,
                distance: word.distance,
                error: word.error
            })
        } catch (error) {
            // If it fails due to unique constraint, update existing record
            await repository.update(
                { gameId, word: normalizedWord },
                {
                    lemma: word.lemma,
                    distance: word.distance,
                    error: word.error,
                    updatedAt: new Date()
                }
            )
        }
    }

    public async getCachedWordByDistance(gameId: number, distance: number): Promise<GameWord | undefined> {
        // Check database for any word at this exact distance
        const repository = getCachedWordsRepository()
        const cachedWord = await repository.findOne({
            where: { gameId, distance }
        })

        if (cachedWord && !cachedWord.error) {
            const result: GameWord = {
                word: cachedWord.word,
                lemma: cachedWord.lemma,
                distance: cachedWord.distance,
                error: cachedWord.error
            }
            
            // Store in memory cache for faster subsequent access
            const cacheKey = `${gameId}-${cachedWord.word.toLowerCase()}`
            this.memoryCache.set(cacheKey, result)
            
            return result
        }

        return undefined
    }

    public leaveCurrentGame(playerId: string) {
        const gameId = this.playerGames.get(playerId)
        if (gameId) {
            const game = this.games.get(gameId)
            if (game) {
                game.removePlayer(playerId)
                
                // Check if no players left in the game
                if (game.getPlayerCount() === 0) {
                    this.unloadGame(gameId)
                } else {
                    // Schedule save after player leaves
                    this.scheduleGameSave(game)
                }
            }
        }
        this.playerGames.delete(playerId)
    }

    /**
     * Schedule a game save operation
     */
    private scheduleGameSave(game: IGame): void {
        const saveCallback = async () => {
            await this.saveGameToDatabase(game)
        }
        gamePersistenceService.scheduleInactivitySave(game.id, saveCallback)
    }

    /**
     * Check if we should save based on guess count and trigger save if needed
     */
    public async onGuessAdded(game: IGame): Promise<void> {
        if (gamePersistenceService.shouldSaveOnGuessCount(game.id)) {
            await this.saveGameToDatabase(game)
        } else {
            // Just schedule the inactivity save
            this.scheduleGameSave(game)
        }
    }

    /**
     * Save a game to the database
     */
    private async saveGameToDatabase(game: IGame): Promise<void> {
        try {
            const gameMode = this.getGameMode(game)
            const guesses = this.getGameGuesses(game)

            await gamePersistenceService.saveGame(
                game.id,
                game.gameId,
                gameMode,
                game.started,
                game.finished,
                game.allowTips,
                game.allowGiveUp,
                guesses
            )
        } catch (error) {
            console.error(`Failed to save game ${game.id}:`, error)
        }
    }

    /**
     * Restore a game from database data
     */
    private async restoreGameFromDatabase(gameData: any, guessesData: any[], requestingPlayerId?: string): Promise<IGame> {
        // Prepare guesses by player for restoration
        const playerGuesses = new Map<string, Guess[]>()
        for (const guessData of guessesData) {
            const guess: Guess = {
                word: guessData.word,
                lemma: guessData.lemma,
                distance: guessData.distance,
                addedBy: guessData.addedBy,
                error: guessData.error,
                hidden: guessData.hidden
            }

            if (!playerGuesses.has(guessData.addedBy)) {
                playerGuesses.set(guessData.addedBy, [])
            }
            playerGuesses.get(guessData.addedBy)!.push(guess)
        }

        // Prepare restoration options
        const restorationOptions: GameRestorationOptions = {
            id: gameData.id,
            started: gameData.started,
            finished: gameData.finished,
            skipPlayerInit: !requestingPlayerId, // Skip player init if no requesting player
            initialGuesses: playerGuesses
        }

        // Create the appropriate game instance based on gameMode with restoration options
        let game: IGame
        const firstPlayerId = requestingPlayerId || '__restoration__' // Use requesting player or placeholder
        
        switch (gameData.gameMode) {
            case 'competitive':
                game = new ContextoCompetitiveGame(firstPlayerId, this, gameData.gameId, restorationOptions)
                break
            case 'stop':
                game = new ContextoStopGame(firstPlayerId, this, gameData.gameId, restorationOptions)
                break
            case 'battle-royale':
                game = new ContextoBattleRoyaleGame(firstPlayerId, this, gameData.gameId, restorationOptions)
                break
            case 'default':
            case 'coop':
            default:
                game = new ContextoDefaultGame(firstPlayerId, this, gameData.gameId, restorationOptions)
        }

        // Restore winner info for competitive games (this still needs to be set externally)
        if (gameData.winnerInfo && (game instanceof ContextoCompetitiveGame || game instanceof ContextoStopGame)) {
            (game as any).winnerInfo = gameData.winnerInfo
        }

        // Add to memory
        this.games.set(game.id, game)
        
        console.log(`Game ${game.id} restored from database with ${guessesData.length} guesses`)
        return game
    }

    /**
     * Unload a game from memory (save first if needed)
     */
    private async unloadGame(gameId: string): Promise<void> {
        const game = this.games.get(gameId)
        if (!game) return

        try {
            // Force save before unloading
            const saveCallback = async () => {
                await this.saveGameToDatabase(game)
            }
            await gamePersistenceService.forceSaveAndCleanup(gameId, saveCallback)

            // Remove from memory
            this.games.delete(gameId)
            
            // Clean up player mappings
            for (const [playerId, playerGameId] of this.playerGames) {
                if (playerGameId === gameId) {
                    this.playerGames.delete(playerId)
                }
            }

            console.log(`Game ${gameId} unloaded from memory`)
        } catch (error) {
            console.error(`Error unloading game ${gameId}:`, error)
        }
    }

    /**
     * Helper methods to extract game data for persistence
     */
    private getGameMode(game: IGame): GameMode {
        if (game instanceof ContextoCompetitiveGame) return 'competitive'
        if (game instanceof ContextoStopGame) return 'stop'
        if (game instanceof ContextoBattleRoyaleGame) return 'battle-royale'
        return 'default'
    }

    private getGameGuesses(game: IGame): Map<string, Guess[]> {
        // Handle different game types with different guess storage structures
        if ((game as any).playerGuesses) {
            // Competitive games store playerGuesses as Map<string, Guess[]>
            return (game as any).playerGuesses
        } else if ((game as any).guesses) {
            // Default/cooperative games store guesses as Guess[]
            const guessesArray = (game as any).guesses as Guess[]
            const playerGuessesMap = new Map<string, Guess[]>()
            
            // Group guesses by player
            for (const guess of guessesArray) {
                if (!playerGuessesMap.has(guess.addedBy)) {
                    playerGuessesMap.set(guess.addedBy, [])
                }
                playerGuessesMap.get(guess.addedBy)!.push(guess)
            }
            
            return playerGuessesMap
        }
        
        return new Map()
    }

    // Initialize the manager and start cleanup tasks
    public async initialize(): Promise<void> {
        // Database cache is kept permanently - no cleanup needed
        console.log('ContextoManager initialized with database persistence')
    }

    // Clean up memory cache periodically
    public clearMemoryCache(): void {
        this.memoryCache.clear()
    }

    // Cleanup method for graceful shutdown
    public async shutdown(): Promise<void> {
        console.log('ContextoManager shutting down...')
        
        // Save all active games before shutdown
        const savePromises: Promise<void>[] = []
        for (const game of this.games.values()) {
            savePromises.push(this.saveGameToDatabase(game))
        }
        
        try {
            await Promise.all(savePromises)
            console.log(`Saved ${savePromises.length} games before shutdown`)
        } catch (error) {
            console.error('Error saving games during shutdown:', error)
        }
        
        // Cleanup persistence service timers
        gamePersistenceService.cleanup()
        
        console.log('ContextoManager shutdown complete')
    }

    // Convenience method to create a game for a specific date
    public createGameForDate(playerId: string, date: Date, gameType: 'default' | 'competitive' | 'stop' | 'battle-royale' = 'default') {
        return this.createNewGame(playerId, gameType, date)
    }

    // Convenience method to create a game for a specific game ID
    public createGameForId(playerId: string, gameId: number, gameType: 'default' | 'competitive' = 'default') {
        return this.createNewGame(playerId, gameType, gameId)
    }

    // Helper method to convert Date to game ID
    private dateToGameId(date: Date): number {
        const today = new Date()
        const diffDays = Math.floor((today.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
        return getTodaysGameId() - diffDays
    }

    // Legacy methods for backward compatibility - internally use getGameInfo
    public async getCompetitiveGameInfo(gameInstanceId: string): Promise<{ game: ContextoCompetitiveGame; exists: boolean }> {
        const result = await this.getGameInfo(gameInstanceId)
        const isCompetitive = result.game instanceof ContextoCompetitiveGame
        return {
            game: isCompetitive ? result.game as ContextoCompetitiveGame : null!,
            exists: isCompetitive
        }
    }

    public async getCooperativeGameInfo(gameInstanceId: string): Promise<{ game: ContextoDefaultGame; exists: boolean }> {
        const result = await this.getGameInfo(gameInstanceId)
        const isCooperative = result.game instanceof ContextoDefaultGame
        return {
            game: isCooperative ? result.game as ContextoDefaultGame : null!,
            exists: isCooperative
        }
    }

    public async getStopGameInfo(gameInstanceId: string): Promise<{ game: ContextoStopGame; exists: boolean }> {
        const result = await this.getGameInfo(gameInstanceId)
        const isStop = result.game instanceof ContextoStopGame
        return {
            game: isStop ? result.game as ContextoStopGame : null!,
            exists: isStop
        }
    }

    public async getBattleRoyaleGameInfo(gameInstanceId: string): Promise<{ game: ContextoBattleRoyaleGame; exists: boolean }> {
        const result = await this.getGameInfo(gameInstanceId)
        const isBattleRoyale = result.game instanceof ContextoBattleRoyaleGame
        return {
            game: isBattleRoyale ? result.game as ContextoBattleRoyaleGame : null!,
            exists: isBattleRoyale
        }
    }
}

export { ContextoManager }
