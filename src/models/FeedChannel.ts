import { Column, Entity, PrimaryColumn } from 'typeorm'

@Entity('feed_channels')
class FeedChannel {
    @PrimaryColumn() id: string
    @Column() guildId: string
    // @Column() interval: number
}

export { FeedChannel }
