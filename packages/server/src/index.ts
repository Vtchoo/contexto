import 'reflect-metadata'
import express, { Router } from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import compression from 'compression'
import path from 'path'
import createConnection from '@contexto/core/database'
import env from '@contexto/core/env'
import { GameManager } from './GameManager'
import { UserManager } from './UserManager'
import { setupGameRoutes } from './routes/gameRoutes'
import { setupRoomRoutes } from './routes/roomRoutes'
import { setupUserRoutes } from './routes/userRoutes'
import { setupSocketHandlers } from './socket/socketHandlers'
import { Player } from '@contexto/core'

const corsOrigin = env.FRONTEND_URL || (env.NODE_ENV === 'production' 
	? true // Allow all origins in production, or specify your domain
	: ["http://localhost:3000", "http://localhost:3002"])

const app = express()
const server = createServer(app)
const io = new Server(server, {
	cors: {
		origin: corsOrigin,
		credentials: true
	}
})

// Middleware
app.use(helmet({
	contentSecurityPolicy: {
		directives: {
			defaultSrc: ["'self'"],
			styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
			fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
			scriptSrc: ["'self'"],
			imgSrc: ["'self'", "data:", "https:"],
			connectSrc: ["'self'", "ws:", "wss:", "https:"],
		},
	},
}))
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

// Health check
app.get('/health', async (req, res) => {
	const uptime = process.uptime()
	const memUsage = process.memoryUsage()
	
	res.json({
		status: 'ok',
		timestamp: new Date().toISOString(),
		uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
		environment: env.NODE_ENV,
		activeRooms: gameManager.getActiveRoomsCount(),
		activeUsers: await userManager.getActiveUsersCount(),
		memory: {
			used: Math.round(memUsage.heapUsed / 1024 / 1024) + ' MB',
			total: Math.round(memUsage.heapTotal / 1024 / 1024) + ' MB'
		}
	})
})

// Ping endpoint for keeping the server alive
app.get('/ping', (req, res) => {
	res.json({
		status: 'pong',
		timestamp: new Date().toISOString(),
		uptime: Math.floor(process.uptime())
	})
})

const api = Router({ mergeParams: true })

// JWT Token middleware - authenticate users with JWT tokens
api.use(async (req, res, next) => {
	let userToken = req.cookies.contexto_token
	let user: Player | null = null
	let newToken: string | undefined = undefined

	if (userToken) {
		try {
			// Verify existing token
			const result = await userManager.verifyAndRefreshToken(userToken)
			user = result.user
			newToken = result.newToken
	
			if (newToken) {
				// Update cookie with refreshed token
				res.cookie('contexto_token', newToken, {
					maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
					httpOnly: true,
					secure: env.NODE_ENV === 'production',
					sameSite: 'lax'
				})
				userToken = newToken
			}
		} catch (error) {
			console.error('Error in JWT middleware:', error)
		}
	}

	try {
		if (!user) {
			// Create new user with JWT token
			const result = await userManager.createUser()
			user = result.user
			userToken = result.token
	
			// Set cookie with JWT token
			res.cookie('contexto_token', userToken, {
				maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
				httpOnly: true,
				secure: env.NODE_ENV === 'production',
				sameSite: 'lax'
			})
		}
	
		// Attach user to request
		req.user = user
		req.userToken = userToken
	
		next()
	} catch (error) {
		console.error('Error in JWT middleware:', error)
		res.status(500).json({ error: 'Internal Server Error' })
	}
})

// Routes
api.use('/game', setupGameRoutes(gameManager, userManager))
api.use('/rooms', setupRoomRoutes(gameManager, userManager))
api.use('/users', setupUserRoutes(userManager))

app.use('/api', api)

// Serve static files from the React app build directory
const publicPath = path.join(__dirname, '../../dist/public')
app.use(express.static(publicPath))

// Catch-all handler: send back React's index.html file for any non-API routes
app.get('*', (req, res) => {
	// Don't serve index.html for API routes or socket.io
	if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
		return res.status(404).json({ error: 'Not found' })
	}
	
	res.sendFile(path.join(publicPath, 'index.html'))
})

// Setup Socket.IO handlers
setupSocketHandlers(io, gameManager, userManager)

const PORT = env.PORT

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
