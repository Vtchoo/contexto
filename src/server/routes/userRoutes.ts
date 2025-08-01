import { Router, Request, Response } from 'express'
import { UserManager } from '../UserManager'
import { Player } from '../../models/Player'
import * as zod from 'zod'

export function setupUserRoutes(userManager: UserManager) {
	const router = Router()

	// Initialize or get user - this ensures user exists and cookies are set
	router.post('/init', async (req: Request, res: Response) => {
		try {
			const user = req.user
			if (!user) {
				return res.status(500).json({ error: 'Failed to initialize user' })
			}

			res.json({
				message: 'User initialized successfully',
				user: user.toJSON()
			})
		} catch (error: any) {
			res.status(500).json({ error: error.message })
		}
	})

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

	// Update any user field(s)
	router.put('/me', async (req: Request, res: Response) => {
		try {

			const player = req.user
			if (!player) {
				return res.status(404).json({ error: 'User not found' })
			}

			const fields: Partial<Player> = zod.object({
				username: zod.string().optional(),
				avatarUrl: zod.string().url().optional(),
				// Add other fields as needed
			}).parse(req.body)

			// const repository = getPlayerRepository()
			// const data = await repository.save({
			// 	id: player.id,
			// 	...fields,
			// })

			const data = await userManager.updatePlayer(player.id, {
				...fields,
			})

			res.json(data)

		} catch (error: any) {
			res.status(500).json({ error: error.message });
		}
	});

	// Generate anonymous username
	// router.post('/username/anonymous', async (req: Request, res: Response) => {
	// 	try {
	// 		const token = req.userToken!
	// 		const anonymousUsername = await userManager.generateAnonymousUsername()

	// 		const success = await userManager.updatePlayer(token, anonymousUsername)
	// 		if (!success) {
	// 			// Try again with a different username
	// 			const fallbackUsername = `Player${Date.now()}`
	// 			await userManager.updatePlayer(token, fallbackUsername)
	// 		}

	// 		const payload = JWTService.verifyToken(token)
	// 		const user = payload ? await userManager.getUserById(payload.userId) : null
	// 		res.json({
	// 			message: 'Anonymous username generated successfully',
	// 			user: user!.toJSON()
	// 		})
	// 	} catch (error: any) {
	// 		res.status(500).json({ error: error.message })
	// 	}
	// })

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

			const isTaken = await userManager.isUsernameTaken(username)
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

			let users = (await userManager.getAllUsers())
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
