import { useState, useRef, useEffect, useMemo } from 'react'
import Row from './original_Row'
import { PlayerAvatar } from './PlayerAvatar'
import { PlayerTooltip } from './PlayerTooltip'
import { strings } from '../constants/strings'
import { Player } from '@/api/gameApi'
import { useGame } from '@/contexts/GameContext'

interface Guess {
  word: string
  distance: number
  addedBy?: string
  error?: string
  hidden?: boolean // For multiplayer, to hide guesses until revealed
}

interface PlayerDisplayData {
  playerId: string
  username?: string
  isOnline: boolean
  transparent: boolean
  numberBadge?: number
  medalPosition?: 1 | 2 | 3
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
  const [highlightedWord, setHighlightedWord] = useState<string | null>(null)
  const [tooltipData, setTooltipData] = useState<{
    isVisible: boolean
    playerId?: string
    username?: string
    closestDistance?: number
    totalGuesses: number
    position: { x: number; y: number }
  }>({
    isVisible: false,
    totalGuesses: 0,
    position: { x: 0, y: 0 }
  })
  const inputRef = useRef<HTMLInputElement>(null)

  const { getPlayerById, currentGame: gameContext } = useGame()

  // Handle player avatar click to show tooltip
  const handlePlayerClick = (playerId: string, position: { x: number; y: number }) => {
    const playerRanking = gameContext?.ranking?.find(r => r.playerId === playerId)
    const username = getPlayerById(playerId)?.username
    
    setTooltipData({
      isVisible: true,
      playerId,
      username,
      closestDistance: playerRanking?.closestDistance,
      totalGuesses: playerRanking?.guessCount || 0,
      position
    })
  }

  const closeTooltip = () => {
    setTooltipData(prev => ({ ...prev, isVisible: false }))
  }

