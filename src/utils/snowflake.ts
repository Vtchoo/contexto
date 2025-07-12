/**
 * Snowflake ID Generator
 * Generates short, unique, user-friendly IDs for game rooms
 * Format: 8-10 character alphanumeric strings (excluding confusing characters)
 */

class SnowflakeGenerator {
    private machineId: number
    private sequence: number = 0
    private lastTimestamp: number = 0
    
    // Use only unambiguous characters (no 0, O, 1, I, l)
    private readonly charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    private readonly base = this.charset.length // 32
    
    // Epoch start (2025-01-01 00:00:00 UTC) to make IDs shorter
    private readonly epoch = 1735689600000
    
    constructor() {
        // Generate a random machine ID (0-1023)
        this.machineId = Math.floor(Math.random() * 1024)
    }
    
    /**
     * Generate a new Snowflake ID
     * @returns A short, friendly ID string (8-10 characters)
     */
    generate(): string {
        let timestamp = Date.now()
        
        if (timestamp < this.lastTimestamp) {
            throw new Error('Clock moved backwards. Refusing to generate id')
        }
        
        if (timestamp === this.lastTimestamp) {
            this.sequence = (this.sequence + 1) & 0xFFF // 12 bits
            if (this.sequence === 0) {
                // Wait for next millisecond
                while (timestamp <= this.lastTimestamp) {
                    timestamp = Date.now()
                }
            }
        } else {
            this.sequence = 0
        }
        
        this.lastTimestamp = timestamp
        
        // Build the snowflake: timestamp (41 bits) + machine (10 bits) + sequence (12 bits)
        const timestampDiff = timestamp - this.epoch
        const snowflake = (timestampDiff << 22) | (this.machineId << 12) | this.sequence
        
        // Convert to base32 string for friendlier format
        return this.toBase32(snowflake)
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
        const timestamp = (num >> 22) + this.epoch
        return new Date(timestamp)
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

// Export a singleton instance
export const snowflakeGenerator = new SnowflakeGenerator()
export default snowflakeGenerator
