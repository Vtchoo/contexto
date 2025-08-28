import { dataSource } from '../database'
import { CachedWord } from '../models/CachedWord'

function getCachedWordsRepository() {
    return dataSource.getRepository(CachedWord)
}

export { getCachedWordsRepository }
