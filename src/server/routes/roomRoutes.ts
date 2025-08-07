import { Router, Request, Response } from 'express'
import { GameManager } from '../GameManager'
import { UserManager } from '../UserManager'
import snowflakeGenerator from '../../utils/snowflake'
import { ContextoDefaultGame } from '../../game/ContextoDefaultGame'
import { ContextoCompetitiveGame } from '../../game/ContextoCompetitiveGame'
import { ContextoBattleRoyaleGame } from '../../game/ContextoBattleRoyaleGame'

export function setupRoomRoutes(gameManager: GameManager, userManager: UserManager) {
  const router = Router()

  // Get room information
  router.get('/:roomId', async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params

      if (!snowflakeGenerator.isValid(roomId)) {
        return res.status(400).json({ error: 'Invalid room ID' })
      }

      const game = gameManager.getGame(roomId)
      if (!game) {
        return res.status(404).json({ error: 'Room not found' })
      }

      let gameType = 'default'
      let extraInfo = {}

      if (game instanceof ContextoBattleRoyaleGame) {
        gameType = 'battle-royale'
        extraInfo = {
          playersProgress: game.getAllPlayersProgress(),
          usedWords: (game as any).usedWords?.size || 0
        }
      } else if (game instanceof ContextoCompetitiveGame) {
        gameType = 'competitive'
        extraInfo = {
          playersProgress: game.getLeaderboard()
        }
      } else if (game instanceof ContextoDefaultGame) {
        gameType = 'default'
      }

      res.json({
        roomId,
        gameId: game.gameId,
        gameDate: (game as any).gameDate || new Date(),
        type: gameType,
        finished: game.finished,
        started: game.started,
        guessCount: game.guessCount,
        allowTips: game.allowTips,
        allowGiveUp: game.allowGiveUp,
        ...extraInfo
      })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // List all active rooms
  router.get('/', async (req: Request, res: Response) => {
    try {
      const { type, limit = 50 } = req.query
      
      let games = gameManager.getActiveGames()

      // Filter by game type if specified
      if (type && ['default', 'competitive', 'battle-royale'].includes(type as string)) {
        games = games.filter(game => {
          switch (type) {
            case 'battle-royale':
              return game instanceof ContextoBattleRoyaleGame
            case 'competitive':
              return game instanceof ContextoCompetitiveGame
            case 'default':
              return game instanceof ContextoDefaultGame
            default:
              return true
          }
        })
      }

      // Limit results
      games = games.slice(0, Number(limit))

      const rooms = games.map(game => {
        let gameType = 'default'
        if (game instanceof ContextoBattleRoyaleGame) {
          gameType = 'battle-royale'
        } else if (game instanceof ContextoCompetitiveGame) {
          gameType = 'competitive'
        }

        return {
          roomId: game.id,
          gameId: game.gameId,
          type: gameType,
          finished: game.finished,
          guessCount: game.guessCount,
          createdAt: snowflakeGenerator.extractTimestamp(game.id)
        }
      })

      res.json({
        rooms,
        total: rooms.length,
        hasMore: gameManager.getActiveGames().length > Number(limit)
      })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get user's rooms
  router.get('/user/me', async (req: Request, res: Response) => {
    try {
      const userId = req.userToken!
      const games = gameManager.getUserGames(userId)

      const rooms = games.map(game => {
        let gameType = 'default'
        if (game instanceof ContextoBattleRoyaleGame) {
          gameType = 'battle-royale'
        } else if (game instanceof ContextoCompetitiveGame) {
          gameType = 'competitive'
        }

        return {
          roomId: game.id,
          gameId: game.gameId,
          type: gameType,
          finished: game.finished,
          guessCount: game.guessCount,
          createdAt: snowflakeGenerator.extractTimestamp(game.id)
        }
      })

      res.json({
        rooms,
        total: rooms.length
      })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  return router
}
