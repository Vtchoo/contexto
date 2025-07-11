import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoCompetitiveGame, ContextoDefaultGame } from "../game"

class RoomCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("room")
        .addStringOption(option =>
            option.setName("id")
                .setDescription("ID da sala para ver informações (opcional, mostra sua sala atual se omitido)")
                .setRequired(false)
        )
        .setDescription("Mostra informações sobre uma sala (cooperativa ou competitiva)")

    async execute({ client, interaction }: CommandHandlerParams) {
        const playerId = interaction.user.id
        const roomId = interaction.options.getString("id")

        let game: ContextoCompetitiveGame | ContextoDefaultGame | undefined

        if (roomId) {
            // Check specific room ID - try competitive first, then cooperative
            const competitiveInfo = gameManager.getCompetitiveGameInfo(roomId)
            if (competitiveInfo.exists) {
                game = competitiveInfo.game
            } else {
                const cooperativeInfo = gameManager.getCooperativeGameInfo(roomId)
                if (cooperativeInfo.exists) {
                    game = cooperativeInfo.game
                } else {
                    await interaction.reply({
                        content: `❌ Sala com ID \`${roomId}\` não encontrada.`,
                        ephemeral: true
                    })
                    return
                }
            }
        } else {
            // Check player's current game
            const currentGame = gameManager.getCurrentPlayerGame(playerId)
            if (!currentGame) {
                await interaction.reply({
                    content: `❌ Você não está em nenhuma sala. Use \`/room <id>\` para ver informações de uma sala específica.`,
                    ephemeral: true
                })
                return
            }
            game = currentGame
        }

        if (game instanceof ContextoCompetitiveGame) {
            return this.showCompetitiveRoomInfo(interaction, game, roomId || undefined)
        } else if (game instanceof ContextoDefaultGame) {
            return this.showCooperativeRoomInfo(interaction, game, roomId || undefined)
        }
    }

    private async showCompetitiveRoomInfo(interaction: any, game: ContextoCompetitiveGame, roomId?: string) {
        const leaderboard = game.getLeaderboard()
        const activeStats = game.getActivePlayerStats()
        
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
                `🎯 **Sala Competitiva**\n\n` +
                `**ID da Sala:** \`${game.id}\`\n` +
                `**Jogo Contexto:** #${game.gameId}\n` +
                `**Jogadores:** ${game.getPlayerCount()}/10\n` +
                `**Dicas:** ${game.canUseTips() ? "✅ Permitidas" : "❌ Desabilitadas"}\n` +
                `**Desistir:** ${game.canGiveUp() ? "✅ Permitido" : "❌ Desabilitado"}` +
                leaderboardText +
                activePlayersText +
                `\n\n📋 **Para convidar outros:**\n\`/join ${game.id}\``,
            ephemeral: roomId ? true : false
        })
    }

    private async showCooperativeRoomInfo(interaction: any, game: ContextoDefaultGame, roomId?: string) {
        const closestGuesses = game.getClosestGuesses('any', 5) // Get top 5 guesses
        
        let guessesText = ""
        if (closestGuesses.length > 0) {
            guessesText = "\n🎯 **Tentativas mais próximas:**\n" +
                closestGuesses.map((guess, index) => 
                    `${index + 1}. ${guess.word} - Distância ${(guess.distance || 0) + 1}`
                ).join('\n')
        }

        await interaction.reply({
            content: 
                `🤝 **Sala Cooperativa**\n\n` +
                `**ID da Sala:** \`${game.id}\`\n` +
                `**Jogo Contexto:** #${game.gameId}\n` +
                `**Jogadores:** ${game.getPlayerCount()}/20\n` +
                `**Status:** ${game.finished ? '✅ Finalizado' : '🎮 Em andamento'}\n` +
                `**Total de tentativas:** ${game.getGuessCount()}\n` +
                `**Dicas:** ${game.canUseTips() ? "✅ Permitidas" : "❌ Desabilitadas"}\n` +
                `**Desistir:** ${game.canGiveUp() ? "✅ Permitido" : "❌ Desabilitado"}` +
                guessesText +
                `\n\n📋 **Para convidar outros:**\n\`/join ${game.id}\``,
            ephemeral: roomId ? true : false
        })
    }
}

export default new RoomCommand()
