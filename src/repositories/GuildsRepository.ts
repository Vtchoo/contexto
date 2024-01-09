import dataSource from '../../dataSource'
import { Guild } from '../models/Guild'

function getGuildsRepository() {
    return dataSource.getRepository(Guild)
}

export { getGuildsRepository }
