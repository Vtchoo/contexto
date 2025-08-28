import { dataSource } from '../database'
import { Guild } from '../models/Guild'

function getGuildsRepository() {
    return dataSource.getRepository(Guild)
}

export { getGuildsRepository }
