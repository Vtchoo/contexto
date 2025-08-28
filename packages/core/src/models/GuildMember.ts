import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm'

export const userRoles = ['user', 'guildAdmin', 'admin'] as const

export type UserRole = typeof userRoles[number]

@Entity('guild_members')
class User {
    @PrimaryColumn() id: string
    @PrimaryColumn() guildId: string
    @Column() name: string
    @Column() role: UserRole
}

export { User }
