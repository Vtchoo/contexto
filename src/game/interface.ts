export interface GameWord {
    word: string
    lemma?: string
    distance?: number
    error?: string // Error message if the word was invalid
}

export interface Guess {
    word: string
    lemma?: string
    distance?: number
    addedBy: string
    error?: string // Error message if the guess was invalid
}

export interface IGame {
    gameId: number
    // players: string[]
    // guesses: GameWord[]
    finished: boolean

    addPlayer(playerId: string): void
    removePlayer(playerId: string): void
    addGuess(playerId: string, guess: GameWord): void
    tryWord(playerId: string, word: string): Promise<GameWord>
    getClosestGuesses(playerId: string, count?: number): GameWord[]
    startGame(): void
    isHost(playerId: string): boolean
}

export interface PlayerScore {
    playerId: string
    guessCount: number
    completedAt: Date
}
