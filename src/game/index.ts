import { AxiosError } from 'axios'
import GameApi from './gameApi'
import { getTodaysGameId, nextTipDistance, halfTipDistance, randomTipDistance } from './utils/misc'
import { v4 as uuid } from 'uuid'
import { GameWord, Guess, IGame, PlayerScore } from './interface'
import { getCachedWordsRepository } from '../repositories/CachedWordsRepository'

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

    // Find or create a competitive game for a player to join
    public findOrCreateCompetitiveGame(playerId: string, gameIdOrDate?: number | Date): ContextoCompetitiveGame {
        // Check if player is already in a competitive game
        const currentGame = this.getCurrentPlayerGame(playerId)
        if (currentGame && currentGame instanceof ContextoCompetitiveGame) {
            return currentGame
        }

        // If a specific game ID is requested, find or create a game with that ID
        if (gameIdOrDate !== undefined) {
            const targetGameId = typeof gameIdOrDate === 'number' ? gameIdOrDate : 
                gameIdOrDate instanceof Date ? this.dateToGameId(gameIdOrDate) : getTodaysGameId()
            
            // Find an existing competitive game with the same game ID
            for (const game of this.competitiveGames.values()) {
                if (game.gameId === targetGameId && game.players.length < 10 && !game.hasPlayerCompleted(playerId)) {
                    game.addPlayer(playerId)
                    this.playerGames.set(playerId, game.id)
                    return game
                }
            }
        } else {
            // Find an existing competitive game that's still accepting players (any game ID)
            for (const game of this.competitiveGames.values()) {
                if (game.players.length < 10 && !game.hasPlayerCompleted(playerId)) {
                    game.addPlayer(playerId)
                    this.playerGames.set(playerId, game.id)
                    return game
                }
            }
        }

        // Create a new competitive game
        return this.createNewGame(playerId, 'competitive', gameIdOrDate) as ContextoCompetitiveGame
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
}

class ContextoDefaultGame implements IGame {

    private readonly manager: ContextoManager
    private readonly gameApi: ReturnType<typeof GameApi>

    private readonly players: string[] // List of player IDs in the game
    private readonly guesses: Guess[] = [] // List of guesses made by players

    public readonly id = uuid()
    public readonly gameId: number

    allowTips = true // Whether players can request tips
    allowGiveUp = true // Whether players can give up on the game

    started = true

    private _finished = false // Whether the game is finished
    public get finished(): boolean {
        return this._finished
    }
    private set finished(value: boolean) {
        this._finished = value
        // this.manager.leaveCurrentGame(this.players[0]) // Assuming the first player is the one who started the game
    }

    public get gameDate(): Date {
        const today = new Date()
        const todaysGameId = getTodaysGameId()
        const daysDiff = todaysGameId - this.gameId
        const gameDate = new Date(today)
        gameDate.setDate(gameDate.getDate() - daysDiff)
        return gameDate
    }

    public get guessCount(): number {
        return this.guesses.length
    }

    constructor(playerId: string, manager: ContextoManager, gameIdOrDate?: number | string | Date) {

        this.manager = manager

        // Initialize game with specific id, date, or use today's game
        this.players = [playerId]

        if (typeof gameIdOrDate === 'number') {
            this.gameId = gameIdOrDate
        } else if (gameIdOrDate instanceof Date) {
            // Convert date to game ID (you may need to implement this logic based on your game's date system)
            const today = new Date()
            const diffDays = Math.floor((today.getTime() - gameIdOrDate.getTime()) / (1000 * 60 * 60 * 24))
            this.gameId = getTodaysGameId() - diffDays
        } else {
            this.gameId = getTodaysGameId()
        }
        
        this.gameApi = GameApi('pt-br', this.gameId)
    }

    startGame() {
        if (this.started) {
            throw new Error(`Game ${this.id} has already started`)
        }
        this.started = true
    }

