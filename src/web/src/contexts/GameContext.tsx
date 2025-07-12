import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { gameApi, User, Guess } from '../api/gameApi'

interface CurrentGame {
  roomId: string
  gameId: string
  gameMode: 'default' | 'competitive' | 'battle-royale' | 'stop'
  guesses: Guess[]
  finished: boolean
}

interface GameContextType {
  user: User | null
  socket: Socket | null
  currentGame: CurrentGame | null
  isConnected: boolean
  loading: boolean
  error: string | null
  connect: () => void
  disconnect: () => void
  createGame: (type: 'default' | 'competitive' | 'battle-royale' | 'stop', gameId?: number) => Promise<string>
  quickPlay: (word: string) => Promise<void>
  joinRoom: (roomId: string) => Promise<void>
  leaveRoom: () => void
  makeGuess: (word: string) => Promise<void>
  clearError: () => void
}

const GameContext = createContext<GameContextType | undefined>(undefined)

interface GameProviderProps {
  children: ReactNode
}

export function GameProvider({ children }: GameProviderProps) {
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
      
      // Try to authenticate with existing token
      const token = localStorage.getItem('contexto-token')
      newSocket.emit('auth', { token })
    })

    newSocket.on('disconnect', () => {
      setIsConnected(false)
    })

    newSocket.on('auth_success', (data) => {
      setUser(data.user)
      localStorage.setItem('contexto-token', data.token)
    })

    newSocket.on('room_joined', (data) => {
      setCurrentGame(prev => ({
        roomId: data.roomId,
        gameId: data.gameId,
        gameMode: prev?.gameMode || 'default',
        guesses: prev?.guesses || [],
        finished: prev?.finished || false
      }))
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
      
      // Join the game room via socket
      if (socket && isConnected) {
        socket.emit('join_room', { roomId: response.roomId })
      }
      
      // Initialize the game state
      setCurrentGame({
        roomId: response.roomId.toString(),
        gameId: response.gameId?.toString() || response.roomId.toString(),
        gameMode: type,
        guesses: [],
        finished: false
      })
      
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

  const clearError = () => {
    setError(null)
  }

  // Auto-connect on mount
  useEffect(() => {
    connect()
    return () => disconnect()
  }, [])

  return (
    <GameContext.Provider
      value={{
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
        clearError,
      }}
    >
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const context = useContext(GameContext)
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider')
  }
  return context
}
