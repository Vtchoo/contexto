import chalk from 'chalk';
import { Guess } from './api';
import { getBarWidth, getBarColor } from './utils';

export class GameRenderer {
  public static renderHeader(roomId: string, gameMode: string, playerCount?: number): string {
    const header = [
      chalk.cyan.bold('🎯 CONTEXTO CLI'),
      '',
      chalk.gray(`Room: ${roomId}`),
      chalk.gray(`Mode: ${gameMode}`),
      playerCount ? chalk.gray(`Players: ${playerCount}`) : '',
      '',
      chalk.dim('━'.repeat(60)),
      ''
    ].filter(Boolean);

    return header.join('\n');
  }

  public static renderGuess(guess: Guess, isCurrentUser: boolean = false): string {
    if (guess.error) {
      return chalk.red(`❌ ${guess.word}: ${guess.error}`);
    }

    const { word, distance } = guess;
    const color = getBarColor(distance);
    const barWidth = Math.round(getBarWidth(distance) / 3); // Scale down for terminal
    const maxBarWidth = 20;
    const normalizedBarWidth = Math.min(barWidth, maxBarWidth);
    
    let colorFn = chalk.red;
    if (color === 'green') colorFn = chalk.green;
    else if (color === 'yellow') colorFn = chalk.yellow;

    const bar = '█'.repeat(normalizedBarWidth) + '░'.repeat(maxBarWidth - normalizedBarWidth);
    const rank = distance + 1;
    const prefix = isCurrentUser ? '👤' : '🔍';
    
    if (distance === 0) {
      return chalk.green.bold(`🎉 ${word.toUpperCase()} - CORRECT! 🎉`);
    }

    return [
      `${prefix} ${colorFn.bold(word.padEnd(15))}`,
      colorFn(bar),
      chalk.white.bold(`#${rank.toString().padStart(5)}`)
    ].join(' ');
  }

  public static renderGuessHistory(guesses: Guess[], currentUserId?: string): string {
    if (guesses.length === 0) {
      return chalk.gray('No guesses yet. Start guessing!');
    }

    // Sort guesses by distance (closest first)
    const sortedGuesses = [...guesses]
      .filter(g => !g.error)
      .sort((a, b) => a.distance - b.distance);

    const lines = [
      chalk.cyan.bold('📋 Guess History (closest first):'),
      ''
    ];

    sortedGuesses.forEach((guess, index) => {
      const isCurrentUser = guess.addedBy === currentUserId;
      lines.push(this.renderGuess(guess, isCurrentUser));
    });

    return lines.join('\n');
  }

  public static renderGameStatus(
    finished: boolean, 
    started: boolean, 
    isHost: boolean,
    guessCount: number,
    answerWord?: string
  ): string {
    const lines: string[] = [];

    if (finished && answerWord) {
      lines.push(
        '',
        chalk.green.bold('🎊 GAME FINISHED! 🎊'),
        chalk.yellow(`The answer was: ${chalk.bold(answerWord.toUpperCase())}`),
        chalk.gray(`Total guesses: ${guessCount}`),
        ''
      );
    } else if (!started && isHost) {
      lines.push(
        '',
        chalk.yellow('⏳ Game not started yet. Type "start" to begin!'),
        ''
      );
    } else if (!started) {
      lines.push(
        '',
        chalk.yellow('⏳ Waiting for host to start the game...'),
        ''
      );
    } else {
      lines.push(
        '',
        chalk.green('🎮 Game in progress!'),
        chalk.gray(`Guesses made: ${guessCount}`),
        ''
      );
    }

    return lines.join('\n');
  }

  public static renderRanking(ranking: Array<{
    playerId: string;
    guessCount: number;
    closestDistance?: number;
    completedAt?: Date;
  }>, playerMap: Map<string, { username?: string }>): string {
    if (ranking.length === 0) {
      return '';
    }

    const lines = [
      '',
      chalk.cyan.bold('🏆 Current Ranking:'),
      ''
    ];

    // Sort by completion status first, then by closest distance, then by guess count
    const sortedRanking = [...ranking].sort((a, b) => {
      // Completed players first
      if (a.completedAt && !b.completedAt) return -1;
      if (!a.completedAt && b.completedAt) return 1;
      
      // If both completed or both not completed, sort by closest distance
      if (a.closestDistance !== undefined && b.closestDistance !== undefined) {
        if (a.closestDistance !== b.closestDistance) {
          return a.closestDistance - b.closestDistance;
        }
      }
      
      // Finally by guess count
      return a.guessCount - b.guessCount;
    });

    sortedRanking.forEach((rank, index) => {
      const player = playerMap.get(rank.playerId);
      const playerName = player?.username || `Player ${rank.playerId.slice(0, 8)}`;
      const position = index + 1;
      const medal = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : '  ';
      
      let statusInfo = '';
      if (rank.completedAt) {
        statusInfo = chalk.green(' ✅ COMPLETED');
      } else if (rank.closestDistance !== undefined) {
        statusInfo = chalk.gray(` (closest: #${rank.closestDistance + 1})`);
      }

      lines.push(
        `${medal} ${position}. ${chalk.bold(playerName)} - ${rank.guessCount} guesses${statusInfo}`
      );
    });

    return lines.join('\n');
  }

  public static renderCommands(): string {
    return [
      '',
      chalk.dim('━'.repeat(60)),
      chalk.cyan.bold('Available commands:'),
      chalk.gray('• Type any word to make a guess'),
      chalk.gray('• "start" - Start the game (host only)'),
      chalk.gray('• "leave" - Leave the current room'),
      chalk.gray('• "rooms" - List active rooms'),
      chalk.gray('• "create [mode]" - Create new game (default, competitive, battle-royale, stop)'),
      chalk.gray('• "join [roomId]" - Join existing room'),
      chalk.gray('• "reconnect" - Try to reconnect to server'),
      chalk.gray('• "config" - Show current configuration'),
      chalk.gray('• "help" - Show this help'),
      chalk.gray('• "quit" or Ctrl+C - Exit'),
      chalk.dim('━'.repeat(60))
    ].join('\n');
  }

  public static renderError(error: string): string {
    return chalk.red(`❌ Error: ${error}`);
  }

  public static renderSuccess(message: string): string {
    return chalk.green(`✅ ${message}`);
  }

  public static renderInfo(message: string): string {
    return chalk.blue(`ℹ️  ${message}`);
  }

  public static clearScreen(): void {
    console.clear();
  }

  public static renderConnectionStatus(connected: boolean, apiUrl: string): string {
    const status = connected ? 
      chalk.green('🟢 Connected') : 
      chalk.red('🔴 Disconnected');
    
    return [
      chalk.gray(`Server: ${apiUrl}`),
      `Status: ${status}`,
      ''
    ].join('\n');
  }
}
