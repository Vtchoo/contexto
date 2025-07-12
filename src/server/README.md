# Contexto Web Server

A web server implementation of the Contexto word guessing game with real-time multiplayer capabilities.

## Features

- **Multiple Game Modes**: Default, Competitive, and Battle Royale
- **Real-time Multiplayer**: WebSocket support for live gaming
- **User Management**: Cookie-based authentication with Snowflake IDs
- **REST API**: Complete game management endpoints
- **Statistics**: Player stats, leaderboards, and game analytics

## Getting Started

### Installation

```bash
npm install
```

### Running the Server

```bash
# Development mode
npm run dev:server

# Production mode
npm run server
```

The server will be available at `http://localhost:3001`

## API Endpoints

### Health Check
- `GET /health` - Server status and stats

### Game Management
- `POST /api/game/create` - Create a new game
- `POST /api/game/join/:roomId` - Join an existing game
- `POST /api/game/guess/:roomId` - Make a guess
- `GET /api/game/closest/:roomId` - Get closest guesses
- `POST /api/game/leave/:roomId` - Leave a game
- `GET /api/game/stats` - Game statistics

### Room Management
- `GET /api/rooms` - List active rooms
- `GET /api/rooms/:roomId` - Get room information
- `GET /api/rooms/user/me` - Get user's rooms

### User Management
- `GET /api/users/me` - Get current user info
- `POST /api/users/username` - Set username
- `POST /api/users/username/anonymous` - Generate anonymous username
- `GET /api/users/stats` - Get user statistics
- `GET /api/users/username/check/:username` - Check username availability
- `GET /api/users/leaderboard` - Get leaderboard

## WebSocket Events

### Client → Server
- `join_room` - Join a game room
- `leave_room` - Leave current room
- `make_guess` - Make a word guess
- `start_game` - Start a game (host only)
- `get_closest` - Get closest guesses

### Server → Client
- `room_joined` - Successfully joined room
- `room_left` - Left room
- `player_joined` - Another player joined
- `player_left` - Player left room
- `guess_result` - Result of your guess
- `player_guess` - Another player's guess (spoilered)
- `game_finished` - Game completed
- `game_started` - Game started by host
- `closest_guesses` - List of closest guesses
- `error` - Error message

## Game Types

### Default Game
- Classic single-player Contexto experience
- Personal guess tracking
- Tips and give-up allowed

### Competitive Game
- Multiplayer racing to find the word
- Leaderboard with completion times
- Real-time progress updates

### Battle Royale Game
- Unique word constraint - each word can only be used once
- Players compete for the best strategy
- Global word pool management

## Authentication

Users are automatically assigned a Snowflake ID via cookies on first visit. The ID is a short, user-friendly string (e.g., "3RFJ22A").

Users can optionally set a username for a better experience.

## Example Usage

### Creating a Game
```bash
curl -X POST http://localhost:3001/api/game/create \\
  -H "Content-Type: application/json" \\
  -d '{"type": "competitive"}'
```

### Making a Guess
```bash
curl -X POST http://localhost:3001/api/game/guess/3RFJ22A \\
  -H "Content-Type: application/json" \\
  -d '{"word": "hello"}'
```

### WebSocket Connection
```javascript
import io from 'socket.io-client'

// Connect with credentials (cookies) for automatic authentication
const socket = io('http://localhost:3001', {
  withCredentials: true
})

// Join a room
socket.emit('join_room', { roomId: '3RFJ22A' })

// Make a guess
socket.emit('make_guess', { word: 'hello' })

// Listen for results
socket.on('guess_result', (data) => {
  console.log('Your guess:', data.guess)
})
```

## Integration with Discord Bot

This web server uses the same game classes and logic as the Discord bot, ensuring consistency across platforms. The Snowflake ID system provides user-friendly room IDs that work well in both web and Discord environments.

## Environment Variables

- `PORT` - Server port (default: 3001)
- `CLIENT_URL` - Allowed client origin for CORS (default: http://localhost:3000)
- `NODE_ENV` - Environment mode (development/production)

## Development

The server integrates seamlessly with the existing Discord bot codebase:
- Shares game logic from `src/game/`
- Uses the same Snowflake ID generator from `src/utils/snowflake.ts`
- Maintains consistent game state management
