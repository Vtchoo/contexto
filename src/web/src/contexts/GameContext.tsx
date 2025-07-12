import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { io, Socket } from 'socket.io-client'
import { gameApi, userApi, User, Guess } from '../api/gameApi'

interface GameContextType {
  user: User | null
  socket: Socket | null
  currentRoom: string | null
  isConnected: boolean
  loading: boolean
  error: string | null
  guesses: Guess[]
  gameFinished: boolean
  connect: () => void
  disconnect: () => void
  createGame: (type: 'default' | 'competitive' | 'battle-royale', gameId?: number) => Promise<string>
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
  const [currentRoom, setCurrentRoom] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [gameFinished, setGameFinished] = useState(false)

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
      setCurrentRoom(data.roomId)
    })

    newSocket.on('room_left', () => {
      setCurrentRoom(null)
    })

    newSocket.on('game_update', (data) => {
      if (data.guesses) setGuesses(data.guesses)
      if (data.gameFinished !== undefined) setGameFinished(data.gameFinished)
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
      setCurrentRoom(null)
    }
  }

  const createGame = async (type: 'default' | 'competitive' | 'battle-royale', gameId?: number): Promise<string> => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await gameApi.createGame(type)
      
      // Join the game room via socket
      if (socket && isConnected) {
        socket.emit('join_game', { gameId: response.gameId })
      }
      
      setGuesses([])
      setGameFinished(false)
      
      return response.gameId.toString()
    } catch (err) {
      setError('Falha ao criar jogo')
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
    if (socket && isConnected && currentRoom) {
      socket.emit('leave_room')
    }
  }

  const makeGuess = async (word: string) => {
    if (!currentRoom || loading) return
    
    setLoading(true)
    setError(null)
    
    try {
      await gameApi.makeGuess(currentRoom, word)
      // The server will broadcast the update via socket
    } catch (err) {
      setError('Falha ao enviar tentativa')
      throw err
    } finally {
      setLoading(false)
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
        currentRoom,
        isConnected,
        loading,
        error,
        guesses,
        gameFinished,
        connect,
        disconnect,
        createGame,
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
