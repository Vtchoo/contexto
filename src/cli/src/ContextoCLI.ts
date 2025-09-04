import * as dotenv from "dotenv";
import * as readline from "readline";
import { io, Socket } from "socket.io-client";
import {
  gameApi,
  roomApi,
  userApi,
  Player,
  Guess,
  GameMode,
  getSharedAgent,
} from "./api";
import { GameRenderer } from "./renderer";
import { cleanInput } from "./utils";

// Load environment variables
dotenv.config();

interface CurrentGame {
  roomId: string;
  gameId: string;
  gameMode: GameMode;
  guesses: Guess[];
  finished: boolean;
  started: boolean;
  isHost: boolean;
  players?: string[];
  ranking?: Array<{
    playerId: string;
    guessCount: number;
    closestDistance?: number;
    completedAt?: Date;
  }>;
  answerWord?: string;
}

export class ContextoCLI {
  private rl: readline.Interface;
  private socket: Socket | null = null;
  private user: Player | null = null;
  private currentGame: CurrentGame | null = null;
  private isConnected = false;
  private isInitialized = false;
  private playerCache = new Map<string, Player>();
  private apiUrl: string;

  constructor() {
    this.apiUrl = process.env.API_URL || "http://localhost:3001";

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    // Handle Ctrl+C gracefully
    this.rl.on("SIGINT", () => {
      this.handleQuit();
    });
  }

  public async start(): Promise<void> {
    GameRenderer.clearScreen();
    console.log(GameRenderer.renderHeader("CLI Client", "Initializing..."));
    console.log(GameRenderer.renderConnectionStatus(false, this.apiUrl));

    try {
      await this.initializeUser();
      await this.connectSocket();
      this.showMainMenu();
    } catch (error) {
      console.log(GameRenderer.renderError(`Failed to initialize: ${error}`));
      console.log(
        GameRenderer.renderInfo("You can still use the CLI in offline mode")
      );
      console.log(
        GameRenderer.renderInfo(
          "Try changing API_URL in .env to a working server"
        )
      );
      console.log("");
      this.showOfflineMenu();
    }
  }

  private showOfflineMenu(): void {
    console.log(
      GameRenderer.renderInfo("Offline Mode - Limited functionality")
    );
    console.log("Available commands:");
    console.log('• "reconnect" - Try to reconnect to server');
    console.log('• "config" - Show current configuration');
    console.log('• "help" - Show help');
    console.log('• "quit" - Exit');

    this.promptForInput();
  }

  private async initializeUser(): Promise<void> {
    try {
      console.log(GameRenderer.renderInfo("Initializing user..."));
      this.user = await userApi.initUser();
      console.log(this.user);
      this.isInitialized = true;
      console.log(
        GameRenderer.renderSuccess(
          `Welcome, ${this.user.username || "Anonymous"}!`
        )
      );
    } catch (error) {
      console.log(
        GameRenderer.renderError(
          `Failed to connect to server at ${this.apiUrl}`
        )
      );
      console.log(GameRenderer.renderInfo("Please check that:"));
      console.log(GameRenderer.renderInfo("1. The server is running"));
      console.log(GameRenderer.renderInfo("2. The API_URL in .env is correct"));
      console.log(
        GameRenderer.renderInfo(
          "3. You have internet connectivity (for remote server)"
        )
      );
      throw new Error(`User initialization failed: ${error}`);
    }
  }

  private async connectSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(GameRenderer.renderInfo("Connecting to server..."));

      const sharedAgent = getSharedAgent();
      console.log(
        GameRenderer.renderInfo(
          "Using shared HTTP agent for cookie persistence"
        )
      );
      
      // Set a timeout for the connection
      const connectionTimeout = setTimeout(() => {
        if (this.socket) {
          this.socket.disconnect();
        }
        reject(new Error("Connection timeout - server may be unavailable"));
      }, 15000); // 15 second timeout

