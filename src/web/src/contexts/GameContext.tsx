import { useState, useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { gameApi, userApi, Player, Guess, CreateGameOptions } from '../api/gameApi'
import contextualize from '@/utils/contextualize'
import { useCache } from '@/hooks/useCache'

const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001'

interface CurrentGame {
  roomId: string
  gameId: string
  gameMode: 'default' | 'competitive' | 'battle-royale' | 'stop'
  guesses: Guess[]
  finished: boolean
  started: boolean
  isHost: boolean
  players?: string[] // List of player IDs in the game
}

type Theme = 'light' | 'dark' | 'auto'

interface GameSettings {
  theme: Theme
}

// Helper functions for localStorage
const getStoredSettings = (): GameSettings => {
  const stored = localStorage.getItem('contexto-game-settings')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // If parsing fails, return defaults
    }
  }
  return {
    theme: 'auto',
  }
}

const saveSettings = (settings: GameSettings) => {
  localStorage.setItem('contexto-game-settings', JSON.stringify(settings))
}

// Check if user prefers dark mode by default
const getSystemPrefersDark = (): boolean => {
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function useGameHook() {
  const [user, setUser] = useState<Player | null>(null)
  const [socket, setSocket] = useState<Socket | null>(null)
  const [currentGame, setCurrentGame] = useState<CurrentGame | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Theme and settings state
  const [settings, setSettings] = useState<GameSettings>(() => getStoredSettings())

  // const [playersCache, setPlayersCache] = useState<Map<string, Player>>(new Map())
  const { get: getPlayerFromCache, add: addToPlayerCache } = useCache(async (playerId: string) => userApi.getPlayerById(playerId))
  
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

  // Apply theme to document
  const applyTheme = (theme: Theme) => {
    let effectiveTheme: 'light' | 'dark'
    
    if (theme === 'auto') {
      effectiveTheme = getSystemPrefersDark() ? 'dark' : 'light'
    } else {
      effectiveTheme = theme
    }
    
    document.documentElement.setAttribute('data-theme', effectiveTheme)
  }

  // Theme and settings functions
  const setTheme = (theme: Theme) => {
    const newSettings = { ...settings, theme }
    setSettings(newSettings)
    saveSettings(newSettings)
    applyTheme(theme)
  }

  // Initialize theme on mount
  useEffect(() => {
    applyTheme(settings.theme)
    // Listen for system theme changes when using auto mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (settings.theme === 'auto') {
        applyTheme('auto')
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [settings.theme])

  useEffect(() => {
    if (!user)
      return
    
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
    const newSocket = io(socketUrl, {
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

    newSocket.on('room_joined', async (data) => {
      console.log('Room joined event:', data) // Debug log
      setCurrentGame(prev => {
        const newGame = {
          roomId: data.roomId,
          gameId: data.gameId,
          gameMode: data?.gameMode || 'default',
          guesses: data?.guesses || prev?.guesses || [],
          finished: prev?.finished || false,
          started: data.started !== undefined ? data.started : (prev?.started || (prev?.gameMode === 'default' || prev?.gameMode === 'competitive')),
          isHost: data.isHost !== undefined ? data.isHost : (prev?.isHost || false),
          players: data.players || prev?.players || []
        }
        console.log('Setting currentGame to:', newGame) // Debug log
        return newGame
      })
      // const players = await getPlayersById(data.players || [])
      // setPlayersCache(prevCache => {
      //   const updatedCache = new Map(prevCache)
      //   players.forEach(player => {
      //     updatedCache.set(player.id, player)
      //   })
      //   return updatedCache
      // })
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
        
        const newGuess = {
          word: data.word,
          distance: data.distance,
          addedBy: data.addedBy,
          error: data.error,
          hidden: data.hidden
        }
        
        let updatedGuesses = [...prev.guesses]
        
        // If it's the current user's guess, always add it
        if (data.addedBy === user?.id) {
          updatedGuesses.push(newGuess)
        } else {
          // For other players' guesses in competitive and stop modes, keep only the closest guess per player
          if (prev.gameMode === 'competitive' || prev.gameMode === 'stop') {
            // Find existing guess from this player
            const existingGuessIndex = updatedGuesses.findIndex(guess => guess.addedBy === data.addedBy)
            
            if (existingGuessIndex >= 0) {
              const existingGuess = updatedGuesses[existingGuessIndex]
              // Only replace if the new guess is closer (lower distance)
              if (data.distance < existingGuess.distance) {
                updatedGuesses[existingGuessIndex] = newGuess
              }
              // If new guess is not closer, don't add it
            } else {
              // No existing guess from this player, add the new one
              updatedGuesses.push(newGuess)
            }
          } else {
            // For default and battle-royale modes, keep all guesses
            updatedGuesses.push(newGuess)
          }
        }
        
        return {
          ...prev,
          guesses: updatedGuesses
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

    // Listen for new player joining the room
    newSocket.on('player_joined', (data) => {
      setCurrentGame(prev => {
        if (!prev) return null
        // Update players list if provided
        // {
        //   userId: socketUser.userId,
        //   username: socketUser.username
        // }
        return {
          ...prev,
          players: [...(prev.players || []), data.userId],
        }
      })
      // getPlayersById([data.userId]).then(players => {
      //   players.forEach(player => {
      //     setPlayersCache(prevCache => new Map(prevCache).set(player.id, player))
      //   })
      // })
    })

    // Listen for player leaving the room
    newSocket.on('player_left', (data) => {
      setCurrentGame(prev => {
        if (!prev) return null
        // Remove the player from the list
        return {
          ...prev,
          players: (prev.players || []).filter(id => id !== data.userId),
        }
      })
    })

    newSocket.on('player_updated', (data) => {
      // setPlayersCache(prev => {
      //   const updatedCache = new Map(prev)
      //   updatedCache.set(data.id, {
      //     ...updatedCache.get(data.id),
      //     ...data
      //   })
      //   return updatedCache
      // })
      addToPlayerCache(data.id, {
        // ...getPlayerFromCache(data.id),
        ...data
      })
    })

    newSocket.on('player_update_success', (data) => {
      setUser(prev => {
        if (!prev) return null
        return {
          ...prev,
          ...data
        }
      })
      // Update player in cache
      addToPlayerCache(data.id, {
        ...data.player
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

  const createGame = async (type: 'default' | 'competitive' | 'battle-royale' | 'stop', options?: CreateGameOptions): Promise<string> => {
    if (!isInitialized) {
      setError('Aplicação não foi inicializada')
      throw new Error('Application not initialized')
    }

    setLoading(true)
    setError(null)

    try {
      const response = await gameApi.createGame(type, options)

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

  const updatePlayer = async (playerInfo: Partial<Player>) => {
    if (!isInitialized || !socket || !isConnected) {
      setError('Aplicação não foi inicializada ou socket não conectado')
      return
    }

    socket.emit('update_player', playerInfo)

    // try {
    //   const updatedPlayer = await userApi.updateUser(playerInfo)
    //   setUser(updatedPlayer)

    //   // Update player in cache
    //   addToPlayerCache(updatedPlayer.id, updatedPlayer)

    //   // Emit event to update player info in other clients
    //   if (socket.connected) {
    //     socket.emit('update_player', updatedPlayer)
    //   }
    // } catch (err) {
    //   setError('Falha ao atualizar usuário')
    //   throw err
    // }
  }

  const clearError = () => {
    setError(null)
  }

  // Initialize app on mount
  useEffect(() => {
    initializeApp()
    return () => disconnect()
  }, [])

  function getPlayerById(id: string): Player | undefined {
    const player = getPlayerFromCache(id)
    if (player.value) {
      return player.value
    }
  }

  return {
    user,
    socket,
    currentGame,
    isConnected,
    isInitialized,
    loading,
    error,
    settings,
    connect,
    disconnect,
    createGame,
    quickPlay,
    joinRoom,
    leaveRoom,
    makeGuess,
    startGame,
    clearError,
    getPlayerById,
    updatePlayer,
    setTheme,
  }
}

const [GameProvider, useGame] = contextualize(useGameHook)

export { GameProvider, useGame }
