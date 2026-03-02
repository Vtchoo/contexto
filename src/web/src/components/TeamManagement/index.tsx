import { useState } from 'react'
import { useGame, TEAM_COLORS } from '../../contexts/GameContext'
import type { Team } from '../../contexts/GameContext'
import PlayerAvatar from '../PlayerAvatar'
import * as S from './styles'

interface TeamManagementProps {
    isOpen: boolean
    onClose: () => void
}

const TeamCard = ({ team, isCurrentTeam, hasAnyTeam, onJoin, showPlayerCount = true }: {
    team: Team
    isCurrentTeam: boolean
    hasAnyTeam: boolean
    onJoin: (teamId: string) => void
    showPlayerCount: boolean
}) => {
    const { getPlayerById } = useGame()

    return (
        <S.TeamCardContainer
            isCurrentTeam={isCurrentTeam}
            teamColor={team.color}
            clickable={!isCurrentTeam && !hasAnyTeam}
            onClick={() => !isCurrentTeam && !hasAnyTeam && onJoin(team.id)}
        >
            <S.TeamCardHeader>
                <S.TeamName>{team.name}</S.TeamName>
                <S.TeamColorDot color={team.color || '#94A3B8'} />
            </S.TeamCardHeader>

            <S.TeamStats>
                {isCurrentTeam && showPlayerCount && (
                    <>
                        {team.players.length} jogador{team.players.length !== 1 ? 'es' : ''}
                        {team.completed && <S.CompletedBadge>✅ Completou</S.CompletedBadge>}
                    </>
                )}
                {!isCurrentTeam && team.completed && (
                    <S.CompletedBadge>✅ Completou</S.CompletedBadge>
                )}
            </S.TeamStats>

            <S.PlayersList>
                {team.players.map(playerId => {
                    const player = getPlayerById(playerId)
                    return (
                        <PlayerAvatar
                            key={playerId}
                            id={playerId}
                            username={player?.username}
                            avatarUrl={player?.avatarUrl}
                            size={32}
                        />
                    )
                })}
            </S.PlayersList>

            {!isCurrentTeam && !team.completed && !hasAnyTeam && (
                <S.JoinHint>
                    Clique para entrar na equipe
                </S.JoinHint>
            )}
        </S.TeamCardContainer>
    )
}

const ColorPicker = ({ selectedColor, onColorChange }: {
    selectedColor?: string
    onColorChange: (color: string) => void
}) => {
    return (
        <S.ColorPickerContainer>
            <S.Label>Cor da Equipe</S.Label>
            <S.ColorGrid>
                {TEAM_COLORS.map(color => (
                    <S.ColorButton
                        key={color}
                        type="button"
                        color={color}
                        selected={selectedColor === color}
                        onClick={() => onColorChange(color)}
                    />
                ))}
            </S.ColorGrid>
        </S.ColorPickerContainer>
    )
}

