import { useState, useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { gameApi, User, Guess } from '../api/gameApi'
import contextualize from '@/utils/contextualize'

interface CurrentGame {
  roomId: string
  gameId: string
  gameMode: 'default' | 'competitive' | 'battle-royale' | 'stop'
  guesses: Guess[]
  finished: boolean
  started: boolean
  isHost: boolean
}

function useGameHook() {
  const [user, setUser] = useState<User | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const connect = () => {
    if (socket?.connected) return

    const newSocket = io('http://localhost:3001', {
      withCredentials: true,
    })

    newSocket.on('connect', () => {
      setIsConnected(true)

      // Authenticate using cookies (no need to send token manually)
      newSocket.emit('auth', {})
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
    })

    newSocket.on('auth_success', (data) => {
      setUser(data.user)
      // Token is now handled via cookies, no need for localStorage
    })

    newSocket.on('room_joined', (data) => {
      console.log('Room joined event:', data) // Debug log
      setCurrentGame(prev => {
        const newGame = {
          roomId: data.roomId,
          gameId: data.gameId,
          gameMode: prev?.gameMode || 'default',
          guesses: prev?.guesses || [],
          finished: prev?.finished || false,
          started: data.started !== undefined ? data.started : (prev?.started || (prev?.gameMode === 'default' || prev?.gameMode === 'competitive')),
          isHost: data.isHost !== undefined ? data.isHost : (prev?.isHost || false)
        }
        console.log('Setting currentGame to:', newGame) // Debug log
        return newGame
      })
    })

    newSocket.on('room_left', () => {
      setCurrentGame(null)
    })

    newSocket.on('game_update', (data) => {
      setCurrentGame(prev => {
        if (!prev) return null
        return {
          ...prev,
          guesses: data.guesses || prev.guesses,
          finished: data.gameFinished !== undefined ? data.gameFinished : prev.finished
        }
      })
    })

    newSocket.on('guess_result', (data) => {
      // Handle our own guess result
      setCurrentGame(prev => {
        if (!prev) return null
        return {
          ...prev,
          guesses: [...prev.guesses, data.guess],
          finished: data.gameFinished || false
        }
      })
      setLoading(false)
    })

    newSocket.on('player_guess', (data) => {
      // Handle other players' guesses in multiplayer
      setCurrentGame(prev => {
        if (!prev) return null
        return {
          ...prev,
          guesses: [...prev.guesses, {
            word: data.word,
            distance: data.distance,
            addedBy: data.playerId,
            error: data.error
          }]
        }
      })
    })

    newSocket.on('game_finished', (data) => {
      setCurrentGame(prev => {
        if (!prev) return null
        return {
          ...prev,
          finished: true
        }
      })
      if (data.winner) {
        // Handle game completion
        console.log(`Game finished! Winner: ${data.winner}`)
      }
    })

    newSocket.on('game_started', () => {
      setCurrentGame(prev => {
        if (!prev) return null
        return {
          ...prev,
          started: true
        }
      })
    })

    newSocket.on('error', (data) => {
      setError(data.message)
    })

    setSocket(newSocket)
  }

  const disconnect = () => {
    if (socket) {
      socket.disconnect()
      setSocket(null)
      setIsConnected(false)
      setCurrentGame(null)
    }
  }

  const createGame = async (type: 'default' | 'competitive' | 'battle-royale' | 'stop', gameId?: number): Promise<string> => {
    setLoading(true)
    setError(null)

    try {
      const response = await gameApi.createGame(type, gameId)

      // Initialize the game state
      const initialGame = {
        roomId: response.roomId.toString(),
        gameId: response.gameId?.toString() || response.roomId.toString(),
        gameMode: type,
        guesses: [],
        finished: false,
        started: type === 'default' || type === 'competitive', // Auto-start for these modes
        isHost: true // User who creates the game is always the host
      }
      console.log('Creating game with initial state:', initialGame) // Debug log
      setCurrentGame(initialGame)

      // Join the room via socket to ensure the socket connection knows about it
      if (socket && isConnected) {
        console.log('Joining room via socket:', response.roomId) // Debug log
        socket.emit('join_room', { roomId: response.roomId })
      }

      return response.roomId.toString()
    } catch (err) {
      setError('Falha ao criar jogo')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const quickPlay = async (word: string): Promise<void> => {
    setLoading(true)
    setError(null)

    try {
      // Create a default game
      await createGame('default')

      if (socket && isConnected) {
        socket.emit('make_guess', { word })
      }
    } catch (err) {
      setError('Falha ao iniciar jogo rápido')
      throw err
    } finally {
      setLoading(false)
    }
  }

  const joinRoom = async (roomId: string) => {
    if (socket && isConnected) {
      socket.emit('join_room', { roomId })
    }
  }

  const leaveRoom = () => {
    if (socket && isConnected && currentGame?.roomId) {
      socket.emit('leave_room')
    }
  }

  const makeGuess = async (word: string) => {
    if (!currentGame?.roomId || loading) return

    setLoading(true)
    setError(null)

    try {
      if (socket && isConnected) {
        // Use Socket.IO for real-time guess
        socket.emit('make_guess', { word })
      } else {
        // Fallback to HTTP API
        await gameApi.makeGuess(currentGame.roomId, word)
        // The server will broadcast the update via socket
      }
    } catch (err) {
      setError('Falha ao enviar tentativa')
      setLoading(false)
      throw err
    }
  }

  const startGame = () => {
    console.log('startGame called') // Debug log
    console.log('currentGame:', currentGame) // Debug log
    console.log('socket connected:', socket?.connected) // Debug log
    console.log('isConnected:', isConnected) // Debug log
    
    if (!currentGame?.roomId || !socket || !isConnected) {
      console.log('startGame failed - missing requirements') // Debug log
      setError('Não é possível iniciar o jogo')
      return
    }

    console.log('Emitting start_game event') // Debug log
    socket.emit('start_game')
  }

  const clearError = () => {
    setError(null)
  }

  // Auto-connect on mount
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [])

  return {
    user,
    socket,
    currentGame,
    isConnected,
    loading,
    error,
    connect,
    disconnect,
    createGame,
    quickPlay,
    joinRoom,
    leaveRoom,
    makeGuess,
    startGame,
    clearError,
  }
}

const [GameProvider, useGame] = contextualize(useGameHook)

export { GameProvider, useGame }
