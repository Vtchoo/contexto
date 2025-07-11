import { SlashCommandBuilder, EmbedBuilder } from "discord.js"
import { CommandHandlerParams, ICommand } from "../types"

class HelpCommand implements ICommand {

    definition = new SlashCommandBuilder()
        .setName("help")
        .setDescription("Mostra todos os comandos disponíveis do Contexto Bot")

    async execute({ client, interaction }: CommandHandlerParams) {
        const embed = new EmbedBuilder()
            .setTitle("🎯 Contexto Bot - Comandos")
            .setDescription("Jogue Contexto, o jogo de adivinhação de palavras!")
            .setColor(0x00AE86)
            .addFields(
                {
                    name: "📝 Comandos Principais",
                    value: 
                        "`/c <palavra>` - Joga uma palavra no Contexto cooperativo\n" +
                        "`/c <palavra> mode:competitive` - Cria/joga em sala competitiva\n" +
                        "`/c <palavra> game-id:12345` - Joga um jogo específico do Contexto\n" +
                        "`/c <palavra> date:2025-07-09` - Joga um jogo de uma data específica",
                    inline: false
                },
                {
                    name: "🏆 Comandos Competitivos",
                    value: 
                        "`/create` - Cria uma sala competitiva privada\n" +
                        "`/create game-id:12345` - Cria sala para um jogo específico\n" +
                        "`/join <id-da-sala>` - Entra em uma sala competitiva existente\n" +
                        "`/room` - Mostra informações da sua sala atual\n" +
                        "`/room <id>` - Mostra informações de uma sala específica\n" +
                        "`/ranking` - Mostra o ranking da sala competitiva",
                    inline: false
                },
                {
                    name: "� Comandos de Ajuda",
                    value: 
                        "`/tip` - Recebe uma dica (apenas em jogos cooperativos solo)\n" +
                        "`/giveup` - Desiste e revela a palavra (apenas em jogos cooperativos solo)",
                    inline: false
                },
                {
                    name: "👥 Comandos Gerais",
                    value: 
                        "`/leave` - Sai do jogo atual\n" +
                        "`/help` - Mostra esta ajuda",
                    inline: false
                },
                {
                    name: "ℹ️ Modos de Jogo",
                    value: 
                        "**Cooperativo:** Todos jogam juntos para encontrar a palavra\n" +
                        "**Competitivo:** Salas privadas onde cada jogador compete individualmente\n\n" +
                        "💡 **Criar salas competitivas:**\n" +
                        "• `/c <palavra> mode:competitive` - Cria e joga imediatamente\n" +
                        "• `/create` - Cria sala vazia para outros entrarem primeiro",
                    inline: false
                },
                {
                    name: "🔍 Dicas e Desistência",
                    value: 
                        "• Só disponíveis em jogos cooperativos com **apenas um jogador**\n" +
                        "• Em jogos com múltiplos jogadores, use a colaboração!\n" +
                        "• Em modo competitivo, dicas podem afetar sua pontuação",
                    inline: false
                }
            )
            .setFooter({ text: "Use /c <palavra> para começar a jogar!" })

        await interaction.reply({ embeds: [embed], ephemeral: true })
    }
}

export default new HelpCommand()
