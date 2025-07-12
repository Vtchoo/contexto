import { ContextoDefaultGame } from '../game/ContextoDefaultGame'
import { ContextoCompetitiveGame } from '../game/ContextoCompetitiveGame'
import { ContextoBattleRoyaleGame } from '../game/ContextoBattleRoyaleGame'
import { ContextoStopGame } from '../game/ContextoStopGame'
import { ContextoManager } from '../game/ContextoManager'
import snowflakeGenerator from '../utils/snowflake'

export type Game = ContextoDefaultGame | ContextoCompetitiveGame | ContextoBattleRoyaleGame | ContextoStopGame

export class GameManager {
  private contextoManager: ContextoManager

  constructor() {
    // Initialize a shared ContextoManager for web server games
    this.contextoManager = new ContextoManager()
  }

  getContextoManager(): ContextoManager {
    return this.contextoManager
  }

  createGame(type: 'default' | 'competitive' | 'battle-royale' | 'stop', userId: string, gameIdOrDate?: number | Date): string {
    // Use ContextoManager to create the game directly
    const game = this.contextoManager.createNewGame(userId, type, gameIdOrDate)
    return game.id
  }

  getGame(roomId: string): Game | null {
    const gameInfo = this.contextoManager.getGameInfo(roomId)
    return gameInfo.exists ? gameInfo.game : null
  }

  deleteGame(roomId: string): boolean {
    const gameInfo = this.contextoManager.getGameInfo(roomId)
    if (!gameInfo.exists) return false

    // Note: ContextoManager doesn't have a public delete method
    // Games are cleaned up automatically when all players leave
    return true
  }

  joinGame(userId: string, roomId: string): Game {
    return this.contextoManager.joinGame(userId, roomId)
  }

  removeUserFromGame(userId: string, roomId: string): void {
    // Use ContextoManager to handle player removal - this will handle the game.removePlayer internally
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
    // Note: ContextoManager doesn't expose a public method to get all games
    // This is a limitation of the current design
    // We would need to add a public method to ContextoManager to support this
    return []
  }

  getActiveGames(): Game[] {
    return this.getAllGames().filter(game => !game.finished)
  }

  getActiveRoomsCount(): number {
    return this.getActiveGames().length
  }

  // Cleanup finished games older than 1 hour
  cleanupOldGames(): number {
    // Note: ContextoManager doesn't expose game cleanup functionality
    // This would need to be implemented in ContextoManager
    // For now, we return 0 as games are cleaned up automatically when players leave
    return 0
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
