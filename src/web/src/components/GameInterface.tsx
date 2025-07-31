import { useState, useRef, useEffect } from 'react'
import Row from './original_Row'
import { PlayerAvatar } from './PlayerAvatar';
import { strings } from '../constants/strings'
import { Player } from '@/api/gameApi'

interface Guess {
  word: string
  distance: number
  addedBy?: string
  error?: string
  hidden?: boolean // For multiplayer, to hide guesses until revealed
}

interface GameInterfaceProps {
  gameId?: number
  roomId?: string
  gameMode?: 'default' | 'competitive' | 'battle-royale' | 'stop' | null
  guesses: Guess[]
  onGuess: (word: string) => void
  gameFinished: boolean
  gameStarted: boolean
  isHost?: boolean
  onStartGame?: () => void
  loading: boolean
  user: Player
  players?: string[]
}

function GameInterface({ 
  gameId, 
  roomId,
  gameMode,
  guesses, 
  onGuess, 
  gameFinished,
  gameStarted,
  isHost,
  onStartGame,
  loading,
  user,
  players = []
}: GameInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const [showCopiedFeedback, setShowCopiedFeedback] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const getGameModeDisplayName = (mode: string | null) => {
    const modeNames = {
      'default': '🤝 Clássico',
      'competitive': '🎯 Competitivo', 
      'battle-royale': '⚔️ Battle Royale',
      'stop': '⚡ Stop'
    }
    return mode ? modeNames[mode as keyof typeof modeNames] || mode : null
  }

  const handleRoomIdClick = async () => {
    if (!roomId) return
    
    try {
      const url = `${window.location.origin}${window.location.pathname}?room=${roomId}`
      await navigator.clipboard.writeText(url)
      
      setShowCopiedFeedback(true)
      setTimeout(() => setShowCopiedFeedback(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea')
      textArea.value = `${window.location.origin}${window.location.pathname}?room=${roomId}`
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      
      setShowCopiedFeedback(true)
      setTimeout(() => setShowCopiedFeedback(false), 2000)
    }
  }

  // Sort guesses by distance (closest first)
  const sortedGuesses = [...guesses]
    .filter(guess => !guess.error)
    .sort((a, b) => a.distance - b.distance)
  
  const playerGuesses = guesses.filter(guess => guess.addedBy === user.id)

  const errorGuesses = guesses.filter(guess => guess.error)

  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [loading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputValue.trim() || loading || gameFinished || !gameStarted) return

    const word = inputValue.trim().toLowerCase()
    
    // Basic validation
    if (word.length < 2) {
      return // Too short
    }

    onGuess(word)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  const isWinner = playerGuesses.some(guess => guess.distance === 0)
  
  // Get last guess for highlighting
  // const lastGuessData = guesses.length > 0 ? guesses[guesses.length - 1] : null
  // find last guess for the current player
  const lastGuessData = playerGuesses.length > 0 ? [...playerGuesses].pop() : null

  // Show message based on game state
  let message = null
  
  if (loading) {
    message = (
      <div className="message">
        <div className="message-text">
          <div className="loading-text">
            <span style={{'--i': 1} as React.CSSProperties}>C</span>
            <span style={{'--i': 2} as React.CSSProperties}>a</span>
            <span style={{'--i': 3} as React.CSSProperties}>l</span>
            <span style={{'--i': 4} as React.CSSProperties}>c</span>
            <span style={{'--i': 5} as React.CSSProperties}>u</span>
            <span style={{'--i': 6} as React.CSSProperties}>l</span>
            <span style={{'--i': 7} as React.CSSProperties}>a</span>
            <span style={{'--i': 8} as React.CSSProperties}>n</span>
            <span style={{'--i': 9} as React.CSSProperties}>d</span>
            <span style={{'--i': 10} as React.CSSProperties}>o</span>
            <span style={{'--i': 11} as React.CSSProperties}>.</span>
            <span style={{'--i': 12} as React.CSSProperties}>.</span>
            <span style={{'--i': 13} as React.CSSProperties}>.</span>
          </div>
        </div>
      </div>
    )
  } else if (lastGuessData?.error) {
    message = (
      <div className="message">
        <div className="message-text">{lastGuessData.error}</div>
      </div>
    )
  } else if (lastGuessData && !lastGuessData.error) {
    message = (
      <div className="message">
        <div>
          <Row 
            // guess={lastGuessData}
            // highlight={true}
            word={lastGuessData.word}
            distance={lastGuessData.distance}
            highlight={true}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="wrapper top-ad-padding">
      <main>
        <div className="top-bar">
          <div className="title">
            <h1>CONTEXTO</h1>
            {gameMode && (
              <div className="game-mode" style={{
                fontSize: '0.9em',
                color: '#666',
                marginTop: '4px',
                fontWeight: 'normal'
              }}>
                Modo: {getGameModeDisplayName(gameMode)}
              </div>
            )}
          </div>
          <button className="btn">⋮</button>
        </div>
        
        {!gameStarted && (gameMode === 'stop' || gameMode === 'battle-royale') && (
          <div className="start-game-section" style={{
            textAlign: 'center',
            padding: '2rem',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            margin: '1rem 0',
            border: '2px dashed #28a745'
          }}>
            <h3 style={{ color: '#495057', marginBottom: '1rem' }}>
              🎮 Jogo Aguardando Início
            </h3>
            <p style={{ color: '#6c757d', marginBottom: '1.5rem' }}>
              {gameMode === 'stop' 
                ? 'Este é um jogo Stop - todos os jogadores devem começar ao mesmo tempo!'
                : 'Este é um jogo Battle Royale - todos os jogadores devem começar ao mesmo tempo!'
              }
            </p>
            {isHost ? (
              <button
                onClick={onStartGame}
                disabled={loading}
                style={{
                  backgroundColor: '#28a745',
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '6px',
                  fontSize: '1rem',
                  fontWeight: 'bold',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                {loading ? 'Iniciando...' : '🚀 Iniciar Jogo'}
              </button>
            ) : (
              <p style={{ color: '#6c757d', fontStyle: 'italic' }}>
                Aguardando o host iniciar o jogo...
              </p>
            )}
          </div>
        )}
        
        {isWinner && (
          <div className="end-msg">
            <p>🎉 {strings.game.congratulations}! {strings.game.youWon}</p>
          </div>
        )}

        <div className="info-bar">
          {roomId && (
            <>
              <span className="label">SALA:</span>{' '}
              <span 
                onClick={handleRoomIdClick}
                style={{ 
                  fontWeight: 'bold', 
                  fontSize: '1.1em', 
                  color: '#28a745',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textDecorationStyle: 'dashed',
                  position: 'relative'
                }}
                title="Clique para copiar o link da sala"
              >
                {roomId}
                {showCopiedFeedback && (
                  <span style={{
                    position: 'absolute',
                    top: '-25px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#28a745',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                    zIndex: 1000
                  }}>
                    Link copiado!
                  </span>
                )}
              </span>
              &nbsp;&nbsp;&nbsp;
            </>
          )}
          {gameId && (
            <>
              <span className="label">JOGO:</span>{' '}
              <span>#{gameId}</span>
              &nbsp;&nbsp;
            </>
          )}
          <span className="label">TENTATIVAS:</span>{' '}
          <span>{sortedGuesses.length}</span>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            className="word"
            type="text"
            name="word"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={strings.game.enterWord}
            disabled={loading || gameFinished || !gameStarted}
            autoComplete="off"
            autoCapitalize="off"
            enterKeyHint="send"
          />
        </form>

        {message}

        {players.length > 1 && (
          <div className="player-list" style={{ paddingBlock: '1rem' }}>
            <ul style={{ display: 'flex', gap: '0.5rem', listStyle: 'none', padding: 0 }}>
              {players.map(playerId => (
                <PlayerAvatar key={playerId} id={playerId} size={36} />
              ))}
            </ul>
          </div>
        )}

        <div className="guess-history">
          {/* Show valid guesses sorted by distance */}
          {sortedGuesses.map((guess, index) => (
            // <Row 
            //   key={`${guess.word}-${index}`}
            //   guess={guess}
            //   highlight={false}
            // />
            <Row 
              key={`${guess.word}-${index}`}
              word={guess.word}
              distance={guess.distance}
              highlight={lastGuessData?.word === guess.word}
              hidden={guess.hidden}
              addedBy={guess.addedBy}
              playerId={user.id} // Pass current user's ID for multiplayer context
            />
          ))}
          
          {/* Show error guesses at the bottom */}
          {/* {errorGuesses.map((guess, index) => (
            <Row 
              key={`error-${guess.word}-${index}`}
              guess={guess}
              highlight={false}
            />
          ))} */}
        </div>
      </main>
    </div>
  )
}

export default GameInterface
