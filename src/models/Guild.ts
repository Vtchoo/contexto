import { Entity, PrimaryColumn } from 'typeorm'

@Entity('guilds')
class Guild {
    @PrimaryColumn() id: string
}

export { Guild }
