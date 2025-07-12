import { AxiosError } from 'axios'
import GameApi from './gameApi'
import { getTodaysGameId, halfTipDistance } from './utils/misc'
import snowflakeGenerator from '../utils/snowflake'
import { GameWord, Guess, IGame } from './interface'
import type { ContextoManager } from './ContextoManager'

abstract class ContextoBaseGame implements IGame {
    protected readonly manager: ContextoManager
    protected readonly gameApi: ReturnType<typeof GameApi>

    public readonly id = snowflakeGenerator.generate()
    public readonly gameId: number

    public players: string[] = []
    
    allowTips = true
    allowGiveUp = true
    started = false
    abstract finished: boolean

    constructor(playerId: string, manager: ContextoManager, gameIdOrDate?: number | string | Date) {
        this.manager = manager
        this.players.push(playerId)

        // Initialize game with specific id, date, or use today's game
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
        
        this.gameApi = GameApi('pt-br', this.gameId)
    }

    // Computed property for game date
    public get gameDate(): Date {
        const today = new Date()
        const todaysGameId = getTodaysGameId()
        const daysDiff = todaysGameId - this.gameId
        const gameDate = new Date(today)
        gameDate.setDate(gameDate.getDate() - daysDiff)
        return gameDate
    }

    startGame(): void {
        if (this.started) {
            throw new Error(`Game ${this.id} has already started`)
        }
        this.started = true
    }

    addPlayer(playerId: string): void {
        if (this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is already in the game`)
        }
        this.players.push(playerId)
    }

    removePlayer(playerId: string): void {
        const index = this.players.indexOf(playerId)
        if (index === -1) {
            throw new Error(`Player ${playerId} is not in the game`)
        }
        this.players.splice(index, 1)
    }

    // Get the number of players in the game
    getPlayerCount(): number {
        return this.players.length
    }

    // Check if a player is the host (first player who created the room)
    isHost(playerId: string): boolean {
        return this.players.length > 0 && this.players[0] === playerId
    }

    // Check if the game allows tips
    canUseTips(): boolean {
        return this.allowTips
    }

    // Check if the game allows giving up
    canGiveUp(): boolean {
        return this.allowGiveUp
    }

    // Protected helper method for common word validation and caching
    protected async processWordFromCache(playerId: string, word: string): Promise<Guess | null> {
        // Check in the cached words first
        const cachedWord = await this.manager.getCachedWord(this.gameId, word)
        if (cachedWord) {
            if (cachedWord.error) {
                const guess: Guess = {
                    word,
                    addedBy: playerId,
                    error: cachedWord.error
                }
                // Cache the error guess for quick access next time
                await this.manager.cacheWord(this.gameId, {
                    word,
                    error: cachedWord.error
                })
                return guess
            }

            const guess: Guess = {
                word,
                lemma: cachedWord.lemma,
                distance: cachedWord.distance,
                addedBy: playerId
            }
            return guess
        }
        return null
    }

    // Protected helper method for API word processing
    protected async processWordFromAPI(playerId: string, word: string): Promise<Guess> {
        try {
            const { data } = await this.gameApi.play(word)
            const guess: Guess = {
                word,
                lemma: data.lemma,
                distance: data.distance,
                addedBy: playerId
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
                    // Cache the error guess for quick access next time
                    await this.manager.cacheWord(this.gameId, {
                        word,
                        error: message
                    })
                    return guess
                }
            }
            throw new Error(`Failed to play word "${word}": ${error.message}`)
        }
    }

    // Protected helper method for tip processing
    protected async processTipRequest(playerId: string, tipDistance: number): Promise<{ word: string; distance: number; error?: string }> {
        try {
            // First, check if we already have a word at this exact distance in cache
            const cachedWordAtDistance = await this.manager.getCachedWordByDistance(this.gameId, tipDistance)
            
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
            const { data } = await this.gameApi.tip(tipDistance)
            
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

    // Basic implementation - can be overridden in child classes
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

        // Get guess history for tip calculation - each game type implements this differently
        const guessHistory = this.getGuessHistoryForTips(playerId)
        const tipDistance = halfTipDistance(guessHistory)
        
        return this.processTipRequest(playerId, tipDistance)
    }

    // Get answer helper - common logic
    protected async getAnswerFromAPI(): Promise<string> {
        // Check if we already have the answer (word with distance 0) in cache
        const cachedAnswer = await this.manager.getCachedWordByDistance(this.gameId, 0)
        
        if (cachedAnswer) {
            return cachedAnswer.word
        } else {
            // Fetch from API and cache normally
            const { data } = await this.gameApi.giveUp()
            
            // Cache the answer normally
            await this.manager.cacheWord(this.gameId, {
                word: data.word,
                lemma: data.lemma,
                distance: 0
            })
            return data.word
        }
    }

    // Basic give up implementation - can be overridden
    async giveUpAndGetAnswer(): Promise<{ word: string; error?: string }> {
        if (!this.canGiveUp()) {
            throw new Error("Give up is not allowed in this game")
        }

        if (this.finished) {
            throw new Error("Game is already finished")
        }

        try {
            const answerWord = await this.getAnswerFromAPI()
            return { word: answerWord }
        } catch (error) {
            return {
                word: "",
                error: "Não foi possível obter a resposta no momento"
            }
        }
    }

    // Abstract methods that must be implemented by each game type
    abstract addGuess(playerId: string, guess: Guess): void
    abstract tryWord(playerId: string, word: string): Promise<Guess>
    abstract getClosestGuesses(playerId: string, count?: number): GameWord[]
    abstract getGuessCount(playerId?: string): number
    
    // Helper method for tip calculation - each game implements differently
    protected abstract getGuessHistoryForTips(playerId: string): Array<[string, number]>
}

export { ContextoBaseGame }
