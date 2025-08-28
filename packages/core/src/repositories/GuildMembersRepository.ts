import { dataSource } from '../database'
import { User } from '../models/GuildMember'

function getUsersRepository() {
    return dataSource.getRepository(User)
}

export { getUsersRepository }
