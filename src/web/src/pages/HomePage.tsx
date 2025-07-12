import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styled from 'styled-components'
import GameInterface from '../components/GameInterface'
import { strings } from '../constants/strings'
import { useGame } from '../contexts/GameContext'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem;
`

const WelcomeSection = styled.div`
  text-align: center;
  margin-bottom: 3rem;
  max-width: 800px;
`

const Title = styled.h1`
  color: var(--text-color);
  margin-bottom: 1rem;
  font-size: 3rem;
  font-weight: 700;
  letter-spacing: -0.02em;
`

const Subtitle = styled.p`
  color: var(--secondary-text);
  font-size: 1.2rem;
  margin-bottom: 2rem;
  line-height: 1.6;
`

const HowToPlay = styled.div`
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  padding: 2rem;
  margin-bottom: 2rem;
  box-shadow: 0 2px 8px var(--shadow);
`

const HowToPlayTitle = styled.h2`
  color: var(--text-color);
  margin-bottom: 1rem;
  font-size: 1.5rem;
`

const HowToPlayText = styled.p`
  color: var(--secondary-text);
  line-height: 1.6;
  margin-bottom: 1rem;
`

const GameModeSelector = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  justify-content: center;
`

const ModeButton = styled.button<{ active: boolean }>`
  background: ${props => props.active ? 'var(--button-bg)' : 'var(--card-bg)'};
  color: ${props => props.active ? 'var(--button-text)' : 'var(--text-color)'};
  border: 2px solid ${props => props.active ? 'var(--button-bg)' : 'var(--border-color)'};
  padding: 1rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  transition: all 0.2s ease;
  cursor: pointer;

  &:hover {
    border-color: var(--button-bg);
    transform: translateY(-2px);
    box-shadow: 0 4px 8px var(--shadow);
  }
`

const StartButton = styled.button`
  background: var(--green);
  color: white;
  padding: 1.25rem 2.5rem;
  border-radius: 8px;
  font-size: 1.2rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
  margin-bottom: 2rem;

  &:hover:not(:disabled) {
    background: #218838;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(40, 167, 69, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: var(--secondary-text);
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`

const DemoGame = styled.div`
  width: 100%;
  max-width: 600px;
`

type GameMode = 'default' | 'competitive' | 'battle-royale'

function HomePage() {
  const navigate = useNavigate()
  const [selectedMode, setSelectedMode] = useState<GameMode>('default')
  const [showDemo, setShowDemo] = useState(false)
  const { createGame, guesses, loading, gameFinished, makeGuess, user, isConnected } = useGame()

  const handleStartGame = async () => {
    try {
      const gameId = await createGame(selectedMode)
      setShowDemo(true)
    } catch (error) {
      console.error('Failed to start game:', error)
    }
  }

  const handleDemoGuess = (word: string) => {
    makeGuess(word)
  }

  const gameModes = [
    {
      key: 'default' as GameMode,
      name: strings.modes.classic,
      description: strings.modeDescriptions.classic
    },
    {
      key: 'competitive' as GameMode,
      name: strings.modes.cooperative,
      description: strings.modeDescriptions.cooperative
    },
    {
      key: 'battle-royale' as GameMode,
      name: strings.modes.battleRoyale,
      description: strings.modeDescriptions.battleRoyale
    }
  ]

  if (showDemo) {
    return (
      <Container>
        <DemoGame>
          <GameInterface
            gameId={1027}
            guesses={guesses}
            onGuess={handleDemoGuess}
            gameFinished={gameFinished}
            loading={loading}
          />
        </DemoGame>
      </Container>
    )
  }

  return (
    <Container>
      <WelcomeSection>
        <Title>CONTEXTO</Title>
        <Subtitle>
          {strings.modeDescriptions.classic}. As palavras são classificadas por um algoritmo de IA de acordo com sua similaridade com a palavra-alvo.
        </Subtitle>
        
        <HowToPlay>
          <HowToPlayTitle>Como jogar</HowToPlayTitle>
          <HowToPlayText>
            🎯 <strong>Objetivo:</strong> Encontre a palavra secreta usando pistas de contexto
          </HowToPlayText>
          <HowToPlayText>
            📊 <strong>Classificação:</strong> As palavras são classificadas por similaridade semântica (1 = palavra secreta)
          </HowToPlayText>
          <HowToPlayText>
            🎨 <strong>Cores:</strong> Verde (muito próximo), Amarelo (próximo), Vermelho (distante)
          </HowToPlayText>
          <HowToPlayText>
            ♾️ <strong>Tentativas:</strong> Você tem tentativas ilimitadas!
          </HowToPlayText>
        </HowToPlay>

        <GameModeSelector>
          {gameModes.map(mode => (
            <ModeButton
              key={mode.key}
              active={selectedMode === mode.key}
              onClick={() => setSelectedMode(mode.key)}
            >
              <div>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>
                  {mode.name}
                </div>
                <div style={{ fontSize: '0.85rem', opacity: 0.8 }}>
                  {mode.description}
                </div>
              </div>
            </ModeButton>
          ))}
        </GameModeSelector>

        <StartButton onClick={handleStartGame} disabled={!isConnected || loading}>
          {loading ? 'Criando jogo...' : isConnected ? 'Começar a jogar' : 'Conectando...'}
        </StartButton>
      </WelcomeSection>
    </Container>
  )
}

export default HomePage
