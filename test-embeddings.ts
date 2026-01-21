import { readEmbeddingsExample } from './src/utils/safetensorsReader'
import { loadAndTestEmbeddings } from './src/utils/embeddings'

/**
 * Test script to demonstrate reading safetensors files
 */
async function main() {
    console.log('=== Testing Safetensors File Reading ===\n')

    // Test manual reading
    console.log('1. Manual safetensors reading:')
    await readEmbeddingsExample()

    console.log('\n' + '='.repeat(50) + '\n')

    // Test embeddings loader
    console.log('2. Embeddings loader test:')
    await loadAndTestEmbeddings()
}

// Run if this is the main module
if (require.main === module) {
    main().catch(console.error)
}

export { main as testEmbeddings }