import { AxiosError } from 'axios'
import GameApi from './gameApi'
import { getTodaysGameId, halfTipDistance, nextTipDistance, randomTipDistance } from './utils/misc'
import { v4 as uuid } from 'uuid'
import { GameWord, Guess, IGame } from './interface'
import type { ContextoManager } from './ContextoManager'

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

export { ContextoDefaultGame }
