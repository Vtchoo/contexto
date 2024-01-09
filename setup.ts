import { REST, Routes } from 'discord.js'
import fs from 'fs'
import env from './env'

async function setupCommands() {

    const commandFiles = fs
        .readdirSync('./src/commands')
        .filter(file => file.endsWith('.js') || file.endsWith('.ts'))

    const commandDefinitions = commandFiles.map(file => {
        const data = require(`./src/commands/${file}`)
        const command = data.default || data
        return command.definition
    })

    console.log(commandDefinitions)

    try {
        const rest = new REST().setToken(env.TOKEN)

        await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: commandDefinitions })
        console.log(`Commands set up successfully!`)
    } catch (error) {
        console.log(`Error while setting up the bot commands. ${error.message}`, error)
    }
}

setupCommands()