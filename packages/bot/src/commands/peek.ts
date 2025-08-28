import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import { gameManager, ContextoCompetitiveGame, ContextoDefaultGame, ContextoStopGame, ContextoBattleRoyaleGame, getBarColor, getBarWidth, getTodaysGameId } from "@contexto/core"

const TOTAL_BAR_WIDTH = 30 // Total width of the bar in characters

class PeekCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("peek")
        .addIntegerOption(option =>
            option.setName("count")
                .setDescription("Número de palavras mais próximas para mostrar (padrão: 10, máximo: 20)")
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(20)
        )
        .setDescription("Veja suas palavras mais próximas sem fazer uma tentativa")

    async execute({ client, interaction }: CommandHandlerParams) {
        const playerId = interaction.user.id
        const count = interaction.options.getInteger("count") || 10

        // Check if player is in any game
        const currentGame = gameManager.getCurrentPlayerGame(playerId)
        
        if (!currentGame) {
            await interaction.reply({
                content: "❌ Você não está em nenhum jogo. Use `/c <palavra>` para começar um jogo ou `/join <id>` para entrar em uma sala existente.",
                ephemeral: true
            })
            return
        }

        try {
            if (currentGame instanceof ContextoDefaultGame) {
                return this.handleDefaultGame(interaction, currentGame, playerId, count)
            } else if (currentGame instanceof ContextoCompetitiveGame) {
                return this.handleCompetitiveGame(interaction, currentGame, playerId, count)
            } else if (currentGame instanceof ContextoStopGame) {
                return this.handleStopGame(interaction, currentGame, playerId, count)
            } else if (currentGame instanceof ContextoBattleRoyaleGame) {
                return this.handleBattleRoyaleGame(interaction, currentGame, playerId, count)
            }
        } catch (error) {
            await interaction.reply({
                content: `❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                ephemeral: true
            })
        }
    }

    private async handleDefaultGame(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoDefaultGame, playerId: string, count: number) {
        if (game.finished) {
            await interaction.reply({
                content: `✅ O jogo cooperativo #${game.gameId} já foi finalizado! A palavra foi encontrada em ${game.getGuessCount()} tentativas.`,
                ephemeral: true
            })
            return
        }

        const closestGuesses = game.getClosestGuesses('any', count)
        
        if (closestGuesses.length === 0) {
            await interaction.reply({
                content: `🤝 **Jogo Cooperativo #${game.gameId}**\n\nNenhuma tentativa foi feita ainda. Use \`/c <palavra>\` para fazer a primeira tentativa!`,
                ephemeral: true
            })
            return
        }

        const gameDate = this.formatGameDate(game.gameId)
        const content = this.formatGuessesDisplay(
            closestGuesses,
            `🤝 **Jogo Cooperativo #${game.gameId}${gameDate}**\n\n🎯 **${closestGuesses.length} palavras mais próximas:**`,
            `\n\n**Total de tentativas:** ${game.getGuessCount()}\n**Jogadores:** ${game.getPlayerCount()}/20\n\nUse \`/c <palavra>\` para fazer uma tentativa.`
        )

        await interaction.reply({
            content,
            ephemeral: true
        })
    }

    private async handleCompetitiveGame(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoCompetitiveGame, playerId: string, count: number) {
        // Check if player has completed the game
        if (game.hasPlayerCompleted(playerId)) {
            const completion = game.getPlayerCompletion(playerId)
            const leaderboard = game.getLeaderboard()
            const playerRank = leaderboard.findIndex(score => score.playerId === playerId) + 1
            
            await interaction.reply({
                content: `🏆 **Jogo Competitivo #${game.gameId}**\n\n✅ Você já encontrou a palavra em ${completion?.guessCount} tentativas!\n🏅 Sua posição: ${playerRank}º lugar\n\nUse \`/ranking\` para ver o placar completo.`,
                ephemeral: true
            })
            return
        }

        const closestGuesses = game.getClosestGuesses(playerId, count)
        
        if (closestGuesses.length === 0) {
            await interaction.reply({
                content: `🎯 **Jogo Competitivo #${game.gameId}**\n\nVocê ainda não fez nenhuma tentativa. Use \`/c <palavra>\` para fazer sua primeira tentativa!`,
                ephemeral: true
            })
            return
        }

        const playerGuessCount = game.getGuessCount(playerId)
        const gameDate = this.formatGameDate(game.gameId)
        const content = this.formatGuessesDisplay(
            closestGuesses,
            `🎯 **Jogo Competitivo #${game.gameId}${gameDate}**\n\n🎯 **Suas ${closestGuesses.length} palavras mais próximas:**`,
            `\n\n**Suas tentativas:** ${playerGuessCount}\n**Jogadores:** ${game.getPlayerCount()}/10\n\nUse \`/c <palavra>\` para fazer uma tentativa.`
        )

        await interaction.reply({
            content,
            ephemeral: true
        })
    }

    private async handleStopGame(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoStopGame, playerId: string, count: number) {
        if (!game.started) {
            await interaction.reply({
                content: `⚡ **Jogo Stop #${game.gameId}**\n\n🔴 O jogo ainda não foi iniciado. Use \`/start\` para iniciar o jogo.`,
                ephemeral: true
            })
            return
        }

        if (game.finished) {
            const winner = game.getWinner()
            await interaction.reply({
                content: `⚡ **Jogo Stop #${game.gameId}**\n\n🏁 O jogo foi finalizado! Vencedor: <@${winner?.playerId}> (${winner?.guessCount} tentativas)\n\nCrie uma nova sala com \`/create mode:stop\` para jogar novamente.`,
                ephemeral: true
            })
            return
        }

        const closestGuesses = game.getClosestGuesses(playerId, count)
        
        if (closestGuesses.length === 0) {
            await interaction.reply({
                content: `⚡ **Jogo Stop #${game.gameId}**\n\n🟢 Jogo em andamento! Você ainda não fez nenhuma tentativa.\n\nUse \`/c <palavra>\` para fazer sua primeira tentativa.\n\n⚡ **Lembre-se:** O jogo termina quando alguém acerta!`,
                ephemeral: true
            })
            return
        }

        const playerGuessCount = game.getPlayerGuessCount(playerId)
        const gameDate = this.formatGameDate(game.gameId)
        const content = this.formatGuessesDisplay(
            closestGuesses,
            `⚡ **Jogo Stop #${game.gameId}${gameDate}**\n\n⚡ **Suas ${closestGuesses.length} palavras mais próximas:**`,
            `\n\n**Suas tentativas:** ${playerGuessCount}\n**Jogadores:** ${game.getPlayerCount()}/20\n\n⚡ **Regra:** O jogo termina quando alguém acerta!\nUse \`/c <palavra>\` para fazer uma tentativa.`
        )

        await interaction.reply({
            content,
            ephemeral: true
        })
    }

    private async handleBattleRoyaleGame(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoBattleRoyaleGame, playerId: string, count: number) {
        if (!game.started) {
            await interaction.reply({
                content: `⚔️ **Jogo Battle Royale #${game.gameId}**\n\n🔴 O jogo ainda não foi iniciado. Use \`/start\` para iniciar o jogo.`,
                ephemeral: true
            })
            return
        }

        if (game.finished) {
            const winner = game.getWinner()
            await interaction.reply({
                content: `⚔️ **Jogo Battle Royale #${game.gameId}**\n\n🏁 O jogo foi finalizado! Vencedor: <@${winner?.playerId}> (${winner?.guessCount} tentativas)\n\nCrie uma nova sala com \`/create mode:battle-royale\` para jogar novamente.`,
                ephemeral: true
            })
            return
        }

        const closestGuesses = game.getClosestGuesses(playerId, count)
        
        if (closestGuesses.length === 0) {
            await interaction.reply({
                content: `⚔️ **Jogo Battle Royale #${game.gameId}**\n\n🟢 Jogo em andamento! Você ainda não fez nenhuma tentativa.\n\nUse \`/c <palavra>\` para fazer sua primeira tentativa.\n\n⚔️ **Lembre-se:** Cada palavra só pode ser usada uma vez!`,
                ephemeral: true
            })
            return
        }

        const playerGuessCount = game.getPlayerGuessCount(playerId)
        const gameDate = this.formatGameDate(game.gameId)
        const content = this.formatGuessesDisplay(
            closestGuesses,
            `⚔️ **Jogo Battle Royale #${game.gameId}${gameDate}**\n\n⚔️ **Suas ${closestGuesses.length} palavras mais próximas:**`,
            `\n\n**Suas tentativas:** ${playerGuessCount}\n**Jogadores:** ${game.getPlayerCount()}/20\n\n⚔️ **Regra:** Cada palavra só pode ser usada uma vez!\nUse \`/c <palavra>\` para fazer uma tentativa.`
        )

        await interaction.reply({
            content,
            ephemeral: true
        })
    }

    private formatGuessesDisplay(guesses: any[], header: string, footer: string): string {
        const guessesFormatting = guesses.map(guess => ({
            text: guess.word,
            lemma: guess.lemma,
            distance: guess.distance,
            color: getBarColor(guess.distance || 0),
            width: getBarWidth(guess.distance || 0), // 0 to 100
        }))

        const rows = guessesFormatting.map((guess) => {
            // Format like: [word██████████████----------------] distance
            const barWidth = Math.floor(guess.width * TOTAL_BAR_WIDTH / 100)
            const barFill = '█'.repeat(Math.max(barWidth - guess.text.length, 0))
            const remainingWidth = TOTAL_BAR_WIDTH - Math.max(barWidth, guess.text.length)
            const remainingBar = '-'.repeat(remainingWidth)

            return `[${this.convertColorToAnsi(guess.color)}${guess.text}${barFill}\u001b[0m${remainingBar}] ${(guess.distance || 0) + 1}`
        })

        return `${header}\n\n\`\`\`ansi\n${rows.join('\n')}\n\`\`\`${footer}`
    }

    private formatGameDate(gameId: number): string {
        const todaysGameId = getTodaysGameId()
        const today = new Date()
        const daysDiff = todaysGameId - gameId
        
        if (daysDiff === 0) {
            return '' // Don't show date for today's game
        }
        
        const gameDate = new Date(today)
        gameDate.setDate(gameDate.getDate() - daysDiff)
        
        const dateStr = gameDate.toLocaleDateString('pt-BR', { 
            day: '2-digit', 
            month: '2-digit', 
            year: 'numeric' 
        })
        
        if (daysDiff > 0) {
            return ` (${dateStr})` // Past game
        } else {
            return ` (${dateStr})` // Future game
        }
    }

    private convertColorToAnsi(color: string): string {
        switch (color) {
            case 'gray':
                return '\u001b[2;30m'
            case 'red':
                return '\u001b[2;31m'
            case 'green':
                return '\u001b[2;32m'
            case 'yellow':
                return '\u001b[2;33m'
            case 'blue':
                return '\u001b[2;34m'
            case 'pink':
                return '\u001b[2;35m'
            case 'cyan':
                return '\u001b[2;36m'
            case 'white':
                return '\u001b[2;37m'
            default:
                return '\u001b[0m' // Reset color
        }
    }
}

export default new PeekCommand()
