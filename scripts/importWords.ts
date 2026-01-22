import fs from 'fs'
import path from 'path'
import { DataSource } from 'typeorm'
import dataSource from '../src/../dataSource'
import { Word } from '../src/models/Word'

/**
 * Script to populate the words table with data from lexico.txt and icf.txt
 */
class WordsImporter {
  private dataSource: DataSource

  constructor() {
    this.dataSource = dataSource
  }

  /**
   * Read and parse the ICF file
   */
  private async loadIcfData(): Promise<Map<string, number>> {
    const icfPath = path.join('data', 'icf.txt')
    const content = await fs.promises.readFile(icfPath, 'utf-8')
    
    const icfMap = new Map<string, number>()
    const lines = content.trim().split('\n')
    
    console.log(`Loading ICF data from ${lines.length} lines...`)
    
    for (const line of lines) {
      const [word, icfValue] = line.split(',')
      if (word && icfValue) {
        icfMap.set(word.toLowerCase().trim(), parseFloat(icfValue))
      }
    }
    
    console.log(`✅ Loaded ${icfMap.size} ICF entries`)
    return icfMap
  }

  /**
   * Read the lexicon file
   */
  private async loadLexicoWords(): Promise<string[]> {
    const lexicoPath = path.join('data', 'lexico.txt')
    const content = await fs.promises.readFile(lexicoPath, 'utf-8')
    
    const words = content.trim().split('\n').map(word => word.toLowerCase().trim())
    console.log(`✅ Loaded ${words.length} words from lexico.txt`)
    return words
  }

  /**
   * Import all words into the database
   */
  async importWords(): Promise<void> {
    console.log('🚀 Starting words import...')
    
    try {
      // Initialize database connection
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize()
        console.log('✅ Database connection initialized')
      }

      // Load data files
      const [icfData, lexicoWords] = await Promise.all([
        this.loadIcfData(),
        this.loadLexicoWords()
      ])

      // Get Word repository
      const wordRepository = this.dataSource.getRepository(Word)

      // Check if words already exist
      const existingWordsCount = await wordRepository.count()
      if (existingWordsCount > 0) {
        console.log(`⚠️  Found ${existingWordsCount} existing words in database`)
        console.log('Clearing existing words...')
        await wordRepository.clear()
      }

      // Prepare word entities
      const wordEntities: Word[] = []
      let wordsWithIcf = 0
      let wordsWithoutIcf = 0

      for (const word of lexicoWords) {
        if (!word || word.length === 0) continue

        const icfValue = icfData.get(word)
        const wordEntity = new Word(word, icfValue || undefined)
        wordEntities.push(wordEntity)

        if (icfValue !== undefined) {
          wordsWithIcf++
        } else {
          wordsWithoutIcf++
        }
      }

      console.log(`📊 Processing ${wordEntities.length} words:`)
      console.log(`   - ${wordsWithIcf} words with ICF values`)
      console.log(`   - ${wordsWithoutIcf} words without ICF values`)

      // Insert in batches for better performance
      const batchSize = 1000
      let processed = 0

      for (let i = 0; i < wordEntities.length; i += batchSize) {
        const batch = wordEntities.slice(i, i + batchSize)
        
        try {
          console.log(batch)
          await wordRepository.save(batch)
          processed += batch.length
          
          const percentage = ((processed / wordEntities.length) * 100).toFixed(1)
          console.log(`💾 Saved batch: ${processed}/${wordEntities.length} (${percentage}%)`)
          
        } catch (error) {
          console.error(`❌ Error saving batch ${i}-${i + batchSize}:`, error)
          throw error
        }
      }

      console.log(`✅ Successfully imported ${processed} words into the database`)
      
      // Verify the import
      const finalCount = await wordRepository.count()
      const wordsWithIcfCount = await wordRepository.count({ 
        where: { icf: { $ne: null } as any }
      })
      
      console.log(`🎉 Import completed:`)
      console.log(`   - Total words in database: ${finalCount}`)
      console.log(`   - Words with ICF values: ${wordsWithIcfCount}`)

    } catch (error) {
      console.error('❌ Import failed:', error)
      throw error
    } finally {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy()
        console.log('✅ Database connection closed')
      }
    }
  }

  /**
   * Sample some words from the database for verification
   */
  async sampleWords(limit: number = 10): Promise<void> {
    try {
      if (!this.dataSource.isInitialized) {
        await this.dataSource.initialize()
      }

      const wordRepository = this.dataSource.getRepository(Word)
      
      console.log(`\n📋 Sample of ${limit} words from database:`)
      
      const sampleWords = await wordRepository.find({
        take: limit,
        order: { id: 'ASC' }
      })

      sampleWords.forEach((word, index) => {
        const icfDisplay = word.icf ? word.icf.toFixed(6) : 'N/A'
        console.log(`   ${(index + 1).toString().padStart(2)}. ${word.word.padEnd(15)} (ICF: ${icfDisplay})`)
      })

    } catch (error) {
      console.error('❌ Error sampling words:', error)
    } finally {
      if (this.dataSource.isInitialized) {
        await this.dataSource.destroy()
      }
    }
  }
}

/**
 * Main execution function
 */
async function main() {
  const importer = new WordsImporter()
  
  try {
    await importer.importWords()
    await importer.sampleWords(15)
  } catch (error) {
    console.error('Script failed:', error)
    process.exit(1)
  }
}

// Run if this is the main module
if (require.main === module) {
  main()
}

export { WordsImporter }