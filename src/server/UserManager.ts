import { User } from './User'
import snowflakeGenerator from '../utils/snowflake'
import JWTService from '../utils/jwt'
import { GameManager } from './GameManager'

export class UserManager {
  private users = new Map<string, User>() // Maps user ID to User
  private usersByUsername = new Map<string, User>()
  private gameManager: GameManager

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager
  }

  createUser(token?: string, username?: string): { user: User, token: string } {
    // Generate a unique user ID
    const userId = snowflakeGenerator.generate()
    
    // Generate JWT token with user ID
    const jwtToken = token || JWTService.generateToken(userId)

    const user = new User(userId, username)
    
    // Store user by ID only
    this.users.set(userId, user)
    
    if (username) {
      this.usersByUsername.set(username, user)
    }

    return { user, token: jwtToken }
  }

  // Helper method to get user by JWT token
  private getUserIdFromToken(token: string): string | null {
    const payload = JWTService.verifyToken(token)
    return payload ? payload.userId : null
  }

  getUserById(userId: string): User | null {
    return this.users.get(userId) || null
  }

  // Room management methods
  joinUserToRoom(userId: string, roomId: string): void {
    this.gameManager.addUserToGame(userId, roomId)
  }

  removeUserFromRoom(userId: string): void {
    // Get current room first
    const currentRoom = this.getUserCurrentRoom(userId)
    if (currentRoom) {
      this.gameManager.removeUserFromGame(userId, currentRoom)
    }
  }

  getUserCurrentRoom(userId: string): string | null {
    // Get the user's games and return the first one (users should only be in one room at a time)
    const games = this.gameManager.getUserGames(userId)
    return games.length > 0 ? games[0].id : null
  }

  getUserByUsername(username: string): User | null {
    return this.usersByUsername.get(username) || null
  }

  setUsername(tokenOrId: string, username: string): boolean {
    // Try to get user by ID first, then by parsing token
    let user = this.getUserById(tokenOrId)
    if (!user) {
      const userId = this.getUserIdFromToken(tokenOrId)
      if (userId) {
        user = this.getUserById(userId)
      }
    }
    
    if (!user) return false

    // Check if username is already taken
    if (this.usersByUsername.has(username)) {
      return false
    }

    // Remove old username mapping if exists
    if (user.username) {
      this.usersByUsername.delete(user.username)
    }

    // Set new username
    user.setUsername(username)
    this.usersByUsername.set(username, user)

    return true
  }

  isUsernameTaken(username: string): boolean {
    return this.usersByUsername.has(username)
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values())
  }

  getActiveUsersCount(): number {
    return Array.from(this.users.values()).filter(user => user.isActive()).length
  }

  updateUserActivity(tokenOrId: string): void {
    // Try to get user by ID first, then by parsing token
    let user = this.getUserById(tokenOrId)
    if (!user) {
      const userId = this.getUserIdFromToken(tokenOrId)
      if (userId) {
        user = this.getUserById(userId)
      }
    }
    
    if (user) {
      user.updateActivity()
    }
  }

  // Cleanup inactive users (not accessed for 7 days)
  cleanupInactiveUsers(): number {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    let removedCount = 0

    for (const [userId, user] of this.users) {
      if (user.lastActivity < sevenDaysAgo) {
        if (user.username) {
          this.usersByUsername.delete(user.username)
        }
        // Clean up room mapping by removing user from all games
        this.removeUserFromRoom(userId)
        this.users.delete(userId)
        removedCount++
      }
    }

    return removedCount
  }

  // Verify and refresh JWT tokens
  verifyAndRefreshToken(token: string): { user: User | null; newToken?: string } {
    const payload = JWTService.verifyToken(token)
    if (!payload) {
      return { user: null }
    }

    const user = this.getUserById(payload.userId)
    if (!user) {
      return { user: null }
    }

    // Check if token needs refresh
    const newToken = JWTService.refreshTokenIfNeeded(token)
    if (newToken && newToken !== token) {
      // Token was refreshed
      return { user, newToken }
    }

    return { user }
  }

  // Generate anonymous username
  generateAnonymousUsername(): string {
    const adjectives = [
      'Quick', 'Smart', 'Fast', 'Cool', 'Epic', 'Bold', 'Wild', 'Wise',
      'Brave', 'Sharp', 'Swift', 'Clever', 'Bright', 'Strong', 'Lucky'
    ]
    
    const nouns = [
      'Player', 'Gamer', 'Hunter', 'Master', 'Champion', 'Warrior', 'Hero',
      'Scout', 'Ninja', 'Agent', 'Phoenix', 'Wolf', 'Eagle', 'Fox', 'Tiger'
    ]

    let username: string
    let attempts = 0
    
    do {
      const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
      const noun = nouns[Math.floor(Math.random() * nouns.length)]
      const number = Math.floor(Math.random() * 1000)
      
      username = `${adjective}${noun}${number}`
      attempts++
    } while (this.isUsernameTaken(username) && attempts < 10)

    // If still taken after 10 attempts, add snowflake
    if (this.isUsernameTaken(username)) {
      username = `Player${snowflakeGenerator.generate()}`
    }

    return username
  }
}
