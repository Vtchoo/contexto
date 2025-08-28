import dataSource from '../../dataSource'
import { User } from '../models/GuildMember'

function getUsersRepository() {
    return dataSource.getRepository(User)
}

export { getUsersRepository }
