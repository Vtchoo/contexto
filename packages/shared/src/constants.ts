// Game configuration constants
export const GAME_CONFIG = {
  // Distance thresholds
  GREEN_THRESHOLD: 300,
  YELLOW_THRESHOLD: 1500,
  
  // Game limits
  MAX_PLAYERS_DEFAULT: 50,
  MAX_PLAYERS_COMPETITIVE: 10,
  MAX_PLAYERS_BATTLE_ROYALE: 20,
  MAX_PLAYERS_STOP: 8,
  
  // Timing
  DEFAULT_GUESS_TIMEOUT: 30000, // 30 seconds
  COMPETITIVE_GUESS_TIMEOUT: 15000, // 15 seconds
  STOP_ROUND_DURATION: 120000, // 2 minutes
  
  // Room settings
  ROOM_ID_LENGTH: 6,
  MAX_ROOM_INACTIVITY: 3600000, // 1 hour
  
  // User settings
  MAX_USERNAME_LENGTH: 20,
  MIN_USERNAME_LENGTH: 2,
  
  // API limits
  MAX_REQUESTS_PER_MINUTE: 100,
  MAX_CONCURRENT_GAMES: 10,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  // Game errors
  GAME_NOT_FOUND: 'Game not found',
  GAME_ALREADY_FINISHED: 'Game has already finished',
  GAME_NOT_STARTED: 'Game has not started yet',
  PLAYER_NOT_IN_GAME: 'Player is not in this game',
  ROOM_FULL: 'Room is full',
  INVALID_ROOM_ID: 'Invalid room ID',
  
  // Word errors
  WORD_TOO_SHORT: 'Word must be at least 2 characters long',
  WORD_INVALID_CHARACTERS: 'Word contains invalid characters',
  WORD_ALREADY_GUESSED: 'Word has already been guessed',
  WORD_NOT_FOUND: 'Word not found in dictionary',
  
  // User errors
  USERNAME_TOO_SHORT: 'Username must be at least 2 characters long',
  USERNAME_TOO_LONG: 'Username must be no more than 20 characters long',
  USERNAME_INVALID_CHARACTERS: 'Username contains invalid characters',
  USERNAME_TAKEN: 'Username is already taken',
  USER_NOT_FOUND: 'User not found',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'Too many requests, please try again later',
  
  // Server errors
  INTERNAL_SERVER_ERROR: 'Internal server error',
  DATABASE_ERROR: 'Database error',
  NETWORK_ERROR: 'Network error',
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  GAME_CREATED: 'Game created successfully',
  GAME_JOINED: 'Joined game successfully',
  GAME_LEFT: 'Left game successfully',
  GUESS_MADE: 'Guess made successfully',
  USERNAME_UPDATED: 'Username updated successfully',
  USER_CREATED: 'User created successfully',
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Socket event names
export const SOCKET_EVENTS = {
  // Connection
  CONNECT: 'connect',
  DISCONNECT: 'disconnect',
  
  // Room management
  JOIN_ROOM: 'join-room',
  LEAVE_ROOM: 'leave-room',
  ROOM_JOINED: 'room-joined',
  ROOM_LEFT: 'room-left',
  
  // Game events
  MAKE_GUESS: 'make-guess',
  NEW_GUESS: 'new-guess',
  GAME_STARTED: 'game-started',
  GAME_FINISHED: 'game-finished',
  
  // Player events
  PLAYER_JOINED: 'player-joined',
  PLAYER_LEFT: 'player-left',
  PLAYER_UPDATED: 'player-updated',
  
  // Errors
  ERROR: 'error',
  GAME_ERROR: 'game-error',
} as const;

// Validation patterns
export const VALIDATION_PATTERNS = {
  USERNAME: /^[a-zA-Z0-9_-]{2,20}$/,
  WORD: /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]{2,}$/,
  ROOM_ID: /^[A-Z0-9]{6}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
} as const;

// Default values
export const DEFAULTS = {
  GAME_MODE: 'default' as const,
  ALLOW_TIPS: true,
  ALLOW_GIVE_UP: true,
  MAX_PLAYERS: GAME_CONFIG.MAX_PLAYERS_DEFAULT,
  PAGE_SIZE: 20,
  LEADERBOARD_SIZE: 10,
} as const;
