import { SlashCommandBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"
import gameManager from "../game"
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
        .setDescription("Jogue Contexto, um jogo de adivinhação de palavras!")

    async execute({ client, interaction }: CommandHandlerParams) {
        const word = interaction.options.getString("word")

        const playerId = interaction.user.id

        const [game, justStarted] = gameManager.getCurrentOrCreateGame(playerId)

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

                        // color only the length of the word that fits in the bar
                        // text inside the bar: white background, colored text
                        // text outside the bar: no background, white text
                        const textWithinBar = guess.text.slice(0, barWidth)
                        const textOutsideBar = guess.text.slice(barWidth)
                        // if the text is longer than the bar, color only the part that fits
                        const coloredText = textWithinBar.length > 0 ? `${convertColorToAnsi(guess.color)}${textWithinBar}` : ''
                        // if the text is longer than the bar, color only the part that fits
                        const remainingText = textOutsideBar.length > 0 ? `${textOutsideBar}` : ''

                        return `[${convertColorToAnsi(guess.color)}${guess.text}${barFill}\u001b[0m${remainingBar}] ${(guess.distance || 0) + 1}${i === 0 ? '\n' : ''}`
                        // return `[${convertColorToAnsi(guess.color)}${coloredText}\u001b[0m${remainingText}${convertColorToAnsi(guess.color)}${barFill}\u001b[0m${remainingBar}] ${(guess.distance || 0) + 1}${i === 0 ? '\n' : ''}`
                    })

                    let finishedGameText = ''
                    if (result.distance === 0) {
                        finishedGameText = `Parabéns!\n\nVocê acertou a palavra #${game.gameId} em ${game.guessCount} tentativas.\n\n\n`
                    }

                    await interaction.reply({
                        content:
                            `\`\`\`ansi\n` +
                            finishedGameText +
                            `Jogo: #${game.gameId} Tentativas: ${game.guessCount}\n\n` +
                            // `[${guessesFormatting.map(guess => `${convertColorToAnsi(guess.color)}${guess.text}\u001b[0m`).join('\n')}]` +
                            `${rows.join('\n')}\n\n\n` +
                            `\`\`\``,
                        ephemeral: true,
                    })
                    return
                }

                await interaction.reply({
                    content: `\`\`\`You guessed the word: ${word}\n\n\n${JSON.stringify(result, null, 2)}\`\`\``,
                    ephemeral: true
                })
                return
            }
        }

        await interaction.reply({
            content: `Contexto game started! Word: ${word}\nGame ID: ${game.id}\nJust started: ${justStarted}\n\n\n${JSON.stringify(game, null, 2)}`,
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
