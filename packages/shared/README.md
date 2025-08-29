# @contexto/shared

Shared utilities, types, and constants for the Contexto project monorepo.

## Purpose

This package contains code that can be safely shared across all other packages in the monorepo:
- **Browser compatible** - no Node.js specific dependencies
- **Pure utilities** - stateless functions and constants
- **Common types** - TypeScript interfaces and type definitions
- **Zero external dependencies** - only development dependencies for building

## What's Included

### Types (`src/types.ts`)
- `GameMode`, `Player`, `Guess`, `GameRoom`
- API request/response interfaces
- Socket event type definitions

### Utilities (`src/utils.ts`)
- Date and time functions (`getTodaysGameId`, `formatDuration`)
- Game logic helpers (`getBarWidth`, `getBarColor`, `isValidWord`)
- General utilities (`cleanInput`, `debounce`, `calculateWinRate`)
- Simple event emitter for client-side events

### Constants (`src/constants.ts`)
- Game configuration (`GAME_CONFIG`)
- Error and success messages
- HTTP status codes
- Socket event names
- Validation patterns

## Usage

```typescript
// Import types
import type { Player, GameMode, Guess } from '@contexto/shared'

// Import utilities
import { getTodaysGameId, getBarColor, isValidWord } from '@contexto/shared'

// Import constants
import { GAME_CONFIG, ERROR_MESSAGES, SOCKET_EVENTS } from '@contexto/shared'
```

## Package Dependencies

This package has **zero runtime dependencies** to ensure it can be safely used in any environment:

- ✅ Browser (web package)
- ✅ Node.js (server, bot packages)  
- ✅ Different module systems (CommonJS, ES modules)

## Building

```bash
npm run build:shared
```

Outputs ES modules to `dist/` directory with TypeScript declaration files.

## Guidelines for Adding Code

When adding to this package, ensure:

1. **No external dependencies** - keep it dependency-free
2. **Environment agnostic** - works in browser and Node.js
3. **Stateless** - pure functions and constants only
4. **Well typed** - comprehensive TypeScript definitions
5. **Documented** - clear JSDoc comments for functions

## Architecture Benefits

- **Clean separation** - no cross-package imports between siblings
- **Single source of truth** - shared types prevent drift
- **Dependency isolation** - web package never imports Node.js code
- **Better builds** - clear dependency tree
- **Easier testing** - shared logic can be tested once
