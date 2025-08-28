# Contexto

A multiplayer word guessing game inspired by Contexto, available as both a Discord bot and web application.

## Monorepo Structure

This project is organized as a monorepo with the following packages:

- **`@contexto/core`** - Shared core functionality (models, database, game logic)
- **`@contexto/server`** - HTTP and WebSocket server
- **`@contexto/web`** - React web frontend
- **`@contexto/bot`** - Discord bot

## Quick Start

```bash
# Install dependencies for all packages
npm install

# Setup database (run once)
npm run setup

# Development - run all services
npm run dev

# Or run individual services
npm run dev:server   # Server only
npm run dev:web      # Web frontend only
npm run dev:bot      # Discord bot only
```

## Production

```bash
# Build all packages
npm run build

# Start services
npm run start:server
npm run start:web
npm run start:bot
```

## Commands

```bash
npm run typeorm -- migration:run # setup database
npm run dev # start bot on dev mode, with fast refresh
npm run setup # setup slash commands
```