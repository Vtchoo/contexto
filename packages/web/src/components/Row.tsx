interface Guess {
  word: string
  distance: number
  addedBy?: string
  error?: string
}

interface RowProps {
  guess: Guess
  highlight?: boolean
}

function Row({ guess, highlight = false }: RowProps) {
  if (guess.error) {
    return (
      <div className={`row-wrapper ${highlight ? 'highlight' : ''}`}>
        <div className="row">
          <span className="word error">{guess.word}</span>
          <span className="distance error">❌</span>
        </div>
        <div className="error-text">{guess.error}</div>
      </div>
    )
  }

  // Calculate percentage for progress bar (0 = 100%, higher distance = lower percentage)
  // Use an exponential decay function for better visual representation
  const percentage = Math.max(0, 100 * Math.exp(-guess.distance / 200))

  return (
    <div className={`row-wrapper ${highlight ? 'highlight' : ''}`}>
      <div className="row">
        <span className="word">{guess.word}</span>
        <div className="outer-bar">
          <div 
            className="inner-bar" 
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="distance">
          {guess.distance === 0 ? '🎯' : guess.distance}
        </span>
      </div>
      {guess.addedBy && (
        <div className="added-by">
          Por: {guess.addedBy}
        </div>
      )}
    </div>
  )
}

export default Row
