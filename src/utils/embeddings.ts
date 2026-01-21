import fs from 'fs'
import path from 'path'

// Basic structure for reading safetensors files
// This assumes you have the 'safetensors' npm package installed

interface SafetensorsFile {
    metadata: Record<string, any>
    tensors: Record<string, Float32Array>
}

export class EmbeddingsLoader {
    private dataPath: string
    private vocabWords: string[] = []
    private embeddings: Map<string, Float32Array> = new Map()

    constructor(dataPath: string = 'data') {
        this.dataPath = dataPath
    }

    /**
     * Load vocabulary from vocab.txt
     */
    async loadVocabulary(): Promise<string[]> {
        const vocabPath = path.join(this.dataPath, 'vocab.txt')
        const content = await fs.promises.readFile(vocabPath, 'utf-8')
        this.vocabWords = content.trim().split('\n')
        return this.vocabWords
    }

    /**
     * Load embeddings from safetensors file
     * Note: This requires the 'safetensors' npm package
     */
    async loadEmbeddings(dimensions: 100 | 300 | 600 = 300): Promise<void> {
        const embeddingPath = path.join(this.dataPath, `embeddings-glove-${dimensions}.safetensors`)

        try {
            // Method 1: Using safetensors package (if available)
            // const safetensors = require('safetensors')
            // const data = await safetensors.load(embeddingPath)

            // Method 2: Read as binary buffer and parse manually (basic approach)
            const buffer = await fs.promises.readFile(embeddingPath)
            console.log(`Loaded ${embeddingPath}, size: ${buffer.length} bytes`)

            // For now, we'll demonstrate basic binary reading
            // The actual parsing would depend on the safetensors format
            await this.parseSafetensorsBuffer(buffer, dimensions)

        } catch (error) {
            console.error(`Error loading embeddings: ${error}`)
            throw error
        }
    }

    /**
     * Basic safetensors buffer parsing (simplified)
     * Real implementation would need proper safetensors format parsing
     */
    private async parseSafetensorsBuffer(buffer: Buffer, dimensions: number): Promise<void> {
        console.log('Parsing safetensors buffer...')
        console.log(`Buffer size: ${buffer.length} bytes`)

        // Read the header (first 8 bytes typically contain metadata length)
        const headerLength = buffer.readBigUInt64LE(0)
        console.log(`Header length: ${headerLength}`)

        if (headerLength > buffer.length) {
            throw new Error('Invalid safetensors file format')
        }

        // Read the JSON metadata header
        const metadataBuffer = buffer.slice(8, 8 + Number(headerLength))
        const metadata = JSON.parse(metadataBuffer.toString('utf-8'))
        console.log('Metadata:', metadata)

        // The actual tensor data starts after the header
        const dataOffset = 8 + Number(headerLength)
        const tensorData = buffer.slice(dataOffset)

        console.log(`Tensor data size: ${tensorData.length} bytes`)
        console.log(`Expected vectors for ${dimensions}D: ${tensorData.length / (dimensions * 4)} (assuming float32)`)
    }

    /**
     * Get embedding vector for a word
     */
    getEmbedding(word: string): Float32Array | null {
        return this.embeddings.get(word.toLowerCase()) || null
    }

    /**
     * Get word similarity using cosine similarity
     */
    getWordSimilarity(word1: string, word2: string): number {
        const emb1 = this.getEmbedding(word1)
        const emb2 = this.getEmbedding(word2)

        if (!emb1 || !emb2) return 0

        return this.cosineSimilarity(emb1, emb2)
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

        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB))
    }

    /**
     * Find most similar words to a given word
     */
    findSimilarWords(word: string, topK: number = 10): Array<{ word: string, similarity: number }> {
        const targetEmbedding = this.getEmbedding(word)
        if (!targetEmbedding) return []

        const similarities: Array<{ word: string, similarity: number }> = []

        for (const [candidateWord, embedding] of this.embeddings) {
            if (candidateWord === word.toLowerCase()) continue

            const similarity = this.cosineSimilarity(targetEmbedding, embedding)
            similarities.push({ word: candidateWord, similarity })
        }

        // Sort by similarity and return top K
        return similarities
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, topK)
    }
}

// Example usage function
export async function loadAndTestEmbeddings() {
    const loader = new EmbeddingsLoader()

    try {
        // Load vocabulary
        console.log('Loading vocabulary...')
        const vocab = await loader.loadVocabulary()
        console.log(`Loaded ${vocab.length} vocabulary words`)
        console.log('First 10 words:', vocab.slice(0, 10))

        // Load embeddings
        console.log('Loading embeddings...')
        await loader.loadEmbeddings(300) // Load 300-dimensional embeddings

    } catch (error) {
        console.error('Failed to load embeddings:', error)
    }
}