import { Server, Socket } from 'socket.io'
import { GameManager } from '../GameManager'
import { UserManager } from '../UserManager'
import { Player } from '../../models/Player'
import snowflakeGenerator from '../../utils/snowflake'
import JWTService from '../../utils/jwt'
import { ContextoBattleRoyaleGame, ContextoCompetitiveGame, ContextoDefaultGame, ContextoStopGame, ContextoTeamGame } from '../../game'
import { IGame } from '../../game/interface'
import * as zod from 'zod'

interface SocketUser {
  token: string
  userId: string
  username?: string
}

// 'default' | 'competitive' | 'battle-royale' | 'stop' | 'team'
const getGameMode = (game: IGame): string => {
  if (game instanceof ContextoDefaultGame) {
    return 'default'
  } else if (game instanceof ContextoCompetitiveGame) {
    return 'competitive'
  } else if (game instanceof ContextoBattleRoyaleGame) {
    return 'battle-royale'
  } else if (game instanceof ContextoStopGame) {
    return 'stop'
  } else if (game instanceof ContextoTeamGame) {
    return 'team'
  }
  return 'default'
}

export function setupSocketHandlers(io: Server, gameManager: GameManager, userManager: UserManager) {
  // Track current socket ID for each user to prevent race conditions
  const userSocketMap = new Map<string, string>()

  io.on('connection', async (socket: Socket) => {
    console.log(`🔌 User connected: ${socket.id}`)

    let socketUser: SocketUser | null = null

    // Authenticate automatically on connection using cookies
    const cookies = socket.handshake.headers.cookie

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

    const userToken = cookieObj.contexto_token
    if (!userToken) {
      console.error('No authentication token found in cookies')
      socket.disconnect()
      return
    }

    // Only validate existing user, never create new ones
    const payload = JWTService.verifyToken(userToken)
    if (!payload) {
      console.error('Invalid JWT token')
      socket.disconnect()
      return
    }

    const user = await userManager.getUserById(payload.userId)
    if (!user) {
      console.error('User not found for token')
      socket.disconnect()
      return
    }

    socketUser = {
      token: userToken,
      userId: user.id,
      username: user.username || undefined
    }

    console.log(`✅ User authenticated via socket: ${user.id}`)

    // Update user's current socket ID
    userSocketMap.set(user.id, socket.id)

    // Join room handler
    socket.on('join_room', async (data: { roomId: string }) => {
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
          socket.emit('error', { error: `Room ${roomId} not found` })
          return
        }

        // Leave current room if any
        const currentRoom = userManager.getUserCurrentRoom(socketUser.userId)
        if (currentRoom && currentRoom !== roomId) {
          socket.leave(currentRoom)
          socket.to(currentRoom).emit('player_left', {
            userId: socketUser.userId,
            username: socketUser.username
          })
        } else {
          // Join new room
          socket.join(roomId)
        }

        // Update user's current socket ID (in case of reconnection)
        userSocketMap.set(socketUser.userId, socket.id)

        // Add user to game
        gameManager.joinGame(socketUser.userId, roomId)

        // Update user's current room
        userManager.joinUserToRoom(socketUser.userId, roomId)

        // Notify room about new player
        socket.to(roomId).emit('player_joined', {
          userId: socketUser.userId,
          username: socketUser.username
        })

        const gameState = game.getCurrentGameState(socketUser.userId)
        const teamInfo = game instanceof ContextoTeamGame ? {
          playerTeam: game.getPlayerTeam(socketUser.userId),
          allTeams: game.getTeams(),
          teamRankings: game.getTeamRankings(),
          otherTeamsBest: game.getOtherTeamsBestGuesses(socketUser.userId)
        } : null

        socket.emit('room_joined', {
          roomId,
          id: gameState.id,
          gameId: game.gameId,
          finished: game.finished,
          started: game.started,
          isHost: game.isHost(socketUser.userId),
          guesses: gameState.guesses,
          gameMode: getGameMode(game),
          players: gameState.players,
          ranking: gameState.ranking,
          teamInfo
        })

        console.log(`🏠 User ${socketUser.userId} joined room ${roomId}`)
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Leave room handler
    socket.on('leave_room', async () => {
      try {
        if (!socketUser) {
          return
        }

        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? await userManager.getUserById(payload.userId) : null
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
        const user = payload ? await userManager.getUserById(payload.userId) : null
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
          word: game instanceof ContextoDefaultGame ? guess.word : ``, // Spoiler for valid guesses in default game
          distance: guess.distance,
          error: guess.error,
          gameFinished: game.finished,
          addedBy: socketUser.userId,
          hidden: game instanceof ContextoDefaultGame ? false : true, // Hide guesses in multiplayer games
          teamGuess: game instanceof ContextoTeamGame, // Indicate if this is a team guess
        })

        // If it's a team game, emit team-specific events
        if (game instanceof ContextoTeamGame) {
          const playerTeam = game.getPlayerTeam(socketUser.userId)
          if (playerTeam) {
            // Emit to team members the full guess details
            playerTeam.players.forEach(playerId => {
              const playerSocketId = userSocketMap.get(playerId)
              if (playerSocketId && playerSocketId !== socket.id) {
                io.to(playerSocketId).emit('team_guess', {
                  guess,
                  gameFinished: game.finished,
                  addedBy: socketUser?.userId,
                  teamName: playerTeam.name
                })
              }
            })

            // Emit updated team rankings to all players
            io.to(roomId).emit('team_rankings_updated', {
              rankings: game.getTeamRankings()
            })
          }
        }

        // If game finished, update user stats
        if (game.finished && guess.distance === 0) {
          const payload = JWTService.verifyToken(socketUser.token)
          const user = payload ? await userManager.getUserById(payload.userId) : null
          if (user) {
            user.incrementGamesPlayed()
            user.incrementGamesWon()
            user.updateAverageGuesses(game.guessCount)
          }

          // For team games, also update stats for all team members
          if (game instanceof ContextoTeamGame) {
            const winningTeam = game.getPlayerTeam(socketUser.userId)
            if (winningTeam) {
              // Update stats for all team members
              for (const teamMemberId of winningTeam.players) {
                if (teamMemberId !== socketUser.userId) {
                  const teamMember = await userManager.getUserById(teamMemberId)
                  if (teamMember) {
                    teamMember.incrementGamesPlayed()
                    teamMember.incrementGamesWon()
                    teamMember.updateAverageGuesses(game.getGuessCount(teamMemberId))
                  }
                }
              }
            }
          }

          // Notify room about game completion
          if (game instanceof ContextoTeamGame) {
            const winningTeam = game.getTeamRankings()[0]
            const playerTeam = game.getPlayerTeam(socketUser.userId)
            
            io.to(roomId).emit('game_finished', {
              winner: {
                teamId: winningTeam?.teamId,
                teamName: winningTeam?.teamName,
                guessCount: winningTeam?.guessCount,
                players: playerTeam?.players || []
              },
              answer: guess.word,
              gameMode: 'team'
            })
          } else {
            io.to(roomId).emit('game_finished', {
              winner: {
                userId: socketUser.userId,
                username: socketUser.username,
                guessCount: game.guessCount
              },
              answer: guess.word
            })
          }
        }

        console.log(`🎯 User ${socketUser.userId} guessed "${word}" in room ${roomId}`)
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Start game handler
    socket.on('start_game', async () => {
      try {
        if (!socketUser) {
          socket.emit('error', { error: 'Not authenticated' })
          return
        }

        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? await userManager.getUserById(payload.userId) : null
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

        // Additional validation for team games
        if (game instanceof ContextoTeamGame) {
          const teams = game.getTeams()
          if (teams.length < 2) {
            socket.emit('error', { error: 'At least 2 teams are required to start the game' })
            return
          }
          
          // Check if all players are on teams
          const playersWithoutTeams = game.players.filter(playerId => !game.getPlayerTeam(playerId))
          if (playersWithoutTeams.length > 0) {
            socket.emit('error', { error: 'All players must be on a team before starting' })
            return
          }
        }

        // Start the game
        game.startGame()

        // Prepare team-specific data for team games
        let teamData: { teams: any[]; teamCount: number } | null = null
        if (game instanceof ContextoTeamGame) {
          teamData = {
            teams: game.getTeams(),
            teamCount: game.getTeams().length
          }
        }

        // Notify all players in the room that the game has started
        io.to(roomId).emit('game_started', {
          roomId,
          gameId: game.gameId,
          started: true,
          gameMode: getGameMode(game),
          teamData
        })

        console.log(`🚀 Game started in room ${roomId} by host ${socketUser.userId}`)
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Get closest guesses handler
    socket.on('get_closest', async (data: { count?: number }) => {
      try {
        if (!socketUser) {
          socket.emit('error', { error: 'Not authenticated' })
          return
        }

        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? await userManager.getUserById(payload.userId) : null
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

    // Create team handler
    socket.on('create_team', async (data: { teamName: string; color?: string }) => {
      try {
        if (!socketUser) {
          socket.emit('error', { error: 'Not authenticated' })
          return
        }

        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? await userManager.getUserById(payload.userId) : null
        const currentRoom = user ? userManager.getUserCurrentRoom(user.id) : null
        if (!user || !currentRoom) {
          socket.emit('error', { error: 'Not in a room' })
          return
        }

        const { teamName, color } = data
        const roomId = currentRoom

        if (!teamName || typeof teamName !== 'string') {
          socket.emit('error', { error: 'Team name is required' })
          return
        }

        const game = gameManager.getGame(roomId)
        if (!game || !(game instanceof ContextoTeamGame)) {
          socket.emit('error', { error: 'Not in a team game' })
          return
        }

        if (game.started) {
          socket.emit('error', { error: 'Cannot create teams after game has started' })
          return
        }

        const teamId = game.createTeam(socketUser.userId, teamName.trim(), color)
        const team = game.getPlayerTeam(socketUser.userId)

        // Notify all players in the room about the new team
        io.to(roomId).emit('team_created', {
          team,
          createdBy: socketUser.userId,
          createdByUsername: socketUser.username
        })

        socket.emit('team_action_success', {
          action: 'create',
          team,
          message: `Team "${teamName.trim()}" created successfully`
        })

        console.log(`🏆 User ${socketUser.userId} created team "${teamName.trim()}" in room ${roomId}`)
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Join team handler
    socket.on('join_team', async (data: { teamIdentifier: string }) => {
      try {
        if (!socketUser) {
          socket.emit('error', { error: 'Not authenticated' })
          return
        }

        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? await userManager.getUserById(payload.userId) : null
        const currentRoom = user ? userManager.getUserCurrentRoom(user.id) : null
        if (!user || !currentRoom) {
          socket.emit('error', { error: 'Not in a room' })
          return
        }

        const { teamIdentifier } = data
        const roomId = currentRoom

        if (!teamIdentifier || typeof teamIdentifier !== 'string') {
          socket.emit('error', { error: 'Team identifier is required' })
          return
        }

        const game = gameManager.getGame(roomId)
        if (!game || !(game instanceof ContextoTeamGame)) {
          socket.emit('error', { error: 'Not in a team game' })
          return
        }

        if (game.started) {
          socket.emit('error', { error: 'Cannot join teams after game has started' })
          return
        }

        game.joinTeam(socketUser.userId, teamIdentifier.trim())
        const team = game.getPlayerTeam(socketUser.userId)

        // Notify all players in the room about the team join
        io.to(roomId).emit('team_updated', {
          team,
          joinedBy: socketUser.userId,
          joinedByUsername: socketUser.username
        })

        socket.emit('team_action_success', {
          action: 'join',
          team,
          message: `Joined team "${team?.name}" successfully`
        })

        console.log(`🏆 User ${socketUser.userId} joined team "${team?.name}" in room ${roomId}`)
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Leave team handler
    socket.on('leave_team', async () => {
      try {
        if (!socketUser) {
          socket.emit('error', { error: 'Not authenticated' })
          return
        }

        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? await userManager.getUserById(payload.userId) : null
        const currentRoom = user ? userManager.getUserCurrentRoom(user.id) : null
        if (!user || !currentRoom) {
          socket.emit('error', { error: 'Not in a room' })
          return
        }

        const roomId = currentRoom

        const game = gameManager.getGame(roomId)
        if (!game || !(game instanceof ContextoTeamGame)) {
          socket.emit('error', { error: 'Not in a team game' })
          return
        }

        if (game.started) {
          socket.emit('error', { error: 'Cannot leave team after game has started' })
          return
        }

        const team = game.getPlayerTeam(socketUser.userId)
        if (!team) {
          socket.emit('error', { error: 'Not on a team' })
          return
        }

        const teamName = team.name
        const teamId = team.id
        game.removePlayer(socketUser.userId)
        
        // Check if team still exists after removing player (it gets deleted if empty)
        const teamStillExists = game.getTeams().some(t => t.id === teamId)

        // Notify all players in the room about the team leave
        io.to(roomId).emit('team_updated', {
          leftBy: socketUser.userId,
          leftByUsername: socketUser.username,
          teamName: teamName,
          teamId: teamId,
          teamDeleted: !teamStillExists
        })

        socket.emit('team_action_success', {
          action: 'leave',
          message: `Left team "${teamName}" successfully`
        })

        console.log(`🏆 User ${socketUser.userId} left team "${teamName}" in room ${roomId}`)
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // List teams handler
    socket.on('list_teams', async () => {
      try {
        if (!socketUser) {
          socket.emit('error', { error: 'Not authenticated' })
          return
        }

        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? await userManager.getUserById(payload.userId) : null
        const currentRoom = user ? userManager.getUserCurrentRoom(user.id) : null
        if (!user || !currentRoom) {
          socket.emit('error', { error: 'Not in a room' })
          return
        }

        const roomId = currentRoom

        const game = gameManager.getGame(roomId)
        if (!game || !(game instanceof ContextoTeamGame)) {
          socket.emit('error', { error: 'Not in a team game' })
          return
        }

        const teams = game.getTeams()
        const playerTeam = game.getPlayerTeam(socketUser.userId)

        socket.emit('teams_list', {
          teams,
          playerTeam,
          canJoinTeams: !game.started
        })
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Get team info handler
    socket.on('get_team_info', async () => {
      try {
        if (!socketUser) {
          socket.emit('error', { error: 'Not authenticated' })
          return
        }

        const payload = JWTService.verifyToken(socketUser.token)
        const user = payload ? await userManager.getUserById(payload.userId) : null
        const currentRoom = user ? userManager.getUserCurrentRoom(user.id) : null
        if (!user || !currentRoom) {
          socket.emit('error', { error: 'Not in a room' })
          return
        }

        const roomId = currentRoom

        const game = gameManager.getGame(roomId)
        if (!game || !(game instanceof ContextoTeamGame)) {
          socket.emit('error', { error: 'Not in a team game' })
          return
        }

        const playerTeam = game.getPlayerTeam(socketUser.userId)
        const otherTeamsBest = game.getOtherTeamsBestGuesses(socketUser.userId)
        const teamRankings = game.getTeamRankings()

        socket.emit('team_info', {
          playerTeam,
          otherTeamsBest,
          teamRankings,
          gameStarted: game.started,
          gameFinished: game.finished
        })
      } catch (error: any) {
        socket.emit('error', { error: error.message })
      }
    })

    // Listen for player info updates (e.g., username change)
    socket.on('update_player', async (data: Partial<Player>) => {
      try {
        if (!socketUser) {
          socket.emit('error', { error: 'Not authenticated' })
          return
        }

        const player = await userManager.getUserById(socketUser.userId)
        if (!player) {
          socket.emit('error', { error: 'Player not found' })
          return
        }

        let fields: Partial<Player>
        try {
          // Only allow editable fields (currently username)
          fields = zod.object({
            username: zod.string().optional(),
            avatarUrl: zod.string().url().optional(),
            // Add other fields as needed
          }).parse(data)
        } catch (error: any) {
          socket.emit('error', { error: 'Invalid data format' })
          return
        }

        await userManager.updatePlayer(player.id, fields)

        console.log(`✅ User ${player.id} updated info:`, fields)
        socket.emit('player_update_success', { player })
        // Notify all players in the room about the update
        const currentRoom = player ? userManager.getUserCurrentRoom(player.id) : null
        if (currentRoom) {
          io.to(currentRoom).emit('player_updated', {
            id: player.id,
            username: player.username,
            // Add more fields as needed
          })
          console.log(`🔄 User ${player.id} updated info in room ${currentRoom}:`, fields)
          return
        }
      } catch (error: any) {
        console.error(`❌ Error updating player ${socketUser?.userId}:`, error.message)
        socket.emit('error', { error: error.message })
      }
    })

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.id}`)

      if (socketUser) {
        try {
          // Only process disconnect if this is the current socket for the user
          const currentSocketId = userSocketMap.get(socketUser.userId)
          if (currentSocketId === socket.id) {
            const currentRoom = userManager.getUserCurrentRoom(socketUser.userId)
            if (currentRoom) {
              // Get team info before removing player for team games
              const game = gameManager.getGame(currentRoom)
              let teamUpdateData: { leftBy: string; leftByUsername: string; teamName?: string } | null = null
              if (game instanceof ContextoTeamGame) {
                const playerTeam = game.getPlayerTeam(socketUser.userId)
                teamUpdateData = {
                  leftBy: socketUser.userId,
                  leftByUsername: socketUser.username || '',
                  teamName: playerTeam?.name
                }
              }

              // Notify room about player leaving
              socket.to(currentRoom).emit('player_left', {
                userId: socketUser.userId,
                username: socketUser.username
              })

              // Remove user from game
              gameManager.removeUserFromGame(socketUser.userId, currentRoom)

              // Emit team update for team games
              if (teamUpdateData && game instanceof ContextoTeamGame) {
                socket.to(currentRoom).emit('team_updated', teamUpdateData)
              }
            }

            // Clean up the socket mapping for this user
            userSocketMap.delete(socketUser.userId)
          } else {
            console.log(`🔄 Ignoring disconnect from old socket for user ${socketUser.userId} (current: ${currentSocketId}, disconnecting: ${socket.id})`)
          }
        } catch (error) {
          console.error(`❌ Error handling disconnect for user ${socketUser.userId}:`, error)
          // Continue with cleanup even if there's an error
        }
      }
    })

    // Error handler
    socket.on('error', (error) => {
      console.error(`❌ Socket error for ${socket.id}:`, error)
    })
  })

  // Periodic cleanup
  setInterval(async () => {
    const removedGames = gameManager.cleanupOldGames()
    if (removedGames > 0) {
      console.log(`🧹 Cleanup: Removed ${removedGames} old games`)
    }

    // const removedUsers = await userManager.cleanupInactiveUsers()
    // if (removedGames > 0 || removedUsers > 0) {
    //   console.log(`🧹 Cleanup: Removed ${removedGames} old games and ${removedUsers} inactive users`)
    // }
  }, 30 * 60 * 1000) // Every 30 minutes

  console.log('⚡ Socket.IO handlers set up successfully')
}
