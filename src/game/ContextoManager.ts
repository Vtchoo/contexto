import { getTodaysGameId } from './utils/misc'
import { GameWord } from './interface'
import { getCachedWordsRepository } from '../repositories/CachedWordsRepository'
import { ContextoDefaultGame } from './ContextoDefaultGame'
import { ContextoCompetitiveGame } from './ContextoCompetitiveGame'
import { ContextoStopGame } from './ContextoStopGame'
import { ContextoBattleRoyaleGame } from './ContextoBattleRoyaleGame'

class ContextoManager {

    private games: Map<string, ContextoDefaultGame | ContextoCompetitiveGame | ContextoStopGame | ContextoBattleRoyaleGame> = new Map()
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

    public getCurrentPlayerGame(playerId: string): ContextoDefaultGame | ContextoCompetitiveGame | ContextoStopGame | ContextoBattleRoyaleGame | undefined {
        const gameId = this.playerGames.get(playerId)
        if (gameId) {
            return this.games.get(gameId)
        }
        return undefined
    }

    public createNewGame(playerId: string, gameType: 'default' | 'competitive' | 'stop' | 'battle-royale' = 'default', gameIdOrDate?: number | Date) {
        if (gameType === 'competitive') {
            // Create a new competitive game room
            const game = new ContextoCompetitiveGame(playerId, this, gameIdOrDate)
            this.games.set(game.id, game)
            this.playerGames.set(playerId, game.id)
            return game
        } else if (gameType === 'stop') {
            // Create a new stop game room
            const game = new ContextoStopGame(playerId, this, gameIdOrDate)
            this.games.set(game.id, game)
            this.playerGames.set(playerId, game.id)
            return game
        } else if (gameType === 'battle-royale') {
            // Create a new battle royale game room
            const game = new ContextoBattleRoyaleGame(playerId, this, gameIdOrDate)
            this.games.set(game.id, game)
            this.playerGames.set(playerId, game.id)
            return game
        } else {
            const game = new ContextoDefaultGame(playerId, this, gameIdOrDate)
            this.games.set(game.id, game)
            this.playerGames.set(playerId, game.id)
            return game
        }
    }

    // Unified method to join any game by ID
    public joinGame(playerId: string, gameInstanceId: string): ContextoDefaultGame | ContextoCompetitiveGame | ContextoStopGame | ContextoBattleRoyaleGame {
        // Check if player is already in a game
        const currentGame = this.getCurrentPlayerGame(playerId)
        if (currentGame) {
            if (currentGame.id === gameInstanceId) {
                return currentGame // Already in this game
            }
            // Leave current game first
            this.leaveCurrentGame(playerId)
        }

        // Find the game by ID
        const gameInfo = this.getGameInfo(gameInstanceId)
        if (!gameInfo.exists || !gameInfo.game) {
            throw new Error(`Game with ID ${gameInstanceId} not found`)
        }

        const game = gameInfo.game

        // Check if game is already finished
        if (game.finished) {
            throw new Error("This game has already been completed")
        }

        // Type-specific validations
        if (game instanceof ContextoCompetitiveGame) {
            // Check if game has room for more players
            if (game.players.length >= 10) {
                throw new Error("This competitive game is full (max 10 players)")
            }
            // Check if player already completed this game
            if (game.hasPlayerCompleted(playerId)) {
                throw new Error("You have already completed this game")
            }
        } else {
            // For default, stop, and battle-royale games
            if (game.getPlayerCount() >= 20) {
                throw new Error("This game is full (max 20 players)")
            }
        }

        // Add player to the game
        game.addPlayer(playerId)
        this.playerGames.set(playerId, game.id)
        return game
    }

    // Convenience methods for backward compatibility (optional - can be removed if not needed)
    public joinCompetitiveGame(playerId: string, gameInstanceId: string): ContextoCompetitiveGame {
        const game = this.joinGame(playerId, gameInstanceId)
        if (!(game instanceof ContextoCompetitiveGame)) {
            throw new Error(`Game ${gameInstanceId} is not a competitive game`)
        }
        return game
    }

    public joinCooperativeGame(playerId: string, gameInstanceId: string): ContextoDefaultGame {
        const game = this.joinGame(playerId, gameInstanceId)
        if (!(game instanceof ContextoDefaultGame)) {
            throw new Error(`Game ${gameInstanceId} is not a cooperative game`)
        }
        return game
    }

    public joinStopGame(playerId: string, gameInstanceId: string): ContextoStopGame {
        const game = this.joinGame(playerId, gameInstanceId)
        if (!(game instanceof ContextoStopGame)) {
            throw new Error(`Game ${gameInstanceId} is not a stop game`)
        }
        return game
    }

    public joinBattleRoyaleGame(playerId: string, gameInstanceId: string): ContextoBattleRoyaleGame {
        const game = this.joinGame(playerId, gameInstanceId)
        if (!(game instanceof ContextoBattleRoyaleGame)) {
            throw new Error(`Game ${gameInstanceId} is not a battle royale game`)
        }
        return game
    }

    // Unified method to get any game by ID
    public getGameInfo(gameInstanceId: string): { game: ContextoDefaultGame | ContextoCompetitiveGame | ContextoStopGame | ContextoBattleRoyaleGame | null; exists: boolean } {
        const game = this.games.get(gameInstanceId)
        return {
            game: game || null,
            exists: !!game
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
            }
        }
        this.playerGames.delete(playerId)
    }

    // Initialize the manager and start cleanup tasks
    public async initialize(): Promise<void> {
        // Database cache is kept permanently - no cleanup needed
        console.log('ContextoManager initialized')
    }

    // Clean up memory cache periodically
    public clearMemoryCache(): void {
        this.memoryCache.clear()
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
    public getCompetitiveGameInfo(gameInstanceId: string): { game: ContextoCompetitiveGame; exists: boolean } {
        const result = this.getGameInfo(gameInstanceId)
        const isCompetitive = result.game instanceof ContextoCompetitiveGame
        return {
            game: isCompetitive ? result.game as ContextoCompetitiveGame : null!,
            exists: isCompetitive
        }
    }

    public getCooperativeGameInfo(gameInstanceId: string): { game: ContextoDefaultGame; exists: boolean } {
        const result = this.getGameInfo(gameInstanceId)
        const isCooperative = result.game instanceof ContextoDefaultGame
        return {
            game: isCooperative ? result.game as ContextoDefaultGame : null!,
            exists: isCooperative
        }
    }

    public getStopGameInfo(gameInstanceId: string): { game: ContextoStopGame; exists: boolean } {
        const result = this.getGameInfo(gameInstanceId)
        const isStop = result.game instanceof ContextoStopGame
        return {
            game: isStop ? result.game as ContextoStopGame : null!,
            exists: isStop
        }
    }

    public getBattleRoyaleGameInfo(gameInstanceId: string): { game: ContextoBattleRoyaleGame; exists: boolean } {
        const result = this.getGameInfo(gameInstanceId)
        const isBattleRoyale = result.game instanceof ContextoBattleRoyaleGame
        return {
            game: isBattleRoyale ? result.game as ContextoBattleRoyaleGame : null!,
            exists: isBattleRoyale
        }
    }
}

export { ContextoManager }
