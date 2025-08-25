import React, { useState, useRef, useEffect } from 'react'
import { PlayerGuessesModal } from './PlayerGuessesModal'

interface PlayerTooltipProps {
  playerId: string
  username?: string
  closestDistance?: number
  totalGuesses: number
  gameMode?: 'default' | 'competitive' | 'battle-royale' | 'stop' | null
  isVisible: boolean
  position: { x: number; y: number }
  onClose: () => void
  roomId?: string
  currentUserFinished?: boolean // Whether the current user has finished their game
}

export function PlayerTooltip({ 
  playerId,
  username, 
  closestDistance, 
  totalGuesses, 
  gameMode,
  isVisible, 
  position,
  onClose,
  roomId,
  currentUserFinished = false
}: PlayerTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [showGuessesModal, setShowGuessesModal] = useState(false)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isVisible, onClose])

  if (!isVisible) return null

  const formatDistance = (distance?: number) => {
    if (distance === undefined) return 'N/A'
    if (distance === 0) return '🎯 Acertou!'
    return `${distance}`
  }

  const getDistanceLabel = () => {
    switch (gameMode) {
      case 'competitive':
        return 'Status'
      case 'stop':
      case 'battle-royale':
        return 'Melhor distância'
      default:
        return 'Melhor distância'
    }
  }

  const getDistanceValue = () => {
    if (gameMode === 'competitive') {
      return closestDistance === 0 ? '✅ Completou' : '⏳ Jogando'
    }
    return formatDistance(closestDistance)
  }

  const handleViewGuesses = () => {
    setShowGuessesModal(true)
  }

  const canViewGuesses = () => {
    return gameMode === 'competitive' && 
           currentUserFinished && 
           roomId && 
           playerId &&
           closestDistance !== undefined
  }

  // Calculate tooltip position to prevent overflow
  const tooltipStyle: React.CSSProperties = {
    position: 'fixed',
    left: Math.min(position.x - 90, window.innerWidth - 220), // Center horizontally relative to avatar
    top: Math.max(10, position.y - 80), // Position above the avatar with some spacing
    zIndex: 1000,
    backgroundColor: 'white',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '12px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontSize: '0.875rem',
    minWidth: '180px',
    maxWidth: '220px'
  }

  return (
    <>
      <div ref={tooltipRef} style={tooltipStyle}>
        <div style={{ 
          fontWeight: 'bold', 
          marginBottom: '8px', 
          color: '#333',
          borderBottom: '1px solid #eee',
          paddingBottom: '6px'
        }}>
          {username || 'Jogador Anônimo'}
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>Tentativas:</span>
            <span style={{ fontWeight: 'bold', color: '#333' }}>{totalGuesses}</span>
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ color: '#666' }}>{getDistanceLabel()}:</span>
            <span style={{ 
              fontWeight: 'bold', 
              color: closestDistance === 0 ? '#28a745' : '#333'
            }}>
              {getDistanceValue()}
            </span>
          </div>
        </div>

        {canViewGuesses() && (
          <div style={{ 
            marginTop: '12px', 
            paddingTop: '8px', 
            borderTop: '1px solid #eee' 
          }}>
            <button
              onClick={handleViewGuesses}
              style={{
                width: '100%',
                padding: '6px 12px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                fontWeight: '500'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#0056b3'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#007bff'
              }}
            >
              Ver tentativas
            </button>
          </div>
        )}
        
        {/* Small arrow pointing to the avatar */}
        <div style={{
          position: 'absolute',
          bottom: '-6px',
          left: '50%',
          transform: 'translateX(-50%) rotate(45deg)',
          width: '12px',
          height: '12px',
          backgroundColor: 'white',
          border: '1px solid #ddd',
          borderTop: 'none',
          borderLeft: 'none'
        }} />
      </div>

      {/* Player Guesses Modal */}
      {showGuessesModal && roomId && playerId && (
        <PlayerGuessesModal
          isOpen={showGuessesModal}
          onClose={() => setShowGuessesModal(false)}
          roomId={roomId}
          playerId={playerId}
          playerUsername={username}
        />
      )}
    </>
  )
}
