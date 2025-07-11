import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoCompetitiveGame } from "../game"
import { parseISO } from "date-fns"

class CreateCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("create")
        .addIntegerOption(option =>
            option.setName("game-id")
                .setDescription("ID do jogo Contexto específico (opcional, padrão é o jogo de hoje)")
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("date")
                .setDescription("Data do jogo no formato YYYY-MM-DD (alternativa ao game-id)")
                .setRequired(false)
        )
        .setDescription("Crie uma sala competitiva privada para outros jogadores entrarem")

    async execute({ client, interaction }: CommandHandlerParams) {
        const playerId = interaction.user.id
        const gameId = interaction.options.getInteger("game-id")
        const dateString = interaction.options.getString("date")

        // Check if player is already in a game
        const currentGame = gameManager.getCurrentPlayerGame(playerId)
        if (currentGame) {
            if (currentGame instanceof ContextoCompetitiveGame) {
                await interaction.reply({
                    content: `Você já criou/entrou na sala competitiva \`${currentGame.id}\`. Use \`/leave\` primeiro para sair.`,
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

        // Parse date if provided
        let gameIdOrDate: number | Date | undefined
        if (gameId) {
            gameIdOrDate = gameId
        } else if (dateString) {
            const parsedDate = parseISO(dateString)
            if (isNaN(parsedDate.getTime())) {
                await interaction.reply({
                    content: "❌ Data inválida! Use o formato YYYY-MM-DD (ex: 2025-07-09)",
                    ephemeral: true
                })
                return
            }
            gameIdOrDate = parsedDate
        }

        try {
            // Create a new competitive game room
            const game = gameManager.createNewGame(playerId, 'competitive', gameIdOrDate) as ContextoCompetitiveGame
            
            await interaction.reply({
                content: `🎯 **Sala competitiva criada!**\n\n**ID da Sala:** \`${game.id}\`\n**Jogo Contexto:** #${game.gameId}\n**Criador:** <@${playerId}>\n**Jogadores:** 1/10\n\n📋 **Compartilhe este ID para outros jogadores entrarem:**\n\`/join ${game.id}\`\n\n🎮 Use \`/c <palavra>\` para começar a jogar!\n📊 Use \`/ranking\` para ver o placar.`,
                ephemeral: false, // Make this public so others can see the room ID
            })
        } catch (error) {
            await interaction.reply({
                content: `❌ Erro ao criar sala: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                ephemeral: true,
            })
        }
    }
}

export default new CreateCommand()
