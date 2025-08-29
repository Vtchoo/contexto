// Export all types
export * from './types';

// Export all utilities
export * from './utils';

// Export all constants
export * from './constants';

// Re-export commonly used items with cleaner names
export {
  GREEN_THRESHOLD,
  YELLOW_THRESHOLD,
  getTodaysGameId,
  getBarWidth,
  getBarColor,
  cleanInput,
  isValidWord,
  calculateWinRate,
  formatDuration,
  debounce,
} from './utils';

export {
  GAME_CONFIG,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  HTTP_STATUS,
  SOCKET_EVENTS,
  VALIDATION_PATTERNS,
  DEFAULTS,
} from './constants';

export type {
  GameMode,
  Guess,
  Player,
  GameRoom,
  CreateGameOptions,
  ApiResponse,
  PaginatedResponse,
  SocketEvents,
} from './types';
