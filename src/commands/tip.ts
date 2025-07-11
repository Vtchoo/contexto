import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoCompetitiveGame, ContextoDefaultGame } from "../game"

class TipCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("tip")
        .setDescription("Recebe uma dica para o jogo atual")

    async execute({ client, interaction }: CommandHandlerParams) {
        const playerId = interaction.user.id
        const currentGame = gameManager.getCurrentPlayerGame(playerId)

        if (!currentGame) {
            await interaction.reply({
                content: "❌ Você não está em nenhum jogo no momento. Use `/c <palavra>` para começar um jogo.",
                ephemeral: true
            })
            return
        }

        // Check if it's a default game with only one player
        if (currentGame instanceof ContextoDefaultGame) {
            if (currentGame.getPlayerCount() > 1) {
                await interaction.reply({
                    content: "❌ Dicas só estão disponíveis em jogos cooperativos com apenas um jogador.",
                    ephemeral: true
                })
                return
            }

            if (!currentGame.canUseTips()) {
                await interaction.reply({
                    content: "❌ Dicas não estão permitidas neste jogo.",
                    ephemeral: true
                })
                return
            }

            if (currentGame.finished) {
                await interaction.reply({
                    content: "❌ O jogo já foi finalizado.",
                    ephemeral: true
                })
                return
            }

            // Get a tip
            try {
                const tipResult = await currentGame.getTip(playerId)
                
                if (tipResult.error) {
                    await interaction.reply({
                        content: `❌ ${tipResult.error}`,
                        ephemeral: true
                    })
                    return
                }

                await interaction.reply({
                    content: `💡 **Dica para o jogo #${currentGame.gameId}:**\n\n` +
                             `**${tipResult.word.toUpperCase()}** está na posição ${tipResult.distance + 1}\n\n` +
                             `Use esta palavra como referência para suas próximas tentativas!`,
                    ephemeral: true
                })

            } catch (error) {
                await interaction.reply({
                    content: "❌ Erro ao obter dica. Tente novamente.",
                    ephemeral: true
                })
            }

        } else if (currentGame instanceof ContextoCompetitiveGame) {
            // In competitive mode, tips are not recommended but allowed
            if (!currentGame.canUseTips()) {
                await interaction.reply({
                    content: "❌ Dicas não estão permitidas neste jogo.",
                    ephemeral: true
                })
                return
            }

            if (currentGame.hasPlayerCompleted(playerId)) {
                await interaction.reply({
                    content: "❌ Você já encontrou a palavra! Não precisa mais de dicas.",
                    ephemeral: true
                })
                return
            }

            try {
                const tipResult = await currentGame.getTip(playerId)
                
                if (tipResult.error) {
                    await interaction.reply({
                        content: `❌ ${tipResult.error}`,
                        ephemeral: true
                    })
                    return
                }

                await interaction.reply({
                    content: `💡 **Dica para o jogo competitivo #${currentGame.gameId}:**\n\n` +
                             `**${tipResult.word.toUpperCase()}** está na posição ${tipResult.distance + 1}\n\n` +
                             `*Lembre-se: usar dicas pode afetar sua pontuação no ranking!*`,
                    ephemeral: true
                })

            } catch (error) {
                await interaction.reply({
                    content: "❌ Erro ao obter dica. Tente novamente.",
                    ephemeral: true
                })
            }
        }
    }
}

export default new TipCommand()
