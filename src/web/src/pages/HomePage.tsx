import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import styled from 'styled-components'
import GameInterface from '../components/GameInterface'
import { useGame } from '../contexts/GameContext'
import CustomGameModal from '../components/CustomGameModal'
import { GameMode, Player } from '@/api/gameApi'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
  gap: 2rem;
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
  /* margin-bottom: 1rem; */
  text-align: center;
  line-height: 1.6;
`

const HowToPlaySection = styled.div`
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px var(--shadow);
  display: flex;
  flex-direction: column;
  gap: 1rem;
`

const QuickStartSection = styled.div`
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
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

const Button = styled.button`
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

const EditUserSection = styled.div`
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
  box-shadow: 0 2px 8px var(--shadow);
`

const EditUserInput = styled.input`
  width: 100%;
  padding: 1rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 1rem;
  background: var(--input-bg);
  color: var(--text-color);
  margin-bottom: 1rem;
  transition: border-color 0.2s ease;

  &:focus {
    border-color: var(--button-bg);
    outline: none;
  }

  &::placeholder {
    color: var(--secondary-text);
  }
`

const DemoGame = styled.div`
  width: 100%;
  max-width: 600px;
`

function HomePage() {
  const [selectedMode, setSelectedMode] = useState<GameMode>('default')
  const [showGame, setShowGame] = useState(false)
  const [quickPlayWord, setQuickPlayWord] = useState('')
  const [roomIdInput, setRoomIdInput] = useState('')
  const [searchParams, setSearchParams] = useSearchParams()
  const { createGame, quickPlay, joinRoom, currentGame, loading, isConnected, makeGuess, startGame, user, updatePlayer } = useGame()
  const [showCustomModal, setShowCustomModal] = useState(false)
  const [customGameLoading, setCustomGameLoading] = useState(false)
  const [playerInfo, setPlayerInfo] = useState<Partial<Player> | null>(null)
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState(false)

  const [showHowToPlay, setShowHowToPlay] = useState(false)
  useEffect(() => {
    // Check if the user has seen the how-to-play section
    const hasSeenHowToPlay = localStorage.getItem('hasSeenHowToPlay')
    if (!hasSeenHowToPlay || hasSeenHowToPlay !== 'true')
      setShowHowToPlay(true)
  }, [])

  // Handle URL room parameter
  useEffect(() => {
    const roomParam = searchParams.get('room')
    if (roomParam && isConnected && !currentGame?.roomId && !showGame) {
      // Auto-join room from URL parameter
      joinRoom(roomParam)
        .then(() => {
          setShowGame(true)
          // Remove the room parameter from URL after joining
          const newParams = new URLSearchParams(searchParams)
          newParams.delete('room')
          setSearchParams(newParams)
        })
        .catch((error) => {
          console.error('Failed to join room from URL:', error)
        })
    }
  }, [searchParams, isConnected, currentGame?.roomId, showGame, joinRoom, setSearchParams])

  const handleQuickPlay = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickPlayWord.trim()) return

    try {
      await quickPlay(quickPlayWord.trim())
      setShowGame(true)
      setQuickPlayWord('') // Clear the input after successful quick play
    } catch (error) {
      console.error('Failed to start quick play:', error)
    }
  }

  const handleCreateRoom = async () => {
    try {
      await createGame(selectedMode)
      setShowGame(true)
    } catch (error) {
      console.error('Failed to create room:', error)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!roomIdInput.trim()) return

    try {
      await joinRoom(roomIdInput.trim())
      setShowGame(true)
    } catch (error) {
      console.error('Failed to join room:', error)
    }
  }

  const handleCustomGameCreate = async (options: {
    gameMode: GameMode;
    allowTips: boolean;
    allowGiveUp: boolean;
    maxPlayers: number;
    gameId?: number | Date | 'random';
  }) => {
    setCustomGameLoading(true)
    try {
      await createGame(options.gameMode, options)
      setShowGame(true)
      setShowCustomModal(false)
      // TODO: Pass allowTips, allowGiveUp, maxPlayers to backend if supported
    } catch (error) {
      console.error('Failed to create custom game:', error)
    } finally {
      setCustomGameLoading(false)
    }
  }

  const gameModes = [
    { key: 'default' as GameMode, name: 'Clássico', description: 'Jogo tradicional ou cooperativo' },
    { key: 'competitive' as GameMode, name: 'Competitivo', description: 'Joguem juntos' },
    { key: 'stop' as GameMode, name: 'Stop', description: 'O primeiro a acertar ganha' },
    { key: 'battle-royale' as GameMode, name: 'Battle Royale', description: '"Alguém já usou essa palavra"' }
  ]

  if (showGame) {
    return (
      <Container>
        <DemoGame>
          <GameInterface
            gameId={currentGame?.gameId ? parseInt(currentGame.gameId) : undefined}
            roomId={currentGame?.roomId}
            gameMode={currentGame?.gameMode}
            guesses={currentGame?.guesses || []}
            onGuess={makeGuess}
            gameFinished={currentGame?.finished || false}
            gameStarted={currentGame?.started || false}
            isHost={currentGame?.isHost || false}
            onStartGame={startGame}
            loading={loading}
            user={user}
            players={currentGame?.players || []}
          />
        </DemoGame>
      </Container>
    )
  }

  return (
    <Container>
      <Title>CONTEXTO</Title>
      {/* <Subtitle>
        Encontre a palavra secreta usando pistas de contexto semântico. Quanto menor o número, mais próximo você está!
      </Subtitle> */}

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

      {showHowToPlay &&
        <HowToPlaySection>
          <SectionTitle>❓ Como Jogar</SectionTitle>
          <p>Descubra a palavra secreta. Você pode tentar quantas vezes precisar.</p>
          <p>As palavras foram ordenadas por um algoritmo de inteligência artificial de acordo com a similaridade delas com a palavra secreta.</p>
          <p>Depois de enviar uma palavra, você verá a posição em que ela está. A palavra secreta é a número 1.</p>
          <p>O algoritmo analisou milhares de textos em Português. Ele utiliza o contexto em que as palavras são utilizadas para calcular a similaridade entre elas.</p>
          <button
            style={{
              color: 'var(--green)',
              textDecoration: 'underline',
              alignSelf: 'flex-end'
            }}
            onClick={() => {
              localStorage.setItem('hasSeenHowToPlay', 'true')
              setShowHowToPlay(false)
            }}
          >Já sei jogar 👍</button>
        </HowToPlaySection>
      }

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
        <CreateRoomButton style={{ marginTop: 12, backgroundColor: 'var(--card-background)', color: 'var(--green)', border: '1px solid var(--green)' }} // invert from the previous button
          onClick={() => setShowCustomModal(true)}
          disabled={!isConnected || loading}
        >
          {customGameLoading ? 'Criando personalizada...' : 'Personalizar Sala'}
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
            // maxLength={6}
          />
          <JoinRoomButton type="submit" disabled={!isConnected || loading || !roomIdInput.trim()}>
            {loading ? 'Entrando...' : 'Entrar'}
          </JoinRoomButton>
        </form>
      </JoinRoomSection>

      <EditUserSection>
        <SectionTitle>👤 Meu perfil</SectionTitle>
        <form onSubmit={async (e) => {
          e.preventDefault()
          if (!playerInfo)
            return
          try {
            await updatePlayer(playerInfo)
            setProfileUpdateSuccess(true)
            setTimeout(() => setProfileUpdateSuccess(false), 3000) // Hide success message after 3 seconds
          } catch (error) {
            console.error('Failed to update profile:', error)
          }
        }}>
          <label htmlFor="username">Nome de usuário</label>
          <EditUserInput
            type="text"
            placeholder="Seu nome de usuário"
            value={playerInfo?.username || ''}
            onChange={(e) => setPlayerInfo({ ...playerInfo, username: e.target.value })}
            disabled={!isConnected || loading}
          />
          <Button type="submit" disabled={!isConnected || loading}>
            Salvar
          </Button>
            <div style={{
              // marginTop: '1rem',
              padding: '0.5rem',
              color: 'var(--text-color)',
              textAlign: 'center',
              fontSize: '0.85rem',
              fontWeight: 'normal'
            }}>
              {profileUpdateSuccess ? (
                <>✅ Perfil atualizado com sucesso!</>
              ) : (
                <>&nbsp;</>
              )}
            </div>
        </form>
      </EditUserSection>

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

      {!showHowToPlay && (
        <button
          style={{
            color: 'var(--secondary-text)',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.9rem',
          }}
          onClick={() => {
            localStorage.removeItem('hasSeenHowToPlay')
            setShowHowToPlay(true)
          }}
        >
          Não sei jogar 🤔
        </button>
      )}

      <CustomGameModal
        isOpen={showCustomModal}
        onClose={() => setShowCustomModal(false)}
        onCreate={handleCustomGameCreate}
      />
    </Container>
  )
}

export default HomePage
