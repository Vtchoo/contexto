import { ContextoDefaultGame } from '../game/ContextoDefaultGame'
import { ContextoCompetitiveGame } from '../game/ContextoCompetitiveGame'
import { ContextoBattleRoyaleGame } from '../game/ContextoBattleRoyaleGame'
import { ContextoStopGame } from '../game/ContextoStopGame'
import { ContextoManager } from '../game/ContextoManager'
import snowflakeGenerator from '../utils/snowflake'

export type Game = ContextoDefaultGame | ContextoCompetitiveGame | ContextoBattleRoyaleGame | ContextoStopGame

export class GameManager {
  private games = new Map<string, Game>()
  private gamesByUser = new Map<string, Set<string>>()
  private contextoManager: ContextoManager

  constructor() {
    // Initialize a shared ContextoManager for web server games
    this.contextoManager = new ContextoManager()
  }

  createGame(type: 'default' | 'competitive' | 'battle-royale' | 'stop', userId: string, word?: string | number | Date): string {
    // const roomId = snowflakeGenerator.generate()
    let game: Game

    switch (type) {
      case 'competitive':
        game = new ContextoCompetitiveGame(userId, this.contextoManager, word)
        break
      case 'battle-royale':
        game = new ContextoBattleRoyaleGame(userId, this.contextoManager, word)
        break
      case 'stop':
        game = new ContextoStopGame(userId, this.contextoManager, word)
        break
      default:
        game = new ContextoDefaultGame(userId, this.contextoManager, word)
        break
    }

    // // Replace the auto-generated ID with our custom room ID
    // Object.defineProperty(game, 'id', { value: roomId, writable: false })

    this.games.set(game.id, game)
    this.addUserToGame(userId, game.id)
    return game.id
  }

  getGame(roomId: string): Game | null {
    return this.games.get(roomId) || null
  }

  deleteGame(roomId: string): boolean {
    const game = this.games.get(roomId)
    if (!game) return false

    // Remove from user mappings
    for (const [userId, gameIds] of this.gamesByUser) {
      gameIds.delete(roomId)
      if (gameIds.size === 0) {
        this.gamesByUser.delete(userId)
      }
    }

    return this.games.delete(roomId)
  }

  addUserToGame(userId: string, roomId: string): void {
    const game = this.games.get(roomId)
    if (game) {
      try {
        game.addPlayer(userId)
      } catch (error) {
        // Player might already be in the game, that's okay
      }
    }

    if (!this.gamesByUser.has(userId)) {
      this.gamesByUser.set(userId, new Set())
    }
    this.gamesByUser.get(userId)!.add(roomId)
  }

  removeUserFromGame(userId: string, roomId: string): void {
    const game = this.games.get(roomId)
    if (game) {
      try {
        game.removePlayer(userId)
      } catch (error) {
        // Player might not be in the game, that's okay
      }
    }

    const userGames = this.gamesByUser.get(userId)
    if (userGames) {
      userGames.delete(roomId)
      if (userGames.size === 0) {
        this.gamesByUser.delete(userId)
      }
    }
  }

  getUserGames(userId: string): Game[] {
    const gameIds = this.gamesByUser.get(userId)
    if (!gameIds) return []

    return Array.from(gameIds)
      .map(id => this.games.get(id))
      .filter((game): game is Game => game !== undefined)
  }

  getAllGames(): Game[] {
    return Array.from(this.games.values())
  }

  getActiveGames(): Game[] {
    return this.getAllGames().filter(game => !game.finished)
  }

  getActiveRoomsCount(): number {
    return this.getActiveGames().length
  }

  // Cleanup finished games older than 1 hour
  cleanupOldGames(): number {
    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    let removedCount = 0

    for (const [roomId, game] of this.games) {
      if (game.finished) {
        // Check if game is old enough to remove
        const gameCreationTime = snowflakeGenerator.extractTimestamp(roomId)
        if (gameCreationTime.getTime() < oneHourAgo) {
          this.deleteGame(roomId)
          removedCount++
        }
      }
    }

    return removedCount
  }

  // Get game stats
  getStats() {
    const allGames = this.getAllGames()
    const activeGames = this.getActiveGames()

    const gameTypes = {
      default: 0,
      competitive: 0,
      battleRoyale: 0,
      stop: 0
    }

    for (const game of allGames) {
      if (game instanceof ContextoBattleRoyaleGame) {
        gameTypes.battleRoyale++
      } else if (game instanceof ContextoCompetitiveGame) {
        gameTypes.competitive++
      } else if (game instanceof ContextoStopGame) {
        gameTypes.stop++
      } else {
        gameTypes.default++
      }
    }

    return {
      totalGames: allGames.length,
      activeGames: activeGames.length,
      gameTypes,
      totalUsers: this.gamesByUser.size
    }
  }
}
