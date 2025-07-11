import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager, { ContextoCompetitiveGame, ContextoDefaultGame } from "../game"
import { getBarColor, getBarWidth } from "../game/utils/misc"



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
        .setDescription("Jogue Contexto, um jogo de adivinhação de palavras!")

    async execute({ client, interaction }: CommandHandlerParams) {
        const word = interaction.options.getString("word")
        const mode = interaction.options.getString("mode") as 'default' | 'competitive' | null

        const playerId = interaction.user.id
        const gameType = mode || 'default'

        const [game, justStarted] = gameManager.getCurrentOrCreateGame(playerId, gameType)

        // Handle game-specific logic
        if (game instanceof ContextoDefaultGame) {
            return this.handleDefaultGame(interaction, game, word, playerId, justStarted)
        } else if (game instanceof ContextoCompetitiveGame) {
            return this.handleCompetitiveGame(interaction, game, word, playerId, justStarted)
        }
    }

    private async handleDefaultGame(interaction: any, game: ContextoDefaultGame, word: string | null, playerId: string, justStarted: boolean) {
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
                return this.sendGameResponse(interaction, game, result, closestGuesses, 'default')
            }
        }

        await interaction.reply({
            content: `Contexto game started! Word: ${word}\nGame ID: ${game.id}\nJust started: ${justStarted}`,
            ephemeral: true
        })
    }

    private async handleCompetitiveGame(interaction: any, game: ContextoCompetitiveGame, word: string | null, playerId: string, justStarted: boolean) {
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
            content: `Jogo competitivo iniciado! Word: ${word}\nGame ID: ${game.id}\nJust started: ${justStarted}`,
            ephemeral: true
        })
    }

    private async sendGameResponse(interaction: any, game: ContextoDefaultGame | ContextoCompetitiveGame, result: any, closestGuesses: any[], mode: 'default' | 'competitive', playerId?: string) {
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
                guessCountText = `Jogo: #${game.gameId} Suas tentativas: ${playerGuessCount}\n\n`
            } else if (mode === 'default' && game instanceof ContextoDefaultGame) {
                guessCountText = `Jogo: #${game.gameId} Tentativas: ${game.getGuessCount()}\n\n`
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
