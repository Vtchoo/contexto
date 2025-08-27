import { AxiosError } from 'axios'
import { halfTipDistance } from './utils/misc'
import { GameState, GameWord, Guess, PlayerScore, GameRestorationOptions } from './interface'
import type { ContextoManager } from './ContextoManager'
import { ContextoBaseGame } from './ContextoBaseGame'

interface BattleRoyalePlayerProgress {
    playerId: string
    closestDistance: number
    closestWord: string
    guessCount: number
}

class ContextoBattleRoyaleGame extends ContextoBaseGame {
    private playerGuesses: Map<string, Guess[]> = new Map() // Individual player guesses
    private usedWords: Set<string> = new Set() // Global set of words used by any player
    private usedLemmas: Set<string> = new Set() // Global set of lemmas used by any player
    private pendingSubmissions = new Set<string>() // Track players currently submitting
    private submissionTimestamps = new Map<string, Date>() // Track submission order
    finished = false
    private winner: PlayerScore | null = null

    constructor(playerId: string, manager: ContextoManager, gameIdOrDate?: number | string | Date, restorationOptions?: GameRestorationOptions) {
        super(playerId, manager, gameIdOrDate, restorationOptions)
        
        // Battle Royale specific settings
        this.allowTips = true
        this.allowGiveUp = true
        
        // Restore guesses if provided, otherwise initialize empty for the first player
        if (restorationOptions?.initialGuesses) {
            this.playerGuesses = new Map(restorationOptions.initialGuesses)
            // Rebuild used words/lemmas from restored guesses
            for (const guesses of this.playerGuesses.values()) {
                for (const guess of guesses) {
                    this.usedWords.add(guess.word.toLowerCase())
                    if (guess.lemma) {
                        this.usedLemmas.add(guess.lemma.toLowerCase())
                    }
                }
            }
        } else if (!restorationOptions?.skipPlayerInit) {
            // Initialize empty guess array for the first player only if not skipping player init
            this.playerGuesses.set(playerId, [])
        }
        
        // Battle Royale games start unstarted unless restoration says otherwise
        this.started = restorationOptions?.started || false
    }

    // Override startGame from base class
    startGame(): void {
        super.startGame()
    }

    // Override addPlayer to initialize guess array
    addPlayer(playerId: string): void {
        super.addPlayer(playerId)
        // Initialize empty guess array for new player
        this.playerGuesses.set(playerId, [])
    }

    // Override removePlayer with battle royale specific logic
    removePlayer(playerId: string): void {
        super.removePlayer(playerId)
        // Remove player's guesses but keep used words in the global set
        this.playerGuesses.delete(playerId)
        
        // Clean up pending submissions and timestamps
        this.pendingSubmissions.delete(playerId)
        // Clean up any submission timestamps for this player
        for (const [key] of this.submissionTimestamps) {
            if (key.startsWith(`${playerId}-`)) {
                this.submissionTimestamps.delete(key)
            }
        }
        
        // If the winner left, clear the winner
        if (this.winner && this.winner.playerId === playerId) {
            this.winner = null
            this.finished = false
        }
        
        // If no players left, the game can be considered finished
        if (this.players.length === 0) {
            this.finished = true
        }
    }

    // Implement abstract method for tip calculation
    protected getGuessHistoryForTips(playerId: string): Array<[string, number]> {
        const playerGuesses = this.playerGuesses.get(playerId) || []
        return playerGuesses
            .filter(guess => !guess.error && guess.distance !== undefined)
            .map(guess => [guess.word, guess.distance!])
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
        
        // Add word and lemma to global used sets if it's a valid guess
        if (!guess.error) {
            this.usedWords.add(guess.word.toLowerCase())
            if (guess.lemma) {
                this.usedLemmas.add(guess.lemma.toLowerCase())
            }
        }
        
        // Notify manager for persistence
        this.notifyGuessAdded()
    }

