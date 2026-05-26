import { useMemo, useState } from 'react'
import styled from 'styled-components'
import { TeamState } from '@/api/gameApi'

const PREDEFINED_COLORS = [
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#84cc16',
  '#22c55e',
  '#14b8a6',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#ec4899',
] as const

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`

const Panel = styled.div`
  width: min(720px, 100%);
  max-height: 90vh;
  overflow: auto;
  border-radius: 12px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  padding: 1rem;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
`

const TeamsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
`

const TeamCard = styled.div`
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 0.75rem;
  background: var(--input-bg);
`

const TeamHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`

const TeamName = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 700;
`

const Dot = styled.span<{ color: string }>`
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: ${props => props.color};
`

const PlayerLine = styled.div`
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
`

const Actions = styled.div`
  display: flex;
  gap: 0.5rem;
`

const Row = styled.div`
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
`

const Input = styled.input`
  flex: 1;
  min-width: 180px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--input-bg);
  color: var(--text-color);
  padding: 0.5rem 0.75rem;
`

const Button = styled.button`
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 0.45rem 0.7rem;
  background: var(--card-bg);
  color: var(--text-color);
  cursor: pointer;
`

const ColorButton = styled.button<{ selected: boolean; color: string }>`
  width: 26px;
  height: 26px;
  border-radius: 999px;
  border: 2px solid ${props => (props.selected ? 'var(--text-color)' : 'transparent')};
  outline: 1px solid var(--border-color);
  background: ${props => props.color};
  cursor: pointer;
`

interface TeamsModalProps {
  isOpen: boolean
  onClose: () => void
  teams: TeamState[]
  playerTeamId?: string
  gameStarted: boolean
  getPlayerName: (playerId: string) => string
  onCreateTeam: (name: string, color: string) => void
  onJoinTeam: (teamId: string) => void
}

export function TeamsModal({
  isOpen,
  onClose,
  teams,
  playerTeamId,
  gameStarted,
  getPlayerName,
  onCreateTeam,
  onJoinTeam,
}: TeamsModalProps) {
  const [name, setName] = useState('')
  const [selectedColor, setSelectedColor] = useState<string>(PREDEFINED_COLORS[0])

  const canCreate = useMemo(() => {
    const trimmed = name.trim()
    return !gameStarted && trimmed.length >= 2 && trimmed.length <= 24
  }, [gameStarted, name])

  if (!isOpen) {
    return null
  }

  return (
    <Overlay onClick={onClose}>
      <Panel onClick={(event) => event.stopPropagation()}>
        <Header>
          <h3>Times</h3>
          <Button onClick={onClose}>Fechar</Button>
        </Header>

        <TeamsGrid>
          {teams.map(team => {
            const isCurrentTeam = playerTeamId === team.id
            const canSwitch = !gameStarted || isCurrentTeam

            return (
              <TeamCard key={team.id}>
                <TeamHeader>
                  <TeamName>
                    <Dot color={team.color} />
                    <span>{team.name}</span>
                  </TeamName>
                  <Actions>
                    <Button
                      onClick={() => onJoinTeam(team.id)}
                      disabled={!canSwitch}
                      title={!canSwitch ? 'Não é possível trocar de time após o início' : 'Entrar no time'}
                    >
                      {isCurrentTeam ? 'No time' : 'Entrar'}
                    </Button>
                  </Actions>
                </TeamHeader>

                {team.players.length === 0 && <PlayerLine>Nenhum jogador</PlayerLine>}
                {team.players.map(playerId => (
                  <PlayerLine key={playerId}>• {getPlayerName(playerId)}</PlayerLine>
                ))}
              </TeamCard>
            )
          })}
        </TeamsGrid>

        <h4 style={{ marginBottom: '0.5rem' }}>Criar novo time</h4>
        <Row>
          <Input
            placeholder="Nome do time"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={gameStarted}
            maxLength={24}
          />
        </Row>
        <Row>
          {PREDEFINED_COLORS.map(color => (
            <ColorButton
              key={color}
              color={color}
              selected={selectedColor === color}
              onClick={() => setSelectedColor(color)}
              disabled={gameStarted}
              title={color}
            />
          ))}
        </Row>
        <Row>
          <Button
            disabled={!canCreate}
            onClick={() => {
              onCreateTeam(name.trim(), selectedColor)
              setName('')
            }}
          >
            Criar time
          </Button>
          {gameStarted && <span style={{ fontSize: '0.9rem' }}>Troca e criação de times bloqueadas após o início.</span>}
        </Row>
      </Panel>
    </Overlay>
  )
}