  // Calculate player display data for the player list
  const playerDisplayData = useMemo((): PlayerDisplayData[] => {
    // Get all unique players who have made guesses (exclude error guesses)
    const playersWithGuesses = [...new Set(guesses
      .filter(guess => guess.addedBy && !guess.error)
      .map(guess => guess.addedBy!))]
    
    // Combine current players with players who have made guesses
    const allRelevantPlayers = [...new Set([...players, ...playersWithGuesses])]
    
    // Only process if there are multiple players
    if (allRelevantPlayers.length <= 1) {
      return []
    }

    const ranking = gameContext?.ranking || []

    const playerList = allRelevantPlayers.map((playerId) => {
      const playerRanking = ranking.find(r => r.playerId === playerId)
      const isPlayerOnline = players.includes(playerId)
      const hasPlayerMadeGuesses = playersWithGuesses.includes(playerId)
      
      // Calculate badges based on game mode and rules
      let medalPosition: 1 | 2 | 3 | undefined
      let numberBadge: number | undefined
      
      if (gameMode === 'default') {
        // Coop: number of guesses, no medal
        const playerGuesses = guesses.filter(g => g.addedBy === playerId && !g.error)
        numberBadge = playerGuesses.length
      } else if (gameMode === 'competitive') {
        // Competitive: number of guesses, medal for less guesses (must have won)
        // Use ranking data for guess count since guesses list only shows closest guess
        numberBadge = playerRanking?.guessCount || 0
        
        // Show medal only if player has won (closestDistance is 0)
        if (playerRanking?.closestDistance === 0) {
          // Sort completed players by guess count, then by completion time
          const completedPlayers = ranking
            .filter(r => r.closestDistance === 0)
            .sort((a, b) => {
              if (a.guessCount !== b.guessCount) {
                return a.guessCount - b.guessCount
              }
              return (a.completedAt?.getTime() || 0) - (b.completedAt?.getTime() || 0)
            })
          
          const position = completedPlayers.findIndex(r => r.playerId === playerId) + 1
          if (position <= 3) {
            medalPosition = position as 1 | 2 | 3
          }
        }
      } else if (gameMode === 'stop' || gameMode === 'battle-royale') {
        // Stop/Battle Royale: show number of guesses on badge, rank by closest distance
        numberBadge = playerRanking?.guessCount
        
        // Show medals only when game has finished
        if (gameFinished) {
          // Sort players by closest distance for medal positions
          const sortedByDistance = ranking
            .filter(r => r.closestDistance !== undefined)
            .sort((a, b) => (a.closestDistance || 0) - (b.closestDistance || 0))
          
          const position = sortedByDistance.findIndex(r => r.playerId === playerId) + 1
          if (position <= 3) {
            medalPosition = position as 1 | 2 | 3
          }
        }

        // if (numberBadge !== undefined)
        //   numberBadge += 1
      }
      
      return {
        playerId,
        username: getPlayerById(playerId)?.username,
        isOnline: isPlayerOnline,
        transparent: !isPlayerOnline && hasPlayerMadeGuesses,
        numberBadge,
        medalPosition
      }
    })

    // Sort players based on game mode
    if (gameMode === 'competitive') {
      // Competitive: order by less guesses (winners first, then by guess count)
      return playerList.sort((a: PlayerDisplayData, b: PlayerDisplayData) => {
        const aRanking = ranking.find(r => r.playerId === a.playerId)
        const bRanking = ranking.find(r => r.playerId === b.playerId)
        
        const aWon = aRanking?.closestDistance === 0
        const bWon = bRanking?.closestDistance === 0
        
        // Winners first
        if (aWon && !bWon) return -1
        if (!aWon && bWon) return 1
        
        // If both won or both didn't win, sort by guess count
        const aGuesses = aRanking?.guessCount || 0
        const bGuesses = bRanking?.guessCount || 0
        return aGuesses - bGuesses
      })
    } else if (gameMode === 'stop' || gameMode === 'battle-royale') {
      // Stop/Battle Royale: order by closest distance, tiebreaker is least guesses
      return playerList.sort((a: PlayerDisplayData, b: PlayerDisplayData) => {
        const aRanking = ranking.find(r => r.playerId === a.playerId)
        const bRanking = ranking.find(r => r.playerId === b.playerId)
        
        const aDistance = aRanking?.closestDistance ?? Infinity
        const bDistance = bRanking?.closestDistance ?? Infinity
        
        // Sort by closest distance first
        if (aDistance !== bDistance) {
          return aDistance - bDistance
        }
        
        // Tiebreaker: least guesses
        const aGuesses = aRanking?.guessCount || 0
        const bGuesses = bRanking?.guessCount || 0
        return aGuesses - bGuesses
      })
    }

    // Default mode: no specific ordering (keep original order)
    return playerList
  }, [guesses, players, gameMode, gameContext?.ranking, getPlayerById])

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

  // Detect if it's a multiplayer game based on whether there are guesses from different players
  const isMultiplayer = useMemo(() => {
    const uniquePlayers = new Set(guesses.map(guess => guess.addedBy).filter(Boolean))
    return uniquePlayers.size > 1
  }, [guesses])

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

    // Check if word has already been guessed
    const existingGuess = guesses.find(guess => guess.word.toLowerCase() === word)
    if (existingGuess) {
      // Just highlight the existing word instead of sending to server
      setHighlightedWord(existingGuess.word)
      setInputValue('')
      return
    }

