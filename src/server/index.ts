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
import { GameManager } from './GameManager'
import { UserManager } from './UserManager'
import { setupGameRoutes } from './routes/gameRoutes'
import { setupRoomRoutes } from './routes/roomRoutes'
import { setupUserRoutes } from './routes/userRoutes'
import { setupSocketHandlers } from './socket/socketHandlers'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:3002"],
    credentials: true
  }
})

// Middleware
app.use(helmet())
app.use(compression())
app.use(cors({
  origin: ["http://localhost:3000", "http://localhost:3002"],
  credentials: true
}))
app.use(express.json())
app.use(cookieParser())

// Initialize managers
const gameManager = new GameManager()
const userManager = new UserManager()

// Token middleware - generate user token on first visit
app.use((req, res, next) => {
  let userToken = req.cookies.contexto_token
  
  if (!userToken) {
    // Generate new user token using snowflake
    userToken = snowflakeGenerator.generate()
    
    // Set cookie with 30 days expiration
    res.cookie('contexto_token', userToken, {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    })
    
    // Create user in memory
    userManager.createUser(userToken)
  }
  
  // Attach user to request
  req.user = userManager.getUser(userToken)
  req.userToken = userToken
  
  next()
})

// Routes
app.use('/api/game', setupGameRoutes(gameManager, userManager))
app.use('/api/rooms', setupRoomRoutes(gameManager, userManager))
app.use('/api/users', setupUserRoutes(userManager))

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    activeRooms: gameManager.getActiveRoomsCount(),
    activeUsers: userManager.getActiveUsersCount()
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
