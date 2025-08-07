import snowflakeGenerator from './src/utils/snowflake'

console.log('Testing Snowflake ID Generator')
console.log('==============================')

// Generate some sample IDs
for (let i = 0; i < 10; i++) {
    const id = snowflakeGenerator.generate()
    const timestamp = snowflakeGenerator.extractTimestamp(id)
    const isValid = snowflakeGenerator.isValid(id)
    
    console.log(`ID: ${id} (${id.length} chars) - Valid: ${isValid} - Created: ${timestamp.toISOString()}`)
}

console.log('\n==============================')

// Test validation
const testIds = [
    'ABCD23',        // Valid
    '23456789',      // Valid  
    'INVALID0',      // Invalid (contains 0)
    'short',         // Invalid (too short/contains invalid chars)
    'TOOLONGSTRING', // Valid but long
    '',              // Invalid (empty)
    '123',           // Invalid (too short)
]

console.log('Testing ID Validation:')
testIds.forEach(id => {
    const isValid = snowflakeGenerator.isValid(id)
    console.log(`"${id}" -> ${isValid ? '✅ Valid' : '❌ Invalid'}`)
})
