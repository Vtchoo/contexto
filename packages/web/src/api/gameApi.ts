import axios from 'axios'
import type { 
  GameMode, 
  Player, 
  Guess, 
  GameRoom, 
  CreateGameOptions, 
  CreateGameResponse, 
  GuessResponse, 
  RoomInfo 
} from '@contexto/shared'

const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.PROD ? window.location.origin : 'http://localhost:3001')

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookie-based auth
})

// Re-export types for convenience
export type { 
  GameMode, 
  Player, 
  Guess, 
  GameRoom, 
  CreateGameOptions, 
  CreateGameResponse, 
  GuessResponse, 
  RoomInfo 
} from '@contexto/shared'

// API functions
export const gameApi = {
  // Game management
  createGame: async (type: 'default' | 'competitive' | 'battle-royale' | 'stop', options?: CreateGameOptions): Promise<CreateGameResponse> => {
    const response = await api.post('/api/game', { ...options, type })
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
  // Initialize user - ensures user exists and cookies are set
  initUser: async (): Promise<Player> => {
    const response = await api.post('/api/users/init')
    return response.data.user
  },

  // User management
  getCurrentUser: async (): Promise<Player> => {
    const response = await api.get('/api/users/me')
    return response.data
  },

  getPlayerById: async (userId: string): Promise<Player> => {
    const response = await api.get(`/api/users/${userId}`)
    return response.data
  },

  // Update any user field(s)
  updateUser: async (fields: Partial<Player>) => {
    // PUT /api/users/me with any editable fields
    const response = await api.put('/api/users/me', fields)
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

  ping: async () => {
    const response = await api.get('/ping')
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
