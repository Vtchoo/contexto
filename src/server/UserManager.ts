import { Player } from '../models/Player'
import { getPlayerRepository } from '../repositories/PlayersRepository'
import snowflakeGenerator from '../utils/snowflake'
import JWTService from '../utils/jwt'
import { GameManager } from './GameManager'

export class UserManager {
  private users = new Map<string, Player>() // In-memory cache for active users
  private usersByUsername = new Map<string, Player>() // Cache for username lookups
  private gameManager: GameManager
  private userRepository = getPlayerRepository()

  constructor(gameManager: GameManager) {
    this.gameManager = gameManager
  }

  async createUser(token?: string, username?: string): Promise<{ user: Player, token: string }> {
    // Generate a unique user ID
    const userId = snowflakeGenerator.generate()
    
    // Generate JWT token with user ID
    const jwtToken = token || JWTService.generateToken(userId)

    const user = new Player(userId, username)
    
    try {
      // Save user to database
      await this.userRepository.save(user)
      
      // Store user in memory cache
      this.users.set(userId, user)
      
      if (username) {
        this.usersByUsername.set(username, user)
      }

      return { user, token: jwtToken }
    } catch (error) {
      console.error('Failed to create user in database:', error)
      // Fallback to memory-only storage
      this.users.set(userId, user)
      if (username) {
        this.usersByUsername.set(username, user)
      }
      return { user, token: jwtToken }
    }
  }

  // Helper method to get user by JWT token
  private getUserIdFromToken(token: string): string | null {
    const payload = JWTService.verifyToken(token)
    return payload ? payload.userId : null
  }

  async getUserById(userId: string): Promise<Player | null> {
    // Check memory cache first
    let user = this.users.get(userId)
    if (user) {
      return user
    }

    // Try to load from database
    try {
      const dbUser = await this.userRepository.findOne({ where: { id: userId } })
      if (dbUser) {
        user = dbUser
        // Cache in memory for future access
        this.users.set(userId, user)
        if (user.username) {
          this.usersByUsername.set(user.username, user)
        }
        return user
      }
    } catch (error) {
      console.error('Failed to load user from database:', error)
    }

    return null
  }

  // Room management methods
  joinUserToRoom(userId: string, roomId: string): void {
    this.gameManager.joinGame(userId, roomId)
  }

  removeUserFromRoom(userId: string): void {
    // Get current game first
    const currentGame = this.gameManager.getContextoManager().getCurrentPlayerGame(userId)
    if (currentGame) {
      this.gameManager.removeUserFromGame(userId, currentGame.id)
    }
  }

  getUserCurrentRoom(userId: string): string | null {
    // Use ContextoManager to get the user's current game and return its ID
    const currentGame = this.gameManager.getContextoManager().getCurrentPlayerGame(userId)
    return currentGame ? currentGame.id : null
  }

  async getUserByUsername(username: string): Promise<Player | null> {
    // Check memory cache first
    let user = this.usersByUsername.get(username)
    if (user) {
      return user
    }

    // Try to load from database
    try {
      const dbUser = await this.userRepository.findOne({ where: { username } })
      if (dbUser) {
        user = dbUser
        // Cache in memory for future access
        this.users.set(user.id, user)
        this.usersByUsername.set(username, user)
        return user
      }
    } catch (error) {
      console.error('Failed to load user by username from database:', error)
    }

    return null
  }

  async updatePlayer(id: string, data: Partial<Player>): Promise<boolean> {
    // Try to get user by ID first, then by parsing token
    const player = await this.getUserById(id)
    
    if (!player) return false

    // Update user fields
    Object.assign(player, data)

    // Update memory cache
    this.users.set(player.id, player)
    if (player.username) {
      this.usersByUsername.set(player.username, player)
    }

    // Save to database
    try {
      await this.userRepository.save(player)
    } catch (error) {
      console.error('Failed to save user to database:', error)
    }

    return true
  }

  async isUsernameTaken(username: string): Promise<boolean> {
    const user = await this.getUserByUsername(username)
    return user !== null
  }

  async getAllUsers(): Promise<Player[]> {
    try {
      // Get all users from database
      const dbUsers = await this.userRepository.find()
      
      // Update memory cache with fresh data
      this.users.clear()
      this.usersByUsername.clear()
      
      for (const user of dbUsers) {
        this.users.set(user.id, user)
        if (user.username) {
          this.usersByUsername.set(user.username, user)
        }
      }
      
      return dbUsers
    } catch (error) {
      console.error('Failed to load users from database:', error)
      // Fallback to memory cache
      return Array.from(this.users.values())
    }
  }

  async getActiveUsersCount(): Promise<number> {
    const users = await this.getAllUsers()
    return users.filter(user => user.isActive()).length
  }

  async updateUserActivity(tokenOrId: string): Promise<void> {
    // Try to get user by ID first, then by parsing token
    let user = await this.getUserById(tokenOrId)
    if (!user) {
      const userId = this.getUserIdFromToken(tokenOrId)
      if (userId) {
        user = await this.getUserById(userId)
      }
    }
    
    if (user) {
      user.updateActivity()
      try {
        await this.userRepository.save(user)
      } catch (error) {
        console.error('Failed to save user activity to database:', error)
      }
    }
  }

  // Cleanup inactive users (not accessed for 7 days)
  async cleanupInactiveUsers(): Promise<number> {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    let removedCount = 0

    try {
      // Delete from database
      const result = await this.userRepository
        .createQueryBuilder()
        .delete()
        .from(Player)
        .where("last_activity < :sevenDaysAgo", { sevenDaysAgo })
        .execute()
      
      removedCount = result.affected || 0

      // Clean up memory cache
      for (const [userId, user] of this.users) {
        if (user.lastActivity < sevenDaysAgo) {
          if (user.username) {
            this.usersByUsername.delete(user.username)
          }
          // Clean up room mapping by removing user from all games
          this.removeUserFromRoom(userId)
          this.users.delete(userId)
        }
      }
    } catch (error) {
      console.error('Failed to cleanup inactive users from database:', error)
      // Fallback to memory-only cleanup
      for (const [userId, user] of this.users) {
        if (user.lastActivity < sevenDaysAgo) {
          if (user.username) {
            this.usersByUsername.delete(user.username)
          }
          this.removeUserFromRoom(userId)
          this.users.delete(userId)
          removedCount++
        }
      }
    }

    return removedCount
  }

  // Verify and refresh JWT tokens
  async verifyAndRefreshToken(token: string): Promise<{ user: Player | null; newToken?: string }> {
    const payload = JWTService.verifyToken(token)
    if (!payload) {
      return { user: null }
    }

    const user = await this.getUserById(payload.userId)
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
  async generateAnonymousUsername(): Promise<string> {
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
    } while ((await this.isUsernameTaken(username)) && attempts < 10)

    // If still taken after 10 attempts, add snowflake
    if (await this.isUsernameTaken(username)) {
      username = `Player${snowflakeGenerator.generate()}`
    }

    return username
  }
}
