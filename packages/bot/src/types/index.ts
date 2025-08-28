import { SlashCommandBuilder, Client, ChatInputCommandInteraction } from 'discord.js'

interface CommandHandlerParams {
    client: Client
    interaction: ChatInputCommandInteraction<'cached'>
}

interface ICommand {
    definition: SlashCommandBuilder
    execute(params: CommandHandlerParams): Promise<void>
}

export { ICommand, CommandHandlerParams }
