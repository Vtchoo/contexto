import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import GameApiClient, { Player, GameMode } from './api'
import SocketClient, { CurrentGame } from './socket'
import GameRenderer from './renderer'
import * as readline from 'readline'

export class ContextoCLI {
  private apiClient: GameApiClient
  private socketClient: SocketClient | null = null
  private user: Player | null = null
  private currentGame: CurrentGame | null = null
  private rl: readline.Interface
  private isInGame = false
  private isLoading = false

  constructor(serverUrl: string = 'http://localhost:3001') {
    this.apiClient = new GameApiClient(serverUrl)
    
    // Setup readline interface
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('contexto> ')
    })

    this.setupReadlineHandlers()
  }

  private setupReadlineHandlers() {
    this.rl.on('line', async (input) => {
      const command = input.trim().toLowerCase()
      
      if (!command) {
        this.rl.prompt()
        return
      }

      // Handle special commands
      if (command === 'quit' || command === 'exit') {
        await this.handleQuit()
        return
      }

      if (command === 'help') {
        GameRenderer.renderCommands()
        this.rl.prompt()
        return
      }

      if (command === 'stats') {
        await this.showStats()
        this.rl.prompt()
        return
      }

      if (command === 'start' && this.currentGame && !this.currentGame.started) {
        if (this.currentGame.isHost) {
          this.socketClient?.startGame()
          GameRenderer.renderInfo('Iniciando jogo...')
        } else {
          GameRenderer.renderError('Apenas o host pode iniciar o jogo')
        }
        this.rl.prompt()
        return
      }

      if (command === 'clear') {
        GameRenderer.clearScreen()
        if (this.currentGame) {
          this.renderGameState()
        }
        this.rl.prompt()
        return
      }

      // If in game and game started, treat as guess
      if (this.isInGame && this.currentGame && this.currentGame.started && !this.currentGame.finished) {
        if (this.isLoading) {
          GameRenderer.renderWaiting('Aguarde a resposta da tentativa anterior...')
          this.rl.prompt()
          return
        }

        // Validate guess
        if (command.length < 2) {
          GameRenderer.renderError('A palavra deve ter pelo menos 2 caracteres')
          this.rl.prompt()
          return
        }

        // Check if word already guessed
        const existingGuess = this.currentGame.guesses.find(g => g.word.toLowerCase() === command)
        if (existingGuess) {
          GameRenderer.renderInfo(`Palavra "${command}" já foi tentada`)
          if (this.currentGame) {
            GameRenderer.renderGuessList(this.currentGame.guesses, this.user?.id || '', command)
          }
          this.rl.prompt()
          return
        }

        // Make guess
        this.isLoading = true
        this.socketClient?.makeGuess(command)
        
        // Don't prompt here, wait for guess result
        return
      }

      GameRenderer.renderError('Comando não reconhecido. Digite "help" para ver os comandos disponíveis.')
      this.rl.prompt()
    })

    this.rl.on('close', () => {
      this.handleQuit()
    })
  }

  async initialize(): Promise<void> {
    const spinner = ora('Inicializando cliente...').start()
    
    try {
      // Initialize user
      this.user = await this.apiClient.initUser()
      spinner.text = 'Conectando ao servidor...'
      
      // Initialize socket
      this.socketClient = new SocketClient(this.apiClient)
      this.setupSocketHandlers()
      
      // Wait for connection
      await this.waitForConnection()
      
      spinner.succeed('Conectado com sucesso!')
      console.log(chalk.green(`Olá, ${this.user.username || 'Anônimo'}! 👋`))
      
    } catch (error) {
      spinner.fail('Falha ao conectar ao servidor')
      console.error(chalk.red('Erro:'), error instanceof Error ? error.message : 'Erro desconhecido')
      process.exit(1)
    }
  }

  private async waitForConnection(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socketClient) {
        reject(new Error('Socket client not initialized'))
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'))
      }, 10000)

      this.socketClient.on('connected', () => {
        clearTimeout(timeout)
        resolve()
      })

      this.socketClient.on('error', (error: any) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
  }

  private setupSocketHandlers() {
    if (!this.socketClient) return

    this.socketClient.on('room_joined', (game: CurrentGame) => {
      this.currentGame = game
      this.isInGame = true
      GameRenderer.clearScreen()
      GameRenderer.renderSuccess(`Entrou na sala ${game.roomId}`)
      this.renderGameState()
      this.rl.prompt()
    })

    this.socketClient.on('room_left', () => {
      this.currentGame = null
      this.isInGame = false
      GameRenderer.renderInfo('Saiu da sala')
      this.rl.prompt()
    })

    this.socketClient.on('guess_result', (data: any) => {
      this.isLoading = false
      if (this.currentGame) {
        this.renderGameState()
        
        if (data.guess.distance === 0) {
          GameRenderer.renderSuccess('🎉 Parabéns! Você encontrou a palavra! 🎉')
        } else if (data.guess.error) {
          GameRenderer.renderError(data.guess.error)
        }
      }
      this.rl.prompt()
    })

    this.socketClient.on('player_guess', (data: any) => {
      if (this.currentGame && data.addedBy !== this.user?.id) {
        // Another player made a guess
        GameRenderer.renderInfo(`${data.word} (${data.distance}) - tentativa de outro jogador`)
        this.renderGameState()
        this.rl.prompt()
      }
    })

    this.socketClient.on('game_finished', (data: any) => {
      if (this.currentGame) {
        this.currentGame.finished = true
        this.currentGame.answerWord = data.answer
        GameRenderer.renderWinner(data)
        this.renderGameState()
      }
      this.rl.prompt()
    })

    this.socketClient.on('game_started', () => {
      if (this.currentGame) {
        this.currentGame.started = true
        GameRenderer.renderSuccess('🚀 Jogo iniciado!')
        this.renderGameState()
      }
      this.rl.prompt()
    })

    this.socketClient.on('player_joined', (data: any) => {
      GameRenderer.renderInfo(`👋 ${data.username} entrou na sala`)
      this.rl.prompt()
    })

    this.socketClient.on('player_left', (data: any) => {
      GameRenderer.renderInfo(`👋 ${data.username} saiu da sala`)
      this.rl.prompt()
    })

    this.socketClient.on('error', (error: any) => {
      GameRenderer.renderError(error.error || 'Erro do servidor')
      this.rl.prompt()
    })
  }

  private renderGameState() {
    if (!this.currentGame || !this.user) return

    GameRenderer.renderGameStatus(this.currentGame, this.user)
    
    if (!this.currentGame.started) {
      GameRenderer.renderGameStartWait(this.currentGame.isHost)
    } else if (this.currentGame.finished) {
      console.log(chalk.green.bold('\n🏁 Jogo finalizado!'))
      if (this.currentGame.answerWord) {
        console.log(chalk.cyan.bold(`🎯 A palavra era: ${this.currentGame.answerWord.toUpperCase()}`))
      }
    }
    
    GameRenderer.renderGuessList(this.currentGame.guesses, this.user.id)
  }

  async showMainMenu(): Promise<void> {
    GameRenderer.renderWelcome()
    
    while (true) {
      const { action } = await inquirer.prompt([
        {
          type: 'list',
          name: 'action',
          message: 'O que você gostaria de fazer?',
          choices: [
            { name: '🎮 Criar novo jogo', value: 'create' },
            { name: '🚪 Entrar em uma sala', value: 'join' },
            { name: '📊 Ver salas ativas', value: 'rooms' },
            { name: '📈 Minhas estatísticas', value: 'stats' },
            { name: '⚙️  Configurações', value: 'settings' },
            { name: '🚪 Sair', value: 'quit' }
          ]
        }
      ])

      try {
        switch (action) {
          case 'create':
            await this.createGame()
            return // Exit menu to enter game mode
          case 'join':
            await this.joinGame()
            return // Exit menu to enter game mode
          case 'rooms':
            await this.showActiveRooms()
            break
          case 'stats':
            await this.showStats()
            break
          case 'settings':
            await this.showSettings()
            break
          case 'quit':
            await this.handleQuit()
            return
        }
      } catch (error) {
        GameRenderer.renderError(error instanceof Error ? error.message : 'Erro desconhecido')
        console.log('') // Add some space
      }
    }
  }

  private async createGame(): Promise<void> {
    const { gameMode } = await inquirer.prompt([
      {
        type: 'list',
        name: 'gameMode',
        message: 'Escolha o modo de jogo:',
        choices: [
          { name: GameRenderer.renderGameModeDescription('default'), value: 'default' },
          { name: GameRenderer.renderGameModeDescription('competitive'), value: 'competitive' },
          { name: GameRenderer.renderGameModeDescription('battle-royale'), value: 'battle-royale' },
          { name: GameRenderer.renderGameModeDescription('stop'), value: 'stop' }
        ]
      }
    ])

    const spinner = ora('Criando jogo...').start()
    
    try {
      const response = await this.apiClient.createGame(gameMode as GameMode)
      spinner.succeed(`Jogo criado! Sala: ${response.roomId}`)
      
      // Join the room via socket
      this.socketClient?.joinRoom(response.roomId)
      
      // Switch to game mode
      this.startGameMode()
      
    } catch (error) {
      spinner.fail('Falha ao criar jogo')
      throw error
    }
  }

  private async joinGame(): Promise<void> {
    const { roomId } = await inquirer.prompt([
      {
        type: 'input',
        name: 'roomId',
        message: 'Digite o ID da sala:',
        validate: (input: string) => input.trim() !== '' || 'ID da sala é obrigatório'
      }
    ])

    const spinner = ora('Entrando na sala...').start()
    
    try {
      // Try to get room info first to validate
      await this.apiClient.getRoomInfo(roomId.trim())
      spinner.text = 'Conectando...'
      
      // Join via socket
      this.socketClient?.joinRoom(roomId.trim())
      
      // Wait a bit for the room_joined event
      setTimeout(() => {
        if (this.isInGame) {
          spinner.succeed(`Entrou na sala ${roomId}`)
          this.startGameMode()
        } else {
          spinner.fail('Falha ao entrar na sala')
        }
      }, 2000)
      
    } catch (error) {
      spinner.fail('Sala não encontrada ou erro ao conectar')
      throw error
    }
  }

  private async showActiveRooms(): Promise<void> {
    const spinner = ora('Carregando salas ativas...').start()
    
    try {
      const response = await this.apiClient.getActiveRooms()
      spinner.stop()
      
      if (response.rooms.length === 0) {
        console.log(chalk.yellow('Nenhuma sala ativa encontrada.'))
        return
      }

      console.log(chalk.blue('\n📋 Salas Ativas:'))
      console.log(chalk.gray('──────────────────────────────────────'))
      
      response.rooms.forEach(room => {
        const statusIcon = room.finished ? '🏁' : '🎮'
        const modeDesc = GameRenderer.renderGameModeDescription(room.type)
        console.log(`${statusIcon} ${chalk.white(room.roomId)} - ${modeDesc} (${room.guessCount} tentativas)`)
      })
      
      console.log('')
      
    } catch (error) {
      spinner.fail('Falha ao carregar salas')
      throw error
    }
  }

  private async showStats(): Promise<void> {
    try {
      const stats = await this.apiClient.getUserStats()
      GameRenderer.renderPlayerStats(stats)
    } catch (error) {
      GameRenderer.renderError('Falha ao carregar estatísticas')
    }
  }

  private async showSettings(): Promise<void> {
    if (!this.user) return

    const { action } = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Configurações:',
        choices: [
          { name: '✏️  Alterar nome de usuário', value: 'username' },
          { name: '🎲 Gerar nome aleatório', value: 'random' },
          { name: '🔙 Voltar', value: 'back' }
        ]
      }
    ])

    switch (action) {
      case 'username':
        await this.changeUsername()
        break
      case 'random':
        await this.generateRandomUsername()
        break
      case 'back':
        return
    }
  }

  private async changeUsername(): Promise<void> {
    const { newUsername } = await inquirer.prompt([
      {
        type: 'input',
        name: 'newUsername',
        message: 'Digite seu novo nome de usuário:',
        validate: (input: string) => {
          if (input.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres'
          if (input.trim().length > 20) return 'Nome deve ter no máximo 20 caracteres'
          return true
        }
      }
    ])

    try {
      const spinner = ora('Verificando disponibilidade...').start()
      
      const availability = await this.apiClient.checkUsernameAvailability(newUsername.trim())
      
      if (!availability.available) {
        spinner.fail('Nome de usuário não disponível')
        return
      }

      spinner.text = 'Atualizando...'
      await this.apiClient.updateUser({ username: newUsername.trim() })
      this.user!.username = newUsername.trim()
      
      spinner.succeed(`Nome alterado para: ${newUsername.trim()}`)
      
    } catch (error) {
      GameRenderer.renderError('Falha ao alterar nome de usuário')
    }
  }

  private async generateRandomUsername(): Promise<void> {
    try {
      const spinner = ora('Gerando nome aleatório...').start()
      
      const response = await this.apiClient.generateAnonymousUsername()
      await this.apiClient.updateUser({ username: response.username })
      this.user!.username = response.username
      
      spinner.succeed(`Novo nome: ${response.username}`)
      
    } catch (error) {
      GameRenderer.renderError('Falha ao gerar nome aleatório')
    }
  }

  private startGameMode(): void {
    console.log(chalk.blue('\n🎮 Modo de jogo ativo'))
    console.log(chalk.gray('Digite "help" para ver os comandos disponíveis'))
    this.rl.prompt()
  }

  private async handleQuit(): Promise<void> {
    console.log(chalk.yellow('\n👋 Saindo...'))
    
    if (this.isInGame && this.socketClient) {
      this.socketClient.leaveRoom()
    }
    
    this.socketClient?.disconnect()
    this.rl.close()
    process.exit(0)
  }

  async run(): Promise<void> {
    try {
      await this.initialize()
      await this.showMainMenu()
    } catch (error) {
      console.error(chalk.red('Erro fatal:'), error instanceof Error ? error.message : 'Erro desconhecido')
      process.exit(1)
    }
  }
}

export default ContextoCLI
