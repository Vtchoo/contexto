import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import { gameManager, ContextoCompetitiveGame, ContextoDefaultGame } from "@contexto/core"

class GiveUpCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("giveup")
        .setDescription("Desiste do jogo atual e revela a palavra")

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
                    content: "❌ Você não pode desistir de um jogo cooperativo com outros jogadores.",
                    ephemeral: true
                })
                return
            }

            if (!currentGame.canGiveUp()) {
                await interaction.reply({
                    content: "❌ Desistir não está permitido neste jogo.",
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

            // Get the answer by giving up
            try {
                const result = await currentGame.giveUpAndGetAnswer()
                
                if (result.error) {
                    await interaction.reply({
                        content: `❌ ${result.error}`,
                        ephemeral: true
                    })
                    return
                }

                await interaction.reply({
                    content: `🏳️ Você desistiu do jogo #${currentGame.gameId}!\n\n` +
                             `A palavra era: **${result.word.toUpperCase()}**\n\n` +
                             `Você fez ${currentGame.getGuessCount()} tentativas.`,
                    ephemeral: true
                })

                // Remove player from the game
                gameManager.leaveCurrentGame(playerId)

            } catch (error) {
                await interaction.reply({
                    content: "❌ Erro ao processar a desistência. Tente novamente.",
                    ephemeral: true
                })
            }

        } else if (currentGame instanceof ContextoCompetitiveGame) {
            // In competitive mode, just remove the player from the game
            try {
                const result = await currentGame.giveUpAndLeave(playerId)
                
                if (!result.success && result.error) {
                    await interaction.reply({
                        content: `❌ ${result.error}`,
                        ephemeral: true
                    })
                    return
                }

                await interaction.reply({
                    content: `🏳️ Você saiu do jogo competitivo #${currentGame.gameId}.\n\n` +
                             `Você fez ${currentGame.getGuessCount(playerId)} tentativas antes de sair.`,
                    ephemeral: true
                })

                gameManager.leaveCurrentGame(playerId)
                
            } catch (error) {
                await interaction.reply({
                    content: "❌ Erro ao sair do jogo. Tente novamente.",
                    ephemeral: true
                })
            }
        }
    }
}

export default new GiveUpCommand()
