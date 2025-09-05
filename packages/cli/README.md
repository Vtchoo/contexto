# Contexto CLI

A command-line interface for playing the Contexto game. This CLI connects to the same server as the web interface and provides a terminal-based gaming experience.

## Features

- Play all game modes: Default, Competitive, Battle Royale, and Stop
- Real-time multiplayer support
- Cookie-based session management
- Clean terminal interface with colored output
- Progress tracking and statistics

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
npm run dev
# or after building:
npm start
```

## Game Modes

- **Default (🤝)**: Collaborative mode where all players work together
- **Competitive (🎯)**: Players compete to find the answer with fewest guesses  
- **Battle Royale (⚔️)**: First player to find the answer wins
- **Stop (⚡)**: All players start simultaneously, fastest wins

## Commands

During gameplay:
- Type any word to make a guess
- Type `quit` or `exit` to leave the game
- Type `help` for available commands
- Type `stats` to see your statistics

## Architecture

The CLI shares the same backend API and WebSocket connection as the web interface, ensuring full compatibility and real-time synchronization with web players.