    // Check if word/lemma has been used by any player
    isWordUsed(word: string, lemma?: string): boolean {
        const wordLower = word.toLowerCase()
        const lemmaLower = lemma?.toLowerCase()
        
        return this.usedWords.has(wordLower) || 
               (lemmaLower ? this.usedLemmas.has(lemmaLower) : false)
    }

    // Get existing guess from player's personal guesses
    getExistingGuess(word: string, playerId: string): Guess | undefined {
        const playerGuesses = this.playerGuesses.get(playerId) || []
        return playerGuesses.find(guess => guess.word === word || guess.lemma === word)
    }

    // Get player's current guess count - implement base class method
    getGuessCount(playerId?: string): number {
        if (playerId) {
            const playerGuesses = this.playerGuesses.get(playerId) || []
            return playerGuesses.filter(guess => !guess.error).length
        }
        // Legacy: total guesses across all players
        let totalGuesses = 0
        for (const guesses of this.playerGuesses.values()) {
            totalGuesses += guesses.filter(guess => !guess.error).length
        }
        return totalGuesses
    }

    // Get player's current guess count (alias for compatibility)
    getPlayerGuessCount(playerId: string): number {
        return this.getGuessCount(playerId)
    }

    // Legacy getter for compatibility
    get guessCount(): number {
        let totalGuesses = 0
        for (const guesses of this.playerGuesses.values()) {
            totalGuesses += guesses.filter(guess => !guess.error).length
        }
        return totalGuesses
    }

    // Atomic winner check using submission timestamp for fairness
    private checkAndSetWinner(playerId: string, word: string, submissionTime: Date): boolean {
        // Use winner as the atomic check - if it's already set, someone won
        if (this.winner !== null) {
            return false // Someone already won
        }
        
        // Check if there are any earlier submissions still pending
        // We need to ensure this is truly the FIRST submission to find the answer
        const submissionKey = `${playerId}-${word}`
        const currentSubmissionTime = this.submissionTimestamps.get(submissionKey)
        
        if (!currentSubmissionTime) {
            // This shouldn't happen, but safety check
            return false
        }
        
        // Check if any other pending submissions were made earlier
        for (const [key, timestamp] of this.submissionTimestamps) {
            if (key !== submissionKey && timestamp < currentSubmissionTime) {
                // There's an earlier submission still being processed
                // We need to wait and see if that one wins first
                return false
            }
        }
        
        // Get current guess count INCLUDING the winning guess that will be added
        const playerGuesses = this.playerGuesses.get(playerId) || []
        const correctGuessCount = playerGuesses.length + 1 // +1 for the winning guess about to be added
        
        // Atomic winner selection - set winner first as the lock
        this.winner = {
            playerId,
            guessCount: correctGuessCount,
            completedAt: currentSubmissionTime // Use actual submission time for fairness
        }
        this.finished = true
        
        return true
    }

