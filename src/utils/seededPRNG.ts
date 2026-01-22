/**
 * Simple seeded pseudo-random number generator
 * Uses a string seed to generate deterministic random numbers
 */
export class SeededPRNG {
  private seed: number

  constructor(seedString: string) {
    this.seed = this.hashString(seedString)
  }

  /**
   * Convert string to a numeric seed using a simple hash function
   */
  private hashString(str: string): number {
    let hash = 0
    if (str.length === 0) return hash
    
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32-bit integer
    }
    
    // Ensure positive number
    return Math.abs(hash) || 1
  }

  /**
   * Generate next random number using Linear Congruential Generator
   * Uses parameters from Numerical Recipes: a=1664525, c=1013904223, m=2^32
   */
  next(): number {
    this.seed = (this.seed * 1664525 + 1013904223) % 0x100000000
    return this.seed / 0x100000000
  }

  /**
   * Generate random integer between min (inclusive) and max (exclusive)
   */
  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min)) + min
  }

  /**
   * Generate random integer between 0 (inclusive) and max (exclusive)
   */
  nextIntMax(max: number): number {
    return this.nextInt(0, max)
  }

  /**
   * Reset the generator with a new seed
   */
  reseed(seedString: string): void {
    this.seed = this.hashString(seedString)
  }

  /**
   * Get current seed value (for debugging)
   */
  getSeed(): number {
    return this.seed
  }
}

/**
 * Utility functions for game word selection
 */
export class GameWordSelector {
  private prng: SeededPRNG

  constructor(gameId: string) {
    this.prng = new SeededPRNG(gameId)
  }

  /**
   * Select a random word from an array using the seeded PRNG
   */
  selectWord(words: string[]): string {
    if (words.length === 0) {
      throw new Error('Words array cannot be empty')
    }
    
    const index = this.prng.nextIntMax(words.length)
    return words[index]
  }

  /**
   * Select multiple random words without repetition
   */
  selectWords(words: string[], count: number): string[] {
    if (count > words.length) {
      throw new Error('Cannot select more words than available')
    }

    const available = [...words]
    const selected: string[] = []

    for (let i = 0; i < count; i++) {
      const index = this.prng.nextIntMax(available.length)
      selected.push(available[index])
      available.splice(index, 1)
    }

    return selected
  }

  /**
   * Get a random number for this game (0-1)
   */
  getRandom(): number {
    return this.prng.next()
  }

  /**
   * Get a random integer for this game
   */
  getRandomInt(min: number, max: number): number {
    return this.prng.nextInt(min, max)
  }

  /**
   * Reset with new game ID
   */
  setGameId(gameId: string): void {
    this.prng.reseed(gameId)
  }
}

/**
 * Quick utility function for simple word selection
 */
export function selectWordForGame(gameId: string, words: string[]): string {
  const selector = new GameWordSelector(gameId)
  return selector.selectWord(words)
}

/**
 * Example usage and demonstration
 */
export function demonstratePRNG() {
  console.log('🎲 Demonstrating Seeded PRNG')
  
  // Test with same seed multiple times - should always produce same results
  const gameId = "1830"
  const testWords = ['casa', 'gato', 'cachorro', 'água', 'feliz', 'triste', 'verde', 'azul', 'vermelho', 'amarelo']
  
  console.log(`\n🎮 Game ID: "${gameId}"`)
  
  // Test multiple times with same seed
  for (let i = 0; i < 5; i++) {
    const word = selectWordForGame(gameId, testWords)
    console.log(`  Run ${i + 1}: ${word}`)
  }
  
  console.log('\n🔄 Testing different game IDs:')
  const gameIds = ['1830', '1831', '1832', '2024', 'daily-2024-01-21']
  
  gameIds.forEach(id => {
    const word = selectWordForGame(id, testWords)
    console.log(`  Game "${id}": ${word}`)
  })
  
  console.log('\n📊 Testing consistency (same seed should always produce same sequence):')
  const selector1 = new GameWordSelector('test123')
  const selector2 = new GameWordSelector('test123')
  
  console.log('  Selector 1 sequence:', [
    selector1.getRandom().toFixed(6),
    selector1.getRandom().toFixed(6),
    selector1.getRandom().toFixed(6)
  ].join(', '))
  
  console.log('  Selector 2 sequence:', [
    selector2.getRandom().toFixed(6),
    selector2.getRandom().toFixed(6),
    selector2.getRandom().toFixed(6)
  ].join(', '))
}