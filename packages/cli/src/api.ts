import axios, { AxiosInstance } from 'axios'
import * as http from 'http'
import * as https from 'https'

// Local type definitions to avoid dependency issues
export type GameMode = 'default' | 'competitive' | 'battle-royale' | 'stop'

export interface Player {
  id: string
  username?: string
  gamesPlayed: number
  gamesWon: number
  winRate: number
  averageGuesses: number
  isActive: boolean
}

export interface Guess {
  word: string
  lemma?: string
  distance: number
  addedBy: string
  error?: string
  hidden?: boolean
}

export interface GameRoom {
  roomId: string
  gameId: number
  type: GameMode
  finished: boolean
  guessCount: number
  createdAt: string
}

export interface CreateGameOptions {
  gameId?: number | Date | 'random'
  allowTips?: boolean
  allowGiveUp?: boolean
  maxPlayers?: number
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

class GameApiClient {
  private api: AxiosInstance
  private cookieString: string = ''
  public httpAgent: http.Agent
  public httpsAgent: https.Agent

  constructor(baseURL: string = 'http://localhost:3001') {
    // Create persistent agents that maintain connection pools
    this.httpAgent = new http.Agent({ 
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 5
    })
    this.httpsAgent = new https.Agent({ 
      keepAlive: true,
      keepAliveMsecs: 1000,
      maxSockets: 5
    })
    
    // Create axios instance
    this.api = axios.create({
      baseURL,
      httpAgent: this.httpAgent,
      httpsAgent: this.httpsAgent,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Contexto-CLI/1.0.0'
      }
    })

    // Request interceptor to add cookies
    this.api.interceptors.request.use((config) => {
      if (this.cookieString) {
        config.headers.Cookie = this.cookieString
      }
      return config
    })

    // Response interceptor for cookie handling and error handling
    this.api.interceptors.response.use(
      (response) => {
        // Extract and store cookies from response
        const setCookieHeader = response.headers['set-cookie']
        if (setCookieHeader) {
          this.cookieString = setCookieHeader
            .map(cookie => cookie.split(';')[0])
            .join('; ')
        }
        return response
      },
      (error) => {
        if (error.response?.data?.message) {
          console.error('API Error:', error.response.data.message)
        } else {
          console.error('API Error:', error.message)
        }
        return Promise.reject(error)
      }
    )
  }

  // Get the HTTP agent for socket.io to share cookies
  getHttpAgent() {
    return this.httpAgent
  }

  getHttpsAgent() {
    return this.httpsAgent
  }

  getCookieString() {
    return this.cookieString
  }

  // Game API methods
  async createGame(type: GameMode, options?: CreateGameOptions): Promise<CreateGameResponse> {
    const response = await this.api.post('/api/game', { ...options, type })
    return response.data
  }

  async joinGame(roomId: string) {
    const response = await this.api.post(`/api/game/join/${roomId}`)
    return response.data
  }

  async makeGuess(roomId: string, word: string): Promise<GuessResponse> {
    const response = await this.api.post(`/api/game/guess/${roomId}`, { word })
    return response.data
  }

  async getClosestGuesses(roomId: string, count = 10) {
    const response = await this.api.get(`/api/game/closest/${roomId}?count=${count}`)
    return response.data
  }

  async leaveGame(roomId: string) {
    const response = await this.api.post(`/api/game/leave/${roomId}`)
    return response.data
  }

  async getGameStats() {
    const response = await this.api.get('/api/game/stats')
    return response.data
  }

  // Room API methods
  async getRoomInfo(roomId: string): Promise<RoomInfo> {
    const response = await this.api.get(`/api/rooms/${roomId}`)
    return response.data
  }

  async getActiveRooms(type?: string, limit = 50): Promise<{ rooms: GameRoom[], total: number, hasMore: boolean }> {
    const params = new URLSearchParams()
    if (type) params.append('type', type)
    params.append('limit', limit.toString())
    
    const response = await this.api.get(`/api/rooms?${params}`)
    return response.data
  }

  async getUserRooms(): Promise<{ rooms: GameRoom[], total: number }> {
    const response = await this.api.get('/api/rooms/user/me')
    return response.data
  }

  // User API methods
  async initUser(): Promise<Player> {
    const response = await this.api.post('/api/users/init')
    return response.data.user
  }

  async getCurrentUser(): Promise<Player> {
    const response = await this.api.get('/api/users/me')
    return response.data
  }

  async getPlayerById(userId: string): Promise<Player> {
    const response = await this.api.get(`/api/users/${userId}`)
    return response.data
  }

  async updateUser(fields: Partial<Player>) {
    const response = await this.api.put('/api/users/me', fields)
    return response.data
  }

  async generateAnonymousUsername() {
    const response = await this.api.post('/api/users/username/anonymous')
    return response.data
  }

  async getUserStats() {
    const response = await this.api.get('/api/users/stats')
    return response.data
  }

  async checkUsernameAvailability(username: string) {
    const response = await this.api.get(`/api/users/username/check/${username}`)
    return response.data
  }

  async getLeaderboard(limit = 10, sortBy = 'winRate') {
    const response = await this.api.get(`/api/users/leaderboard?limit=${limit}&sortBy=${sortBy}`)
    return response.data
  }

  // Health API methods
  async getServerStatus() {
    const response = await this.api.get('/health')
    return response.data
  }

  async ping() {
    const response = await this.api.get('/ping')
    return response.data
  }
}

export default GameApiClient
