import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookie-based auth
  headers: {
    'Content-Type': 'application/json',
  },
})

// Types
export interface User {
  token: string
  username?: string
  gamesPlayed: number
  gamesWon: number
  winRate: number
  averageGuesses: number
  currentRoom?: string
  isActive: boolean
}

export interface Guess {
  word: string
  lemma?: string
  distance: number
  addedBy: string
  error?: string
}

export interface GameRoom {
  roomId: string
  gameId: number
  type: 'default' | 'competitive' | 'battle-royale' | 'stop'
  finished: boolean
  guessCount: number
  createdAt: string
}

export interface CreateGameResponse {
  roomId: string
  gameId: number
  type: string
  message: string
}

export interface GuessResponse {
  guess: Guess
  gameFinished: boolean
  guessCount: number
}

export interface RoomInfo {
  roomId: string
  gameId: number
  gameDate: string
  type: string
  finished: boolean
  started: boolean
  guessCount: number
  allowTips: boolean
  allowGiveUp: boolean
  playersProgress?: any[]
  usedWords?: number
}

// API functions
export const gameApi = {
  // Game management
  createGame: async (type: 'default' | 'competitive' | 'battle-royale' | 'stop', gameId?: number): Promise<CreateGameResponse> => {
    const response = await api.post('/api/game/create', { type, gameId })
    return response.data
  },

  joinGame: async (roomId: string) => {
    const response = await api.post(`/api/game/join/${roomId}`)
    return response.data
  },

  makeGuess: async (roomId: string, word: string): Promise<GuessResponse> => {
    const response = await api.post(`/api/game/guess/${roomId}`, { word })
    return response.data
  },

  getClosestGuesses: async (roomId: string, count = 10) => {
    const response = await api.get(`/api/game/closest/${roomId}?count=${count}`)
    return response.data
  },

  leaveGame: async (roomId: string) => {
    const response = await api.post(`/api/game/leave/${roomId}`)
    return response.data
  },

  getGameStats: async () => {
    const response = await api.get('/api/game/stats')
    return response.data
  },
}

export const roomApi = {
  // Room management
  getRoomInfo: async (roomId: string): Promise<RoomInfo> => {
    const response = await api.get(`/api/rooms/${roomId}`)
    return response.data
  },

  getActiveRooms: async (type?: string, limit = 50): Promise<{ rooms: GameRoom[], total: number, hasMore: boolean }> => {
    const params = new URLSearchParams()
    if (type) params.append('type', type)
    params.append('limit', limit.toString())
    
    const response = await api.get(`/api/rooms?${params}`)
    return response.data
  },

  getUserRooms: async (): Promise<{ rooms: GameRoom[], total: number }> => {
    const response = await api.get('/api/rooms/user/me')
    return response.data
  },
}

export const userApi = {
  // User management
  getCurrentUser: async (): Promise<User> => {
    const response = await api.get('/api/users/me')
    return response.data
  },

  setUsername: async (username: string) => {
    const response = await api.post('/api/users/username', { username })
    return response.data
  },

  generateAnonymousUsername: async () => {
    const response = await api.post('/api/users/username/anonymous')
    return response.data
  },

  getUserStats: async () => {
    const response = await api.get('/api/users/stats')
    return response.data
  },

  checkUsernameAvailability: async (username: string) => {
    const response = await api.get(`/api/users/username/check/${username}`)
    return response.data
  },

  getLeaderboard: async (limit = 10, sortBy = 'winRate') => {
    const response = await api.get(`/api/users/leaderboard?limit=${limit}&sortBy=${sortBy}`)
    return response.data
  },
}

export const healthApi = {
  getServerStatus: async () => {
    const response = await api.get('/health')
    return response.data
  },
}

// Error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message)
    return Promise.reject(error)
  }
)

export default api
