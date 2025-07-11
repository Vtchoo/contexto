import { getTodaysGameId } from './utils/misc'
import { GameWord } from './interface'
import { getCachedWordsRepository } from '../repositories/CachedWordsRepository'
import { ContextoDefaultGame } from './ContextoDefaultGame'
import { ContextoCompetitiveGame } from './ContextoCompetitiveGame'

class ContextoManager {

    private defaultGames: Map<string, ContextoDefaultGame> = new Map()
    private competitiveGames: Map<string, ContextoCompetitiveGame> = new Map()
    private playerGames: Map<string, string> = new Map() // playerId -> gameId , used to track which game a player is currently playing
    private gameTypes: Map<string, 'default' | 'competitive'> = new Map() // gameId -> game type

    private memoryCache: Map<string, GameWord> = new Map() // In-memory cache for fast access during session

    public getCurrentOrCreateGame(playerId: string, gameType: 'default' | 'competitive' = 'default', gameIdOrDate?: number | Date) {
        let game = this.getCurrentPlayerGame(playerId)
        let justStarted = false
        if (!game) {
            // Always create a new private room for any game type
            game = this.createNewGame(playerId, gameType, gameIdOrDate)
            justStarted = true
        }
        return [game, justStarted] as const
    }

    public getCurrentPlayerGame(playerId: string): ContextoDefaultGame | ContextoCompetitiveGame | undefined {
        const gameId = this.playerGames.get(playerId)
        if (gameId) {
            const gameType = this.gameTypes.get(gameId)
            if (gameType === 'competitive') {
                return this.competitiveGames.get(gameId)
            } else {
                return this.defaultGames.get(gameId)
            }
        }
        return undefined
    }

    public createNewGame(playerId: string, gameType: 'default' | 'competitive' = 'default', gameIdOrDate?: number | Date) {
        if (gameType === 'competitive') {
            // Create a new competitive game room
            const game = new ContextoCompetitiveGame(playerId, this, gameIdOrDate)
            this.competitiveGames.set(game.id, game)
            this.playerGames.set(playerId, game.id)
            this.gameTypes.set(game.id, 'competitive')
            return game
        } else {
            const game = new ContextoDefaultGame(playerId, this, gameIdOrDate)
            this.defaultGames.set(game.id, game)
            this.playerGames.set(playerId, game.id)
            this.gameTypes.set(game.id, 'default')
            return game
        }
    }

    // Join a specific competitive game by its instance ID (like a private room/lobby)
    public joinCompetitiveGame(playerId: string, gameInstanceId: string): ContextoCompetitiveGame {
        // Check if player is already in a competitive game
        const currentGame = this.getCurrentPlayerGame(playerId)
        if (currentGame && currentGame instanceof ContextoCompetitiveGame) {
            if (currentGame.id === gameInstanceId) {
                return currentGame // Already in this game
            }
            throw new Error("You are already in another competitive game. Use /leave first.")
        }

        // Find the specific competitive game by its instance ID
        const game = this.competitiveGames.get(gameInstanceId)
        if (!game) {
            throw new Error(`Competitive game with ID ${gameInstanceId} not found`)
        }

        // Check if game has room for more players
        if (game.players.length >= 10) {
            throw new Error("This competitive game is full (max 10 players)")
        }

        // Check if player already completed this game
        if (game.hasPlayerCompleted(playerId)) {
            throw new Error("You have already completed this game")
        }

        // Add player to the game
        game.addPlayer(playerId)
        this.playerGames.set(playerId, game.id)
        return game
    }

    // Join a specific cooperative game by its instance ID (like a private room/lobby)
    public joinCooperativeGame(playerId: string, gameInstanceId: string): ContextoDefaultGame {
        // Check if player is already in a cooperative game
        const currentGame = this.getCurrentPlayerGame(playerId)
        if (currentGame && currentGame instanceof ContextoDefaultGame) {
            if (currentGame.id === gameInstanceId) {
                return currentGame // Already in this game
            }
            throw new Error("You are already in another cooperative game. Use /leave first.")
        }

        // Find the specific cooperative game by its instance ID
        const game = this.defaultGames.get(gameInstanceId)
        if (!game) {
            throw new Error(`Cooperative game with ID ${gameInstanceId} not found`)
        }

        // Check if game has room for more players (cooperative games can have more players)
        if (game.getPlayerCount() >= 20) {
            throw new Error("This cooperative game is full (max 20 players)")
        }

        // Check if game is already finished
        if (game.finished) {
            throw new Error("This cooperative game has already been completed")
        }

        // Add player to the game
        game.addPlayer(playerId)
        this.playerGames.set(playerId, game.id)
        return game
    }

    // Get information about a competitive game room
    public getCompetitiveGameInfo(gameInstanceId: string): { game: ContextoCompetitiveGame; exists: boolean } {
        const game = this.competitiveGames.get(gameInstanceId)
        return {
            game: game!,
            exists: !!game
        }
    }

    // Get information about a cooperative game room
    public getCooperativeGameInfo(gameInstanceId: string): { game: ContextoDefaultGame; exists: boolean } {
        const game = this.defaultGames.get(gameInstanceId)
        return {
            game: game!,
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
            const gameType = this.gameTypes.get(gameId)
            if (gameType === 'competitive') {
                const game = this.competitiveGames.get(gameId)
                if (game) {
                    game.removePlayer(playerId)
                }
            } else {
                const game = this.defaultGames.get(gameId)
                if (game) {
                    game.removePlayer(playerId)
                }
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
    public createGameForDate(playerId: string, date: Date, gameType: 'default' | 'competitive' = 'default') {
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
}

export { ContextoManager }