    onGuess(word)
    setHighlightedWord(word)
    setInputValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e)
    }
  }

  const isWinner = gameMode === 'default' 
    ? sortedGuesses.some(guess => guess.distance === 0) // In default mode, anyone finding the word means everyone wins
    : playerGuesses.some(guess => guess.distance === 0) // In competitive modes, only individual wins count
  
  // Check if another player won in stop/battle royale modes
  const otherPlayerWon = useMemo(() => {
    if (gameMode !== 'stop' && gameMode !== 'battle-royale') return null
    if (!gameFinished) return null
    if (isWinner) return null // Current player won, no need to show other player message
    
    // Find the winner from ranking data
    const winner = gameContext?.ranking?.find(r => r.closestDistance === 0)
    if (winner) {
      const winnerName = getPlayerById(winner.playerId)?.username || 'Jogador'
      
      return {
        playerId: winner.playerId,
        username: winnerName,
        guessCount: winner.guessCount,
        answerWord: gameContext?.answerWord // Use answer from game context (server provides this)
      }
    }
    return null
  }, [gameMode, gameFinished, isWinner, gameContext?.ranking, gameContext?.answerWord, getPlayerById])
  
  // Get the attempted/highlighted word data for message display, fallback to last guess
  const lastGuessData = playerGuesses.length > 0 ? [...playerGuesses].pop() : null
  const attemptedWordData = highlightedWord ? guesses.find(guess => guess.word === highlightedWord) : lastGuessData

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
  } else if (attemptedWordData?.error) {
    message = (
      <div className="message">
        <div className="message-text">{attemptedWordData.error}</div>
      </div>
    )
  } else if (attemptedWordData && !attemptedWordData.error) {
    message = (
      <div className="message">
        <div>
          <Row 
            // guess={attemptedWordData}
            // highlight={true}
            word={attemptedWordData.word}
            distance={attemptedWordData.distance}
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
            <p>🎉 {strings.game.congratulations}! {gameMode === 'default' && isMultiplayer ? strings.game.youAllWon : strings.game.youWon}</p>
          </div>
        )}

        {otherPlayerWon && (
          <div className="end-msg" style={{ backgroundColor: '#f8d7da', borderColor: '#f5c6cb', color: '#721c24' }}>
            <p>
              {gameMode === 'stop' ? '⚡' : '⚔️'} <strong>{otherPlayerWon.username}</strong> venceu em{' '}
              <strong>{otherPlayerWon.guessCount}</strong> tentativa{otherPlayerWon.guessCount !== 1 ? 's' : ''}!
              {otherPlayerWon.answerWord && (
                <>
                  <br />
                  A palavra era: <strong style={{ fontSize: '1.1em', color: '#155724' }}>
                    {otherPlayerWon.answerWord.toUpperCase()}
                  </strong>
                </>
              )}
            </p>
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
          <span>
            {gameMode === 'default' ? sortedGuesses.length : playerGuesses.filter(guess => !guess.error).length}
          </span>
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

        {/* Show all players who have participated in the game */}
        {playerDisplayData.length > 0 && (
          <div className="player-list" style={{ paddingBlock: '1rem' }}>
            <ul style={{ display: 'flex', gap: '0.5rem', listStyle: 'none', padding: 0 }}>
              {playerDisplayData.map((player) => {
                const playerRanking = gameContext?.ranking?.find(r => r.playerId === player.playerId)
                return (
                  <PlayerAvatar 
                    key={player.playerId} 
                    id={player.playerId} 
                    username={player.username} 
                    size={36}
                    transparent={player.transparent}
                    numberBadge={player.numberBadge}
                    medalPosition={player.medalPosition}
                    onClick={(_, position) => handlePlayerClick(player.playerId, position)}
                    closestDistance={playerRanking?.closestDistance}
                    totalGuesses={playerRanking?.guessCount || 0}
                  />
                )
              })}
            </ul>
          </div>
        )}

        {/* Player tooltip */}
        <PlayerTooltip
          username={tooltipData.username}
          closestDistance={tooltipData.closestDistance}
          totalGuesses={tooltipData.totalGuesses}
          gameMode={gameMode}
          isVisible={tooltipData.isVisible}
          position={tooltipData.position}
          onClose={closeTooltip}
        />

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
              highlight={highlightedWord === guess.word}
              hidden={guess.hidden}
              addedBy={guess.addedBy}
              playerId={user.id} // Pass current user's ID for multiplayer context
              highlightPlayerGuess={gameMode !== 'default' && guess.addedBy !== user.id} // if game is coop, no need to highlight other players
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
