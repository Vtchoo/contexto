import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoCompetitiveGame, ContextoDefaultGame } from "../game"

class JoinCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("join")
        .addStringOption(option =>
            option.setName("game-id")
                .setDescription("ID da sala para entrar (cooperativa ou competitiva)")
                .setRequired(true)
        )
        .setDescription("Entre em uma sala específica usando o ID da sala")

    async execute({ client, interaction }: CommandHandlerParams) {
        const playerId = interaction.user.id
        const gameInstanceId = interaction.options.getString("game-id")

        if (!gameInstanceId) {
            await interaction.reply({
                content: "❌ Você deve especificar o ID da sala para entrar!",
                ephemeral: true
            })
            return
        }

        try {
            // Try to join as competitive game first
            const competitiveInfo = gameManager.getCompetitiveGameInfo(gameInstanceId)
            if (competitiveInfo.exists) {
                const game = gameManager.joinCompetitiveGame(playerId, gameInstanceId)
                await interaction.reply({
                    content: `🎯 **Você entrou na sala competitiva!**\n\n**Sala ID:** \`${game.id}\`\n**Jogo:** #${game.gameId}\n**Jogadores:** ${game.getPlayerCount()}/10\n\nUse \`/c <palavra>\` para fazer suas tentativas.\nUse \`/ranking\` para ver o placar atual.`,
                    ephemeral: true,
                })
                return
            }

            // Try to join as cooperative game
            const cooperativeInfo = gameManager.getCooperativeGameInfo(gameInstanceId)
            if (cooperativeInfo.exists) {
                const game = gameManager.joinCooperativeGame(playerId, gameInstanceId)
                await interaction.reply({
                    content: `🤝 **Você entrou na sala cooperativa!**\n\n**Sala ID:** \`${game.id}\`\n**Jogo:** #${game.gameId}\n**Jogadores:** ${game.getPlayerCount()}/20\n**Status:** ${game.finished ? 'Finalizado' : 'Em andamento'}\n\nUse \`/c <palavra>\` para fazer suas tentativas.`,
                    ephemeral: true,
                })
                return
            }

            // Game not found
            await interaction.reply({
                content: `❌ Sala com ID \`${gameInstanceId}\` não encontrada.`,
                ephemeral: true
            })

        } catch (error) {
            await interaction.reply({
                content: `❌ Erro ao entrar na sala: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                ephemeral: true,
            })
        }
    }
}

export default new JoinCommand()
