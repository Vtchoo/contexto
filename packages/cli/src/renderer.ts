import chalk from 'chalk'
import { Guess } from './api'

export class GameRenderer {
  static renderWelcome() {
    const title = `
╔═══════════════════════════════════════╗
║                                       ║
║         🎯 CONTEXTO CLI 🎯           ║
║                                       ║
║     Find the secret word through      ║
║        semantic similarity!           ║
║                                       ║
╚═══════════════════════════════════════╝
    `
    console.log(chalk.cyan(title))
  }

  static renderGameModeDescription(mode: string) {
    const descriptions = {
      'default': '🤝 Clássico - Trabalhe em equipe para encontrar a palavra',
      'competitive': '🎯 Competitivo - Compita para encontrar com menos tentativas',
      'battle-royale': '⚔️ Battle Royale - Primeiro a encontrar vence',
      'stop': '⚡ Stop - Todos começam juntos, mais rápido vence'
    }
    return descriptions[mode as keyof typeof descriptions] || mode
  }

  static renderGameStatus(game: any, user: any) {
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log(chalk.bold.white(`🎮 Sala: ${chalk.green(game.roomId)} | Jogo: ${chalk.green('#' + game.gameId)}`))
    console.log(chalk.white(`📋 Modo: ${this.renderGameModeDescription(game.gameMode)}`))
    
    if (game.players && game.players.length > 1) {
      console.log(chalk.white(`👥 Jogadores: ${game.players.length}`))
    }
    
    const playerGuesses = game.guesses.filter((guess: any) => guess.addedBy === user.id && !guess.error)
    console.log(chalk.white(`🎯 Suas tentativas: ${playerGuesses.length}`))
    
    if (game.gameMode !== 'default') {
      console.log(chalk.white(`📊 Total de tentativas: ${game.guesses.filter((g: any) => !g.error).length}`))
    }
    
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
  }

  static renderGuess(guess: Guess, isOwn: boolean = false, highlight: boolean = false) {
    let distanceColor = chalk.red
    let distanceIcon = '🔥'
    
    if (guess.distance <= 100) {
      distanceColor = chalk.green
      distanceIcon = '🎯'
    } else if (guess.distance <= 500) {
      distanceColor = chalk.yellow
      distanceIcon = '🟡'
    } else if (guess.distance <= 1000) {
      distanceColor = chalk.magenta
      distanceIcon = '🟠'
    }

    let wordStyle = guess.word.toUpperCase()
    if (highlight) {
      wordStyle = chalk.inverse(wordStyle)
    }
    if (isOwn) {
      wordStyle = chalk.bold(wordStyle)
    }

    const playerIndicator = isOwn ? '→ ' : '  '
    
    if (guess.distance === 0) {
      console.log(`${playerIndicator}${chalk.green.bold('🏆 ' + guess.word.toUpperCase() + ' ✨ ENCONTROU! ✨')}`)
    } else {
      console.log(`${playerIndicator}${wordStyle} ${distanceColor(guess.distance.toString().padStart(4))} ${distanceIcon}`)
    }
  }

  static renderGuessList(guesses: Guess[], userId: string, highlightWord?: string) {
    // Sort by distance (closest first)
    const validGuesses = guesses
      .filter(guess => !guess.error)
      .sort((a, b) => a.distance - b.distance)

    if (validGuesses.length === 0) {
      console.log(chalk.gray('  Nenhuma tentativa ainda...'))
      return
    }

    console.log(chalk.white('\n📝 Tentativas (ordenadas por proximidade):'))
    console.log(chalk.gray('────────────────────────────────────────'))
    
    validGuesses.forEach(guess => {
      const isOwn = guess.addedBy === userId
      const highlight = highlightWord === guess.word
      this.renderGuess(guess, isOwn, highlight)
    })
    
    console.log('')
  }

  static renderError(message: string) {
    console.log(chalk.red(`❌ ${message}`))
  }

  static renderSuccess(message: string) {
    console.log(chalk.green(`✅ ${message}`))
  }

  static renderInfo(message: string) {
    console.log(chalk.blue(`ℹ️  ${message}`))
  }

  static renderWaiting(message: string) {
    console.log(chalk.yellow(`⏳ ${message}`))
  }

  static renderWinner(data: any) {
    if (data.winner) {
      console.log(chalk.green.bold(`\n🎉 ${data.winner.username} encontrou a palavra! 🎉`))
    }
    if (data.answer) {
      console.log(chalk.cyan.bold(`🎯 A palavra era: ${data.answer.toUpperCase()}`))
    }
  }

  static renderGameStartWait(isHost: boolean) {
    console.log(chalk.yellow('\n⏸️  Aguardando início do jogo...'))
    if (isHost) {
      console.log(chalk.white('💡 Digite "start" para iniciar o jogo'))
    } else {
      console.log(chalk.gray('💤 Aguardando o host iniciar o jogo...'))
    }
  }

  static renderCommands() {
    console.log(chalk.blue('\n📚 Comandos disponíveis:'))
    console.log(chalk.white('  help       - Mostra esta ajuda'))
    console.log(chalk.white('  start      - Inicia o jogo (apenas host)'))
    console.log(chalk.white('  stats      - Mostra suas estatísticas'))
    console.log(chalk.white('  quit/exit  - Sair do jogo'))
    console.log(chalk.white('  <palavra>  - Fazer uma tentativa'))
    console.log('')
  }

  static clearScreen() {
    console.clear()
  }

  static renderPlayerStats(stats: any) {
    console.log(chalk.blue('\n📊 Suas Estatísticas:'))
    console.log(chalk.white(`🎮 Jogos jogados: ${stats.gamesPlayed}`))
    console.log(chalk.white(`🏆 Jogos ganhos: ${stats.gamesWon}`))
    console.log(chalk.white(`📈 Taxa de vitória: ${(stats.winRate * 100).toFixed(1)}%`))
    console.log(chalk.white(`🎯 Média de tentativas: ${stats.averageGuesses.toFixed(1)}`))
    console.log('')
  }
}

export default GameRenderer
