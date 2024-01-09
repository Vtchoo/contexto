import Discord, { GuildMember } from 'discord.js'
import { UserRole } from '../models/GuildMember'
import { getUsersRepository } from '../repositories/GuildMembersRepository'
import { getGuildsRepository } from '../repositories/GuildsRepository'
import { Guild } from '../models/Guild'

class Bot {
    
    async saveUserData(member: GuildMember, userData?: { role?: UserRole }) {

        try {

            const repository = getUsersRepository()

            const user = repository.create({
                id: member.id,
                guildId: member.guild.id,
                name: member.displayName || member.nickname || member.user.displayName,
                role: userData?.role
            })

            const newUser = await repository.save(user)

            return newUser
        } catch (error) {
            throw error
        }
    }

    async registerGuild(guild: Discord.Guild) {

        try {
            const repository = getGuildsRepository()
            
            const newGuild = {
                id: guild.id
            } as Guild

            const result = await repository.save(newGuild)

            return result

        } catch (error) {
            console.log(error)
            throw error
        }
    }

    async removeGuild(guildId: string) {
        try {
            const repository = getGuildsRepository()

            await repository.delete(guildId)
            return
        } catch (error) {
            console.log(error)
            throw error
        }
    }
}

const bot = new Bot()

export default bot
