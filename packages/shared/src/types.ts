// Game-related types
export type GameMode = 'default' | 'competitive' | 'battle-royale' | 'stop'

export interface GameWord {
  word: string
  lemma?: string
  distance?: number
  error?: string // Error message if the word was invalid
}

export interface Guess {
  word: string
  lemma?: string
  distance: number
  addedBy: string
  error?: string // Error message if the guess was invalid
  hidden?: boolean // For multiplayer, to hide guesses until revealed
}

export interface IGame {
  id: string
  gameId: number
  started: boolean
  finished: boolean
  guessCount: number
  allowTips: boolean
  allowGiveUp: boolean
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

// Player types
export interface Player {
  id: string
  username?: string
  gamesPlayed: number
  gamesWon: number
  winRate: number
  averageGuesses: number
  isActive: boolean
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  hasMore: boolean
}

// Socket event types
export interface SocketEvents {
  // Client to server
  'join-room': (roomId: string) => void
  'leave-room': (roomId: string) => void
  'make-guess': (data: { roomId: string; word: string }) => void
  
  // Server to client
  'room-joined': (data: { roomId: string; players: Player[] }) => void
  'room-left': (data: { roomId: string }) => void
  'new-guess': (data: { guess: Guess; playerId: string }) => void
  'game-finished': (data: { roomId: string; winner?: string }) => void
  'player-joined': (data: { player: Player }) => void
  'player-left': (data: { playerId: string }) => void
  'error': (data: { message: string }) => void
}
