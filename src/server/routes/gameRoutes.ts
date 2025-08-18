import { Router, Request, Response } from 'express'
import { GameManager } from '../GameManager'
import { UserManager } from '../UserManager'
import { Player } from '../../models/Player'
import snowflakeGenerator from '../../utils/snowflake'
import JWTService from '../../utils/jwt'
import { getTodaysGameId } from '../../utils/misc'
import * as zod from 'zod'

// Extend Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: Player
      userToken?: string
    }
  }
}

export function setupGameRoutes(gameManager: GameManager, userManager: UserManager) {
  const router = Router()

  // Create a new game
  router.post('/', async (req: Request, res: Response) => {
    try {
      const { type, allowTips, allowGiveUp, maxPlayers } = req.body
      let gameId: number | Date | 'random' | undefined = req.body.gameId

      if (!['default', 'competitive', 'battle-royale', 'stop'].includes(type)) {
        return res.status(400).json({ error: 'Invalid game type' })
      }

      if (!req.user) {
        return res.status(401).json({ error: 'User not authenticated' })
      }

      const user = await userManager.getUserById(req.user.id)

      if (!user) {
        return res.status(401).json({ error: 'User not found' })
      }

      if (gameId === 'random') {
        const currentId = getTodaysGameId()
        const randomId = Math.floor(Math.random() * currentId)
        gameId = randomId
      }
      // detect if gameId is a iso date
      const { success, data } = zod.string().datetime().safeParse(gameId)
      if (success)
        gameId = new Date(data)

      const roomId = gameManager.createGame(type, user.id, gameId)
      const game = gameManager.getGame(roomId)

      // Update user's current room
      userManager.joinUserToRoom(user.id, roomId)

      res.json({
        roomId,
        gameId: game!.gameId,
        type,
        message: `${type} game created successfully`
      })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // Join an existing game
  router.post('/join/:roomId', async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params
      const token = req.userToken!

      if (!snowflakeGenerator.isValid(roomId)) {
        return res.status(400).json({ error: 'Invalid room ID' })
      }

      const game = gameManager.getGame(roomId)
      if (!game) {
        return res.status(404).json({ error: 'Game not found' })
      }

      if (game.finished) {
        return res.status(400).json({ error: 'Game has already finished' })
      }

      gameManager.joinGame(token, roomId)

      // Update user's current room
      const payload = JWTService.verifyToken(token)
      const user = payload ? await userManager.getUserById(payload.userId) : null
      if (user) {
        userManager.joinUserToRoom(user.id, roomId)
      }

      res.json({
        roomId,
        gameId: game.gameId,
        message: 'Joined game successfully'
      })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  })

  // Make a guess
  router.post('/guess/:roomId', async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params
      const { word } = req.body
      const token = req.userToken!

      if (!snowflakeGenerator.isValid(roomId)) {
        return res.status(400).json({ error: 'Invalid room ID' })
      }

      if (!word || typeof word !== 'string') {
        return res.status(400).json({ error: 'Word is required' })
      }

      const game = gameManager.getGame(roomId)
      if (!game) {
        return res.status(404).json({ error: 'Game not found' })
      }

      if (game.finished) {
        return res.status(400).json({ error: 'Game has already finished' })
      }

      const guess = await game.tryWord(token, word.trim().toLowerCase())

      // Update user activity
      userManager.updateUserActivity(token)

      // If game finished, update user stats
      if (game.finished && guess.distance === 0) {
        const payload = JWTService.verifyToken(token)
        const user = payload ? await userManager.getUserById(payload.userId) : null
        if (user) {
          user.incrementGamesPlayed()
          user.incrementGamesWon()
          user.updateAverageGuesses(game.guessCount)
        }
      }

      res.json({
        guess,
        gameFinished: game.finished,
        guessCount: game.guessCount
      })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  })

  // Get closest guesses
  router.get('/closest/:roomId', async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params
      const { count = 10 } = req.query
      const userId = req.userToken!

      if (!snowflakeGenerator.isValid(roomId)) {
        return res.status(400).json({ error: 'Invalid room ID' })
      }

      const game = gameManager.getGame(roomId)
      if (!game) {
        return res.status(404).json({ error: 'Game not found' })
      }

      const closestGuesses = game.getClosestGuesses(userId, Number(count))

      res.json({
        closestGuesses,
        count: closestGuesses.length
      })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  })

  // Leave a game
  router.post('/leave/:roomId', async (req: Request, res: Response) => {
    try {
      const { roomId } = req.params
      const token = req.userToken!

      if (!snowflakeGenerator.isValid(roomId)) {
        return res.status(400).json({ error: 'Invalid room ID' })
      }

      gameManager.removeUserFromGame(token, roomId)

      // Update user's current room
      const payload = JWTService.verifyToken(token)
      const user = payload ? await userManager.getUserById(payload.userId) : null
      if (user) {
        userManager.removeUserFromRoom(user.id)
      }

      res.json({ message: 'Left game successfully' })
    } catch (error: any) {
      res.status(400).json({ error: error.message })
    }
  })

  // Get game stats
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = gameManager.getStats()
      res.json(stats)
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  return router
}
