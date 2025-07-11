import { AxiosError } from 'axios'
import GameApi from './gameApi'
import { getTodaysGameId } from './utils/misc'
import { v4 as uuid } from 'uuid'
import { GameWord, Guess, IGame, PlayerScore } from './interface'

class ContextoManager {

    private defaultGames: Map<string, ContextoDefaultGame> = new Map()
    private competitiveGames: Map<string, ContextoCompetitiveGame> = new Map()
    private playerGames: Map<string, string> = new Map() // playerId -> gameId , used to track which game a player is currently playing
    private gameTypes: Map<string, 'default' | 'competitive'> = new Map() // gameId -> game type

    private cachedWords: Map<string, GameWord> = new Map() // gameId + word -> guesses, used to cache guesses for quick access and avoid unnecessary API calls

    public getCurrentOrCreateGame(playerId: string, gameType: 'default' | 'competitive' = 'default') {
        let game = this.getCurrentPlayerGame(playerId)
        let justStarted = false
        if (!game) {
            game = this.createNewGame(playerId, gameType)
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

    public createNewGame(playerId: string, gameType: 'default' | 'competitive' = 'default') {
        if (gameType === 'competitive') {
            const game = new ContextoCompetitiveGame(playerId, this)
            this.competitiveGames.set(game.id, game)
            this.playerGames.set(playerId, game.id)
            this.gameTypes.set(game.id, 'competitive')
            return game
        } else {
            const game = new ContextoDefaultGame(playerId, this)
            this.defaultGames.set(game.id, game)
            this.playerGames.set(playerId, game.id)
            this.gameTypes.set(game.id, 'default')
            return game
        }
    }

    // Find or create a competitive game for a player to join
    public findOrCreateCompetitiveGame(playerId: string): ContextoCompetitiveGame {
        // Check if player is already in a competitive game
        const currentGame = this.getCurrentPlayerGame(playerId)
        if (currentGame && currentGame instanceof ContextoCompetitiveGame) {
            return currentGame
        }

        // Find an existing competitive game that's still accepting players
        for (const game of this.competitiveGames.values()) {
            if (game.players.length < 10 && !game.hasPlayerCompleted(playerId)) { // Arbitrary max of 10 players
                game.addPlayer(playerId)
                this.playerGames.set(playerId, game.id)
                return game
            }
        }

        // Create a new competitive game
        return this.createNewGame(playerId, 'competitive') as ContextoCompetitiveGame
    }

    public getCachedWord(gameId: number, word: string): GameWord | undefined {
        return this.cachedWords.get(`${gameId}-${word}`)
    }

    public cacheWord(gameId: number, word: GameWord) {
        this.cachedWords.set(`${gameId}-${word.word}`, word)
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
        const date = new Date()
        date.setDate(date.getDate() - (this.gameId % 10000))
        return date
    }

    public get guessCount(): number {
        return this.guesses.length
    }

    constructor(playerId: string, manager: ContextoManager, idOrDate?: string | Date) {

        this.manager = manager

        // TODO: Initialize game with id or date
        this.players = [playerId]

        this.gameId = getTodaysGameId()
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
        const cachedWord = this.manager.getCachedWord(this.gameId, word)
        if (cachedWord) {
            if (cachedWord.error) {
                const guess = {
                    word,
                    addedBy: playerId,
                    error: cachedWord.error
                }
                // this.addGuess(playerId, guess)
                // Cache the error guess for quick access next time
                this.manager.cacheWord(this.gameId, {
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
            this.manager.cacheWord(this.gameId, {
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
                    this.manager.cacheWord(this.gameId, {
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

    constructor(playerId: string, manager: ContextoManager, idOrDate?: string | Date) {
        this.gameId = getTodaysGameId()
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
        const cachedWord = this.manager.getCachedWord(this.gameId, word)
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
            this.manager.cacheWord(this.gameId, {
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
                    this.manager.cacheWord(this.gameId, { word, error: message })
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
}

const gameManager = new ContextoManager()

export default gameManager
export { ContextoDefaultGame, ContextoCompetitiveGame, ContextoManager }
