import { useState } from 'react'
import styled from 'styled-components'
import GameInterface from '../components/GameInterface'
import { useGame } from '../contexts/GameContext'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
`

const Title = styled.h1`
  color: var(--text-color);
  margin-bottom: 0.5rem;
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  text-align: center;
`

const Subtitle = styled.p`
  color: var(--secondary-text);
  font-size: 1.1rem;
  margin-bottom: 3rem;
  text-align: center;
  line-height: 1.6;
`

const QuickStartSection = styled.div`
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px var(--shadow);
`

const SectionTitle = styled.h2`
  color: var(--text-color);
  margin-bottom: 1rem;
  font-size: 1.3rem;
  font-weight: 600;
`

const QuickPlayInput = styled.input`
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--input-bg);
  color: var(--text-color);
  margin-bottom: 0.5rem;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: var(--button-bg);
    outline: none;
  }

  &::placeholder {
    color: var(--secondary-text);
  }
`

const QuickPlayNote = styled.p`
  color: var(--secondary-text);
  font-size: 0.9rem;
  margin-bottom: 1rem;
  line-height: 1.4;
`

const CreateRoomSection = styled.div`
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px var(--shadow);
`

const GameModeSelector = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1.5rem;
`

const ModeButton = styled.button<{ active: boolean }>`
  background: ${props => props.active ? 'var(--button-bg)' : 'var(--input-bg)'};
  color: ${props => props.active ? 'var(--button-text)' : 'var(--text-color)'};
  border: 2px solid ${props => props.active ? 'var(--button-bg)' : 'var(--border-color)'};
  padding: 0.75rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;
  text-align: center;

  &:hover {
    border-color: var(--button-bg);
    transform: translateY(-1px);
  }
`

const CreateRoomButton = styled.button`
  width: 100%;
  background: var(--green);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(40, 167, 69, 0.3);

  &:hover:not(:disabled) {
    background: #218838;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(40, 167, 69, 0.4);
  }

  &:disabled {
    background: var(--secondary-text);
    cursor: not-allowed;
    transform: none;
  }
`

const JoinRoomSection = styled.div`
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px var(--shadow);
`

const JoinRoomInput = styled.input`
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--input-bg);
  color: var(--text-color);
  margin-bottom: 1rem;
  transition: border-color 0.2s ease;
  text-transform: uppercase;
  letter-spacing: 0.1em;

  &:focus {
    border-color: var(--button-bg);
    outline: none;
  }

  &::placeholder {
    color: var(--secondary-text);
    text-transform: none;
    letter-spacing: normal;
  }
`

const JoinRoomButton = styled.button`
  width: 100%;
  background: var(--button-bg);
  color: var(--button-text);
  padding: 1rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: var(--button-hover);
    transform: translateY(-1px);
  }

  &:disabled {
    background: var(--secondary-text);
    cursor: not-allowed;
    transform: none;
  }
`

const DemoGame = styled.div`
  width: 100%;
  max-width: 600px;
`

type GameMode = 'default' | 'competitive' | 'battle-royale' | 'stop'

function HomePage() {
  const [selectedMode, setSelectedMode] = useState<GameMode>('default')
  const [showDemo, setShowDemo] = useState(false)
  const [quickPlayWord, setQuickPlayWord] = useState('')
  const [roomIdInput, setRoomIdInput] = useState('')
  const { createGame, joinRoom, guesses, loading, gameFinished, makeGuess, isConnected, currentRoom, currentGameId } = useGame()

  const handleQuickPlay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickPlayWord.trim()) return

    try {
      // Create a new cooperative game and make the first guess
      await createGame('default') // Using cooperative mode for quick play
      setShowDemo(true)
      // Make the first guess
      if (quickPlayWord.trim()) {
        makeGuess(quickPlayWord.trim())
      }
    } catch (error) {
      console.error('Failed to start quick play:', error)
    }
  }

  const handleCreateRoom = async () => {
    try {
      await createGame(selectedMode)
      setShowDemo(true)
    } catch (error) {
      console.error('Failed to create room:', error)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomIdInput.trim()) return

    try {
      await joinRoom(roomIdInput.trim().toUpperCase())
      setShowDemo(true)
    } catch (error) {
      console.error('Failed to join room:', error)
    }
  }

  const gameModes = [
    { key: 'default' as GameMode, name: 'Clássico', description: 'Jogo tradicional ou cooperativo' },
    { key: 'competitive' as GameMode, name: 'Competitivo', description: 'Joguem juntos' },
    { key: 'stop' as GameMode, name: 'Stop', description: 'Primeiro a acertar ganha' },
    { key: 'battle-royale' as GameMode, name: 'Battle Royale', description: '"Alguém já usou essa palavra"' }
  ]

  if (showDemo) {
    return (
      <Container>
        <DemoGame>
          <GameInterface
            gameId={currentGameId ? parseInt(currentGameId) : undefined}
            roomId={currentRoom || undefined}
            guesses={guesses}
            onGuess={makeGuess}
            gameFinished={gameFinished}
            loading={loading}
          />
        </DemoGame>
      </Container>
    )
  }

  return (
    <Container>
      <Title>CONTEXTO</Title>
      <Subtitle>
        Encontre a palavra secreta usando pistas de contexto semântico. Quanto menor o número, mais próximo você está!
      </Subtitle>

      <QuickStartSection>
        <SectionTitle>🚀 Jogo Rápido</SectionTitle>
        <QuickPlayNote>
          Digite uma palavra para começar imediatamente um jogo cooperativo
        </QuickPlayNote>
        <form onSubmit={handleQuickPlay}>
          <QuickPlayInput
            type="text"
            placeholder="Digite uma palavra para começar..."
            value={quickPlayWord}
            onChange={(e) => setQuickPlayWord(e.target.value)}
            disabled={!isConnected || loading}
          />
        </form>
      </QuickStartSection>

      <CreateRoomSection>
        <SectionTitle>🎮 Criar Nova Sala</SectionTitle>
        <GameModeSelector>
          {gameModes.map(mode => (
            <ModeButton
              key={mode.key}
              active={selectedMode === mode.key}
              onClick={() => setSelectedMode(mode.key)}
            >
              <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                {mode.name}
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.8, marginTop: '0.25rem' }}>
                {mode.description}
              </div>
            </ModeButton>
          ))}
        </GameModeSelector>
        <CreateRoomButton onClick={handleCreateRoom} disabled={!isConnected || loading}>
          {loading ? 'Criando sala...' : 'Criar Sala'}
        </CreateRoomButton>
      </CreateRoomSection>

      <JoinRoomSection>
        <SectionTitle>🔗 Entrar em Sala</SectionTitle>
        <form onSubmit={handleJoinRoom}>
          <JoinRoomInput
            type="text"
            placeholder="Digite o ID da sala (ex: AB12CD)"
            value={roomIdInput}
            onChange={(e) => setRoomIdInput(e.target.value)}
            disabled={!isConnected || loading}
            maxLength={6}
          />
          <JoinRoomButton type="submit" disabled={!isConnected || loading || !roomIdInput.trim()}>
            {loading ? 'Entrando...' : 'Entrar'}
          </JoinRoomButton>
        </form>
      </JoinRoomSection>
      
      {!isConnected && (
        <div style={{ 
          color: 'var(--secondary-text)', 
          textAlign: 'center', 
          marginTop: '1rem',
          fontSize: '0.9rem'
        }}>
          Conectando ao servidor...
        </div>
      )}
    </Container>
  )
}

export default HomePage
