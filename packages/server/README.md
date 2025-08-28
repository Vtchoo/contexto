# @contexto/server

HTTP and WebSocket server for the Contexto game.

## Features

- REST API endpoints
- WebSocket real-time communication
- Room management
- Game state synchronization
- Player authentication

## Usage

```bash
npm run dev    # Development mode
npm start      # Production mode
```

## API Endpoints

- `GET /api/rooms` - List rooms
- `POST /api/rooms` - Create room
- `GET /api/game/:id` - Get game state
- WebSocket events for real-time gameplay
