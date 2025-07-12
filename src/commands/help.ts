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
                        "`/c <palavra>` - Cria sala cooperativa e joga uma palavra\n" +
                        "`/c <palavra> mode:competitive` - Cria sala competitiva e joga\n" +
                        "`/c <palavra> mode:stop` - Cria sala Stop e joga\n" +
                        "`/c <palavra> mode:battle-royale` - Cria sala Battle Royale e joga\n" +
                        "`/c <palavra> game-id:12345` - Joga um jogo específico do Contexto\n" +
                        "`/c <palavra> date:2025-07-09` - Joga um jogo de uma data específica",
                    inline: false
                },
                {
                    name: "🏠 Comandos de Sala",
                    value: 
                        "`/create` - Cria uma sala cooperativa vazia\n" +
                        "`/create mode:competitive` - Cria uma sala competitiva vazia\n" +
                        "`/create mode:stop` - Cria uma sala Stop vazia\n" +
                        "`/create mode:battle-royale` - Cria uma sala Battle Royale vazia\n" +
                        "`/join <id-da-sala>` - Entra em uma sala existente\n" +
                        "`/room` - Mostra informações da sua sala atual\n" +
                        "`/room <id>` - Mostra informações de uma sala específica\n" +
                        "`/leave` - Sai da sala atual\n" +
                        "`/start` - Inicia o jogo (necessário para Battle Royale)",
                    inline: false
                },
                {
                    name: "🏆 Comandos Competitivos",
                    value: 
                        "`/ranking` - Mostra o ranking da sala competitiva",
                    inline: false
                },
                {
                    name: "💡 Comandos de Ajuda",
                    value: 
                        "`/peek` - Vê suas palavras mais próximas sem fazer tentativa\n" +
                        "`/tip` - Recebe uma dica (apenas em jogos cooperativos solo)\n" +
                        "`/giveup` - Desiste e revela a palavra (apenas em jogos cooperativos solo)",
                    inline: false
                },
                {
                    name: "👥 Comandos Gerais",
                    value: 
                        "`/help` - Mostra esta ajuda",
                    inline: false
                },
                {
                    name: "ℹ️ Sistema de Salas",
                    value: 
                        "**Todas as partidas são salas privadas com ID único**\n\n" +
                        "**Cooperativo:** Todos jogam juntos para encontrar a palavra\n" +
                        "**Competitivo:** Cada jogador compete individualmente\n" +
                        "**Stop:** Termina quando o primeiro jogador acerta - ranking por distância!\n" +
                        "**Battle Royale:** Cada palavra só pode ser usada uma vez - seja o primeiro!\n\n" +
                        "💡 **Como funciona:**\n" +
                        "• `/c <palavra>` - Cria sala e joga imediatamente\n" +
                        "• `/create` - Cria sala vazia para outros entrarem\n" +
                        "• `/join <id>` - Entra em sala existente\n" +
                        "• Compartilhe o ID da sala para convidar outros!",
                    inline: false
                },
                {
                    name: "🔍 Dicas e Desistência",
                    value: 
                        "• **Cooperativo:** Só disponíveis com **apenas um jogador**\n" +
                        "• **Competitivo:** Dicas podem afetar sua pontuação\n" +
                        "• **Stop:** Sem dicas! Desistir apenas sai da sala\n" +
                        "• **Battle Royale:** Sem dicas! Cada palavra é única\n" +
                        "• Em jogos com múltiplos jogadores, use a colaboração!",
                    inline: false
                }
            )
            .setFooter({ text: "Use /c <palavra> para começar a jogar!" })

        await interaction.reply({ embeds: [embed], ephemeral: true })
    }
}

export default new HelpCommand()
