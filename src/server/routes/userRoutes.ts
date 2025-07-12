import { Router, Request, Response } from 'express'
import { UserManager } from '../UserManager'

export function setupUserRoutes(userManager: UserManager) {
  const router = Router()

  // Get current user info
  router.get('/me', async (req: Request, res: Response) => {
    try {
      const user = req.user
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.json(user.toJSON())
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // Set username
  router.post('/username', async (req: Request, res: Response) => {
    try {
      const { username } = req.body
      const token = req.userToken!

      if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Username is required' })
      }

      if (username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Username must be between 3 and 20 characters' })
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens' })
      }

      const success = userManager.setUsername(token, username)
      if (!success) {
        return res.status(400).json({ error: 'Username is already taken' })
      }

      const user = userManager.getUserByToken(token)
      res.json({
        message: 'Username set successfully',
        user: user!.toJSON()
      })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // Generate anonymous username
  router.post('/username/anonymous', async (req: Request, res: Response) => {
    try {
      const token = req.userToken!
      const anonymousUsername = userManager.generateAnonymousUsername()

      const success = userManager.setUsername(token, anonymousUsername)
      if (!success) {
        // Try again with a different username
        const fallbackUsername = `Player${Date.now()}`
        userManager.setUsername(token, fallbackUsername)
      }

      const user = userManager.getUserByToken(token)
      res.json({
        message: 'Anonymous username generated successfully',
        user: user!.toJSON()
      })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get user stats
  router.get('/stats', async (req: Request, res: Response) => {
    try {
      const user = req.user
      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      res.json(user.getStats())
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // Check if username is available
  router.get('/username/check/:username', async (req: Request, res: Response) => {
    try {
      const { username } = req.params

      if (!username || username.length < 3 || username.length > 20) {
        return res.status(400).json({ error: 'Invalid username length' })
      }

      if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return res.status(400).json({ error: 'Invalid username format' })
      }

      const isTaken = userManager.isUsernameTaken(username)
      res.json({
        username,
        available: !isTaken
      })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  // Get leaderboard (top users by win rate)
  router.get('/leaderboard', async (req: Request, res: Response) => {
    try {
      const { limit = 10, sortBy = 'winRate' } = req.query

      let users = userManager.getAllUsers()
        .filter(user => user.gamesPlayed > 0) // Only users who have played games
        .map(user => user.getStats())

      // Sort by the requested field
      switch (sortBy) {
        case 'gamesWon':
          users.sort((a, b) => b.gamesWon - a.gamesWon)
          break
        case 'gamesPlayed':
          users.sort((a, b) => b.gamesPlayed - a.gamesPlayed)
          break
        case 'averageGuesses':
          users.sort((a, b) => a.averageGuesses - b.averageGuesses) // Lower is better
          break
        default: // winRate
          users.sort((a, b) => b.winRate - a.winRate)
          break
      }

      users = users.slice(0, Number(limit))

      res.json({
        leaderboard: users,
        total: users.length,
        sortBy
      })
    } catch (error: any) {
      res.status(500).json({ error: error.message })
    }
  })

  return router
}
