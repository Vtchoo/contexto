import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import { gameManager, ContextoCompetitiveGame, ContextoDefaultGame, ContextoStopGame, ContextoBattleRoyaleGame, snowflakeGenerator } from "@contexto/core"

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

        // Validate the game ID format
        if (!snowflakeGenerator.isValid(gameInstanceId)) {
            await interaction.reply({
                content: `❌ ID de sala inválido: \`${gameInstanceId}\`\n\nO ID deve conter apenas letras e números (6-12 caracteres).`,
                ephemeral: true
            })
            return
        }

        try {
            // Get game info using unified method
            const gameInfo = gameManager.getGameInfo(gameInstanceId)
            if (!gameInfo.exists || !gameInfo.game) {
                await interaction.reply({
                    content: `❌ Sala com ID \`${gameInstanceId}\` não encontrada.`,
                    ephemeral: true
                })
                return
            }

            const game = gameInfo.game

            // Join the game using the unified method
            const joinedGame = gameManager.joinGame(playerId, gameInstanceId)
            
            // Handle different game types for response messages
            if (joinedGame instanceof ContextoCompetitiveGame) {
                await interaction.reply({
                    content: `🎯 **Você entrou na sala competitiva!**\n\n**Sala ID:** \`${joinedGame.id}\`\n**Jogo:** #${joinedGame.gameId}\n**Jogadores:** ${joinedGame.getPlayerCount()}/10\n\nUse \`/c <palavra>\` para fazer suas tentativas.\nUse \`/ranking\` para ver o placar atual.`,
                    ephemeral: true,
                })
            } else if (joinedGame instanceof ContextoDefaultGame) {
                await interaction.reply({
                    content: `🤝 **Você entrou na sala cooperativa!**\n\n**Sala ID:** \`${joinedGame.id}\`\n**Jogo:** #${joinedGame.gameId}\n**Jogadores:** ${joinedGame.getPlayerCount()}/20\n**Status:** ${joinedGame.finished ? 'Finalizado' : 'Em andamento'}\n\nUse \`/c <palavra>\` para fazer suas tentativas.`,
                    ephemeral: true,
                })
            } else if (joinedGame instanceof ContextoStopGame) {
                const statusText = joinedGame.started ? "🟢 Iniciado" : "🔴 Aguardando /start"
                await interaction.reply({
                    content: `⚡ **Você entrou na sala Stop!**\n\n**Sala ID:** \`${joinedGame.id}\`\n**Jogo:** #${joinedGame.gameId}\n**Jogadores:** ${joinedGame.getPlayerCount()}/20\n**Status:** ${statusText}\n\n⚡ **Regras Stop:** O jogo termina quando alguém acerta a palavra. Ranking por distância mais próxima!\n${joinedGame.started ? 'Use `/c <palavra>` para fazer suas tentativas.' : '🚀 Aguarde o `/start` para começar!'}`,
                    ephemeral: true,
                })
            } else if (joinedGame instanceof ContextoBattleRoyaleGame) {
                const statusText = joinedGame.started ? "🟢 Iniciado" : "🔴 Aguardando /start"
                await interaction.reply({
                    content: `⚔️ **Você entrou na sala Battle Royale!**\n\n**Sala ID:** \`${joinedGame.id}\`\n**Jogo:** #${joinedGame.gameId}\n**Jogadores:** ${joinedGame.getPlayerCount()}/20\n**Status:** ${statusText}\n\n⚔️ **Regras Battle Royale:** O jogo termina quando alguém acerta a palavra. Cada palavra só pode ser usada uma vez!\n${joinedGame.started ? 'Use `/c <palavra>` para fazer suas tentativas.' : '🚀 Aguarde o `/start` para começar!'}`,
                    ephemeral: true,
                })
            }

        } catch (error) {
            await interaction.reply({
                content: `❌ Erro ao entrar na sala: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                ephemeral: true,
            })
        }
    }
}

export default new JoinCommand()
