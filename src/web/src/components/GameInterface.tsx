import { useState, useRef, useEffect } from 'react'
import styled from 'styled-components'
import Row from './Row'
import { strings } from '../constants/strings'

interface Guess {
  word: string
  distance: number
  addedBy?: string
  error?: string
}

interface GameInterfaceProps {
  gameId?: number
  roomId?: string
  guesses: Guess[]
  onGuess: (word: string) => void
  gameFinished: boolean
  loading: boolean
}

const Container = styled.div`
  max-width: 600px;
  margin: 0 auto;
  padding: 2rem;
`

const GameHeader = styled.div`
  text-align: center;
  margin-bottom: 2rem;
`

const GameTitle = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 0.5rem;
  letter-spacing: -0.02em;
`

const GameInfo = styled.div`
  display: flex;
  justify-content: center;
  gap: 2rem;
  margin-bottom: 1rem;
  color: var(--secondary-text);
  font-size: 0.9rem;
`

const InputSection = styled.div`
  margin-bottom: 2rem;
`

const InputContainer = styled.div`
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
`

const WordInput = styled.input`
  flex: 1;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text-color);
  font-size: 1rem;
  transition: all 0.2s ease;

  &:focus {
    border-color: var(--button-bg);
    background: var(--bg-color);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &::placeholder {
    color: var(--secondary-text);
  }
`

const SubmitButton = styled.button`
  background: var(--button-bg);
  color: var(--button-text);
  padding: 1rem 2rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px var(--shadow);

  &:hover:not(:disabled) {
    background: var(--button-hover);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px var(--shadow);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 2px 4px var(--shadow);
  }
`

const GuessesSection = styled.div`
  margin-top: 2rem;
`

const GuessesHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
`

const GuessesTitle = styled.h3`
  color: var(--text-color);
  font-size: 1.2rem;
  font-weight: 600;
`

const GuessCount = styled.span`
  color: var(--secondary-text);
  font-size: 0.9rem;
`

const GuessesList = styled.div`
  max-height: 400px;
  overflow-y: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  background: var(--card-bg);
`

const EmptyState = styled.div`
  text-align: center;
  color: var(--secondary-text);
  padding: 2rem;
  font-style: italic;
`

const WinMessage = styled.div`
  background: var(--green);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 1rem;
  font-weight: 600;
  animation: fadeIn 0.5s ease-out;
`

const ErrorMessage = styled.div`
  background: var(--red);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
  margin-bottom: 1rem;
  font-weight: 500;
  animation: fadeIn 0.5s ease-out;
`

const LoadingSpinner = styled.div`
  display: inline-block;
  width: 20px;
  height: 20px;
  border: 2px solid var(--border-color);
  border-radius: 50%;
  border-top-color: var(--button-bg);
  animation: spin 1s ease-in-out infinite;

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`

function GameInterface({ 
  gameId, 
  roomId, 
  guesses, 
  onGuess, 
  gameFinished, 
  loading 
}: GameInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const [lastGuess, setLastGuess] = useState<string | null>(null)
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

    setLastGuess(word)
    onGuess(word)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  const isWinner = sortedGuesses.some(guess => guess.distance === 0)

  return (
    <Container>
      <GameHeader>
        <GameTitle>CONTEXTO</GameTitle>
        <GameInfo>
          {gameId && <span>JOGO: #{gameId}</span>}
          {roomId && <span>SALA: {roomId}</span>}
          <span>TENTATIVAS: {guesses.length}</span>
        </GameInfo>
      </GameHeader>

      {isWinner && (
        <WinMessage>
          🎉 {strings.game.congratulations}! {strings.game.youWon}
        </WinMessage>
      )}

      <InputSection>
        <form onSubmit={handleSubmit}>
          <InputContainer>
            <WordInput
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={strings.game.enterWord}
              disabled={loading || gameFinished}
              autoComplete="off"
              spellCheck={false}
            />
            <SubmitButton 
              type="submit" 
              disabled={!inputValue.trim() || loading || gameFinished}
            >
              {loading ? <LoadingSpinner /> : strings.submit}
            </SubmitButton>
          </InputContainer>
        </form>
      </InputSection>

      <GuessesSection>
        <GuessesHeader>
          <GuessesTitle>Suas tentativas</GuessesTitle>
          <GuessCount>{guesses.length} tentativa{guesses.length !== 1 ? 's' : ''}</GuessCount>
        </GuessesHeader>

        <GuessesList>
          {guesses.length === 0 ? (
            <EmptyState>
              Faça sua primeira tentativa para começar!
            </EmptyState>
          ) : (
            <>
              {/* Show valid guesses sorted by distance */}
              {sortedGuesses.map((guess, index) => (
                <Row 
                  key={`${guess.word}-${index}`}
                  guess={guess}
                  highlight={guess.word === lastGuess}
                />
              ))}
              
              {/* Show error guesses at the bottom */}
              {errorGuesses.map((guess, index) => (
                <Row 
                  key={`error-${guess.word}-${index}`}
                  guess={guess}
                  highlight={guess.word === lastGuess}
                />
              ))}
            </>
          )}
        </GuessesList>
      </GuessesSection>
    </Container>
  )
}

export default GameInterface
