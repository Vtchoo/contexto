import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import { gameManager, ContextoCompetitiveGame } from "@contexto/core"

class RankingCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("ranking")
        .setDescription("Veja o ranking do jogo competitivo atual")

    async execute({ client, interaction }: CommandHandlerParams) {
        const playerId = interaction.user.id

        const currentGame = gameManager.getCurrentPlayerGame(playerId)

        if (!currentGame) {
            await interaction.reply({
                content: "Você não está em nenhum jogo no momento. Use `/c <palavra> competitive` para entrar em um jogo competitivo.",
                ephemeral: true,
            })
            return
        }

        if (!(currentGame instanceof ContextoCompetitiveGame)) {
            await interaction.reply({
                content: "O comando de ranking só funciona em jogos competitivos. Use `/c <palavra> competitive` para jogar no modo competitivo.",
                ephemeral: true,
            })
            return
        }

        const leaderboard = currentGame.getLeaderboard()
        const activeStats = currentGame.getActivePlayerStats()

        let response = `🏆 **Ranking - Jogo #${currentGame.gameId}**\n\n`

        // Show completed players (winners)
        if (leaderboard.length > 0) {
            response += "**✅ Jogadores que acertaram:**\n"
            leaderboard.forEach((score, index) => {
                const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `${index + 1}º`
                const userName = score.playerId === playerId ? "**Você**" : `<@${score.playerId}>`
                response += `${medal} ${userName} - ${score.guessCount} tentativas\n`
            })
            response += "\n"
        }

        // Show active players (still playing)
        if (activeStats.length > 0) {
            response += "**🎯 Jogadores ativos:**\n"
            // Sort by guess count
            activeStats.sort((a, b) => a.guessCount - b.guessCount)
            activeStats.forEach((stat) => {
                const userName = stat.playerId === playerId ? "**Você**" : `<@${stat.playerId}>`
                response += `${userName} - ${stat.guessCount} tentativas\n`
            })
        }

        if (leaderboard.length === 0 && activeStats.length === 0) {
            response += "Nenhum jogador encontrado neste jogo."
        }

        await interaction.reply({
            content: response,
            ephemeral: false, // Make it public so everyone can see the ranking
        })
    }
}

export default new RankingCommand()
