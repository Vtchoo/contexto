import { Server, Socket } from 'socket.io'
import { GameManager } from '../GameManager'
import { UserManager } from '../UserManager'
import { User } from '../User'
import snowflakeGenerator from '../../utils/snowflake'

interface SocketUser {
  token: string
  userId: string
  username?: string
  currentRoom?: string
}

export function setupSocketHandlers(io: Server, gameManager: GameManager, userManager: UserManager) {
  
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 User connected: ${socket.id}`)
    
    let socketUser: SocketUser | null = null

    // Authentication handler
    socket.on('auth', (data: { token?: string }) => {
      try {
        let userToken = data.token
        let user: User | null = null

        if (userToken) {
          // Try to get existing user by token
          user = userManager.getUserByToken(userToken)
        }

        if (!user) {
          // Create new user (this will generate a new JWT token internally)
          user = userManager.createUser()
          userToken = user.token
        }

        socketUser = {
          token: userToken!,
          userId: user.id,
          username: user.username || undefined
        }

        socket.emit('auth_success', {
          token: userToken!,
          user: user.toJSON()
        })

        console.log(`✅ User authenticated: ${user.id}`)
      } catch (error: any) {
        socket.emit('auth_error', { error: error.message })
      }
    })

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
        if (socketUser.currentRoom) {
          socket.leave(socketUser.currentRoom)
        }

        // Join new room
        socket.join(roomId)
        socketUser.currentRoom = roomId

        // Add user to game
        gameManager.addUserToGame(socketUser.userId, roomId)

        // Update user's current room
        const user = userManager.getUserByToken(socketUser.token)
        if (user) {
          user.joinRoom(roomId)
        }

        // Notify room about new player
        socket.to(roomId).emit('player_joined', {
          userId: socketUser.userId,
          username: socketUser.username
        })

        socket.emit('room_joined', {
          roomId,
          gameId: game.gameId,
          finished: game.finished
        })

        console.log(`🏠 User ${socketUser.userId} joined room ${roomId}`)
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Leave room handler
    socket.on('leave_room', () => {
      try {
        if (!socketUser || !socketUser.currentRoom) {
          return
        }

        const roomId = socketUser.currentRoom

        // Remove user from game
        gameManager.removeUserFromGame(socketUser.userId, roomId)

        // Update user's current room
        const user = userManager.getUserByToken(socketUser.token)
        if (user) {
          user.leaveRoom()
        }

        // Leave socket room
        socket.leave(roomId)

        // Notify room about player leaving
        socket.to(roomId).emit('player_left', {
          userId: socketUser.userId,
          username: socketUser.username
        })

        socketUser.currentRoom = undefined

        socket.emit('room_left', { roomId })

        console.log(`🚪 User ${socketUser.userId} left room ${roomId}`)
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Make guess handler
    socket.on('make_guess', async (data: { word: string }) => {
      try {
        if (!socketUser || !socketUser.currentRoom) {
          socket.emit('error', { error: 'Not in a room' })
          return
        }

        const { word } = data
        const roomId = socketUser.currentRoom

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
          const user = userManager.getUserByToken(socketUser.token)
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

    // Get closest guesses handler
    socket.on('get_closest', (data: { count?: number }) => {
      try {
        if (!socketUser || !socketUser.currentRoom) {
          socket.emit('error', { error: 'Not in a room' })
          return
        }

        const { count = 10 } = data
        const roomId = socketUser.currentRoom

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
      
      if (socketUser && socketUser.currentRoom) {
        // Notify room about player leaving
        socket.to(socketUser.currentRoom).emit('player_left', {
          userId: socketUser.userId,
          username: socketUser.username
        })
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
