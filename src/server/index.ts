import 'reflect-metadata'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import compression from 'compression'
import createConnection from '../database'
import snowflakeGenerator from '../utils/snowflake'
import JWTService from '../utils/jwt'
import { GameManager } from './GameManager'
import { UserManager } from './UserManager'
import { setupGameRoutes } from './routes/gameRoutes'
import { setupRoomRoutes } from './routes/roomRoutes'
import { setupUserRoutes } from './routes/userRoutes'
import { setupSocketHandlers } from './socket/socketHandlers'
import { Player } from '../models/Player'

const corsOrigin = process.env.FRONTEND_URL || ["http://localhost:3000", "http://localhost:3002"]

const app = express()
const server = createServer(app)
const io = new Server(server, {
	cors: {
		origin: corsOrigin,
		credentials: true
	}
})

// Middleware
app.use(helmet())
app.use(compression())
app.use(cors({
	origin: corsOrigin,
	credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// Initialize managers
const gameManager = new GameManager()
const userManager = new UserManager(gameManager)

// JWT Token middleware - authenticate users with JWT tokens
app.use(async (req, res, next) => {
	let userToken = req.cookies.contexto_token
	let user: Player | null = null
	let newToken: string | undefined = undefined

	if (userToken) {
		// Verify existing token
		const result = await userManager.verifyAndRefreshToken(userToken)
		user = result.user
		newToken = result.newToken

		if (newToken) {
			// Update cookie with refreshed token
			res.cookie('contexto_token', newToken, {
				maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
				httpOnly: true,
				secure: process.env.NODE_ENV === 'production',
				sameSite: 'lax'
			})
			userToken = newToken
		}
	}

	if (!user) {
		// Create new user with JWT token
		const result = await userManager.createUser()
		user = result.user
		userToken = result.token

		// Set cookie with JWT token
		res.cookie('contexto_token', userToken, {
			maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
			httpOnly: true,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax'
		})
	}

	// Attach user to request
	req.user = user
	req.userToken = userToken

	next()
})

// Routes
app.use('/api/game', setupGameRoutes(gameManager, userManager))
app.use('/api/rooms', setupRoomRoutes(gameManager, userManager))
app.use('/api/users', setupUserRoutes(userManager))

// Health check
app.get('/health', async (req, res) => {
	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		activeRooms: gameManager.getActiveRoomsCount(),
		activeUsers: await userManager.getActiveUsersCount()
	})
})

// Setup Socket.IO handlers
setupSocketHandlers(io, gameManager, userManager)

const PORT = process.env.PORT || 3001

async function startServer() {
	try {
		// Initialize database connection
		console.log('🔄 Initializing database connection...')
		await createConnection()
		console.log('✅ Database connected successfully')

		server.listen(PORT, () => {
			console.log(`🚀 Contexto server running on port ${PORT}`)
			console.log(`🎮 Game API available at http://localhost:${PORT}/api/game`)
			console.log(`🏠 Rooms API available at http://localhost:${PORT}/api/rooms`)
			console.log(`👤 Users API available at http://localhost:${PORT}/api/users`)
			console.log(`⚡ WebSocket server ready for real-time gaming`)
		})
	} catch (error) {
		console.error('❌ Failed to start server:', error)
		process.exit(1)
	}
}

// Start the server
startServer()

// Graceful shutdown
process.on('SIGTERM', () => {
	console.log('🛑 SIGTERM signal received: closing HTTP server')
	server.close(() => {
		console.log('✅ HTTP server closed')
	})
})

export { app, server, io, gameManager, userManager }