      this.socket = io(this.apiUrl, {
        withCredentials: true,
        transports: ["websocket", "webtransport", "polling"], // Only use websocket to avoid xhr polling errors
        timeout: 10000, // Socket.IO timeout
        reconnection: false, // Disable automatic reconnection to prevent error spam
        extraHeaders: {
          Origin: this.apiUrl,
          "User-Agent": "Contexto-CLI/1.0.0",
        },
        // Pass the agent for engine.io transport
        agent: sharedAgent as any, // Type assertion since Socket.IO types might not include agent
      });

      this.socket.on("connect", () => {
        clearTimeout(connectionTimeout);
        this.isConnected = true;
        console.log(GameRenderer.renderSuccess("Connected to server!"));
        this.setupSocketListeners();
        resolve();
      });

      this.socket.on("connect_error", (error) => {
        clearTimeout(connectionTimeout);
        console.log(
          GameRenderer.renderError(`Connection error: ${error.message}`)
        );
        reject(new Error(`Connection failed: ${error.message}`));
      });

      this.socket.on("disconnect", () => {
        this.isConnected = false;
        console.log(GameRenderer.renderError("Disconnected from server"));
      });
    });
  }

  private setupSocketListeners(): void {
    if (!this.socket) return;

    this.socket.on("room_joined", (data) => {
      this.currentGame = {
        roomId: data.roomId,
        gameId: data.gameId,
        gameMode: data?.gameMode || "default",
        guesses: data?.guesses || [],
        finished: false,
        started: data.started !== undefined ? data.started : true,
        isHost: data.isHost !== undefined ? data.isHost : false,
        players: data.players || [],
        ranking: data.ranking || [],
      };
      this.refreshGameDisplay();
    });

    this.socket.on("room_left", () => {
      this.currentGame = null;
      this.showMainMenu();
    });

    this.socket.on("game_update", (data) => {
      if (!this.currentGame) return;
      this.currentGame.guesses = data.guesses || this.currentGame.guesses;
      this.currentGame.finished =
        data.gameFinished !== undefined
          ? data.gameFinished
          : this.currentGame.finished;
      this.refreshGameDisplay();
    });

    this.socket.on("guess_result", (data) => {
      if (!this.currentGame) return;

      this.currentGame.guesses.push(data.guess);
      this.currentGame.finished = data.gameFinished || false;

      // Update ranking
      this.updateRanking(data.guess);
      this.refreshGameDisplay();
    });

    this.socket.on("player_guess", (data) => {
      if (!this.currentGame) return;

      const newGuess = {
        word: data.word,
        distance: data.distance,
        addedBy: data.addedBy,
        error: data.error,
        hidden: data.hidden,
      };

      this.currentGame.guesses.push(newGuess);
      this.updateRanking(newGuess);
      this.refreshGameDisplay();
    });

    this.socket.on("game_finished", (data) => {
      if (!this.currentGame) return;
      this.currentGame.finished = true;
      this.currentGame.answerWord = data.answer;
      this.refreshGameDisplay();
    });

    this.socket.on("game_started", () => {
      if (!this.currentGame) return;
      this.currentGame.started = true;
      this.refreshGameDisplay();
    });

    this.socket.on("player_joined", (data) => {
      if (!this.currentGame) return;
      this.currentGame.players = [
        ...(this.currentGame.players || []),
        data.userId,
      ];
      console.log(GameRenderer.renderInfo(`Player joined: ${data.username}`));
    });

    this.socket.on("player_left", (data) => {
      if (!this.currentGame) return;
      this.currentGame.players = (this.currentGame.players || []).filter(
        (id) => id !== data.userId
      );
      console.log(GameRenderer.renderInfo(`Player left: ${data.username}`));
    });

    this.socket.on("error", (data) => {
      console.log(GameRenderer.renderError(data.error));
    });
  }

  private updateRanking(guess: Guess): void {
    if (!this.currentGame || guess.error) return;

    let ranking = [...(this.currentGame.ranking || [])];
    const playerRankingIndex = ranking.findIndex(
      (r) => r.playerId === guess.addedBy
    );

    if (playerRankingIndex >= 0) {
      const currentRanking = ranking[playerRankingIndex];
      ranking[playerRankingIndex] = {
        ...currentRanking,
        guessCount: currentRanking.guessCount + 1,
        closestDistance:
          currentRanking.closestDistance !== undefined
            ? Math.min(currentRanking.closestDistance, guess.distance)
            : guess.distance,
        completedAt:
          guess.distance === 0 && currentRanking.closestDistance !== 0
            ? new Date()
            : currentRanking.completedAt,
      };
    } else {
      ranking.push({
        playerId: guess.addedBy,
        guessCount: 1,
        closestDistance: guess.distance,
        completedAt: guess.distance === 0 ? new Date() : undefined,
      });
    }

    this.currentGame.ranking = ranking;
  }

  private refreshGameDisplay(): void {
    if (!this.currentGame) return;

    GameRenderer.clearScreen();

    // Header
    console.log(
      GameRenderer.renderHeader(
        this.currentGame.roomId,
        this.currentGame.gameMode,
        this.currentGame.players?.length
      )
    );

    // Connection status
    console.log(
      GameRenderer.renderConnectionStatus(this.isConnected, this.apiUrl)
    );

    // Game status
    console.log(
      GameRenderer.renderGameStatus(
        this.currentGame.finished,
        this.currentGame.started,
        this.currentGame.isHost,
        this.currentGame.guesses.filter((g) => !g.error).length,
        this.currentGame.answerWord
      )
    );

    // Guess history
    console.log(
      GameRenderer.renderGuessHistory(this.currentGame.guesses, this.user?.id)
    );

    // Ranking
    console.log(
      GameRenderer.renderRanking(
        this.currentGame.ranking || [],
        this.playerCache
      )
    );

    // Commands
    console.log(GameRenderer.renderCommands());

    this.promptForInput();
  }

  private showMainMenu(): void {
    GameRenderer.clearScreen();
    console.log(GameRenderer.renderHeader("Main Menu", "Ready"));
    console.log(
      GameRenderer.renderConnectionStatus(this.isConnected, this.apiUrl)
    );

    if (this.user) {
      console.log(
        GameRenderer.renderInfo(
          `Logged in as: ${this.user.username || "Anonymous"}`
        )
      );
      console.log(
        GameRenderer.renderInfo(
          `Games played: ${this.user.gamesPlayed}, Win rate: ${(
            this.user.winRate * 100
          ).toFixed(1)}%`
        )
      );
    }

    console.log(GameRenderer.renderCommands());
    this.promptForInput();
  }

  private promptForInput(): void {
    this.rl.question("\n> ", (input) => {
      this.handleInput(cleanInput(input));
    });
  }

  private async handleInput(input: string): Promise<void> {
    if (!input) {
      this.promptForInput();
      return;
    }

    const [command, ...args] = input.split(" ");

    try {
      switch (command) {
        case "quit":
        case "exit":
          this.handleQuit();
          break;

        case "help":
          this.showHelp();
          break;

        case "create":
          await this.createGame((args[0] as GameMode) || "default");
          break;

        case "join":
          if (args[0]) {
            await this.joinRoom(args[0]);
          } else {
            console.log(GameRenderer.renderError("Please specify a room ID"));
            this.promptForInput();
          }
          break;

        case "leave":
          this.leaveRoom();
          break;

        case "start":
          this.startGame();
          break;

        case "rooms":
          await this.listRooms();
          break;

        case "reconnect":
          await this.reconnect();
          break;

        case "config":
          this.showConfig();
          break;

        default:
          // Treat as a guess
          if (
            this.currentGame &&
            this.currentGame.started &&
            !this.currentGame.finished
          ) {
            await this.makeGuess(input);
          } else if (!this.currentGame) {
            console.log(
              GameRenderer.renderError(
                'Not in a game. Use "create" or "join" to start playing.'
              )
            );
            this.promptForInput();
          } else if (!this.currentGame.started) {
            console.log(GameRenderer.renderError("Game not started yet."));
            this.promptForInput();
          } else {
            console.log(GameRenderer.renderError("Game is finished."));
            this.promptForInput();
          }
          break;
      }
    } catch (error) {
      console.log(GameRenderer.renderError(`Command failed: ${error}`));
      this.promptForInput();
    }
  }

  private async createGame(mode: GameMode = "default"): Promise<void> {
    if (!this.isInitialized) {
      console.log(GameRenderer.renderError("Not initialized"));
      return;
    }

    try {
      console.log(GameRenderer.renderInfo(`Creating ${mode} game...`));
      const response = await gameApi.createGame(mode);

      if (this.socket && this.isConnected) {
        this.socket.emit("join_room", { roomId: response.roomId });
      }

      console.log(
        GameRenderer.renderSuccess(`Game created! Room ID: ${response.roomId}`)
      );
    } catch (error) {
      console.log(GameRenderer.renderError(`Failed to create game: ${error}`));
      this.promptForInput();
    }
  }

  private async joinRoom(roomId: string): Promise<void> {
    if (!this.socket || !this.isConnected) {
      console.log(GameRenderer.renderError("Not connected to server"));
      this.promptForInput();
      return;
    }

    console.log(GameRenderer.renderInfo(`Joining room ${roomId}...`));
    this.socket.emit("join_room", { roomId });
  }

  private leaveRoom(): void {
    if (!this.socket || !this.isConnected || !this.currentGame) {
      console.log(GameRenderer.renderError("Not in a room"));
      this.promptForInput();
      return;
    }

    this.socket.emit("leave_room");
    console.log(GameRenderer.renderInfo("Left the room"));
  }

  private startGame(): void {
    if (!this.currentGame || !this.currentGame.isHost) {
      console.log(
        GameRenderer.renderError("You are not the host of this game")
      );
      this.promptForInput();
      return;
    }

    if (!this.socket || !this.isConnected) {
      console.log(GameRenderer.renderError("Not connected to server"));
      this.promptForInput();
      return;
    }

    this.socket.emit("start_game");
    console.log(GameRenderer.renderInfo("Starting game..."));
  }

  private async makeGuess(word: string): Promise<void> {
    if (!this.currentGame || !this.socket || !this.isConnected) {
      console.log(GameRenderer.renderError("Cannot make guess"));
      this.promptForInput();
      return;
    }

    this.socket.emit("make_guess", { word });
  }

  private async listRooms(): Promise<void> {
    try {
      console.log(GameRenderer.renderInfo("Fetching active rooms..."));
      const { rooms } = await roomApi.getActiveRooms();

      if (rooms.length === 0) {
        console.log(GameRenderer.renderInfo("No active rooms found"));
      } else {
        console.log("\n📋 Active Rooms:");
        rooms.forEach((room) => {
          const status = room.finished ? "✅ Finished" : "🔄 Active";
          console.log(
            `  ${room.roomId} - ${room.type} - ${status} (${room.guessCount} guesses)`
          );
        });
      }

      this.promptForInput();
    } catch (error) {
      console.log(GameRenderer.renderError(`Failed to fetch rooms: ${error}`));
      this.promptForInput();
    }
  }

  private showHelp(): void {
    console.log(GameRenderer.renderCommands());
    this.promptForInput();
  }

  private async reconnect(): Promise<void> {
    try {
      console.log(GameRenderer.renderInfo("Attempting to reconnect..."));
      await this.initializeUser();
      await this.connectSocket();
      console.log(GameRenderer.renderSuccess("Reconnected successfully!"));
      this.showMainMenu();
    } catch (error) {
      console.log(GameRenderer.renderError(`Reconnection failed: ${error}`));
      this.promptForInput();
    }
  }

  private showConfig(): void {
    console.log(GameRenderer.renderInfo("Current Configuration:"));
    console.log(`API URL: ${this.apiUrl}`);
    console.log(`Connected: ${this.isConnected ? "✅ Yes" : "❌ No"}`);
    console.log(`Initialized: ${this.isInitialized ? "✅ Yes" : "❌ No"}`);
    if (this.user) {
      console.log(
        `User: ${this.user.username || "Anonymous"} (ID: ${this.user.id})`
      );
      console.log(`Games Played: ${this.user.gamesPlayed}`);
      console.log(`Win Rate: ${(this.user.winRate * 100).toFixed(1)}%`);
    }
    console.log("");
    this.promptForInput();
  }

  private handleQuit(): void {
    console.log(GameRenderer.renderInfo("Goodbye!"));

    if (this.socket) {
      this.socket.disconnect();
    }

    this.rl.close();
    process.exit(0);
  }
}
