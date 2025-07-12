import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoCompetitiveGame, ContextoDefaultGame, ContextoStopGame, ContextoBattleRoyaleGame } from "../game"

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

        try {
            const game = await this.findGame(roomId, playerId, interaction)
            if (!game) return // Error already handled in findGame

            await this.showRoomInfo(interaction, game, roomId)
        } catch (error) {
            await interaction.reply({
                content: `❌ Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                ephemeral: true
            })
        }
    }

    private async findGame(roomId: string | null, playerId: string, interaction: ChatInputCommandInteraction<'cached'>) {
        if (roomId) {
            // Try to find game by ID
            return this.findGameById(roomId, interaction)
        } else {
            // Get player's current game
            return this.findPlayerCurrentGame(playerId, interaction)
        }
    }

    private async findGameById(roomId: string, interaction: ChatInputCommandInteraction<'cached'>) {
        // Check each game type in order
        const gameGetters = [
            () => gameManager.getCompetitiveGameInfo(roomId),
            () => gameManager.getCooperativeGameInfo(roomId),
            () => gameManager.getStopGameInfo(roomId),
            () => gameManager.getBattleRoyaleGameInfo(roomId)
        ]

        for (const getter of gameGetters) {
            const info = getter()
            if (info.exists) {
                return info.game
            }
        }

        await interaction.reply({
            content: `❌ Sala com ID \`${roomId}\` não encontrada.`,
            ephemeral: true
        })
        return null
    }

    private async findPlayerCurrentGame(playerId: string, interaction: ChatInputCommandInteraction<'cached'>) {
        const currentGame = gameManager.getCurrentPlayerGame(playerId)
        if (!currentGame) {
            await interaction.reply({
                content: `❌ Você não está em nenhuma sala. Use \`/room <id>\` para ver informações de uma sala específica.`,
                ephemeral: true
            })
            return null
        }
        return currentGame
    }

    private async showRoomInfo(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoCompetitiveGame | ContextoDefaultGame | ContextoStopGame | ContextoBattleRoyaleGame, roomId: string | null) {
        const roomIdOrUndefined = roomId || undefined
        
        if (game instanceof ContextoCompetitiveGame) {
            return this.showCompetitiveRoomInfo(interaction, game, roomIdOrUndefined)
        } else if (game instanceof ContextoDefaultGame) {
            return this.showCooperativeRoomInfo(interaction, game, roomIdOrUndefined)
        } else if (game instanceof ContextoStopGame) {
            return this.showStopRoomInfo(interaction, game, roomIdOrUndefined)
        } else if (game instanceof ContextoBattleRoyaleGame) {
            return this.showBattleRoyaleRoomInfo(interaction, game, roomIdOrUndefined)
        }
    }

    private async showCompetitiveRoomInfo(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoCompetitiveGame, roomId?: string) {
        const leaderboard = game.getLeaderboard()
        const activeStats = game.getActivePlayerStats()
        
        const sections = [
            this.buildBasicInfo("🏆 **Sala Competitiva**", game, `${game.getPlayerCount()}/10`),
            this.buildFeatureInfo(game),
            this.buildLeaderboardSection(leaderboard),
            this.buildActivePlayersSection(activeStats),
            this.buildInviteSection(game.id)
        ]

        await this.sendResponse(interaction, sections, roomId)
    }

    private async showCooperativeRoomInfo(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoDefaultGame, roomId?: string) {
        const closestGuesses = game.getClosestGuesses('any', 5)
        const statusText = game.finished ? '✅ Finalizado' : '🎮 Em andamento'
        
        const sections = [
            this.buildBasicInfo("🤝 **Sala Cooperativa**", game, `${game.getPlayerCount()}/20`),
            `**Status:** ${statusText}`,
            `**Total de tentativas:** ${game.getGuessCount()}`,
            this.buildFeatureInfo(game),
            this.buildClosestGuessesSection(closestGuesses),
            this.buildInviteSection(game.id)
        ]

        await this.sendResponse(interaction, sections, roomId)
    }

    private async showStopRoomInfo(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoStopGame, roomId?: string) {
        const progress = game.getAllPlayersProgress()
        const statusText = this.buildStopStatusText(game)
        
        const sections = [
            this.buildBasicInfo("⚡ **Sala Stop**", game, `${game.getPlayerCount()}/20`),
            `**Status:** ${statusText}`,
            `**Dicas:** ❌ Não permitidas no modo Stop`,
            `**Desistir:** ✅ Sair da sala sem revelar a palavra`,
            this.buildStopProgressSection(progress),
            this.buildInviteSection(game.id),
            `⚡ **Regras Stop:** O jogo termina quando alguém acerta a palavra. Ranking por distância mais próxima!`
        ]

        await this.sendResponse(interaction, sections, roomId)
    }

    private async showBattleRoyaleRoomInfo(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoBattleRoyaleGame, roomId?: string) {
        const progress = game.getAllPlayersProgress()
        const statusEmoji = game.finished ? '🏁' : game.started ? '🟢' : '🔴'
        const statusText = game.finished ? 'Finalizado' : game.started ? 'Em andamento' : 'Aguardando início'
        
        const sections = [
            this.buildBasicInfo("⚔️ **Sala Battle Royale**", game, `${game.getPlayerCount()}/20`),
            `**Status:** ${statusEmoji} ${statusText}`,
            this.buildBattleRoyaleWinnerSection(game),
            this.buildBattleRoyaleProgressSection(progress),
            this.buildBattleRoyaleRulesSection(),
            this.buildBattleRoyaleActionsSection(game)
        ]

        await this.sendResponse(interaction, sections, null, true) // Always ephemeral for battle royale
    }

    // Helper methods for building content sections
    private buildBasicInfo(title: string, game: any, playerCount: string): string {
        return `${title}\n\n**ID da Sala:** \`${game.id}\`\n**Jogo Contexto:** #${game.gameId}\n**Jogadores:** ${playerCount}`
    }

    private buildFeatureInfo(game: any): string {
        return `**Dicas:** ${game.canUseTips() ? "✅ Permitidas" : "❌ Desabilitadas"}\n**Desistir:** ${game.canGiveUp() ? "✅ Permitido" : "❌ Desabilitado"}`
    }

    private buildInviteSection(gameId: string): string {
        return `📋 **Para convidar outros:**\n\`/join ${gameId}\``
    }

    private buildLeaderboardSection(leaderboard: any[]): string {
        if (leaderboard.length === 0) return ""
        
        const entries = leaderboard.slice(0, 5).map((score, index) => 
            `${index + 1}º <@${score.playerId}> - ${score.guessCount} tentativas`
        ).join('\n')
        
        return `🏆 **Jogadores que completaram:**\n${entries}`
    }

    private buildActivePlayersSection(activeStats: any[]): string {
        if (activeStats.length === 0) return ""
        
        const entries = activeStats.map(stat => 
            `<@${stat.playerId}> - ${stat.guessCount} tentativas`
        ).join('\n')
        
        return `🎮 **Jogadores ativos:**\n${entries}`
    }

    private buildClosestGuessesSection(closestGuesses: any[]): string {
        if (closestGuesses.length === 0) return ""
        
        const entries = closestGuesses.map((guess, index) => 
            `${index + 1}. ${guess.word} - Distância ${(guess.distance || 0) + 1}`
        ).join('\n')
        
        return `🎯 **Tentativas mais próximas:**\n${entries}`
    }

    private buildStopStatusText(game: any): string {
        if (game.finished) {
            const winner = game.getWinner()
            if (winner) {
                return `🏁 **Finalizado** - Vencedor: <@${winner.playerId}> (${winner.guessCount} tentativas)`
            }
            return "🏁 **Finalizado**"
        }
        return "⚡ **Em andamento** - Termina quando alguém acerta!"
    }

    private buildStopProgressSection(progress: any[]): string {
        if (progress.length === 0) return ""
        
        const entries = progress.slice(0, 5).map((player, index) => 
            `${index + 1}º <@${player.playerId}> - ${player.closestDistance + 1} (${player.closestWord})`
        ).join('\n')
        
        return `🏆 **Ranking atual (por distância mais próxima):**\n${entries}`
    }

    private buildBattleRoyaleWinnerSection(game: any): string {
        if (!game.finished) return ""
        
        const winner = game.getWinner()
        if (!winner) return ""
        
        return `🎯 **Vencedor:** <@${winner.playerId}> (${winner.guessCount} tentativas)`
    }

    private buildBattleRoyaleProgressSection(progress: any[]): string {
        if (progress.length === 0) {
            return `📊 **Nenhum jogador fez palpites ainda.**`
        }
        
        let text = `📊 **Progresso dos jogadores:**\n`
        progress.slice(0, 10).forEach((player, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🔹'
            const paddedWord = player.closestWord ? player.closestWord.padEnd(15, ' ') : 'Nenhuma'.padEnd(15, ' ')
            text += `${medal} <@${player.playerId}>: ${player.closestDistance + 1} (||${paddedWord}||) - ${player.guessCount} tentativas\n`
        })
        
        return text.trim()
    }

    private buildBattleRoyaleRulesSection(): string {
        return `⚔️ **Regras Battle Royale:** Cada palavra só pode ser usada uma vez!\n🏁 **Objetivo:** Seja o primeiro a acertar a palavra!`
    }

    private buildBattleRoyaleActionsSection(game: any): string {
        if (!game.started && !game.finished) {
            return '🚀 Use `/start` para iniciar o jogo.'
        } else if (game.started && !game.finished) {
            return '🎮 Use `/c <palavra>` para fazer suas tentativas.'
        } else if (game.finished) {
            return '🎮 Crie uma nova sala com `/create mode:battle-royale`'
        }
        return ""
    }

    private async sendResponse(interaction: ChatInputCommandInteraction<'cached'>, sections: string[], roomId: string | null | undefined, forceEphemeral = false): Promise<void> {
        const content = sections.filter(section => section.length > 0).join('\n\n')
        const ephemeral = forceEphemeral || (roomId != null)
        
        await interaction.reply({
            content,
            ephemeral
        })
    }
}

export default new RoomCommand()
