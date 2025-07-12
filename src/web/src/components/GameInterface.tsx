import { useState, useRef, useEffect } from 'react'
import Row from './original_Row'
import { strings } from '../constants/strings'

interface Guess {
  word: string
  distance: number
  addedBy?: string
  error?: string
}

interface GameInterfaceProps {
  gameId?: number
  guesses: Guess[]
  onGuess: (word: string) => void
  gameFinished: boolean
  loading: boolean
}

function GameInterface({ 
  gameId, 
  guesses, 
  onGuess, 
  gameFinished, 
  loading 
}: GameInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Sort guesses by distance (closest first)
  const sortedGuesses = [...guesses]
    .filter(guess => !guess.error)
    .sort((a, b) => a.distance - b.distance)

  const errorGuesses = guesses.filter(guess => guess.error)

  useEffect(() => {
    if (!loading && inputRef.current) {
      inputRef.current.focus()
    }
  }, [loading])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!inputValue.trim() || loading || gameFinished) return

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

  const isWinner = sortedGuesses.some(guess => guess.distance === 0)
  
  // Get last guess for highlighting
  const lastGuessData = guesses.length > 0 ? guesses[guesses.length - 1] : null

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
          </div>
          <button className="btn">⋮</button>
        </div>
        
        {isWinner && (
          <div className="end-msg">
            <p>🎉 {strings.game.congratulations}! {strings.game.youWon}</p>
          </div>
        )}

        <div className="info-bar">
          {gameId && (
            <>
              <span className="label">JOGO:</span>{' '}
              <span>#{gameId}</span>
              &nbsp;&nbsp;
            </>
          )}
          <span className="label">TENTATIVAS:</span>{' '}
          <span>{guesses.length}</span>
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
            disabled={loading || gameFinished}
            autoComplete="off"
            autoCapitalize="off"
            enterKeyHint="send"
          />
        </form>

        {message}

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
