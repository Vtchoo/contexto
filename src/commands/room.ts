import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoCompetitiveGame } from "../game"

class RoomCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("room")
        .addStringOption(option =>
            option.setName("id")
                .setDescription("ID da sala para ver informações (opcional, mostra sua sala atual se omitido)")
                .setRequired(false)
        )
        .setDescription("Mostra informações sobre uma sala competitiva")

    async execute({ client, interaction }: CommandHandlerParams) {
        const playerId = interaction.user.id
        const roomId = interaction.options.getString("id")

        let game: ContextoCompetitiveGame | undefined

        if (roomId) {
            // Check specific room ID
            const roomInfo = gameManager.getCompetitiveGameInfo(roomId)
            if (!roomInfo.exists) {
                await interaction.reply({
                    content: `❌ Sala com ID \`${roomId}\` não encontrada.`,
                    ephemeral: true
                })
                return
            }
            game = roomInfo.game
        } else {
            // Check player's current game
            const currentGame = gameManager.getCurrentPlayerGame(playerId)
            if (!currentGame || !(currentGame instanceof ContextoCompetitiveGame)) {
                await interaction.reply({
                    content: `❌ Você não está em nenhuma sala competitiva. Use \`/room <id>\` para ver informações de uma sala específica.`,
                    ephemeral: true
                })
                return
            }
            game = currentGame
        }

        const leaderboard = game!.getLeaderboard()
        const activeStats = game!.getActivePlayerStats()
        
        let leaderboardText = ""
        if (leaderboard.length > 0) {
            leaderboardText = "\n🏆 **Jogadores que completaram:**\n" +
                leaderboard.slice(0, 5).map((score, index) => 
                    `${index + 1}º <@${score.playerId}> - ${score.guessCount} tentativas`
                ).join('\n')
        }

        let activePlayersText = ""
        if (activeStats.length > 0) {
            activePlayersText = "\n🎮 **Jogadores ativos:**\n" +
                activeStats.map(stat => 
                    `<@${stat.playerId}> - ${stat.guessCount} tentativas`
                ).join('\n')
        }

        await interaction.reply({
            content: 
                `🎯 **Informações da Sala Competitiva**\n\n` +
                `**ID da Sala:** \`${game!.id}\`\n` +
                `**Jogo Contexto:** #${game!.gameId}\n` +
                `**Jogadores:** ${game!.getPlayerCount()}/10\n` +
                `**Dicas:** ${game!.canUseTips() ? "✅ Permitidas" : "❌ Desabilitadas"}\n` +
                `**Desistir:** ${game!.canGiveUp() ? "✅ Permitido" : "❌ Desabilitado"}` +
                leaderboardText +
                activePlayersText +
                `\n\n📋 **Para convidar outros:**\n\`/join ${game!.id}\``,
            ephemeral: roomId ? true : false // Public if showing current room, private if checking specific room
        })
    }
}

export default new RoomCommand()
