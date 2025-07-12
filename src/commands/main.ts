import { SlashCommandBuilder, ChatInputCommandInteraction } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoCompetitiveGame, ContextoDefaultGame, ContextoStopGame } from "../game"
import { getBarColor, getBarWidth, getTodaysGameId } from "../game/utils/misc"
import { parseISO } from "date-fns"

const TOTAL_BAR_WIDTH = 30 // Total width of the bar in characters

class MainCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("c")
        .addStringOption(option =>
            option.setName("word")
                .setDescription("A palavra que você quer tentar adivinhar")
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName("mode")
                .setDescription("Modo de jogo")
                .setRequired(false)
                .addChoices(
                    { name: "Cooperativo (padrão)", value: "default" },
                    { name: "Competitivo", value: "competitive" }
                )
        )
        .addIntegerOption(option =>
            option.setName("game-id")
                .setDescription("ID do jogo específico (para jogar um jogo de um dia específico)")
                .setRequired(false)
        )
        .addStringOption(option =>
            option.setName("date")
                .setDescription("Data do jogo no formato YYYY-MM-DD (ex: 2025-07-09)")
                .setRequired(false)
        )
        .setDescription("Jogue Contexto - cooperativo ou em salas competitivas!")

    async execute({ client, interaction }: CommandHandlerParams) {
        const word = interaction.options.getString("word")
        const mode = interaction.options.getString("mode") as 'default' | 'competitive' | null
        const gameId = interaction.options.getInteger("game-id")
        const dateString = interaction.options.getString("date")

        const playerId = interaction.user.id
        const gameType = mode || 'default'

        // Check if player is already in a game
        const currentGame = gameManager.getCurrentPlayerGame(playerId)
        
        // If player is in a Stop game, handle it differently (no creation, just guessing)
        if (currentGame instanceof ContextoStopGame) {
            return this.handleStopGame(interaction, currentGame, word, playerId)
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
            const [game, justStarted] = gameManager.getCurrentOrCreateGame(playerId, gameType, gameIdOrDate)

            // Handle game-specific logic
            if (game instanceof ContextoDefaultGame) {
                return this.handleDefaultGame(interaction, game, word, playerId, justStarted)
            } else if (game instanceof ContextoCompetitiveGame) {
                return this.handleCompetitiveGame(interaction, game, word, playerId, justStarted)
            }
        } catch (error) {
            await interaction.reply({
                content: `❌ ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
                ephemeral: true
            })
            return
        }
    }

    private async handleDefaultGame(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoDefaultGame, word: string | null, playerId: string, justStarted: boolean) {
        if (game.finished) {
            await interaction.reply({
                content: `O jogo ${game.id} já foi finalizado. Você pode jogar novamente com o comando /c <palavra>`,
                ephemeral: true,
            })
            gameManager.leaveCurrentGame(playerId)
            return
        }

        if (word) {
            const alreadyPlayed = game.getExistingGuess(word)

            if (alreadyPlayed) {
                if (alreadyPlayed.error) {
                    await interaction.reply({
                        content: alreadyPlayed.error,
                        ephemeral: true,
                    })
                    return
                }

                await interaction.reply({
                    content: `A palavra ${word} já foi. (${(alreadyPlayed.distance || 0) + 1})`,
                    ephemeral: true,
                })
                return
            }

            const result = await game.tryWord(playerId, word)
            if (result) {
                if (result.error) {
                    await interaction.reply({
                        content: result.error,
                        ephemeral: true,
                    })
                    return
                }

                const closestGuesses = game.getClosestGuesses(playerId)
                
                // Check if this guess finished the game
                if (result.distance === 0) {
                    // Send private response first
                    await this.sendGameResponse(interaction, game, result, closestGuesses, 'default')
                    
                    // Then broadcast the win to the channel
                    await this.broadcastCoopGameResults(interaction, game, playerId)
                    return
                }
                
                return this.sendGameResponse(interaction, game, result, closestGuesses, 'default')
            }
        }

        await interaction.reply({
            content: `🤝 **Jogo Cooperativo**${justStarted ? ' (Nova sala!)' : ''}\n\n**Palavra:** ${word}\n**Sala ID:** \`${game.id}\`\n**Jogo:** #${game.gameId}${this.formatGameDate(game.gameId)}\n**Status:** ${justStarted ? 'Criada agora' : 'Em andamento'}\n\n${justStarted ? '📋 **Compartilhe este ID para outros entrarem:**\n`/join ' + game.id + '`\n\n' : ''}Use \`/room\` para ver informações da sala.`,
            ephemeral: justStarted ? false : true // Public if new room created (so others can see the join code), private otherwise
        })
    }

    private async handleCompetitiveGame(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoCompetitiveGame, word: string | null, playerId: string, justStarted: boolean) {
        // Competitive games never finish, so no need to check game.finished

        if (word) {
            // Check if player already completed the word
            if (game.hasPlayerCompleted(playerId)) {
                const completion = game.getPlayerCompletion(playerId)
                await interaction.reply({
                    content: `Você já encontrou a palavra em ${completion?.guessCount} tentativas! Veja o ranking com /ranking`,
                    ephemeral: true,
                })
                return
            }

            const alreadyPlayed = game.getExistingGuess(word, playerId)

            if (alreadyPlayed) {
                if (alreadyPlayed.error) {
                    await interaction.reply({
                        content: alreadyPlayed.error,
                        ephemeral: true,
                    })
                    return
                }

                await interaction.reply({
                    content: `Você já tentou a palavra ${word}. (${(alreadyPlayed.distance || 0) + 1})`,
                    ephemeral: true,
                })
                return
            }

            const result = await game.tryWord(playerId, word)
            if (result) {
                if (result.error) {
                    await interaction.reply({
                        content: result.error,
                        ephemeral: true,
                    })
                    return
                }

                const closestGuesses = game.getClosestGuesses(playerId)
                return this.sendGameResponse(interaction, game, result, closestGuesses, 'competitive', playerId)
            }
        }

        await interaction.reply({
            content: `🎯 **Sala Competitiva**${justStarted ? ' (Nova!)' : ''}\n\n**Palavra:** ${word}\n**Sala ID:** \`${game.id}\`\n**Jogo:** #${game.gameId}${this.formatGameDate(game.gameId)}\n**Status:** ${justStarted ? 'Criada agora' : 'Em andamento'}\n\n${justStarted ? '📋 **Compartilhe este ID para outros entrarem:**\n`/join ' + game.id + '`\n\n' : ''}Use \`/room\` para ver informações da sala.`,
            ephemeral: justStarted ? false : true // Public if new room created (so others can see the join code), private otherwise
        })
    }

    private async handleStopGame(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoStopGame, word: string | null, playerId: string) {
        if (!word) {
            await interaction.reply({
                content: `⚡ **Sala Stop**\n\n**Sala ID:** \`${game.id}\`\n**Jogo:** #${game.gameId}${this.formatGameDate(game.gameId)}\n**Status:** ${game.started ? 'Em andamento' : 'Aguardando início'}\n**Jogadores:** ${game.getPlayerCount()}\n\n${!game.started ? '⏳ **Aguardando início:** Use \`/start\` para iniciar o jogo.\n\n' : '⚡ **Jogo ativo!** Use \`/c <palavra>\` para fazer suas tentativas.\n\n'}⚡ **Regras Stop:** O jogo termina quando alguém acerta a palavra. Ranking por distância mais próxima!\n\nUse \`/room\` para ver informações da sala.`,
                ephemeral: true
            })
            return
        }

        if (!game.started) {
            await interaction.reply({
                content: "❌ O jogo ainda não foi iniciado! Use `/start` para iniciar o jogo Stop.",
                ephemeral: true
            })
            return
        }

        if (game.finished) {
            await interaction.reply({
                content: `🏁 O jogo Stop já foi finalizado! Crie uma nova sala com \`/create mode:stop\` para jogar novamente.`,
                ephemeral: true,
            })
            return
        }

        const alreadyPlayed = game.getExistingGuess(word, playerId)

        if (alreadyPlayed) {
            if (alreadyPlayed.error) {
                await interaction.reply({
                    content: alreadyPlayed.error,
                    ephemeral: true,
                })
                return
            }

            await interaction.reply({
                content: `Você já tentou a palavra ${word}. (${(alreadyPlayed.distance || 0) + 1})`,
                ephemeral: true,
            })
            return
        }

        const result = await game.tryWord(playerId, word)
        if (result) {
            if (result.error) {
                await interaction.reply({
                    content: result.error,
                    ephemeral: true,
                })
                return
            }

            // Check if this guess ended the game
            if (result.distance === 0) {
                // Player found the answer! End game and broadcast results
                const closestGuesses = game.getClosestGuesses(playerId)
                await this.sendStopGameResponse(interaction, game, result, closestGuesses, playerId)
                
                // Broadcast final results to the guild
                await this.broadcastStopGameResults(interaction, game)
                return
            }

            // Game continues - show player's result and current standings
            const closestGuesses = game.getClosestGuesses(playerId)
            const progress = game.getAllPlayersProgress()
            
            let progressText = ''
            if (progress.length > 1) {
                progressText = '\n\n**📊 Progresso dos jogadores:**\n'
                progress.forEach((player, index) => {
                    const isCurrentPlayer = player.playerId === playerId
                    const indicator = isCurrentPlayer ? '👤' : '🔹'
                    progressText += `${indicator} <@${player.playerId}>: ${player.closestDistance + 1} (${player.closestWord})\n`
                })
            }

            return this.sendStopGameResponse(interaction, game, result, closestGuesses, playerId, progressText)
        }
    }

    private async sendGameResponse(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoDefaultGame | ContextoCompetitiveGame, result: any, closestGuesses: any[], mode: 'default' | 'competitive', playerId?: string) {
        if (closestGuesses.length > 0) {
            const guessesFormatting = [result, ...closestGuesses].map(guess => ({
                text: guess.word,
                lemma: guess.lemma,
                distance: guess.distance,
                color: getBarColor(guess.distance || 0),
                width: getBarWidth(guess.distance || 0), // 0 to 100
            }))

            const rows = guessesFormatting.map((guess, i) => {
                // should format like this: [word██████████████----------------]
                // color the bar with ANSI colors
                // and the word with the color of the bar
                // if word is too long, color only the characters that fit in the bar
                const barWidth = Math.floor(guess.width * TOTAL_BAR_WIDTH / 100)
                const barFill = '█'.repeat(Math.max(barWidth - guess.text.length, 0))
                const remainingWidth = TOTAL_BAR_WIDTH - Math.max(barWidth, guess.text.length)
                const remainingBar = '-'.repeat(remainingWidth)

                return `[${convertColorToAnsi(guess.color)}${guess.text}${barFill}\u001b[0m${remainingBar}] ${(guess.distance || 0) + 1}${i === 0 ? '\n' : ''}`
            })

            let finishedGameText = ''
            let guessCountText = ''
            
            if (result.distance === 0) {
                if (mode === 'competitive' && game instanceof ContextoCompetitiveGame && playerId) {
                    const playerGuessCount = game.getGuessCount(playerId)
                    finishedGameText = `Parabéns!\n\nVocê acertou a palavra #${game.gameId} em ${playerGuessCount} tentativas.\n\n\n`
                    
                    // Show current ranking
                    const leaderboard = game.getLeaderboard()
                    const playerRank = leaderboard.findIndex(score => score.playerId === playerId) + 1
                    if (playerRank > 0) {
                        finishedGameText += `Sua posição: ${playerRank}º lugar\n\n`
                    }
                } else if (mode === 'default' && game instanceof ContextoDefaultGame) {
                    finishedGameText = `Parabéns!\n\nVocê acertou a palavra #${game.gameId} em ${game.getGuessCount()} tentativas.\n\n\n`
                }
            }

            if (mode === 'competitive' && game instanceof ContextoCompetitiveGame && playerId) {
                const playerGuessCount = game.getGuessCount(playerId)
                const gameDate = this.formatGameDate(game.gameId)
                guessCountText = `Jogo: #${game.gameId}${gameDate} Suas tentativas: ${playerGuessCount}\n\n`
            } else if (mode === 'default' && game instanceof ContextoDefaultGame) {
                const gameDate = this.formatGameDate(game.gameId)
                guessCountText = `Jogo: #${game.gameId}${gameDate} Tentativas: ${game.getGuessCount()}\n\n`
            }

            await interaction.reply({
                content:
                    `\`\`\`ansi\n` +
                    finishedGameText +
                    guessCountText +
                    `${rows.join('\n')}\n\n\n` +
                    `\`\`\``,
                ephemeral: true,
            })
            return
        }

        await interaction.reply({
            content: `\`\`\`You guessed the word: ${result.word}\n\n\n${JSON.stringify(result, null, 2)}\`\`\``,
            ephemeral: true
        })
    }

    private async broadcastStopGameResults(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoStopGame) {
        const leaderboard = game.getLeaderboard()
        const winner = game.getWinner()
        
        if (!winner) return

        let resultsText = `🏁 **Jogo Stop #${game.gameId} Finalizado!**\n\n`
        resultsText += `🎯 **Vencedor:** <@${winner.playerId}> (${winner.guessCount} tentativas)\n\n`
        
        if (leaderboard.length > 1) {
            resultsText += `📊 **Ranking Final (por distância mais próxima):**\n`
            leaderboard.forEach((player, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`
                let distanceText = ''
                if (player.closestDistance === 999999) {
                    distanceText = 'Sem palpites válidos'
                } else {
                    // Pad the closest word to constant length and wrap in spoiler
                    const paddedWord = player.closestWord.padEnd(15, ' ')
                    distanceText = `${player.closestDistance + 1} (||${paddedWord}||)`
                }
                resultsText += `${medal} <@${player.playerId}>: ${distanceText}\n`
            })
        }

        // Show the answer with spoiler protection for all games
        try {
            const gameWord = await game.getGameWord()
            if (gameWord && gameWord.word) {
                // Pad the word to a constant length to hide word length
                const paddedWord = gameWord.word.padEnd(15, ' ')
                resultsText += `\n💡 **Resposta:** ||${paddedWord}||`
            }
        } catch (error) {
            // Ignore error, don't show answer
        }

        resultsText += `\n\n🎮 Jogue novamente com \`/create mode:stop\``

        // Send to the channel (not ephemeral)
        await interaction.followUp({
            content: resultsText,
            ephemeral: false
        })
    }

    private async broadcastCoopGameResults(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoDefaultGame, winnerId: string) {
        const totalGuesses = game.getGuessCount()
        const playerCount = game.getPlayerCount()
        
        let resultsText = `🎉 **Jogo Cooperativo #${game.gameId} Concluído!**\n\n`
        resultsText += `🎯 **Descoberto por:** <@${winnerId}>\n`
        resultsText += `🤝 **Esforço colaborativo:** ${totalGuesses} tentativas${playerCount > 1 ? ` (${playerCount} jogadores)` : ''}\n\n`

        // Show the answer with spoiler protection (constant length padding)
        const winningGuess = game.getClosestGuesses(winnerId)[0] // The closest guess should be the winning one with distance 0
        if (winningGuess && winningGuess.distance === 0) {
            // Pad the word to a constant length to hide word length
            const paddedWord = winningGuess.word.padEnd(15, ' ')
            resultsText += `💡 **Resposta:** ||${paddedWord}||\n\n`
        }

        const gameDate = this.formatGameDate(game.gameId)
        resultsText += `📅 **Jogo:** #${game.gameId}${gameDate}\n`
        resultsText += `🎮 **Jogue novamente:** \`/c <palavra>\``

        // Send to the channel (not ephemeral)
        await interaction.followUp({
            content: resultsText,
            ephemeral: false
        })
    }

    private async sendStopGameResponse(interaction: ChatInputCommandInteraction<'cached'>, game: ContextoStopGame, result: any, closestGuesses: any[], playerId: string, additionalText?: string) {
        if (closestGuesses.length > 0) {
            const guessesFormatting = [result, ...closestGuesses].map(guess => ({
                text: guess.word,
                lemma: guess.lemma,
                distance: guess.distance,
                color: getBarColor(guess.distance || 0),
                width: getBarWidth(guess.distance || 0), // 0 to 100
            }))

            const rows = guessesFormatting.map((guess, i) => {
                // should format like this: [word██████████████----------------]
                // color the bar with ANSI colors
                // and the word with the color of the bar
                // if word is too long, color only the characters that fit in the bar
                const barWidth = Math.floor(guess.width * TOTAL_BAR_WIDTH / 100)
                const barFill = '█'.repeat(Math.max(barWidth - guess.text.length, 0))
                const remainingWidth = TOTAL_BAR_WIDTH - Math.max(barWidth, guess.text.length)
                const remainingBar = '-'.repeat(remainingWidth)

                return `[${convertColorToAnsi(guess.color)}${guess.text}${barFill}\u001b[0m${remainingBar}] ${(guess.distance || 0) + 1}${i === 0 ? '\n' : ''}`
            })

            let finishedGameText = ''
            let guessCountText = ''
            
            if (result.distance === 0) {
                const playerGuessCount = game.getPlayerGuessCount(playerId)
                finishedGameText = `⚡ Parabéns!\n\nVocê acertou a palavra #${game.gameId} em ${playerGuessCount} tentativas e venceu o jogo Stop!\n\n\n`
            }

            const playerGuessCount = game.getPlayerGuessCount(playerId)
            const gameDate = this.formatGameDate(game.gameId)
            guessCountText = `Jogo: #${game.gameId}${gameDate} Suas tentativas: ${playerGuessCount}\n\n`

            let content = `\`\`\`ansi\n` +
                finishedGameText +
                guessCountText +
                `${rows.join('\n')}\n\n\n` +
                `\`\`\``

            if (additionalText) {
                content += additionalText
            }

            await interaction.reply({
                content,
                ephemeral: true,
            })
            return
        }

        await interaction.reply({
            content: `\`\`\`You guessed the word: ${result.word}\n\n\n${JSON.stringify(result, null, 2)}\`\`\``,
            ephemeral: true
        })
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
}
// discord ansi colors
// \u001b[{format};{color}m

// Colors

// Here is the list of values you can use to replace {color}:
// Text Colors

//     30: Gray
//     31: Red
//     32: Green
//     33: Yellow
//     34: Blue
//     35: Pink
//     36: Cyan
//     37: White

// Background Colors

//     40: Firefly dark blue
//     41: Orange
//     42: Marble blue
//     43: Greyish turquoise
//     44: Gray
//     45: Indigo
//     46: Light gray
//     47: White

const convertColorToAnsi = (color: string): string => {
    switch (color) {
        case 'gray':
            return '\u001b[2;30m';
        case 'red':
            return '\u001b[2;31m';
        case 'green':
            return '\u001b[2;32m';
        case 'yellow':
            return '\u001b[2;33m';
        case 'blue':
            return '\u001b[2;34m';
        case 'pink':
            return '\u001b[2;35m';
        case 'cyan':
            return '\u001b[2;36m';
        case 'white':
            return '\u001b[2;37m';
        default:
            return '\u001b[0m'; // Reset color
    }
}


export default new MainCommand()
