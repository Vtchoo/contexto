export class User {
  public id: string
  public username: string | null
  public lastActivity: number
  public gamesPlayed: number
  public gamesWon: number
  public averageGuesses: number

  constructor(id: string, username?: string) {
    this.id = id
    this.username = username || null
    this.lastActivity = Date.now()
    this.gamesPlayed = 0
    this.gamesWon = 0
    this.averageGuesses = 0
  }

  setUsername(username: string): void {
    this.username = username
    this.updateActivity()
  }

  updateActivity(): void {
    this.lastActivity = Date.now()
  }

  isActive(): boolean {
    // Consider user active if accessed in last 24 hours
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000)
    return this.lastActivity > oneDayAgo
  }

  incrementGamesPlayed(): void {
    this.gamesPlayed++
    this.updateActivity()
  }

  incrementGamesWon(): void {
    this.gamesWon++
    this.updateActivity()
  }

  updateAverageGuesses(guesses: number): void {
    if (this.gamesPlayed === 0) {
      this.averageGuesses = guesses
    } else {
      this.averageGuesses = ((this.averageGuesses * (this.gamesPlayed - 1)) + guesses) / this.gamesPlayed
    }
    this.updateActivity()
  }

  getWinRate(): number {
    if (this.gamesPlayed === 0) return 0
    return (this.gamesWon / this.gamesPlayed) * 100
  }

  getStats() {
    return {
      id: this.id,
      username: this.username,
      gamesPlayed: this.gamesPlayed,
      gamesWon: this.gamesWon,
      winRate: this.getWinRate(),
      averageGuesses: Math.round(this.averageGuesses * 100) / 100,
      isActive: this.isActive(),
      lastActivity: this.lastActivity
    }
  }

  toJSON() {
    return {
      id: this.id,
      username: this.username,
      gamesPlayed: this.gamesPlayed,
      gamesWon: this.gamesWon,
      winRate: this.getWinRate(),
      averageGuesses: Math.round(this.averageGuesses * 100) / 100,
      isActive: this.isActive()
    }
  }
}
