# Contexto Web App

A modern React implementation of the Contexto word guessing game with real-time multiplayer capabilities.

## Features

🎯 **Multiple Game Modes**
- **Classic**: Traditional single-player Contexto experience
- **Competitive**: Real-time multiplayer racing
- **Battle Royale**: Unique word constraints across all players

🎨 **Beautiful UI**
- Responsive design with mobile support
- Dark/Light theme support
- Smooth animations and transitions
- Styled with styled-components

⚡ **Real-time Features**
- WebSocket integration for live multiplayer
- Instant guess feedback
- Live player updates
- Real-time leaderboards

🔒 **User Management**
- Automatic user identification via cookies
- Optional username setting
- Persistent game statistics
- Anonymous play support

## Technology Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool and dev server
- **Styled Components** - CSS-in-JS styling
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time communication
- **Axios** - HTTP client for API calls

## Development

### Prerequisites
- Node.js 18+
- The Contexto server running on port 3001

### Getting Started

```bash
# Install dependencies (from project root)
npm install

# Start the web app
npm run web

# Build for production
npm run web:build

# Preview production build
npm run web:preview
```

The app will be available at `http://localhost:3000`

### Project Structure

```
src/web/
├── public/                 # Static assets
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── GameInterface.tsx
│   │   ├── Row.tsx
│   │   ├── Header.tsx
│   │   └── Footer.tsx
│   ├── contexts/          # React contexts
│   │   ├── GameContext.tsx
│   │   └── ThemeContext.tsx
│   ├── pages/             # Page components
│   │   ├── HomePage.tsx
│   │   ├── GamePage.tsx
│   │   └── RoomsPage.tsx
│   ├── styles/            # Global styles
│   │   └── GlobalStyles.ts
│   ├── hooks/             # Custom React hooks
│   ├── utils/             # Utility functions
│   ├── api/               # API integration
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── index.html
├── vite.config.ts
└── tsconfig.json
```

## Features Overview

### Game Interface
- **Word Input**: Clean, accessible input with auto-focus
- **Progress Visualization**: Color-coded proximity bars (green/yellow/red)
- **Guess History**: Sorted list showing closest words first
- **Real-time Feedback**: Instant response to guesses
- **Error Handling**: User-friendly error messages

### Responsive Design
- **Desktop**: Full-featured interface with optimal spacing
- **Tablet**: Adapted layout for medium screens
- **Mobile**: Touch-friendly design with optimized interactions

### Theme Support
- **Auto-detection**: Respects system preference
- **Manual Toggle**: Easy theme switching
- **Persistent**: Remembers user preference
- **CSS Variables**: Consistent theming throughout

### Multiplayer Features
- **Room Management**: Create and join game rooms
- **Live Updates**: See other players' progress in real-time
- **Spoiler Protection**: Automatic spoiler tags for multiplayer guesses
- **Winner Announcements**: Celebrate victories together

## API Integration

The web app integrates seamlessly with the Contexto server:

```typescript
// Game creation
POST /api/game/create
{
  "type": "competitive",
  "gameId": 1027
}

// Making guesses
POST /api/game/guess/ROOM_ID
{
  "word": "computer"
}

// WebSocket events
socket.emit('join_room', { roomId: 'ABC123' })
socket.emit('make_guess', { word: 'computer' })
socket.on('guess_result', handleGuessResult)
```

## Styling Guide

### CSS Variables
The app uses CSS custom properties for consistent theming:

```css
:root {
  --bg-color: #ffffff;
  --text-color: #1a1a1a;
  --button-bg: #007bff;
  --green: #28a745;
  --yellow: #ffc107;
  --red: #dc3545;
}
```

### Component Styling
Styled-components with TypeScript for type-safe styling:

```typescript
const Button = styled.button<{ variant: 'primary' | 'secondary' }>`
  background: ${props => 
    props.variant === 'primary' 
      ? 'var(--button-bg)' 
      : 'var(--card-bg)'
  };
`
```

## Performance

- **Code Splitting**: Automatic route-based splitting
- **Tree Shaking**: Dead code elimination
- **Hot Reload**: Instant development feedback
- **Optimized Builds**: Minified production bundles
- **Lazy Loading**: Components loaded on demand

## Browser Support

- **Modern Browsers**: Chrome 88+, Firefox 85+, Safari 14+
- **Mobile**: iOS Safari, Chrome Mobile
- **Features**: ES2020, CSS Grid, Flexbox, CSS Variables

## Deployment

### Production Build
```bash
npm run web:build
```

Generates optimized static files in `src/web/dist/`

### Environment Variables
Create `.env` in the web directory:

```env
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001
```

## Contributing

1. Follow React best practices
2. Use TypeScript for type safety
3. Write responsive, accessible components
4. Test on multiple devices and browsers
5. Follow the existing code style

## License

Part of the Contexto Bot project.
