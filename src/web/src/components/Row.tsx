import styled from 'styled-components'

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

const RowWrapper = styled.div<{ highlight?: boolean }>`
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0.75rem;
  border-radius: 8px;
  background: ${props => props.highlight ? 'var(--hover-bg)' : 'transparent'};
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--hover-bg);
  }
`

const ProgressBar = styled.div`
  width: 80px;
  height: 20px;
  background: var(--input-bg);
  border-radius: 10px;
  margin-right: 1rem;
  overflow: hidden;
  border: 1px solid var(--border-color);
`

const ProgressFill = styled.div<{ distance: number }>`
  height: 100%;
  border-radius: 10px;
  transition: all 0.3s ease;
  background-color: ${props => getBarColor(props.distance)};
  width: ${props => getBarWidth(props.distance)};
`

const WordContainer = styled.div`
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const Word = styled.span`
  font-weight: 500;
  color: var(--text-color);
  font-size: 1rem;
`

const Position = styled.span`
  color: var(--secondary-text);
  font-size: 0.9rem;
  font-weight: 500;
  min-width: 40px;
  text-align: right;
`

const ErrorMessage = styled.span`
  color: var(--red);
  font-size: 0.9rem;
  font-style: italic;
`

// Utility functions from the original
const getBarWidth = (distance: number): string => {
  const total = 40000
  const lambda = 0.5
  const pdf = (x: number) => lambda * Math.exp(-lambda * x)
  const startX = 0
  const endX = 100
  const startY = pdf(startX)
  const endY = pdf(endX)
  const x = (distance / total) * (endX - startX)
  let result = ((pdf(x) - endY) / (startY - endY)) * 100
  if (result < 1) {
    result = 1
  }
  return `${result}%`
}

const getBarColor = (distance: number): string => {
  const GREEN_THRESHOLD = 300
  const YELLOW_THRESHOLD = 1000
  
  if (distance < GREEN_THRESHOLD) {
    return 'var(--green)'
  }
  if (distance < YELLOW_THRESHOLD) {
    return 'var(--yellow)'
  }
  return 'var(--red)'
}

function Row({ guess, highlight = false }: RowProps) {
  if (guess.error) {
    return (
      <RowWrapper highlight={highlight}>
        <WordContainer>
          <Word>{guess.word}</Word>
          <ErrorMessage>{guess.error}</ErrorMessage>
        </WordContainer>
      </RowWrapper>
    )
  }

  return (
    <RowWrapper highlight={highlight}>
      <ProgressBar>
        <ProgressFill distance={guess.distance} />
      </ProgressBar>
      <WordContainer>
        <Word>{guess.word}</Word>
        <Position>{guess.distance + 1}</Position>
      </WordContainer>
    </RowWrapper>
  )
}

export default Row
