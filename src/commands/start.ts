import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoStopGame } from "../game"

class StartCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("start")
        .setDescription("Inicia uma sala Stop (apenas para salas do tipo Stop)")

    async execute({ client, interaction }: CommandHandlerParams) {
        const playerId = interaction.user.id

        try {
            // Check if player is in a stop game
            const currentGame = gameManager.getCurrentPlayerGame(playerId)
            
            if (!currentGame) {
                await interaction.reply({
                    content: "❌ Você não está em nenhuma sala. Primeiro crie ou entre em uma sala Stop com `/create mode:stop` ou `/join <id>`.",
                    ephemeral: true
                })
                return
            }

            if (!(currentGame instanceof ContextoStopGame)) {
                await interaction.reply({
                    content: "❌ O comando `/start` só funciona em salas do tipo Stop. Você está em uma sala " + 
                           (currentGame.constructor.name === 'ContextoCompetitiveGame' ? 'competitiva' : 'cooperativa') + ".",
                    ephemeral: true
                })
                return
            }

            if (currentGame.started) {
                await interaction.reply({
                    content: "❌ O jogo já foi iniciado! Use `/c <palavra>` para fazer suas tentativas.",
                    ephemeral: true
                })
                return
            }

            if (!currentGame.canStart()) {
                await interaction.reply({
                    content: "❌ Não é possível iniciar o jogo no momento. Verifique se há jogadores na sala.",
                    ephemeral: true
                })
                return
            }

            // Start the game
            currentGame.startGame()

            await interaction.reply({
                content: `🚀 **Jogo Stop Iniciado!**\n\n` +
                        `**Sala ID:** \`${currentGame.id}\`\n` +
                        `**Jogo:** #${currentGame.gameId}\n` +
                        `**Jogadores:** ${currentGame.getPlayerCount()}\n\n` +
                        `⚡ **O jogo está ativo!** Use \`/c <palavra>\` para fazer suas tentativas.\n` +
                        `🏁 **Lembre-se:** O primeiro jogador a acertar vence!\n` +
                        `📊 **Ranking:** Baseado na distância mais próxima.`,
                ephemeral: false // Make this public so all players see the game has started
            })

        } catch (error) {
            await interaction.reply({
                content: `❌ Erro ao iniciar o jogo: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                ephemeral: true,
            })
        }
    }
}

export default new StartCommand()
