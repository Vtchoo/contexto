// Web-safe exports - no TypeORM or Node.js specific code
export { getTodaysGameId, GREEN_THRESHOLD, YELLOW_THRESHOLD, getBarColor, getBarWidth } from './utils/misc'

// Game types only (no implementations that depend on TypeORM)
export type { IGame, Guess } from './game/interface'
