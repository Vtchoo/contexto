import { Router, Request, Response } from 'express'
import { DataSource, LessThan } from 'typeorm'
import dataSource from '../../../dataSource'
import { Word } from '../../models/Word'
import { CustomWordRanking } from '../../models/CustomWordRanking'
import { GameWordSelector } from '../../utils/seededPRNG'
import { embeddingsService } from '../../utils/embeddingsService'

export function setupGenerateRoutes() {
    const router = Router()

    /**
     * GET /generate?gameId=1234
     * Generate a custom Contexto game with word rankings
     */
    router.get('/', async (req: Request, res: Response) => {
        const startTime = Date.now()

        try {
            // Get gameId from query parameter
            const gameId = req.query.gameId as string

            if (!gameId) {
                return res.status(400).json({
                    error: 'gameId parameter is required',
                    example: '/api/generate?gameId=1234'
                })
            }

            console.log(`🎮 Starting game generation for gameId: ${gameId}`)

            // Initialize database if needed
            if (!dataSource.isInitialized) {
                await dataSource.initialize()
            }

            // Initialize embeddings service if needed
            if (!embeddingsService.isLoaded) {
                console.log('🧠 Initializing embeddings service...')
                await embeddingsService.initialize(300)
            }

            const wordRepository = dataSource.getRepository(Word)
            const rankingRepository = dataSource.getRepository(CustomWordRanking)

            // Step 1: Get all candidate words with ICF < 15
            console.log('📚 Fetching candidate target words (ICF < 15)...')
            const candidateWords = await wordRepository.find({
                where: {
                    icf: LessThan(15) as any
                }
            })

            if (candidateWords.length === 0) {
                return res.status(500).json({
                    error: 'No candidate words found with ICF < 15',
                    suggestion: 'Make sure words are imported with ICF values'
                })
            }

            console.log(`✅ Found ${candidateWords.length} candidate target words`)

            // Step 2: Use seeded PRNG to select target word
            const selector = new GameWordSelector(gameId)
            const targetWord = selector.selectWord(candidateWords.map(w => w.word))
            const targetWordEntity = candidateWords.find(w => w.word === targetWord)!

            console.log(`🎯 Selected target word: "${targetWord}" (ID: ${targetWordEntity.id}, ICF: ${targetWordEntity.icf})`)

            // Step 3: Check if this game already exists
            const existingRankings = await rankingRepository.count({
                where: { targetWordId: targetWordEntity.id }
            })

            if (existingRankings > 0) {
                console.log(`⚠️  Game for word "${targetWord}" already exists with ${existingRankings} rankings`)
                return res.json({
                    message: 'Game already exists',
                    gameId,
                    targetWord,
                    targetWordId: targetWordEntity.id,
                    existingRankings,
                    generated: false
                })
            }

            // Step 4: Get all words for similarity calculation
            console.log('📊 Fetching all words for similarity calculation...')
            const allWords = await wordRepository.find()
            console.log(`✅ Found ${allWords.length} total words`)

            // Step 5: Calculate similarities
            console.log('🧮 Calculating cosine similarities...')
            const similarities: Array<{
                word: Word,
                similarity: number,
                distance: number
            }> = []

            const targetEmbedding = embeddingsService.getEmbedding(targetWord)
            if (!targetEmbedding) {
                return res.status(500).json({
                    error: `Target word "${targetWord}" not found in embeddings`,
                    suggestion: 'Make sure embeddings are properly loaded'
                })
            }

            let processedWords = 0
            const batchSize = 1000

            for (let i = 0; i < allWords.length; i += batchSize) {
                const batch = allWords.slice(i, i + batchSize)

                for (const word of batch) {
                    const embedding = embeddingsService.getEmbedding(word.word)
                    if (embedding) {
                        const similarity = embeddingsService.getWordSimilarity(targetWord, word.word)
                        const distance = embeddingsService.getSemanticDistance(targetWord, word.word)

                        similarities.push({
                            word,
                            similarity,
                            distance
                        })
                    }
                    processedWords++
                }

                // Log progress every 5000 words
                if (processedWords % 5000 === 0) {
                    const progress = ((processedWords / allWords.length) * 100).toFixed(1)
                    console.log(`   Processing: ${processedWords}/${allWords.length} (${progress}%)`)
                }
            }

            console.log(`✅ Calculated similarities for ${similarities.length} words`)

            // Step 6: Sort by similarity (highest first) and assign rankings
            similarities.sort((a, b) => b.similarity - a.similarity)

            // Step 7: Create ranking entities
            console.log('💾 Creating ranking entities...')
            const rankingEntities: CustomWordRanking[] = []

            similarities.forEach((item, index) => {
                const ranking = new CustomWordRanking()
                ranking.targetWordId = targetWordEntity.id
                ranking.wordId = item.word.id
                ranking.rankingScore = index + 1  // 1-based ranking
                rankingEntities.push(ranking)
            })

            // Step 8: Save rankings in batches
            console.log('💾 Saving rankings to database...')
            const rankingBatchSize = 2000
            let savedRankings = 0

            for (let i = 0; i < rankingEntities.length; i += rankingBatchSize) {
                const batch = rankingEntities.slice(i, i + rankingBatchSize)
                await rankingRepository.save(batch)
                savedRankings += batch.length

                const progress = ((savedRankings / rankingEntities.length) * 100).toFixed(1)
                console.log(`   Saved: ${savedRankings}/${rankingEntities.length} (${progress}%)`)
            }

            const endTime = Date.now()
            const duration = ((endTime - startTime) / 1000).toFixed(2)

            console.log(`🎉 Game generation completed in ${duration}s`)

            // Step 9: Get some sample rankings for response
            const topRankings = await rankingRepository
                .createQueryBuilder('ranking')
                .leftJoinAndSelect('ranking.word', 'word', 'word.id = ranking.wordId')
                .where('ranking.targetWordId = :targetWordId', { targetWordId: targetWordEntity.id })
                .orderBy('ranking.rankingScore', 'ASC')
                .limit(100)
                .getMany()

            const sampleWords = similarities.slice(0, 100).map(item => ({
                word: item.word.word,
                ranking: similarities.indexOf(item) + 1,
                similarity: parseFloat(item.similarity.toFixed(6)),
                distance: parseFloat(item.distance.toFixed(0))
            }))

            return res.json({
                message: 'Game generated successfully',
                gameId,
                targetWord,
                targetWordId: targetWordEntity.id,
                totalWords: similarities.length,
                topSimilarWords: sampleWords,
                generationTime: `${duration}s`,
                generated: true
            })

        } catch (error) {
            console.error('❌ Game generation failed:', error)
            return res.status(500).json({
                error: 'Game generation failed',
                message: error instanceof Error ? error.message : 'Unknown error',
                gameId: req.query.gameId
            })
        }
    })

    /**
     * GET /generate/status?gameId=1234
     * Check if a game exists for a given gameId
     */
    router.get('/status', async (req: Request, res: Response) => {
        try {
            const gameId = req.query.gameId as string

            if (!gameId) {
                return res.status(400).json({
                    error: 'gameId parameter is required'
                })
            }

            if (!dataSource.isInitialized) {
                await dataSource.initialize()
            }

            const wordRepository = dataSource.getRepository(Word)
            const rankingRepository = dataSource.getRepository(CustomWordRanking)

            // Get candidate words and select target word using same logic
            const candidateWords = await wordRepository.find({
                where: { icf: LessThan(15) as any }
            })

            if (candidateWords.length === 0) {
                return res.status(500).json({ error: 'No candidate words available' })
            }

            const selector = new GameWordSelector(gameId)
            const targetWord = selector.selectWord(candidateWords.map(w => w.word))
            const targetWordEntity = candidateWords.find(w => w.word === targetWord)!

            const rankingsCount = await rankingRepository.count({
                where: { targetWordId: targetWordEntity.id }
            })

            return res.json({
                gameId,
                targetWord,
                targetWordId: targetWordEntity.id,
                exists: rankingsCount > 0,
                rankingsCount
            })

        } catch (error) {
            console.error('❌ Status check failed:', error)
            return res.status(500).json({
                error: 'Status check failed',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        }
    })

    return router
}