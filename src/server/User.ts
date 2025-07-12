export class User {
  public id: string
  public token: string
  public username: string | null
  public lastActivity: number
  public gamesPlayed: number
  public gamesWon: number
  public averageGuesses: number
  public currentRoom: string | null

  constructor(id: string, token: string, username?: string) {
    this.id = id
    this.token = token
    this.username = username || null
    this.lastActivity = Date.now()
    this.gamesPlayed = 0
    this.gamesWon = 0
    this.averageGuesses = 0
    this.currentRoom = null
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

  joinRoom(roomId: string): void {
    this.currentRoom = roomId
    this.updateActivity()
  }

  leaveRoom(): void {
    this.currentRoom = null
    this.updateActivity()
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
      token: this.token,
      username: this.username,
      gamesPlayed: this.gamesPlayed,
      gamesWon: this.gamesWon,
      winRate: this.getWinRate(),
      averageGuesses: Math.round(this.averageGuesses * 100) / 100,
      currentRoom: this.currentRoom,
      isActive: this.isActive(),
      lastActivity: this.lastActivity
    }
  }

  toJSON() {
    return {
      id: this.id,
      token: this.token,
      username: this.username,
      gamesPlayed: this.gamesPlayed,
      gamesWon: this.gamesWon,
      winRate: this.getWinRate(),
      averageGuesses: Math.round(this.averageGuesses * 100) / 100,
      currentRoom: this.currentRoom,
      isActive: this.isActive()
    }
  }
}
