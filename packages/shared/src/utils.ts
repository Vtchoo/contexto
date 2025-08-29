// Game constants
export const GREEN_THRESHOLD = 300;
export const YELLOW_THRESHOLD = 1500;

// Date constants (start dates for different languages)
export const PT_START_DATE = '2022-02-23';
export const EN_START_DATE = '2022-09-18';
export const ES_START_DATE = '2023-05-26';

// Utility functions that work in both browser and Node.js

/**
 * Clean and normalize user input
 */
export const cleanInput = (value: string): string => {
  return value.toLowerCase().trim();
};

/**
 * Get today's game ID based on days since Portuguese start date
 */
export const getTodaysGameId = (): number => {
  const startDate = new Date(PT_START_DATE);
  const today = new Date();
  const diffTime = Math.abs(today.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Get game ID for a specific date
 */
export const getGameIdForDate = (date: Date): number => {
  const startDate = new Date(PT_START_DATE);
  const diffTime = Math.abs(date.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

/**
 * Calculate progress bar width based on distance
 */
export const getBarWidth = (distance: number): number => {
  if (distance <= GREEN_THRESHOLD) {
    return Math.max(25, 100 * (GREEN_THRESHOLD - distance) / GREEN_THRESHOLD);
  } else if (distance <= YELLOW_THRESHOLD) {
    return Math.max(5, 25 * (YELLOW_THRESHOLD - distance) / (YELLOW_THRESHOLD - GREEN_THRESHOLD));
  } else {
    return 5;
  }
};

/**
 * Get progress bar color based on distance
 */
export const getBarColor = (distance: number): string => {
  if (distance <= GREEN_THRESHOLD) {
    const intensity = Math.max(0.3, (GREEN_THRESHOLD - distance) / GREEN_THRESHOLD);
    const red = Math.floor(0 + (255 - 0) * (1 - intensity));
    const green = Math.floor(128 + (255 - 128) * intensity);
    const blue = Math.floor(0 + (100 - 0) * (1 - intensity));
    return `rgb(${red}, ${green}, ${blue})`;
  } else if (distance <= YELLOW_THRESHOLD) {
    const intensity = Math.max(0.3, (YELLOW_THRESHOLD - distance) / (YELLOW_THRESHOLD - GREEN_THRESHOLD));
    const red = Math.floor(200 + (255 - 200) * intensity);
    const green = Math.floor(150 + (200 - 150) * intensity);
    const blue = Math.floor(0 + (50 - 0) * intensity);
    return `rgb(${red}, ${green}, ${blue})`;
  } else {
    return 'rgb(150, 150, 150)';
  }
};

/**
 * Generate a random tip distance that hasn't been used
 */
export const randomTipDistance = (usedDistances: number[]): number => {
  const maxDistance = GREEN_THRESHOLD - 1;
  let tipDistance = Math.floor(Math.random() * maxDistance - 1) + 1;

  if (usedDistances.length > 0) {
    while (usedDistances.includes(tipDistance)) {
      tipDistance = Math.floor(Math.random() * maxDistance - 1) + 1;
    }
  }

  return tipDistance;
};

/**
 * Validate if a word is acceptable (basic validation)
 */
export const isValidWord = (word: string): boolean => {
  if (!word || typeof word !== 'string') return false;
  
  const cleaned = cleanInput(word);
  
  // Must be at least 2 characters
  if (cleaned.length < 2) return false;
  
  // Must contain only letters (including accented characters)
  const letterPattern = /^[a-zA-ZÀ-ÿ\u0100-\u017F\u0180-\u024F\u1E00-\u1EFF]+$/;
  return letterPattern.test(cleaned);
};

/**
 * Calculate win rate percentage
 */
export const calculateWinRate = (gamesWon: number, gamesPlayed: number): number => {
  if (gamesPlayed === 0) return 0;
  return Math.round((gamesWon / gamesPlayed) * 100);
};

/**
 * Format time duration in a human-readable way
 */
export const formatDuration = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

/**
 * Debounce function for limiting function calls
 */
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | number;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout as any);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Simple event emitter for client-side events
 */
export class SimpleEventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, callback: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(callback);
  }

  off(event: string, callback: Function): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(cb => cb !== callback);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(callback => callback(...args));
  }

  once(event: string, callback: Function): void {
    const onceCallback = (...args: any[]) => {
      callback(...args);
      this.off(event, onceCallback);
    };
    this.on(event, onceCallback);
  }
}
