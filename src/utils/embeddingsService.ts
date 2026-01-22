import fs from 'fs'
import path from 'path'

/**
 * Production-ready embeddings service for the Contexto game
 * Handles loading and querying word embeddings efficiently
 */
export class ContextoEmbeddingsService {
    private embeddings: Map<string, Float32Array> = new Map()
    private vocabulary: string[] = []
    private dimensions: number = 300
    public isLoaded: boolean = false

    constructor(private dataPath: string = 'data') { }

    /**
     * Initialize the embeddings service
     */
    async initialize(dimensions: 100 | 300 = 300): Promise<void> {
        if (this.isLoaded && this.dimensions === dimensions) {
            return // Already loaded with the same dimensions
        }

        console.log(`Initializing embeddings service with ${dimensions}D vectors...`)

        this.dimensions = dimensions
        await this.loadVocabulary()
        await this.loadEmbeddings(dimensions)

        this.isLoaded = true
        console.log(`✅ Embeddings service initialized with ${this.embeddings.size} words`)
    }

    /**
     * Load vocabulary from vocab.txt
     */
    private async loadVocabulary(): Promise<void> {
        const vocabPath = path.join(this.dataPath, 'vocab.txt')
        const content = await fs.promises.readFile(vocabPath, 'utf-8')
        this.vocabulary = content.trim().split('\n').map(word => word.toLowerCase())
    }

    /**
     * Load embeddings from safetensors file
     */
    private async loadEmbeddings(dimensions: 100 | 300): Promise<void> {
        const embeddingPath = path.join(this.dataPath, `embeddings-glove-${dimensions}.safetensors`)

        try {
            const buffer = await fs.promises.readFile(embeddingPath)

            // Parse safetensors header
            const headerLength = Number(buffer.readBigUInt64LE(0))
            const header = JSON.parse(buffer.slice(8, 8 + headerLength).toString('utf-8'))

            // Extract embeddings tensor info
            const embeddingsInfo = header.embeddings
            const [startOffset, endOffset] = embeddingsInfo.data_offsets
            const dataStartOffset = 8 + headerLength

            // Read the embeddings data
            const tensorBuffer = buffer.slice(
                dataStartOffset + startOffset,
                dataStartOffset + endOffset
            )

            // Convert to Float32Array
            const embeddingsArray = new Float32Array(
                tensorBuffer.buffer,
                tensorBuffer.byteOffset,
                tensorBuffer.length / 4
            )

            // Map each word to its embedding vector
            const numWords = this.vocabulary.length
            this.embeddings.clear()

            for (let i = 0; i < numWords; i++) {
                const word = this.vocabulary[i]
                const startIdx = i * dimensions
                const endIdx = startIdx + dimensions
                const embedding = embeddingsArray.slice(startIdx, endIdx)
                this.embeddings.set(word, embedding)
            }

            console.log(`Loaded ${numWords} word embeddings (${dimensions}D)`)

        } catch (error) {
            console.error(`Failed to load embeddings: ${error}`)
            throw error
        }
    }

    /**
     * Get embedding vector for a word
     */
    getEmbedding(word: string): Float32Array | null {
        if (!this.isLoaded) {
            throw new Error('Embeddings service not initialized. Call initialize() first.')
        }
        return this.embeddings.get(word.toLowerCase()) || null
    }

    /**
     * Calculate cosine similarity between two words
     */
    getWordSimilarity(word1: string, word2: string): number {
        const emb1 = this.getEmbedding(word1)
        const emb2 = this.getEmbedding(word2)

        if (!emb1 || !emb2) return 0

        return this.cosineSimilarity(emb1, emb2)
    }

    /**
     * Calculate semantic distance (lower = more similar)
     * This is what Contexto game typically uses for ranking
     */
    getSemanticDistance(word1: string, word2: string): number {
        const similarity = this.getWordSimilarity(word1, word2)
        // Convert similarity (0-1) to distance (higher values = more distant)
        return Math.max(0, 1 - similarity) * 40000 // Scale to match game's distance range
    }

    /**
     * Find most similar words to a target word
     */
    findSimilarWords(
        targetWord: string,
        candidateWords: string[],
        limit: number = 1000
    ): Array<{ word: string, distance: number, similarity: number }> {
        const targetEmbedding = this.getEmbedding(targetWord)
        if (!targetEmbedding) return []

        const results: Array<{ word: string, distance: number, similarity: number }> = []

        for (const word of candidateWords) {
            if (word.toLowerCase() === targetWord.toLowerCase()) continue

            const embedding = this.getEmbedding(word)
            if (!embedding) continue

            const similarity = this.cosineSimilarity(targetEmbedding, embedding)
            const distance = Math.max(0, 1 - similarity) * 40000

            results.push({ word, distance, similarity })
        }

        // Sort by similarity (highest first) / distance (lowest first)
        return results
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit)
    }

    /**
     * Batch calculate similarities for multiple word pairs
     */
    batchGetSimilarities(pairs: Array<[string, string]>): Array<{
        word1: string,
        word2: string,
        similarity: number,
        distance: number
    }> {
        return pairs.map(([word1, word2]) => ({
            word1,
            word2,
            similarity: this.getWordSimilarity(word1, word2),
            distance: this.getSemanticDistance(word1, word2)
        }))
    }

    /**
     * Check if a word exists in the vocabulary
     */
    hasWord(word: string): boolean {
        return this.embeddings.has(word.toLowerCase())
    }

    /**
     * Get vocabulary size
     */
    getVocabularySize(): number {
        return this.vocabulary.length
    }

    /**
     * Get current dimensions
     */
    getDimensions(): number {
        return this.dimensions
    }

    /**
     * Calculate cosine similarity between two vectors
     */
    private cosineSimilarity(a: Float32Array, b: Float32Array): number {
        let dotProduct = 0
        let normA = 0
        let normB = 0

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i]
            normA += a[i] * a[i]
            normB += b[i] * b[i]
        }

        const norm = Math.sqrt(normA) * Math.sqrt(normB)
        return norm === 0 ? 0 : dotProduct / norm
    }
}

// Singleton instance for the application
export const embeddingsService = new ContextoEmbeddingsService()

// Example usage
export async function demonstrateEmbeddingsService() {
    console.log('🚀 Demonstrating Contexto Embeddings Service')

    // Initialize the service
    await embeddingsService.initialize(300)

    // Test word similarities
    const testWords = ['casa', 'lar', 'moradia', 'carro', 'feliz', 'triste']
    const targetWord = 'casa'

    console.log(`\n📊 Similarities with "${targetWord}":`)
    for (const word of testWords) {
        if (word === targetWord) continue

        const similarity = embeddingsService.getWordSimilarity(targetWord, word)
        const distance = embeddingsService.getSemanticDistance(targetWord, word)

        console.log(`  ${word.padEnd(12)} | similarity: ${similarity.toFixed(4)} | distance: ${distance.toFixed(0)}`)
    }

    // Find most similar words
    console.log(`\n🔍 Most similar words to "${targetWord}":`)
    const similar = embeddingsService.findSimilarWords(targetWord, testWords, 5)
    similar.forEach((result, i) => {
        console.log(`  ${(i + 1).toString().padStart(2)}. ${result.word.padEnd(12)} (distance: ${result.distance.toFixed(0)})`)
    })

    console.log(`\n✅ Service ready with ${embeddingsService.getVocabularySize()} words`)
}