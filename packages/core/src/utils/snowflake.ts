import { randomBytes } from 'crypto'

/**
 * Snowflake ID Generator
 * Generates short, unique, user-friendly IDs for game rooms
 * Format: 6-8 character alphanumeric strings (excluding confusing characters)
 * Based on Discord Snowflake algorithm with randomized sequence handling
 */

class SnowflakeGenerator {
    public static readonly MACHINE_ID_BITS = 10
    public static readonly SEQUENCE_BITS = 12
    
    public static readonly MAX_MACHINE_ID = -1 ^ (-1 << SnowflakeGenerator.MACHINE_ID_BITS)
    public static readonly MAX_SEQUENCE = -1 ^ (-1 << SnowflakeGenerator.SEQUENCE_BITS)
    
    public static readonly MACHINE_ID_SHIFT = SnowflakeGenerator.SEQUENCE_BITS
    public static readonly TIMESTAMP_LEFT_SHIFT = SnowflakeGenerator.SEQUENCE_BITS + SnowflakeGenerator.MACHINE_ID_BITS
    
    private machineId: number
    private lastTimestamp: number = -1
    private generatedSequences: Set<number> = new Set()
    
    // Use only unambiguous characters (no 0, O, 1, I, l, i)
    // Base58-like charset for maximum efficiency while avoiding confusion
    private readonly charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz'
    private readonly base = this.charset.length // 58
    
    // Epoch start (2025-07-12 00:00:00 UTC) - today's date to minimize 0 timestamp differences
    private readonly epoch = 1752307200000
    
    constructor() {
        // Generate a random machine ID (1-MAX_MACHINE_ID) with better distribution
        // Use Node.js crypto for better randomness
        const randomBytes = require('crypto').randomBytes(4)
        const randomValue = randomBytes.readUInt32BE(0) / (0xFFFFFFFF + 1)
            
        // Ensure machine ID is never 0 to avoid always starting with same base
        this.machineId = Math.floor(randomValue * SnowflakeGenerator.MAX_MACHINE_ID) + 1
        
        if (this.machineId < 1 || this.machineId > SnowflakeGenerator.MAX_MACHINE_ID) {
            throw new Error(`Machine ID must be between 1 and ${SnowflakeGenerator.MAX_MACHINE_ID}`)
        }
        
        // Add some random initial sequences to avoid immediate collisions
        // Start with a random offset to ensure first sequence is not 0
        const initialSequenceCount = 3 + Math.floor(Math.random() * 5)
        for (let i = 0; i < initialSequenceCount; i++) {
            this.generatedSequences.add(Math.floor(Math.random() * SnowflakeGenerator.MAX_SEQUENCE))
        }
    }
    
    private currentTime(): number {
        let timestamp = Date.now()
        // Ensure we never return exactly the epoch to avoid 0 timestamp diff
        if (timestamp === this.epoch) {
            timestamp += 1
        }
        return timestamp
    }
    
    private generateId(): number {
        const timestamp = this.currentTime()
        
        if (timestamp < this.lastTimestamp) {
            throw new Error('Clock moved backwards. Refusing to generate id')
        }
        
        if (timestamp !== this.lastTimestamp) {
            this.generatedSequences.clear()
            this.lastTimestamp = timestamp
        }
        
        let sequence: number
        let attempts = 0
        const maxAttempts = SnowflakeGenerator.MAX_SEQUENCE + 1
        
        do {
            // Use better randomization for sequence
            sequence = Math.floor(Math.random() * (SnowflakeGenerator.MAX_SEQUENCE + 1))
            attempts++
            
            if (attempts >= maxAttempts) {
                // If we've exhausted all sequences, wait for next millisecond
                while (this.currentTime() === timestamp) {
                    // Busy wait for next millisecond
                }
                return this.generateId() // Recursive call with new timestamp
            }
        } while (this.generatedSequences.has(sequence))
        
        this.generatedSequences.add(sequence)
        
        // Use BigInt to avoid 32-bit integer overflow when shifting
        const timestampDiff = BigInt(timestamp - this.epoch)
        const machineIdBig = BigInt(this.machineId)
        const sequenceBig = BigInt(sequence)
        
        const id = (timestampDiff << BigInt(SnowflakeGenerator.TIMESTAMP_LEFT_SHIFT)) |
                   (machineIdBig << BigInt(SnowflakeGenerator.MACHINE_ID_SHIFT)) |
                   sequenceBig
        
        // Convert back to regular number - should be safe for our use case
        const result = Number(id)
        
        // Ensure we never return 0 as it converts to "222222"
        if (result === 0) {
            return 1
        }
                   
        return result
    }
    
