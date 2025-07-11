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
                        "`/c <palavra>` - Joga uma palavra no Contexto\n" +
                        "`/c <palavra> mode:competitive` - Joga no modo competitivo\n" +
                        "`/c <palavra> game-id:12345` - Joga um jogo específico\n" +
                        "`/c <palavra> date:2025-07-09` - Joga um jogo de uma data específica",
                    inline: false
                },
                {
                    name: "💡 Comandos de Ajuda",
                    value: 
                        "`/tip` - Recebe uma dica (apenas em jogos solo cooperativos)\n" +
                        "`/giveup` - Desiste e revela a palavra (apenas em jogos solo cooperativos)",
                    inline: false
                },
                {
                    name: "👥 Comandos de Grupo",
                    value: 
                        "`/join` - Entra em um jogo competitivo\n" +
                        "`/leave` - Sai do jogo atual\n" +
                        "`/ranking` - Mostra o ranking do jogo competitivo",
                    inline: false
                },
                {
                    name: "ℹ️ Modos de Jogo",
                    value: 
                        "**Cooperativo:** Todos jogam juntos para encontrar a palavra\n" +
                        "**Competitivo:** Cada jogador compete individualmente",
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
