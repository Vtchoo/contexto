import { AxiosError } from 'axios'
import GameApi from './gameApi'
import { getTodaysGameId } from './utils/misc'
import { v4 as uuid } from 'uuid'
import { GameWord, Guess, IGame } from './interface'

class ContextoManager {

    games: Map<string, ContextoDefaultGame> = new Map()
    private playerGames: Map<string, string> = new Map() // playerId -> gameId , used to track which game a player is currently playing

    private cachedWords: Map<string, GameWord> = new Map() // gameId + word -> guesses, used to cache guesses for quick access and avoid unnecessary API calls

    public getCurrentOrCreateGame(playerId: string) {
        let game = this.getCurrentPlayerGame(playerId)
        let justStarted = false
        if (!game) {
            game = this.createNewGame(playerId)
            justStarted = true
        }
        return [game, justStarted] as const
    }

    public getCurrentPlayerGame(playerId: string): ContextoDefaultGame | undefined {
        const gameId = this.playerGames.get(playerId)
        if (gameId) {
            return this.games.get(gameId)
        }
        return undefined
    }

    public createNewGame(playerId: string) {
        const game = new ContextoDefaultGame(playerId, this)
        this.games.set(game.id, game)
        this.playerGames.set(playerId, game.id)
        return game
    }

    public getCachedWord(gameId: number, word: string): GameWord | undefined {
        return this.cachedWords.get(`${gameId}-${word}`)
    }

    public cacheWord(gameId: number, word: GameWord) {
        this.cachedWords.set(`${gameId}-${word.word}`, word)
    }

    public leaveCurrentGame(playerId: string) {
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
}

class ContextoCompetitiveGame implements IGame {

    private readonly manager: ContextoManager
    private readonly gameApi: ReturnType<typeof GameApi>

    gameId: number
    players: string[] = []
    guesses: Guess[] = []
    finished = false

    allowTips = true
    allowGiveUp = true

    started = false

    constructor(playerId: string, manager: ContextoManager, idOrDate?: string | Date) {
        this.gameId = getTodaysGameId()
        this.players.push(playerId)
        this.manager = manager
        this.gameApi = GameApi('pt-br', this.gameId)
    }

    startGame() {
        this.started = true
    }

    addPlayer(playerId: string) {
        if (this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is already in the game`)
        }
        this.players.push(playerId)
    }

    removePlayer(playerId: string) {
        const index = this.players.indexOf(playerId)
        if (index === -1) {
            throw new Error(`Player ${playerId} is not in the game`)
        }
        this.players.splice(index, 1)
        if (this.players.length === 0) {
            this.finished = true
        }
    }

    addGuess(playerId: string, guess: Guess) {
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }
        this.guesses.push(guess)
    }

    async tryWord(playerId: string, word: string): Promise<Guess> {
        if (this.finished) {
            throw new Error(`Game ${this.gameId} is already finished`)
        }

        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
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

            if (data.distance === 0) {
                this.finished = true // Mark the game as finished if the guess is correct
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
        // show only guesses made by the player
        return this.guesses
            .filter(guess => !guess.error) // Filter out invalid guesses
            .filter(guess => guess.addedBy === playerId) // Filter by player
            .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0)) // Sort by distance
            .slice(0, count ?? 10) // Limit to the closest guesses
    }
}

const gameManager = new ContextoManager()

export default gameManager
