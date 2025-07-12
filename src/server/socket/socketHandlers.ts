import { Server, Socket } from 'socket.io'
import { GameManager } from '../GameManager'
import { UserManager } from '../UserManager'
import { User } from '../User'
import snowflakeGenerator from '../../utils/snowflake'
import JWTService from '../../utils/jwt'

interface SocketUser {
  token: string
  userId: string
  username?: string
}

export function setupSocketHandlers(io: Server, gameManager: GameManager, userManager: UserManager) {

  io.on('connection', (socket: Socket) => {
    console.log(`🔌 User connected: ${socket.id}`)

    let socketUser: SocketUser | null = null

    // Authenticate automatically on connection using cookies
    const cookies = socket.handshake.headers.cookie
    console.log('Socket auth cookies:', cookies)

    if (!cookies) {
      console.error('No authentication cookies found')
      socket.disconnect()
      return
    }

    // Parse cookies to find contexto_token
    const cookieObj = cookies.split(';').reduce((acc: Record<string, string>, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {})

    console.log('Parsed cookies:', cookieObj)

    const userToken = cookieObj.contexto_token
    if (!userToken) {
      console.error('No authentication token found in cookies')
      socket.disconnect()
      return
    }

    console.log('Using token from cookie:', userToken)

    // Only validate existing user, never create new ones
    const payload = JWTService.verifyToken(userToken)
    if (!payload) {
      console.error('Invalid JWT token')
      socket.disconnect()
      return
    }

    const user = userManager.getUserById(payload.userId)
    if (!user) {
      console.error('User not found for token')
      socket.disconnect()
      return
    }

    console.log('Found user by token:', user.id)

    socketUser = {
      token: userToken,
      userId: user.id,
      username: user.username || undefined
    }

    console.log(`✅ User authenticated via socket: ${user.id}`)

    // Join room handler
    socket.on('join_room', (data: { roomId: string }) => {
      try {
        if (!socketUser) {
          socket.emit('error', { error: 'Not authenticated' })
          return
        }

        const { roomId } = data

        if (!snowflakeGenerator.isValid(roomId)) {
          socket.emit('error', { error: 'Invalid room ID' })
          return
        }

        const game = gameManager.getGame(roomId)
        if (!game) {
          socket.emit('error', { error: 'Room not found' })
          return
        }

        // Leave current room if any
        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? userManager.getUserById(payload.userId) : null
        const currentRoom = user ? userManager.getUserCurrentRoom(user.id) : null
        if (currentRoom) {
          socket.leave(currentRoom)
        }

        // Join new room
        socket.join(roomId)

        // Add user to game
        gameManager.addUserToGame(socketUser.userId, roomId)

        // Update user's current room
        if (user) {
          userManager.joinUserToRoom(user.id, roomId)
        }

        // Notify room about new player
        socket.to(roomId).emit('player_joined', {
          userId: socketUser.userId,
          username: socketUser.username
        })

        socket.emit('room_joined', {
          roomId,
          gameId: game.gameId,
          finished: game.finished,
          started: game.started,
          isHost: game.isHost(socketUser.userId)
        })

        console.log(`🏠 User ${socketUser.userId} joined room ${roomId}`)
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Leave room handler
    socket.on('leave_room', () => {
      try {
        if (!socketUser) {
          return
        }

        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? userManager.getUserById(payload.userId) : null
        const currentRoom = user ? userManager.getUserCurrentRoom(user.id) : null
        if (!user || !currentRoom) {
          return
        }

        const roomId = currentRoom

        // Remove user from game
        gameManager.removeUserFromGame(socketUser.userId, roomId)

        // Update user's current room
        userManager.removeUserFromRoom(user.id)

        // Leave socket room
        socket.leave(roomId)

        // Notify room about player leaving
        socket.to(roomId).emit('player_left', {
          userId: socketUser.userId,
          username: socketUser.username
        })

        socket.emit('room_left', { roomId })

        console.log(`🚪 User ${socketUser.userId} left room ${roomId}`)
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Make guess handler
    socket.on('make_guess', async (data: { word: string }) => {
      try {
        if (!socketUser) {
          socket.emit('error', { error: 'Not authenticated' })
          return
        }

        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? userManager.getUserById(payload.userId) : null
        const currentRoom = user ? userManager.getUserCurrentRoom(user.id) : null
        if (!user || !currentRoom) {
          socket.emit('error', { error: 'Not in a room' })
          return
        }

        console.log(`🔍 User ${socketUser.userId} making guess in room ${currentRoom}:`, data.word)

        const { word } = data
        const roomId = currentRoom

        if (!word || typeof word !== 'string') {
          socket.emit('error', { error: 'Word is required' })
          return
        }

        const game = gameManager.getGame(roomId)
        if (!game) {
          socket.emit('error', { error: 'Game not found' })
          return
        }

        if (game.finished) {
          socket.emit('error', { error: 'Game has already finished' })
          return
        }

        const guess = await game.tryWord(socketUser.userId, word.trim().toLowerCase())

        // Update user activity  
        userManager.updateUserActivity(socketUser.userId)

        // Emit guess to the player who made it
        socket.emit('guess_result', {
          guess,
          gameFinished: game.finished,
          guessCount: game.guessCount
        })

        // Emit guess to other players in room (with spoiler for multiplayer games)
        socket.to(roomId).emit('player_guess', {
          userId: socketUser.userId,
          username: socketUser.username,
          word: guess.error ? guess.word : `||${guess.word}||`, // Spoiler for valid guesses
          distance: guess.distance,
          error: guess.error,
          gameFinished: game.finished
        })

        // If game finished, update user stats
        if (game.finished && guess.distance === 0) {
          const payload = JWTService.verifyToken(socketUser.token)
          const user = payload ? userManager.getUserById(payload.userId) : null
          if (user) {
            user.incrementGamesPlayed()
            user.incrementGamesWon()
            user.updateAverageGuesses(game.guessCount)
          }

          // Notify room about game completion
          io.to(roomId).emit('game_finished', {
            winner: {
              userId: socketUser.userId,
              username: socketUser.username,
              guessCount: game.guessCount
            },
            answer: guess.word
          })
        }

        console.log(`🎯 User ${socketUser.userId} guessed "${word}" in room ${roomId}`)
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Start game handler
    socket.on('start_game', () => {
      try {
        if (!socketUser) {
          socket.emit('error', { error: 'Not authenticated' })
          return
        }

        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? userManager.getUserById(payload.userId) : null
        const currentRoom = user ? userManager.getUserCurrentRoom(user.id) : null
        if (!user || !currentRoom) {
          socket.emit('error', { error: 'Not in a room' })
          return
        }

        const roomId = currentRoom
        const game = gameManager.getGame(roomId)
        if (!game) {
          socket.emit('error', { error: 'Game not found' })
          return
        }

        // Check if user is the room host (first player)
        const isHost = game.isHost(socketUser.userId)
        if (!isHost) {
          socket.emit('error', { error: 'Only the room host can start the game' })
          return
        }

        // Start the game
        game.startGame()

        // Notify all players in the room that the game has started
        io.to(roomId).emit('game_started', {
          roomId,
          gameId: game.gameId,
          started: true
        })

        console.log(`🚀 Game started in room ${roomId} by host ${socketUser.userId}`)
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Get closest guesses handler
    socket.on('get_closest', (data: { count?: number }) => {
      try {
        if (!socketUser) {
          socket.emit('error', { error: 'Not authenticated' })
          return
        }

        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? userManager.getUserById(payload.userId) : null
        const currentRoom = user ? userManager.getUserCurrentRoom(user.id) : null
        if (!user || !currentRoom) {
          socket.emit('error', { error: 'Not in a room' })
          return
        }

        const { count = 10 } = data
        const roomId = currentRoom

        const game = gameManager.getGame(roomId)
        if (!game) {
          socket.emit('error', { error: 'Game not found' })
          return
        }

        const closestGuesses = game.getClosestGuesses(socketUser.userId, count)

        socket.emit('closest_guesses', {
          closestGuesses,
          count: closestGuesses.length
        })
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${socket.id}`)

      if (socketUser) {
        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? userManager.getUserById(payload.userId) : null
        const currentRoom = user ? userManager.getUserCurrentRoom(user.id) : null
        if (user && currentRoom) {
          // Notify room about player leaving
          socket.to(currentRoom).emit('player_left', {
            userId: socketUser.userId,
            username: socketUser.username
          })

          // Remove user from game
          gameManager.removeUserFromGame(socketUser.userId, currentRoom)
        }
      }
    })

    // Error handler
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error)
    })
  })

  // Periodic cleanup
  setInterval(() => {
    const removedGames = gameManager.cleanupOldGames()
    const removedUsers = userManager.cleanupInactiveUsers()

    if (removedGames > 0 || removedUsers > 0) {
      console.log(`🧹 Cleanup: Removed ${removedGames} old games and ${removedUsers} inactive users`)
    }
  }, 30 * 60 * 1000) // Every 30 minutes

  console.log('⚡ Socket.IO handlers set up successfully')
}
