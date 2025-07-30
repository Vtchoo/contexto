import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { gameApi, userApi, Player, Guess } from '../api/gameApi'
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
  const [user, setUser] = useState<Player | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Use ref to track if initialization is in progress to prevent race conditions
  const initializationInProgress = useRef(false)

  // Initialize user first, then connect socket
  const initializeApp = async () => {
    // Prevent double initialization (React StrictMode calls useEffect twice)
    if (isInitialized || user || initializationInProgress.current) {
      console.log('Already initialized or in progress, skipping...')
      return
    }

    // Mark initialization as in progress
    initializationInProgress.current = true

    try {
      console.log('Initializing user...')
      const userData = await userApi.initUser()
      setUser(userData)
      setIsInitialized(true)
      console.log('User initialized:', userData)
      
      // Only connect socket after user is initialized
      // connect()
    } catch (err) {
      console.error('Failed to initialize user:', err)
      setError('Falha ao inicializar usuário')
    } finally {
      // Always reset the flag when done (success or failure)
      initializationInProgress.current = false
    }
  }

  useEffect(() => {
    if (!user)
      return;
    
    connect()

    return () => {
      if (socket) {
        socket.disconnect()
        setSocket(null)
        setIsConnected(false)
        setCurrentGame(null)
      }
    }
  }, [user])

  const connect = () => {
    if (!isInitialized) return

    console.log('Connecting socket...')
    const newSocket = io('http://localhost:3001', {
      withCredentials: true, // This ensures cookies are sent
    })

    newSocket.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
    })

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false)
      console.log('Socket disconnected', reason)
    })

    newSocket.on('room_joined', (data) => {
      console.log('Room joined event:', data) // Debug log
      setCurrentGame(prev => {
        const newGame = {
          roomId: data.roomId,
          gameId: data.gameId,
          gameMode: data?.gameMode || 'default',
          guesses: data?.guesses || prev?.guesses || [],
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
            addedBy: data.addedBy,
            error: data.error,
            hidden: data.hidden
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
      setError(data.error)
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
    if (!isInitialized) {
      setError('Aplicação não foi inicializada')
      throw new Error('Application not initialized')
    }

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
    if (!isInitialized) {
      setError('Aplicação não foi inicializada')
      throw new Error('Application not initialized')
    }

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
    if (!isInitialized || !socket || !isConnected) {
      setError('Aplicação não foi inicializada ou socket não conectado')
      return
    }
    socket.emit('join_room', { roomId })
  }

  const leaveRoom = () => {
    if (socket && isConnected && currentGame?.roomId) {
      socket.emit('leave_room')
    }
  }

  const makeGuess = async (word: string) => {
    console.log('Making guess:', word) // Debug log
    console.log(currentGame, 'loading:', loading, 'isInitialized:', isInitialized) // Debug log
    if (!currentGame?.roomId || loading || !isInitialized) return

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
    console.log('isInitialized:', isInitialized) // Debug log
    
    if (!currentGame?.roomId || !socket || !isConnected || !isInitialized) {
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

  // Initialize app on mount
  useEffect(() => {
    initializeApp()
    return () => disconnect()
  }, [])

  return {
    user,
    socket,
    currentGame,
    isConnected,
    isInitialized,
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
