/**
 * Snowflake ID Generator
 * Generates short, unique, user-friendly IDs for game rooms
 * Format: 8-10 character alphanumeric strings (excluding confusing characters)
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
    
    // Use only unambiguous characters (no 0, O, 1, I, l)
    private readonly charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    private readonly base = this.charset.length // 32
    
    // Epoch start (2025-07-12 00:00:00 UTC) - today's date to minimize 0 timestamp differences
    private readonly epoch = 1752307200000
    
    constructor() {
        // Generate a random machine ID (1-MAX_MACHINE_ID) with better distribution
        // Use crypto random if available, fall back to Math.random
        const randomValue = typeof crypto !== 'undefined' && crypto.getRandomValues 
            ? crypto.getRandomValues(new Uint32Array(1))[0] / (0xFFFFFFFF + 1)
            : Math.random()
            
        this.machineId = Math.floor(randomValue * SnowflakeGenerator.MAX_MACHINE_ID) + 1
        
        if (this.machineId < 0 || this.machineId > SnowflakeGenerator.MAX_MACHINE_ID) {
            throw new Error(`Machine ID must be between 0 and ${SnowflakeGenerator.MAX_MACHINE_ID}`)
        }
        
        // Add some random initial sequences to avoid immediate collisions
        for (let i = 0; i < 5; i++) {
            this.generatedSequences.add(Math.floor(Math.random() * SnowflakeGenerator.MAX_SEQUENCE))
        }
    }
    
    private currentTime(): number {
        return Date.now()
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
        while (true) {
            sequence = Math.floor(Math.random() * (SnowflakeGenerator.MAX_SEQUENCE + 1))
            if (!this.generatedSequences.has(sequence)) {
                this.generatedSequences.add(sequence)
                break
            }
        }
        
        const id = ((timestamp - this.epoch) << SnowflakeGenerator.TIMESTAMP_LEFT_SHIFT) |
                   (this.machineId << SnowflakeGenerator.MACHINE_ID_SHIFT) |
                   sequence
                   
        return id
    }
    
    /**
     * Generate a new Snowflake ID
     * @returns A short, friendly ID string (6-12 characters)
     */
    generate(): string {
        const id = this.generateId()
        return this.toBase32(id)
    }
    
    /**
     * Convert a number to base32 string using our charset
     */
    private toBase32(num: number): string {
        if (num === 0) return this.charset[0]
        
        let result = ''
        while (num > 0) {
            result = this.charset[num % this.base] + result
            num = Math.floor(num / this.base)
        }
        
        // Pad to minimum 6 characters for consistency
        return result.padStart(6, this.charset[0])
    }
    
    /**
     * Extract timestamp from a snowflake ID (for debugging/analytics)
     */
    extractTimestamp(id: string): Date {
        const num = this.fromBase32(id)
        const timestamp = (num >> SnowflakeGenerator.TIMESTAMP_LEFT_SHIFT) + this.epoch
        return new Date(timestamp)
    }
    
    /**
     * Parse a snowflake ID into its components
     * @param id - The snowflake ID string to parse
     * @returns Object containing timestamp, machineId, and sequence
     */
    parseSnowflake(id: string): { timestamp: number; machineId: number; sequence: number } {
        const num = this.fromBase32(id)
        const timestamp = (num >> SnowflakeGenerator.TIMESTAMP_LEFT_SHIFT) + this.epoch
        const machineId = (num >> SnowflakeGenerator.MACHINE_ID_SHIFT) & SnowflakeGenerator.MAX_MACHINE_ID
        const sequence = num & SnowflakeGenerator.MAX_SEQUENCE
        
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
        if (id.length < 6 || id.length > 12) return false
        
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
    const timestamp = (snowflakeId >> SnowflakeGenerator.TIMESTAMP_LEFT_SHIFT) + epoch
    const machineId = (snowflakeId >> SnowflakeGenerator.MACHINE_ID_SHIFT) & SnowflakeGenerator.MAX_MACHINE_ID
    const sequence = snowflakeId & SnowflakeGenerator.MAX_SEQUENCE
    
    return { timestamp, machineId, sequence }
}

// Export the class for testing
export { SnowflakeGenerator }

// Export a singleton instance
export const snowflakeGenerator = new SnowflakeGenerator()
export default snowflakeGenerator