    addPlayer(playerId: string) {
        // Check if the player is already in the game
        if (this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is already in the game`)
        }

        // Add the player to the game
        this.players.push(playerId)
    }

    removePlayer(playerId: string) {
        // Check if the player is in the game
        const index = this.players.indexOf(playerId)
        if (index === -1) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        // Remove the player from the game
        this.players.splice(index, 1)

        // If the player was the last one, mark the game as finished
        if (this.players.length === 0) {
            this.finished = true
        }
    }

    addGuess(playerId: string, guess: Guess) {
        // Check if the player is in the game
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        // Add the guess to the game
        this.guesses.push(guess)
    }

    getExistingGuess(word: string): Guess | undefined {
        return this.guesses.find(guess => guess.word === word || guess.lemma === word)
    }

    async tryWord(playerId: string, word: string) {

        if (this.finished) {
            throw new Error(`Game ${this.id} is already finished`)
        }

        // Check if the player is in the game
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        // Check in the cached words first
        const cachedWord = await this.manager.getCachedWord(this.gameId, word)
        if (cachedWord) {
            if (cachedWord.error) {
                const guess = {
                    word,
                    addedBy: playerId,
                    error: cachedWord.error
                }
                // this.addGuess(playerId, guess)
                // Cache the error guess for quick access next time
                await this.manager.cacheWord(this.gameId, {
                    word,
                    error: cachedWord.error
                })
                return guess as Guess
            }

            const guess: Guess = {
                word,
                lemma: cachedWord.lemma,
                distance: cachedWord.distance,
                addedBy: playerId
            }
            this.addGuess(playerId, guess)
            return guess as Guess
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

            if (data.distance === 0) {
                this.finished = true // Mark the game as finished if the guess is correct
            }
            // Cache the word for quick access next time
            await this.manager.cacheWord(this.gameId, {
                word: data.word,
                lemma: data.lemma,
                distance: data.distance
            })
            return guess as Guess
        } catch (error) {
            if (error instanceof AxiosError) {
                const { error: message } = error.response?.data ?? {}
                if (message) {
                    const guess = {
                        word,
                        addedBy: playerId,
                        error: message
                    }
                    // this.addGuess(playerId, guess)
                    // Cache the error guess for quick access next time
                    await this.manager.cacheWord(this.gameId, {
                        word,
                        error: message
                    })
                    return guess as Guess
                }
            }
            throw new Error(`Failed to play word "${word}": ${error.message}`)
        }
    }

    getClosestGuesses(playerId: string, count = 10) {
        return this.guesses
            .filter(guess => !guess.error) // Filter out invalid guesses
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)) // Sort by distance
            .slice(0, count) // Limit to the closest guesses
    }

    getGuessCount(playerId?: string): number {
        // In default games, all players share the same guess count
        return this.guesses.filter(guess => !guess.error).length
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

    // Get a tip for the game
    async getTip(playerId: string): Promise<{ word: string; distance: number; error?: string }> {
        if (!this.canUseTips()) {
            throw new Error("Tips are not allowed in this game")
        }

        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        if (this.finished) {
            throw new Error("Game is already finished")
        }

        try {
            // Convert guesses to the format expected by tip functions
            const guessHistory = this.guesses
                .filter(guess => !guess.error && guess.distance !== undefined)
                .map(guess => [guess.word, guess.distance])

            // Calculate tip distance using the game's easy difficulty rule (default)
            const tipDist = halfTipDistance(guessHistory)
            
            // First, check if we already have a word at this exact distance in cache
            const cachedWordAtDistance = await this.manager.getCachedWordByDistance(this.gameId, tipDist)
            
            if (cachedWordAtDistance) {
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
            const { data } = await this.gameApi.tip(tipDist)
            
            // Add the tip word as a guess so it appears in the player's list
            const tipGuess: Guess = {
                word: data.word,
                lemma: data.lemma || data.word,
                distance: data.distance,
                addedBy: playerId
            }
            this.addGuess(playerId, tipGuess)
            
            // Cache the new tip word normally (it will be stored with its actual word as key)
            await this.manager.cacheWord(this.gameId, {
                word: data.word,
                lemma: data.lemma,
                distance: data.distance
            })
            
            return {
                word: data.word,
                distance: data.distance
            }
        } catch (error) {
            return {
                word: "",
                distance: -1,
                error: "Não foi possível obter uma dica no momento"
            }
        }
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

        try {
            // Convert guesses to the format expected by tip functions
            const guessHistory = this.guesses
                .filter(guess => !guess.error && guess.distance !== undefined)
                .map(guess => [guess.word, guess.distance])

            // Calculate tip distance based on difficulty
            let tipDist: number
            switch (difficulty) {
                case 'medium':
                    tipDist = nextTipDistance(guessHistory)
                    break
                case 'hard':
                    tipDist = randomTipDistance(guessHistory)
                    break
                case 'easy':
                default:
                    tipDist = halfTipDistance(guessHistory)
                    break
            }
            
            // First, check if we already have a word at this exact distance in cache
            const cachedWordAtDistance = await this.manager.getCachedWordByDistance(this.gameId, tipDist)
            
            if (cachedWordAtDistance) {
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
            const { data } = await this.gameApi.tip(tipDist)
            
            // Add the tip word as a guess so it appears in the player's list
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
        } catch (error) {
            return {
                word: "",
                distance: -1,
                error: "Não foi possível obter uma dica no momento"
            }
        }
    }

    // Get the answer by giving up
    async giveUpAndGetAnswer(): Promise<{ word: string; error?: string }> {
        if (!this.canGiveUp()) {
            throw new Error("Give up is not allowed in this game")
        }

        if (this.finished) {
            throw new Error("Game is already finished")
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
                
                // Cache the answer normally (it will be stored with its actual word as key and distance 0)
                await this.manager.cacheWord(this.gameId, {
                    word: data.word,
                    lemma: data.lemma,
                    distance: 0
                })
            }
            
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
}

class ContextoCompetitiveGame implements IGame {

    private readonly manager: ContextoManager
    private readonly gameApi: ReturnType<typeof GameApi>

    public readonly id = uuid()
    gameId: number
    players: string[] = []
    private playerGuesses: Map<string, Guess[]> = new Map() // Individual player guesses
    private playerCompletions: PlayerScore[] = [] // Track when players complete the word
    finished = false // Always false in competitive mode

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
        // Remove player's guesses and completions
        this.playerGuesses.delete(playerId)
        this.playerCompletions = this.playerCompletions.filter(score => score.playerId !== playerId)
        // Note: Don't finish the game when players leave in competitive mode
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
            
            // Check if player found the word
            if (cachedWord.distance === 0) {
                const playerGuesses = this.playerGuesses.get(playerId) || []
                this.playerCompletions.push({
                    playerId,
                    guessCount: playerGuesses.length,
                    completedAt: new Date()
                })
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

            // Check if player found the word - don't end game, just record completion
            if (data.distance === 0) {
                const playerGuesses = this.playerGuesses.get(playerId) || []
                this.playerCompletions.push({
                    playerId,
                    guessCount: playerGuesses.length,
                    completedAt: new Date()
                })
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

    // Get a tip for a specific player in competitive mode
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

        try {
            // Convert player's guesses to the format expected by tip functions
            const playerGuesses = this.playerGuesses.get(playerId) || []
            const guessHistory = playerGuesses
                .filter(guess => !guess.error && guess.distance !== undefined)
                .map(guess => [guess.word, guess.distance])

            // Calculate tip distance using the game's easy difficulty rule (default)
            const tipDist = halfTipDistance(guessHistory)
            
            // First, check if we already have a word at this exact distance in cache
            const cachedWordAtDistance = await this.manager.getCachedWordByDistance(this.gameId, tipDist)
            
            if (cachedWordAtDistance) {
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
            const { data } = await this.gameApi.tip(tipDist)
            
            // Add the tip word as a guess to the player's personal list
            const tipGuess: Guess = {
                word: data.word,
                lemma: data.lemma || data.word, // Use lemma from API or fallback to word
                distance: data.distance,
                addedBy: playerId
            }
            this.addGuess(playerId, tipGuess)
            
            // Cache the new tip word normally (it will be stored with its actual word as key)
            await this.manager.cacheWord(this.gameId, {
                word: data.word,
                lemma: data.lemma,
                distance: data.distance
            })
            
            return {
                word: data.word,
                distance: data.distance
            }
        } catch (error) {
            return {
                word: "",
                distance: -1,
                error: "Não foi possível obter uma dica no momento"
            }
        }
    }

    // Give up is not really applicable in competitive mode, but we can remove the player
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

    // Get the answer without ending the game (for competitive mode)
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
                
                // Cache the answer normally (it will be stored with its actual word as key and distance 0)
                await this.manager.cacheWord(this.gameId, {
                    word: data.word,
                    lemma: data.lemma,
                    distance: 0
                })
            }
            
            // In competitive mode, don't end the game, just return the answer
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
}

const gameManager = new ContextoManager()

export default gameManager
export { ContextoDefaultGame, ContextoCompetitiveGame, ContextoManager }
