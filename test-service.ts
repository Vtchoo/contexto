import { demonstrateEmbeddingsService, embeddingsService } from './src/utils/embeddingsService'

/**
 * Test the production embeddings service
 */
async function main() {
    console.log('=== Testing Contexto Embeddings Service ===\n')

    try {
        // Run the demonstration
        await demonstrateEmbeddingsService()

        // Additional custom tests
        console.log('\n' + '='.repeat(50))
        console.log('🧪 Additional Tests:')

        // Test some Portuguese words common in Contexto
        const portugueseTests = [
            ['gato', 'felino'],
            ['cachorro', 'cão'],
            ['água', 'líquido'],
            ['feliz', 'alegre'],
            ['triste', 'melancolia']
        ]

        console.log('\nPortuguese word similarities:')
        for (const [word1, word2] of portugueseTests) {
            const similarity = embeddingsService.getWordSimilarity(word1, word2)
            const distance = embeddingsService.getSemanticDistance(word1, word2)

            if (similarity > 0) {
                console.log(`  ${word1} ↔ ${word2}: ${similarity.toFixed(4)} (distance: ${distance.toFixed(0)})`)
            } else {
                console.log(`  ${word1} ↔ ${word2}: ❌ One or both words not found`)
            }
        }

        // Test batch processing
        console.log('\n🔄 Batch processing test:')
        const batchResults = embeddingsService.batchGetSimilarities([
            ['casa', 'lar'],
            ['gato', 'cão'],
            ['feliz', 'triste']
        ])

        batchResults.forEach(result => {
            console.log(`  ${result.word1} ↔ ${result.word2}: ${result.similarity.toFixed(4)}`)
        })

    } catch (error) {
        console.error('❌ Test failed:', error)
    }
}

if (require.main === module) {
    main()
}