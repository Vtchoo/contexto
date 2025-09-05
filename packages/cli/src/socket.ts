import { io, Socket } from 'socket.io-client'
import GameApiClient from './api'
import chalk from 'chalk'

export interface CurrentGame {
  roomId: string
  gameId: string
  gameMode: 'default' | 'competitive' | 'battle-royale' | 'stop'
  guesses: any[]
  finished: boolean
  started: boolean
  isHost: boolean
  players?: string[]
  ranking?: Array<{
    playerId: string
    guessCount: number
    closestDistance?: number
    completedAt?: Date
  }>
  answerWord?: string
}

class SocketClient {
  private socket: Socket | null = null
  private apiClient: GameApiClient
  private currentGame: CurrentGame | null = null
  private isConnected = false
  private eventHandlers: { [event: string]: Function[] } = {}

  constructor(apiClient: GameApiClient, socketUrl: string = 'http://localhost:3001') {
    this.apiClient = apiClient
    
    // Create socket with shared cookie support
    this.socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      extraHeaders: {
        'Cookie': apiClient.getCookieString()
      }
    })

    this.setupEventHandlers()
  }

  private setupEventHandlers() {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log(chalk.green('🔌 Connected to game server'))
      this.isConnected = true
      this.emit('connected')
    })

    this.socket.on('disconnect', (reason) => {
      console.log(chalk.yellow(`🔌 Disconnected: ${reason}`))
      this.isConnected = false
      this.emit('disconnected', reason)
    })

    this.socket.on('room_joined', (data) => {
      console.log(chalk.blue(`🏠 Joined room ${data.roomId}`))
      this.currentGame = {
        roomId: data.roomId,
        gameId: data.gameId,
        gameMode: data?.gameMode || 'default',
        guesses: data?.guesses || [],
        finished: false,
        started: data.started !== undefined ? data.started : true,
        isHost: data.isHost !== undefined ? data.isHost : false,
        players: data.players || [],
        ranking: data.ranking || [],
      }
      this.emit('room_joined', this.currentGame)
    })

    this.socket.on('room_left', () => {
      console.log(chalk.yellow('🚪 Left room'))
      this.currentGame = null
      this.emit('room_left')
    })

    this.socket.on('game_update', (data) => {
      if (this.currentGame) {
        this.currentGame.guesses = data.guesses || this.currentGame.guesses
        this.currentGame.finished = data.gameFinished !== undefined ? data.gameFinished : this.currentGame.finished
        this.emit('game_update', this.currentGame)
      }
    })

    this.socket.on('guess_result', (data) => {
      if (this.currentGame) {
        this.currentGame.guesses.push(data.guess)
        this.currentGame.finished = data.gameFinished || false
        this.emit('guess_result', data)
      }
    })

    this.socket.on('player_guess', (data) => {
      if (this.currentGame) {
        const newGuess = {
          word: data.word,
          distance: data.distance,
          addedBy: data.addedBy,
          error: data.error,
          hidden: data.hidden
        }
        this.currentGame.guesses.push(newGuess)
        this.emit('player_guess', data)
      }
    })

    this.socket.on('game_finished', (data) => {
      if (this.currentGame) {
        this.currentGame.finished = true
        this.currentGame.answerWord = data.answer
      }
      this.emit('game_finished', data)
    })

    this.socket.on('game_started', () => {
      if (this.currentGame) {
        this.currentGame.started = true
      }
      this.emit('game_started')
    })

    this.socket.on('player_joined', (data) => {
      if (this.currentGame && this.currentGame.players) {
        this.currentGame.players.push(data.userId)
      }
      this.emit('player_joined', data)
    })

    this.socket.on('player_left', (data) => {
      if (this.currentGame && this.currentGame.players) {
        this.currentGame.players = this.currentGame.players.filter(id => id !== data.userId)
      }
      this.emit('player_left', data)
    })

    this.socket.on('error', (data) => {
      console.error(chalk.red(`❌ Socket error: ${data.error}`))
      this.emit('error', data)
    })
  }

  // Event emitter pattern
  on(event: string, handler: Function) {
    if (!this.eventHandlers[event]) {
      this.eventHandlers[event] = []
    }
    this.eventHandlers[event].push(handler)
  }

  private emit(event: string, data?: any) {
    if (this.eventHandlers[event]) {
      this.eventHandlers[event].forEach(handler => handler(data))
    }
  }

  // Socket actions
  joinRoom(roomId: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('join_room', { roomId })
    }
  }

  leaveRoom() {
    if (this.socket && this.isConnected && this.currentGame?.roomId) {
      this.socket.emit('leave_room')
    }
  }

  makeGuess(word: string) {
    if (this.socket && this.isConnected) {
      this.socket.emit('make_guess', { word })
    }
  }

  startGame() {
    if (this.socket && this.isConnected) {
      this.socket.emit('start_game')
    }
  }

  updatePlayer(playerInfo: any) {
    if (this.socket && this.isConnected) {
      this.socket.emit('update_player', playerInfo)
    }
  }

  // Getters
  getCurrentGame() {
    return this.currentGame
  }

  getConnectionStatus() {
    return this.isConnected
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
    }
  }
}

export default SocketClient