    async tryWord(playerId: string, word: string): Promise<Guess> {
        // Capture submission timestamp immediately for fairness
        const submissionTime = new Date()
        const submissionKey = `${playerId}-${word}`
        
        // Atomic validation and submission registration
        if (this.finished) {
            throw new Error("The game has already finished")
        }
        
        if (!this.started) {
            throw new Error("The game has not started yet")
        }
        
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        // Check if player is already submitting a word to prevent concurrent submissions
        if (this.pendingSubmissions.has(playerId)) {
            throw new Error("Player is already submitting a word. Please wait.")
        }

        // Register this submission attempt with timestamp
        this.pendingSubmissions.add(playerId)
        this.submissionTimestamps.set(submissionKey, submissionTime)

        try {
            // Check in the cached words first to get lemma for word usage check
            const cachedWord = await this.manager.getCachedWord(this.gameId, word)
            let wordLemma = cachedWord?.lemma

            // If not cached, we need to make a temp API call to get the lemma for checking
            if (!cachedWord) {
                try {
                    const { data } = await this.gameApi.play(word)
                    wordLemma = data.lemma
                } catch (error) {
                    // If API call fails, we'll handle it below in the main logic
                }
            }

            // Check if this word (or its lemma) has been used by any player
            if (this.isWordUsed(word, wordLemma)) {
                const guess: Guess = {
                    word,
                    addedBy: playerId,
                    error: "Alguém já usou esta palavra"
                }
                // Don't add this to player's guesses since it's invalid
                return guess
            }

            let guess: Guess

            // Try to get from cache first using base class helper
            const cachedGuess = await this.processWordFromCache(playerId, word)
            if (cachedGuess) {
                guess = cachedGuess
            } else {
                // Get from API using base class helper
                guess = await this.processWordFromAPI(playerId, word)
            }

            // CRITICAL: Check if game finished while we were processing
            // In Battle Royale mode, only the first player to find the word should win
            if (this.finished) {
                // Game finished while we were processing - reject this guess
                throw new Error("Game finished while processing your guess. Someone else found the word first.")
            }

            // Check if this is a winning guess BEFORE adding to history
            const isWinningGuess = !guess.error && guess.distance === 0

            if (isWinningGuess) {
                // Attempt atomic winner determination BEFORE adding guess
                const wonGame = this.checkAndSetWinner(playerId, word, submissionTime)
                
                if (!wonGame) {
                    // Someone else already won - this should be treated as invalid
                    throw new Error("Game finished while processing your guess. Someone else found the word first.")
                }
            }

            // Only add the guess to history if we didn't lose the race
            this.addGuess(playerId, guess)
            
            return guess

        } finally {
            // Always clean up pending submission state
            this.pendingSubmissions.delete(playerId)
            this.submissionTimestamps.delete(submissionKey)
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

    // Get comprehensive ranking for all players
    private getAllPlayersRanking(): Array<{ playerId: string; guessCount: number; closestDistance?: number }> {
        return this.players.map(playerId => {
            const playerGuesses = this.playerGuesses.get(playerId) || []
            const validGuesses = playerGuesses.filter(guess => !guess.error)
            const closestDistance = validGuesses.reduce((min, guess) => {
                if (guess.distance !== undefined) {
                    if (min === undefined) return guess.distance
                    return Math.min(min, guess.distance)
                }
                return min
            }, undefined as number | undefined)
            
            return {
                playerId,
                guessCount: validGuesses.length,
                closestDistance
            }
        })
    }

    // Get all players' progress for Battle Royale ranking display
    getAllPlayersProgress(): BattleRoyalePlayerProgress[] {
        return this.players.map(playerId => {
            const playerGuesses = this.playerGuesses.get(playerId) || []
            const validGuesses = playerGuesses.filter(guess => !guess.error && guess.distance !== undefined)
            
            let closestDistance = 999999
            let closestWord = ""
            
            if (validGuesses.length > 0) {
                const closest = validGuesses.reduce((prev, current) => 
                    (current.distance! < prev.distance!) ? current : prev
                )
                closestDistance = closest.distance!
                closestWord = closest.word
            }
            
            return {
                playerId,
                closestDistance,
                closestWord,
                guessCount: validGuesses.length
            }
        }).sort((a, b) => a.closestDistance - b.closestDistance) // Sort by closest distance
    }

    // Get leaderboard for final results
    getLeaderboard(): BattleRoyalePlayerProgress[] {
        return this.getAllPlayersProgress()
    }

    // Get winner
    getWinner(): PlayerScore | null {
        return this.winner
    }

    // Check if the game can be started
    canStart(): boolean {
        return this.players.length > 0 && !this.started && !this.finished
    }

    // Override getTip for Battle Royale specific logic (avoiding used words)
    async getTip(playerId: string): Promise<{ word: string; distance: number; error?: string }> {
        if (!this.canUseTips()) {
            throw new Error("Tips are not allowed in this game")
        }

        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        if (this.finished) {
            throw new Error("The game has already finished")
        }

        try {
            // Get guess history for tip calculation using base class helper
            const guessHistory = this.getGuessHistoryForTips(playerId)
            
            // Calculate tip distance using the game's easy difficulty rule (default)
            const tipDist = halfTipDistance(guessHistory)
            
            // Keep trying to get a tip that hasn't been used yet
            let attempts = 0
            const maxAttempts = 10
            
            while (attempts < maxAttempts) {
                // First, check if we already have a word at this exact distance in cache
                const cachedWordAtDistance = await this.manager.getCachedWordByDistance(this.gameId, tipDist + attempts)
                
                if (cachedWordAtDistance && !this.isWordUsed(cachedWordAtDistance.word, cachedWordAtDistance.lemma)) {
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
                try {
                    const { data } = await this.gameApi.tip(tipDist + attempts)
                    
                    // Check if this word has been used
                    if (!this.isWordUsed(data.word, data.lemma)) {
                        // Add the tip word as a guess to the player's personal list
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
                    }
                } catch (apiError) {
                    // Continue to next attempt
                }
                
                attempts++
            }
            
            // If we couldn't find an unused tip after max attempts
            return {
                word: "",
                distance: -1,
                error: "Não foi possível encontrar uma dica não utilizada"
            }
        } catch (error) {
            return {
                word: "",
                distance: -1,
                error: "Não foi possível obter uma dica no momento"
            }
        }
    }

    // Give up and leave the game
    async giveUpAndLeave(playerId: string): Promise<{ success: boolean; error?: string }> {
        if (!this.players.includes(playerId)) {
            throw new Error(`Player ${playerId} is not in the game`)
        }

        this.removePlayer(playerId)
        return { success: true }
    }

    // Override giveUpAndGetAnswer for Battle Royale (using base class helper)
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
                
                // Cache the answer normally
                await this.manager.cacheWord(this.gameId, {
                    word: data.word,
                    lemma: data.lemma,
                    distance: 0
                })
            }
            
            // End the game
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

    // Get the game word for displaying in broadcasts
    async getGameWord(): Promise<{ word: string; lemma?: string } | null> {
        try {
            // Check if we already have the answer (word with distance 0) in cache
            const cachedAnswer = await this.manager.getCachedWordByDistance(this.gameId, 0)
            
            if (cachedAnswer) {
                return {
                    word: cachedAnswer.word,
                    lemma: cachedAnswer.lemma
                }
            }
            
            // If not cached, fetch from API
            const { data } = await this.gameApi.giveUp()
            
            // Cache the answer
            await this.manager.cacheWord(this.gameId, {
                word: data.word,
                lemma: data.lemma,
                distance: 0
            })
            
            return {
                word: data.word,
                lemma: data.lemma
            }
        } catch (error) {
            return null
        }
    }

    getCurrentGameState(playerId: string): GameState {
        
        const playerGuesses = this.playerGuesses.get(playerId) || []
        const otherPlayersGuesses = Object.entries(this.playerGuesses)
            .filter(([id]) => id !== playerId)
            .map(([id, guesses]) => guesses || [])
            .flat()
            .filter(guess => guess !== null) // Filter out null guesses
            .map(guess => ({
                word: "",
                distance: guess?.distance,
                addedBy: guess?.addedBy || "",
                error: guess?.error,
                hidden: true,
            } as Guess))
        
        const guesses = [...playerGuesses, ...otherPlayersGuesses].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))

        // Use the comprehensive ranking method for consistency
        const ranking = this.getAllPlayersRanking()

        return {
            id: this.id,
            started: this.started,
            finished: this.finished,
            players: this.players,
            guesses: guesses,
            ranking: ranking
        }
    }
}

export { ContextoBattleRoyaleGame, type BattleRoyalePlayerProgress }