export default function TeamManagement({ isOpen, onClose }: TeamManagementProps) {
    const {
        currentGame,
        createTeam,
        joinTeam,
        leaveTeam,
        teamActionLoading,
        error
    } = useGame()

    const [isCreating, setIsCreating] = useState(false)
    const [newTeamName, setNewTeamName] = useState('')
    const [selectedColor, setSelectedColor] = useState(TEAM_COLORS[0])

    if (!isOpen || !currentGame || currentGame.gameMode !== 'team') {
        return null
    }

    const { teamInfo } = currentGame
    const teams = teamInfo?.allTeams || []
    const playerTeam = teamInfo?.playerTeam

    const handleCreateTeam = async () => {
        if (!newTeamName.trim()) return

        try {
            await createTeam(newTeamName.trim(), selectedColor)
            setNewTeamName('')
            setIsCreating(false)
        } catch (err) {
            console.error('Failed to create team:', err)
        }
    }

    const handleJoinTeam = async (teamId: string) => {
        if (playerTeam) return // Already on a team

        try {
            await joinTeam(teamId)
        } catch (err) {
            console.error('Failed to join team:', err)
        }
    }

    const handleLeaveTeam = async () => {
        try {
            await leaveTeam()
        } catch (err) {
            console.error('Failed to leave team:', err)
        }
    }

    return (
        <S.Overlay>
            <S.Modal>
                <S.ModalContent>
                    {/* Header */}
                    <S.Header>
                        <S.Title>Gerenciar Equipes</S.Title>
                        <S.CloseButton onClick={onClose}>
                            ✕
                        </S.CloseButton>
                    </S.Header>

                    {/* Error Message */}
                    {error && (
                        <S.ErrorMessage>
                            {error}
                        </S.ErrorMessage>
                    )}

                    {/* Current Team Status */}
                    {playerTeam ? (
                        <S.Section>
                            <S.SectionTitle>Sua Equipe</S.SectionTitle>
                            <TeamCard
                                team={playerTeam}
                                isCurrentTeam={true}
                                hasAnyTeam={!!playerTeam}
                                onJoin={() => { }}
                            />
                            {!currentGame.started && (
                                <S.LeaveTeamButton
                                    onClick={handleLeaveTeam}
                                    disabled={teamActionLoading}
                                >
                                    Sair da Equipe
                                </S.LeaveTeamButton>
                            )}
                        </S.Section>
                    ) : (
                        <S.Section>
                            <S.WarningBox>
                                <S.WarningText>
                                    <S.WarningTitle>⚠️ Você precisa entrar em uma equipe!</S.WarningTitle>
                                    <S.WarningDescription>
                                        Crie uma nova equipe ou entre em uma equipe existente para participar do jogo.
                                    </S.WarningDescription>
                                </S.WarningText>
                            </S.WarningBox>
                        </S.Section>
                    )}

                    {/* Create New Team */}
                    {!playerTeam && !currentGame.started && (
                        <S.Section>
                            {!isCreating ? (
                                <S.CreateButton
                                    fullWidth
                                    onClick={() => setIsCreating(true)}
                                    disabled={teamActionLoading}
                                >
                                    Criar Nova Equipe
                                </S.CreateButton>
                            ) : (
                                <S.CreateTeamForm>
                                    <S.SectionTitle>Criar Nova Equipe</S.SectionTitle>

                                    <S.FormField>
                                        <S.Label>Nome da Equipe</S.Label>
                                        <S.Input
                                            type="text"
                                            value={newTeamName}
                                            onChange={(e) => setNewTeamName(e.target.value)}
                                            placeholder="Digite o nome da equipe..."
                                            maxLength={32}
                                        />
                                    </S.FormField>

                                    <ColorPicker
                                        selectedColor={selectedColor}
                                        onColorChange={setSelectedColor}
                                    />

                                    <S.FormActions>
                                        <S.PrimaryButton
                                            onClick={handleCreateTeam}
                                            disabled={!newTeamName.trim() || teamActionLoading}
                                        >
                                            {teamActionLoading ? 'Criando...' : 'Criar'}
                                        </S.PrimaryButton>
                                        <S.SecondaryButton
                                            onClick={() => {
                                                setIsCreating(false)
                                                setNewTeamName('')
                                                setSelectedColor(TEAM_COLORS[0])
                                            }}
                                            disabled={teamActionLoading}
                                        >
                                            Cancelar
                                        </S.SecondaryButton>
                                    </S.FormActions>
                                </S.CreateTeamForm>
                            )}
                        </S.Section>
                    )}

                    {/* Available Teams */}
                    <S.Section>
                        <S.SectionTitle>
                            Equipes Disponíveis ({teams.length})
                        </S.SectionTitle>

                        {teams.length === 0 ? (
                            <S.EmptyState>
                                <S.EmptyStateIcon>🏆</S.EmptyStateIcon>
                                <S.EmptyStateText>Nenhuma equipe criada ainda.</S.EmptyStateText>
                                <S.EmptyStateSubtext>Seja o primeiro a criar uma equipe!</S.EmptyStateSubtext>
                            </S.EmptyState>
                        ) : (
                            <S.TeamsGrid>
                                {teams.map(team => (
                                    <TeamCard
                                        key={team.id}
                                        team={team}
                                        isCurrentTeam={playerTeam?.id === team.id}
                                        hasAnyTeam={!!playerTeam}
                                        onJoin={handleJoinTeam}
                                        showPlayerCount={false}
                                    />
                                ))}
                            </S.TeamsGrid>
                        )}
                    </S.Section>

                    {/* Game Status Info */}
                    <S.GameStatusBox>
                        <S.StatusText>
                            <S.StatusLabel>Status do Jogo:</S.StatusLabel> {currentGame.started ? '🟢 Iniciado' : '🔴 Aguardando início'}
                        </S.StatusText>
                        {currentGame.started && (
                            <S.StatusText>
                                O jogo está em andamento. Não é possível trocar de equipe.
                            </S.StatusText>
                        )}
                        {!currentGame.started && teams.length < 2 && (
                            <S.WarningStatusText>
                                ⚠️ Pelo menos 2 equipes são necessárias para iniciar o jogo.
                            </S.WarningStatusText>
                        )}
                    </S.GameStatusBox>
                </S.ModalContent>
            </S.Modal>
        </S.Overlay>
    )
}