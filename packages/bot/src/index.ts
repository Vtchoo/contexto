import 'reflect-metadata'
import fs from 'fs'
import { env, createConnection, gameManager } from '@contexto/core'
import Discord, { AuditLogEvent, Client, EmbedBuilder, Events, GatewayIntentBits, GuildAuditLogs, GuildAuditLogsEntry } from 'discord.js'
import { ICommand } from './types'
import bot from './core/Bot'
import { format } from 'date-fns'

async function startClient() {

    console.log('Initializing Bot')

    await createConnection()
    
    console.log('Initializing Game Manager')
    await gameManager.initialize()
    
    const client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
        ]
    })
    
    const slashCommands: Discord.Collection<string, ICommand> = new Discord.Collection()
    
    console.log('Importing commands')
    
    const slashFiles = fs
        .readdirSync('./src/commands')
        .filter(file => file.endsWith('.js') || file.endsWith('.ts'))
        
    for (const file of slashFiles) {
        const cmdData = require(`./commands/${file}`)
        const slashcmd = cmdData.default || cmdData

        slashCommands.set(slashcmd.definition.name, slashcmd)
    }
 
    client.on(Events.ClientReady, (client) => {
        console.log(`Logged in as ${client.user.tag}`)
        
        // Set up periodic memory cache cleanup (every hour)
        setInterval(() => {
            gameManager.clearMemoryCache()
            console.log('Memory cache cleared')
        }, 60 * 60 * 1000) // 1 hour
    })
    
    client.on(Events.InteractionCreate, async (interaction) => {

        if (interaction.isChatInputCommand()) {

            try {
                if (!interaction.inCachedGuild()) {
                    await interaction.reply('Invalid guild (?)')
                    return
                }
    
                const slashcmd = slashCommands.get(interaction.commandName)
                if (!slashcmd) {
                    await interaction.reply('Invalid command')
                    return
                }

                const user = interaction.member.displayName || interaction.member.nickname
                const subCommand = interaction.options.getSubcommand(false) || ''
                console.log(`[${format(new Date(), 'dd/MM/yyyy HH:mm:ss')}] ${user} - /${interaction.commandName} ${subCommand} [Guild: ${interaction.guild.name}]`)
                    
                // await interaction.deferReply()
                await slashcmd.execute({ client, interaction })
                return
                    
            } catch (error) {

                if (!interaction.deferred)
                    await interaction.deferReply({ ephemeral: true })

                const embed = new EmbedBuilder()
                    .setTitle(`**Oh no, an error occurred!**`)
                    .setDescription(error.message)
                    .setColor(0xc4393c)
                    
                await interaction.editReply({
                    embeds: [embed]
                })
            }
        }
    })
    
    client.on(Events.GuildCreate, async guild => {
        console.log(`Bot added to guild ${guild.name} [id: ${guild.id}]`)

        await bot.registerGuild(guild)

        const owner = await guild.fetchOwner()

        await bot.saveUserData(owner, { role: 'guildAdmin' })
    })

    client.on(Events.GuildDelete, async guild => {
        console.log(`Bot removed from guild ${guild.name} [id: ${guild.id}]`)

        await bot.removeGuild(guild.id)
    })
    
    client.login(env.TOKEN)
}

startClient()
