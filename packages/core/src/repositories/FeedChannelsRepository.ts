import { EntityManager } from 'typeorm'
import { dataSource } from '../database'
import { FeedChannel } from '../models/FeedChannel'

function getFeedChannelsRepository(manager?: EntityManager) {
    return dataSource.getRepository(FeedChannel)
}

export { getFeedChannelsRepository }
