import { SnowflakeGenerator } from '../src/utils/snowflake'

describe('SnowflakeGenerator', () => {
  let generator: SnowflakeGenerator

  beforeEach(() => {
    // Create a new instance for each test to avoid state contamination
    generator = new (SnowflakeGenerator as any)()
  })

  describe('Basic Generation', () => {
    test('should generate a string ID', () => {
      const id = generator.generate()
      expect(typeof id).toBe('string')
      expect(id.length).toBeGreaterThan(0)
    })

    test('should generate IDs of expected length', () => {
      const id = generator.generate()
      expect(id.length).toBeGreaterThanOrEqual(6)
      expect(id.length).toBeLessThanOrEqual(12)
    })

    test('should use only valid characters from charset', () => {
      const charset = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
      const id = generator.generate()
      
      for (const char of id) {
        expect(charset).toContain(char)
      }
    })

    test('should not use confusing characters (0, O, 1, I, l)', () => {
      const confusingChars = ['0', 'O', '1', 'I', 'l']
      const id = generator.generate()
      
      for (const char of confusingChars) {
        expect(id).not.toContain(char)
      }
    })
  })

  describe('Uniqueness', () => {
    test('should generate unique IDs in sequence', () => {
      const ids = new Set()
      const count = 100
      
      for (let i = 0; i < count; i++) {
        const id = generator.generate()
        expect(ids.has(id)).toBe(false)
        ids.add(id)
      }
      
      expect(ids.size).toBe(count)
    })

    test('should not always generate the same first ID', () => {
      // This test specifically addresses the concern about always getting 222222
      const firstIds = new Set()
      const numGenerators = 10
      
      for (let i = 0; i < numGenerators; i++) {
        const newGenerator = new (SnowflakeGenerator as any)()
        const firstId = newGenerator.generate()
        firstIds.add(firstId)
      }
      
      // We should have some variety in first IDs (at least 50% unique)
      expect(firstIds.size).toBeGreaterThan(numGenerators * 0.5)
    })

    test('should generate different IDs with different timestamps', async () => {
      const id1 = generator.generate()
      
      // Wait a small amount to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 2))
      
      const id2 = generator.generate()
      expect(id1).not.toBe(id2)
    })
  })

  describe('Multiple Instances', () => {
    test('should generate different IDs from different instances', () => {
      const generator1 = new (SnowflakeGenerator as any)()
      const generator2 = new (SnowflakeGenerator as any)()
      
      const ids1 = Array.from({ length: 10 }, () => generator1.generate())
      const ids2 = Array.from({ length: 10 }, () => generator2.generate())
      
      // There should be very little overlap between the two sets
      const overlap = ids1.filter(id => ids2.includes(id)).length
      expect(overlap).toBeLessThan(3) // Allow for some overlap due to timing
    })
  })

  describe('Sequence Handling', () => {
    test('should handle rapid generation within same millisecond', () => {
      const ids: string[] = []
      const startTime = Date.now()
      
      // Generate many IDs quickly to force sequence increments
      while (Date.now() === startTime && ids.length < 50) {
        ids.push(generator.generate())
      }
      
      // All IDs should be unique even when generated in same millisecond
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('Validation', () => {
    test('should validate own generated IDs', () => {
      const id = generator.generate()
      expect(generator.isValid(id)).toBe(true)
    })

    test('should reject invalid IDs', () => {
      expect(generator.isValid('')).toBe(false)
      expect(generator.isValid('1234')).toBe(false) // too short
      expect(generator.isValid('THISISWAYTOOLONGTOBEVALID')).toBe(false) // too long
      expect(generator.isValid('ABC0123')).toBe(false) // contains invalid character '0'
      expect(generator.isValid('ABCOI1l')).toBe(false) // contains confusing characters
      expect(generator.isValid(null as any)).toBe(false)
      expect(generator.isValid(undefined as any)).toBe(false)
      expect(generator.isValid(123 as any)).toBe(false)
    })
  })

  describe('Timestamp Extraction', () => {
    test('should extract reasonable timestamp from generated ID', () => {
      const beforeGeneration = Date.now()
      const id = generator.generate()
      const afterGeneration = Date.now()
      
      const extractedTime = generator.extractTimestamp(id)
      
      // Since our epoch is set to today's date, the extracted time should be close to now
      // but might be slightly off due to the epoch being set to start of day
      expect(extractedTime.getTime()).toBeGreaterThanOrEqual(beforeGeneration - 24 * 60 * 60 * 1000) // Within 24 hours
      expect(extractedTime.getTime()).toBeLessThanOrEqual(afterGeneration + 1000)
    })
  })

  describe('Base32 Conversion', () => {
    test('should properly convert numbers to base32 and back', () => {
      const testNumbers = [0, 1, 31, 32, 1000, 999999, 123456789]
      
      for (const num of testNumbers) {
        const base32 = (generator as any).toBase32(num)
        const converted = (generator as any).fromBase32(base32)
        expect(converted).toBe(num)
      }
    })
  })

  describe('Edge Cases', () => {
    test('should handle clock moving backwards', () => {
      // Mock Date.now to simulate clock moving backwards
      const originalNow = Date.now
      let callCount = 0
      
      Date.now = jest.fn(() => {
        callCount++
        if (callCount === 1) return 1000000
        if (callCount === 2) return 999999 // Clock moved backwards
        return 1000001
      })
      
      generator.generate() // First call
      
      expect(() => generator.generate()).toThrow('Clock moved backwards')
      
      Date.now = originalNow // Restore original
    })
  })

  describe('Specific Issue Investigation', () => {
    test('should investigate why first ID might be 222222', () => {
      const results = {
        '222222': 0,
        other: 0,
        allFirstIds: [] as string[]
      }
      
      // Generate first IDs from many instances
      for (let i = 0; i < 50; i++) {
        const newGenerator = new (SnowflakeGenerator as any)()
        const firstId = newGenerator.generate()
        results.allFirstIds.push(firstId)
        
        if (firstId === '222222') {
          results['222222']++
        } else {
          results.other++
        }
      }
      
      console.log('First ID distribution:', {
        '222222 count': results['222222'],
        'Other count': results.other,
        'Sample first IDs': results.allFirstIds.slice(0, 10),
        'Unique first IDs': new Set(results.allFirstIds).size
      })
      
      // The issue might be if we're getting too many 222222s
      expect(results['222222']).toBeLessThan(results.allFirstIds.length * 0.5) // Less than 50%
    })

    test('should check if machine ID affects first ID generation', () => {
      // Test with controlled machine IDs
      const machineIdResults = new Map<number, string[]>()
      
      for (let machineId = 0; machineId < 10; machineId++) {
        const gen = new (SnowflakeGenerator as any)()
        // Set machine ID directly for testing
        ;(gen as any).machineId = machineId
        
        const firstId = gen.generate()
        if (!machineIdResults.has(machineId)) {
          machineIdResults.set(machineId, [])
        }
        machineIdResults.get(machineId)!.push(firstId)
      }
      
      console.log('Machine ID vs First ID:', Object.fromEntries(machineIdResults))
      
      // Different machine IDs should generally produce different first IDs
      const uniqueFirstIds = new Set(Array.from(machineIdResults.values()).flat())
      expect(uniqueFirstIds.size).toBeGreaterThan(1)
    })

    test('should check timestamp component in early IDs', () => {
      const gen = new (SnowflakeGenerator as any)()
      const id = gen.generate()
      
      // Extract components for debugging
      const num = (gen as any).fromBase32(id)
      const epoch = (gen as any).epoch
      const currentTime = Date.now()
      const timestampComponent = (num >> 22) + epoch
      const machineComponent = (num >> 12) & 0x3FF
      const sequenceComponent = num & 0xFFF
      
      console.log('ID breakdown:', {
        id,
        timestamp: new Date(timestampComponent),
        currentTime: new Date(currentTime),
        machineId: machineComponent,
        sequence: sequenceComponent,
        timestampDiff: currentTime - timestampComponent
      })
      
      expect(timestampComponent).toBeGreaterThan(epoch)
      expect(timestampComponent).toBeLessThanOrEqual(currentTime + 1000)
    })
  })
})