    /**
     * Generate a new Snowflake ID
     * @returns A short, friendly ID string (4-8 characters)
     */
    generate(): string {
        const id = this.generateId()
        return this.toBase32(id)
    }
    
    /**
     * Convert a number to base32 string using our charset
     */
    private toBase32(num: number): string {
        // Special handling for 0 - this should rarely happen in practice
        // due to timestamp and sequence randomization, but handle it gracefully
        if (num === 0) return this.charset[0]
        
        let result = ''
        while (num > 0) {
            result = this.charset[num % this.base] + result
            num = Math.floor(num / this.base)
        }
        
        // Pad to minimum 4 characters for consistency
        return result.padStart(4, this.charset[0])
    }
    
    /**
     * Extract timestamp from a snowflake ID (for debugging/analytics)
     */
    extractTimestamp(id: string): Date {
        const num = this.fromBase32(id)
        const numBig = BigInt(num)
        const timestamp = Number(numBig >> BigInt(SnowflakeGenerator.TIMESTAMP_LEFT_SHIFT)) + this.epoch
        return new Date(timestamp)
    }
    
    /**
     * Parse a snowflake ID into its components
     * @param id - The snowflake ID string to parse
     * @returns Object containing timestamp, machineId, and sequence
     */
    parseSnowflake(id: string): { timestamp: number; machineId: number; sequence: number } {
        const num = this.fromBase32(id)
        const numBig = BigInt(num)
        const timestamp = Number(numBig >> BigInt(SnowflakeGenerator.TIMESTAMP_LEFT_SHIFT)) + this.epoch
        const machineId = Number((numBig >> BigInt(SnowflakeGenerator.MACHINE_ID_SHIFT)) & BigInt(SnowflakeGenerator.MAX_MACHINE_ID))
        const sequence = Number(numBig & BigInt(SnowflakeGenerator.MAX_SEQUENCE))
        
        return { timestamp, machineId, sequence }
    }
    
    /**
     * Convert base32 string back to number
     */
    private fromBase32(str: string): number {
        let result = 0
        for (let i = 0; i < str.length; i++) {
            const charIndex = this.charset.indexOf(str[i])
            if (charIndex === -1) {
                throw new Error(`Invalid character in snowflake ID: ${str[i]}`)
            }
            result = result * this.base + charIndex
        }
        return result
    }
    
    /**
     * Validate if a string is a valid snowflake ID
     */
    isValid(id: string): boolean {
        if (!id || typeof id !== 'string') return false
        if (id.length < 4 || id.length > 10) return false
        
        // Check if all characters are in our charset
        for (const char of id) {
            if (!this.charset.includes(char)) return false
        }
        
        try {
            this.fromBase32(id)
            return true
        } catch {
            return false
        }
    }
}

/**
 * Parse a snowflake ID into its components (standalone function)
 * @param snowflakeId - The numeric snowflake ID
 * @param epoch - The epoch timestamp used when generating the ID
 * @returns Object containing timestamp, machineId, and sequence
 */
export function parseSnowflakeId(snowflakeId: number, epoch: number): { timestamp: number; machineId: number; sequence: number } {
    const snowflakeBig = BigInt(snowflakeId)
    const timestamp = Number(snowflakeBig >> BigInt(SnowflakeGenerator.TIMESTAMP_LEFT_SHIFT)) + epoch
    const machineId = Number((snowflakeBig >> BigInt(SnowflakeGenerator.MACHINE_ID_SHIFT)) & BigInt(SnowflakeGenerator.MAX_MACHINE_ID))
    const sequence = Number(snowflakeBig & BigInt(SnowflakeGenerator.MAX_SEQUENCE))
    
    return { timestamp, machineId, sequence }
}

// Export the class for testing
export { SnowflakeGenerator }

// Export a singleton instance
export const snowflakeGenerator = new SnowflakeGenerator()
export default snowflakeGenerator
