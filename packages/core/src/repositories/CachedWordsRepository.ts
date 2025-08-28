import dataSource from '../../dataSource'
import { CachedWord } from '../models/CachedWord'

function getCachedWordsRepository() {
    return dataSource.getRepository(CachedWord)
}

export { getCachedWordsRepository }
