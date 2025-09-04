import axios from 'axios';
import { Agent as HttpAgent } from 'http';
import { Agent as HttpsAgent } from 'https';

// Environment configuration
const API_BASE_URL = process.env.API_URL || 'http://localhost:3001';

// Create a shared agent that will maintain cookies
const isHttps = API_BASE_URL.startsWith('https');
const sharedAgent = isHttps ? new HttpsAgent({ keepAlive: true }) : new HttpAgent({ keepAlive: true });

// Cookie storage for sharing between HTTP and WebSocket
let storedCookies = '';

// Create axios instance with shared agent
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for cookie-based auth
  httpAgent: !isHttps ? sharedAgent : undefined,
  httpsAgent: isHttps ? sharedAgent : undefined,
  headers: {
    'Origin': API_BASE_URL, // Make server think request comes from same origin
    'Referer': API_BASE_URL,
    'User-Agent': 'Contexto-CLI/1.0.0',
    'Content-Type': 'application/json',
  }
});

// Intercept responses to capture cookies
api.interceptors.response.use(
  (response) => {
    // Capture Set-Cookie headers from responses
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader && Array.isArray(setCookieHeader)) {
      storedCookies = setCookieHeader.join('; ');
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Function to get stored cookies for WebSocket
export const getStoredCookies = (): string => {
    console.log('Getting stored cookies:', storedCookies);
    return storedCookies;
};

// Export the shared agent for use with Socket.IO
export const getSharedAgent = () => sharedAgent;

// Types - matching web client
export type GameMode = 'default' | 'competitive' | 'battle-royale' | 'stop';

export interface Player {
  id: string;
  username?: string;
  gamesPlayed: number;
  gamesWon: number;
  winRate: number;
  averageGuesses: number;
  isActive: boolean;
}

export interface Guess {
  word: string;
  lemma?: string;
  distance: number;
  addedBy: string;
  error?: string;
  hidden?: boolean;
}

export interface GameRoom {
  roomId: string;
  gameId: number;
  type: 'default' | 'competitive' | 'battle-royale' | 'stop';
  finished: boolean;
  guessCount: number;
  createdAt: string;
}

export interface CreateGameOptions {
  gameId?: number | Date | 'random';
  allowTips?: boolean;
  allowGiveUp?: boolean;
  maxPlayers?: number;
}

export interface CreateGameResponse {
  roomId: string;
  gameId: number;
  type: string;
  message: string;
}

export interface GuessResponse {
  guess: Guess;
  gameFinished: boolean;
  guessCount: number;
}

export interface RoomInfo {
  roomId: string;
  gameId: number;
  gameDate: string;
  type: string;
  finished: boolean;
  started: boolean;
  guessCount: number;
  allowTips: boolean;
  allowGiveUp: boolean;
  playersProgress?: any[];
  usedWords?: number;
}

// API functions
export const gameApi = {
  // Game management
  createGame: async (type: 'default' | 'competitive' | 'battle-royale' | 'stop', options?: CreateGameOptions): Promise<CreateGameResponse> => {
    const response = await api.post('/api/game', { ...options, type });
    return response.data;
  },

  joinGame: async (roomId: string) => {
    const response = await api.post(`/api/game/join/${roomId}`);
    return response.data;
  },

  makeGuess: async (roomId: string, word: string): Promise<GuessResponse> => {
    const response = await api.post(`/api/game/guess/${roomId}`, { word });
    return response.data;
  },

  getClosestGuesses: async (roomId: string, count = 10) => {
    const response = await api.get(`/api/game/closest/${roomId}?count=${count}`);
    return response.data;
  },

  leaveGame: async (roomId: string) => {
    const response = await api.post(`/api/game/leave/${roomId}`);
    return response.data;
  },

  getGameStats: async () => {
    const response = await api.get('/api/game/stats');
    return response.data;
  },
};

export const roomApi = {
  // Room management
  getRoomInfo: async (roomId: string): Promise<RoomInfo> => {
    const response = await api.get(`/api/rooms/${roomId}`);
    return response.data;
  },

  getActiveRooms: async (type?: string, limit = 50): Promise<{ rooms: GameRoom[], total: number, hasMore: boolean }> => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    params.append('limit', limit.toString());
    
    const response = await api.get(`/api/rooms?${params}`);
    return response.data;
  },

  getUserRooms: async (): Promise<{ rooms: GameRoom[], total: number }> => {
    const response = await api.get('/api/rooms/user/me');
    return response.data;
  },
};

export const userApi = {
  // Initialize user - ensures user exists and cookies are set
  initUser: async (): Promise<Player> => {
    const response = await api.post('/api/users/init');
    return response.data.user;
  },

  // User management
  getCurrentUser: async (): Promise<Player> => {
    const response = await api.get('/api/users/me');
    return response.data;
  },

  getPlayerById: async (userId: string): Promise<Player> => {
    const response = await api.get(`/api/users/${userId}`);
    return response.data;
  },

  // Update any user field(s)
  updateUser: async (fields: Partial<Player>) => {
    // PUT /api/users/me with any editable fields
    const response = await api.put('/api/users/me', fields);
    return response.data;
  },

  generateAnonymousUsername: async () => {
    const response = await api.post('/api/users/username/anonymous');
    return response.data;
  },

  getUserStats: async () => {
    const response = await api.get('/api/users/stats');
    return response.data;
  },

  checkUsernameAvailability: async (username: string) => {
    const response = await api.get(`/api/users/username/check/${username}`);
    return response.data;
  },

  getLeaderboard: async (limit = 10, sortBy = 'winRate') => {
    const response = await api.get(`/api/users/leaderboard?limit=${limit}&sortBy=${sortBy}`);
    return response.data;
  },
};

export const healthApi = {
  getServerStatus: async () => {
    const response = await api.get('/health');
    return response.data;
  },
};

// Error handling
api.interceptors.response.use(
  (response) => {
    // Capture Set-Cookie headers from responses
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader && Array.isArray(setCookieHeader)) {
      storedCookies = setCookieHeader.join('; ');
    }
    return response;
  },
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
