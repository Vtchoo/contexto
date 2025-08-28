import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoCompetitiveGame, ContextoDefaultGame, ContextoStopGame, ContextoBattleRoyaleGame } from "../game"
import { parseISO } from "date-fns"

class CreateCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("create")
        .addStringOption(option =>
            option.setName("mode")
                .setDescription("Tipo de sala a criar")
                .setRequired(false)
                .addChoices(
                    { name: "Cooperativa (padrão)", value: "default" },
                    { name: "Competitiva", value: "competitive" },
                    { name: "Stop (termina quando alguém acerta)", value: "stop" },
                    { name: "Battle Royale (palavras únicas)", value: "battle-royale" }
                )
        )
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
        .setDescription("Crie uma sala privada para outros jogadores entrarem")

    async execute({ client, interaction }: CommandHandlerParams) {
        const playerId = interaction.user.id
        const mode = interaction.options.getString("mode") as 'default' | 'competitive' | 'stop' | 'battle-royale' | null
        const gameId = interaction.options.getInteger("game-id")
        const dateString = interaction.options.getString("date")

        const gameType = mode || 'default'

        // Check if player is already in a game
        const currentGame = gameManager.getCurrentPlayerGame(playerId)
        if (currentGame) {
            if (currentGame instanceof ContextoCompetitiveGame) {
                await interaction.reply({
                    content: `Você já criou/entrou na sala competitiva \`${currentGame.id}\`. Use \`/leave\` primeiro para sair.`,
                    ephemeral: true,
                })
            } else if (currentGame instanceof ContextoDefaultGame) {
                await interaction.reply({
                    content: `Você já criou/entrou na sala cooperativa \`${currentGame.id}\`. Use \`/leave\` primeiro para sair.`,
                    ephemeral: true,
                })
            } else if (currentGame instanceof ContextoStopGame) {
                await interaction.reply({
                    content: `Você já criou/entrou na sala stop \`${currentGame.id}\`. Use \`/leave\` primeiro para sair.`,
                    ephemeral: true,
                })
            } else if (currentGame instanceof ContextoBattleRoyaleGame) {
                await interaction.reply({
                    content: `Você já criou/entrou na sala battle royale \`${currentGame.id}\`. Use \`/leave\` primeiro para sair.`,
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
            // Create a new game room
            const game = gameManager.createNewGame(playerId, gameType, gameIdOrDate)
            
            if (game instanceof ContextoCompetitiveGame) {
                await interaction.reply({
                    content: `🎯 **Sala competitiva criada!**\n\n**ID da Sala:** \`${game.id}\`\n**Jogo Contexto:** #${game.gameId}\n**Criador:** <@${playerId}>\n**Jogadores:** 1/10\n\n📋 **Compartilhe este ID para outros jogadores entrarem:**\n\`/join ${game.id}\`\n\n🎮 Use \`/c <palavra>\` para começar a jogar!\n📊 Use \`/ranking\` para ver o placar.`,
                    ephemeral: false, // Make this public so others can see the room ID
                })
            } else if (game instanceof ContextoStopGame) {
                await interaction.reply({
                    content: `⚡ **Sala Stop criada!**\n\n**ID da Sala:** \`${game.id}\`\n**Jogo Contexto:** #${game.gameId}\n**Criador:** <@${playerId}>\n**Jogadores:** 1/20\n**Status:** 🔴 Não iniciada\n\n📋 **Compartilhe este ID para outros jogadores entrarem:**\n\`/join ${game.id}\`\n\n⚡ **Regras Stop:** O jogo termina quando alguém acerta a palavra. Ranking por distância mais próxima!\n\n🚀 **Para iniciar:** Use \`/start\` quando todos estiverem prontos (modo time-critical!)`,
                    ephemeral: false, // Make this public so others can see the room ID
                })
            } else if (game instanceof ContextoBattleRoyaleGame) {
                await interaction.reply({
                    content: `⚔️ **Sala Battle Royale criada!**\n\n**ID da Sala:** \`${game.id}\`\n**Jogo Contexto:** #${game.gameId}\n**Criador:** <@${playerId}>\n**Jogadores:** 1/20\n**Status:** 🔴 Não iniciada\n\n📋 **Compartilhe este ID para outros jogadores entrarem:**\n\`/join ${game.id}\`\n\n⚔️ **Regras Battle Royale:** O jogo termina quando alguém acerta a palavra. Cada palavra só pode ser usada uma vez!\n\n🚀 **Para iniciar:** Use \`/start\` quando todos estiverem prontos!`,
                    ephemeral: false, // Make this public so others can see the room ID
                })
            } else {
                await interaction.reply({
                    content: `🤝 **Sala cooperativa criada!**\n\n**ID da Sala:** \`${game.id}\`\n**Jogo Contexto:** #${game.gameId}\n**Criador:** <@${playerId}>\n**Jogadores:** 1/20\n\n📋 **Compartilhe este ID para outros jogadores entrarem:**\n\`/join ${game.id}\`\n\n🎮 Use \`/c <palavra>\` para começar a jogar!`,
                    ephemeral: false, // Make this public so others can see the room ID
                })
            }
        } catch (error) {
            await interaction.reply({
                content: `❌ Erro ao criar sala: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                ephemeral: true,
            })
        }
    }
}

export default new CreateCommand()
