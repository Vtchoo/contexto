import { useRef, useEffect } from 'react'

interface PlayerTooltipProps {
  username?: string
  closestDistance?: number
  totalGuesses: number
  gameMode?: 'default' | 'competitive' | 'battle-royale' | 'stop' | null
  isVisible: boolean
  position: { x: number; y: number }
  onClose: () => void
}

export function PlayerTooltip({ 
  username, 
  closestDistance, 
  totalGuesses, 
  gameMode,
  isVisible, 
  position,
  onClose 
}: PlayerTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null)

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
  )
}
