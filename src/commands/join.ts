import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoCompetitiveGame } from "../game"

class JoinCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("join")
        .addStringOption(option =>
            option.setName("game-id")
                .setDescription("ID do jogo competitivo para entrar (como uma sala privada)")
                .setRequired(true)
        )
        .setDescription("Entre em um jogo competitivo específico usando o ID da sala")

    async execute({ client, interaction }: CommandHandlerParams) {
        const playerId = interaction.user.id
        const gameInstanceId = interaction.options.getString("game-id")

        if (!gameInstanceId) {
            await interaction.reply({
                content: "❌ Você deve especificar o ID do jogo para entrar em uma sala competitiva!",
                ephemeral: true
            })
            return
        }

        try {
            // Join the specific competitive game by its instance ID
            const game = gameManager.joinCompetitiveGame(playerId, gameInstanceId)
            
            await interaction.reply({
                content: `🎯 Você entrou na sala competitiva!\n\n**Sala ID:** \`${game.id}\`\n**Jogo:** #${game.gameId}\n**Jogadores:** ${game.getPlayerCount()}/10\n\nUse \`/c <palavra>\` para fazer suas tentativas.\nUse \`/ranking\` para ver o placar atual.`,
                ephemeral: true,
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
