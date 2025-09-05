#!/usr/bin/env node

/**
 * Test script for the Contexto CLI
 * This demonstrates how to use the CLI without requiring a running server
 */

import chalk from 'chalk'
import GameRenderer from './renderer'

console.log(chalk.blue('🧪 Testing Contexto CLI Components'))
console.log('')

// Test the welcome screen
GameRenderer.renderWelcome()

// Test game mode descriptions
console.log(chalk.yellow('📋 Game Mode Descriptions:'))
const modes = ['default', 'competitive', 'battle-royale', 'stop']
modes.forEach(mode => {
  console.log(`  ${GameRenderer.renderGameModeDescription(mode)}`)
})
console.log('')

// Test mock game state
const mockUser = { id: 'user123', username: 'TestUser' }
const mockGame = {
  roomId: 'ABC123',
  gameId: '12345',
  gameMode: 'default' as const,
  guesses: [
    { word: 'cat', distance: 50, addedBy: 'user123', error: undefined },
    { word: 'dog', distance: 30, addedBy: 'user456', error: undefined },
    { word: 'animal', distance: 10, addedBy: 'user123', error: undefined },
    { word: 'pet', distance: 5, addedBy: 'user789', error: undefined }
  ],
  finished: false,
  started: true,
  isHost: true,
  players: ['user123', 'user456', 'user789']
}

console.log(chalk.yellow('🎮 Mock Game State:'))
GameRenderer.renderGameStatus(mockGame, mockUser)
GameRenderer.renderGuessList(mockGame.guesses, mockUser.id)

// Test commands help
GameRenderer.renderCommands()

console.log(chalk.green('✅ CLI components working correctly!'))
console.log('')
console.log(chalk.blue('🚀 To run the actual CLI:'))
console.log(chalk.white('  npm run dev:cli'))
console.log(chalk.white('  or'))
console.log(chalk.white('  node dist/index.js'))
console.log('')
console.log(chalk.gray('Note: Make sure the server is running on http://localhost:3001'))
