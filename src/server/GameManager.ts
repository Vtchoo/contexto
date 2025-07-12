import { ContextoDefaultGame } from '../game/ContextoDefaultGame'
import { ContextoCompetitiveGame } from '../game/ContextoCompetitiveGame'
import { ContextoBattleRoyaleGame } from '../game/ContextoBattleRoyaleGame'
import { ContextoStopGame } from '../game/ContextoStopGame'
import { ContextoManager } from '../game/ContextoManager'
import snowflakeGenerator from '../utils/snowflake'

export type Game = ContextoDefaultGame | ContextoCompetitiveGame | ContextoBattleRoyaleGame | ContextoStopGame

export class GameManager {
  private games = new Map<string, Game>()
  private contextoManager: ContextoManager

  constructor() {
    // Initialize a shared ContextoManager for web server games
    this.contextoManager = new ContextoManager()
  }

  getContextoManager(): ContextoManager {
    return this.contextoManager
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

    // Note: Player cleanup is handled by individual game objects
    // when they are removed from the games map
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

    // Use ContextoManager to track the player's current game
    // This enforces one-game-per-user rule
    const currentGame = this.contextoManager.getCurrentPlayerGame(userId)
    if (currentGame) {
      this.contextoManager.leaveCurrentGame(userId)
    }
    
    // Set the player's current game in ContextoManager
    // Note: We manually update the playerGames mapping since we're managing games externally
    (this.contextoManager as any).playerGames.set(userId, roomId)
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

    // Use ContextoManager to handle player removal
    this.contextoManager.leaveCurrentGame(userId)
  }

  getUserGames(userId: string): Game[] {
    // Use ContextoManager to get the user's current game
    const currentGame = this.contextoManager.getCurrentPlayerGame(userId)
    if (currentGame) {
      // Return the game wrapped in an array to maintain the interface
      return [currentGame]
    }
    return []
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
      totalUsers: (this.contextoManager as any).playerGames.size
    }
  }
}
