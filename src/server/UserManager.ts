import { User } from './User'
import snowflakeGenerator from '../utils/snowflake'

export class UserManager {
  private users = new Map<string, User>()
  private usersByUsername = new Map<string, User>()

  createUser(token: string, username?: string): User {
    if (this.users.has(token)) {
      return this.users.get(token)!
    }

    const user = new User(token, username)
    this.users.set(token, user)
    
    if (username) {
      this.usersByUsername.set(username, user)
    }

    return user
  }

  getUser(token: string): User | null {
    return this.users.get(token) || null
  }

  getUserByUsername(username: string): User | null {
    return this.usersByUsername.get(username) || null
  }

  setUsername(token: string, username: string): boolean {
    const user = this.users.get(token)
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

  updateUserActivity(token: string): void {
    const user = this.users.get(token)
    if (user) {
      user.updateActivity()
    }
  }

  // Cleanup inactive users (not accessed for 7 days)
  cleanupInactiveUsers(): number {
    const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
    let removedCount = 0

    for (const [token, user] of this.users) {
      if (user.lastActivity < sevenDaysAgo) {
        if (user.username) {
          this.usersByUsername.delete(user.username)
        }
        this.users.delete(token)
        removedCount++
      }
    }

    return removedCount
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
