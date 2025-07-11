import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoCompetitiveGame } from "../game"

class JoinCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("join")
        .setDescription("Entre em um jogo competitivo")

    async execute({ client, interaction }: CommandHandlerParams) {
        const playerId = interaction.user.id

        // Check if player is already in a game
        const currentGame = gameManager.getCurrentPlayerGame(playerId)
        if (currentGame) {
            if (currentGame instanceof ContextoCompetitiveGame) {
                await interaction.reply({
                    content: `Você já está no jogo competitivo #${currentGame.gameId}. Use \`/ranking\` para ver sua posição.`,
                    ephemeral: true,
                })
            } else {
                await interaction.reply({
                    content: `Você já está em um jogo cooperativo. Use \`/leave\` primeiro para sair do jogo atual.`,
                    ephemeral: true,
                })
            }
            return
        }

        // Find or create a competitive game
        const game = gameManager.findOrCreateCompetitiveGame(playerId)
        
        await interaction.reply({
            content: `🎯 Você entrou no jogo competitivo #${game.gameId}!\n\nUse \`/c <palavra>\` para fazer suas tentativas.\nUse \`/ranking\` para ver o placar atual.`,
            ephemeral: true,
        })
    }
}

export default new JoinCommand()
