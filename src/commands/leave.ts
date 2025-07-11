import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoCompetitiveGame } from "../game"

class LeaveCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("leave")
        .setDescription("Saia do jogo atual")

    async execute({ client, interaction }: CommandHandlerParams) {
        const playerId = interaction.user.id

        const currentGame = gameManager.getCurrentPlayerGame(playerId)
        if (!currentGame) {
            await interaction.reply({
                content: "Você não está em nenhum jogo no momento.",
                ephemeral: true,
            })
            return
        }

        const gameType = currentGame instanceof ContextoCompetitiveGame ? "competitivo" : "cooperativo"
        const gameId = currentGame.gameId

        gameManager.leaveCurrentGame(playerId)

        await interaction.reply({
            content: `Você saiu do jogo ${gameType} #${gameId}.`,
            ephemeral: true,
        })
    }
}

export default new LeaveCommand()
