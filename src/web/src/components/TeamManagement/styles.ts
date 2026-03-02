import styled from 'styled-components'

export const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
`

export const Modal = styled.div`
  background-color: var(--card-bg, #ffffff);
  border-radius: 12px;
  box-shadow: 0 25px 50px -12px var(--shadow, rgba(0, 0, 0, 0.25));
  max-width: 32rem;
  width: 100%;
  margin: 0 1rem;
  max-height: 90vh;
  overflow-y: auto;
`

export const ModalContent = styled.div`
  padding: 1.5rem;
`

export const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
`

export const Title = styled.h2`
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--text-color, #1a1a1a);
  margin: 0;
`

export const CloseButton = styled.button`
  color: var(--secondary-text, #666666);
  background: none;
  border: none;
  font-size: 1.25rem;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover {
    color: var(--text-color, #1a1a1a);
  }
`

export const ErrorMessage = styled.div`
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  color: var(--red, #dc3545);
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  margin-bottom: 1rem;

  [data-theme='dark'] & {
    background-color: #7f1d1d;
    border-color: #991b1b;
    color: #fecaca;
  }
`

export const Section = styled.div`
  margin-bottom: 1.5rem;
`

export const SectionTitle = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color, #1a1a1a);
  margin: 0 0 0.75rem 0;
`

export const TeamCardContainer = styled.div<{
    isCurrentTeam: boolean
    teamColor?: string
    clickable?: boolean
}>`
  padding: 1rem;
  border: 2px solid ${props => props.isCurrentTeam ? 'var(--button-bg, #007bff)' : 'var(--border-color, #e0e0e0)'};
  border-left: 6px solid ${props => props.teamColor || '#94A3B8'};
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  cursor: ${props => props.clickable ? 'pointer' : 'default'};
  background-color: ${props => props.isCurrentTeam ? 'var(--hover-bg, #f8f9fa)' : 'var(--card-bg, #ffffff)'};

  ${props => props.clickable && `
    &:hover {
      border-color: var(--secondary-text, #666666);
    }
  `}
`

export const TeamCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
`

export const TeamName = styled.h3`
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-color, #1a1a1a);
  margin: 0;
`

export const TeamColorDot = styled.div<{ color: string }>`
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 50%;
  border: 2px solid white;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  background-color: ${props => props.color};
`

export const TeamStats = styled.div`
  font-size: 0.875rem;
  color: var(--secondary-text, #666666);
  margin-bottom: 0.5rem;
`

export const CompletedBadge = styled.span`
  color: var(--green, #28a745);
  margin-left: 0.5rem;

  [data-theme='dark'] & {
    color: #34d399;
  }
`

export const PlayersList = styled.div`
  margin-top: 0.75rem;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
`

export const JoinHint = styled.div`
  margin-top: 0.75rem;
  font-size: 0.75rem;
  color: var(--button-bg, #007bff);
`

export const WarningBox = styled.div`
  padding: 1rem;
  background-color: #fffbeb;
  border: 1px solid #fcd34d;
  border-radius: 0.5rem;

  [data-theme='dark'] & {
    background-color: #451a03;
    border-color: #92400e;
  }
`

export const WarningText = styled.div`
  color: var(--orange, #fd7e14);

  [data-theme='dark'] & {
    color: #fcd34d;
  }
`

export const WarningTitle = styled.strong`
  display: block;
  margin-bottom: 0.25rem;
`

export const WarningDescription = styled.p`
  margin: 0.25rem 0 0 0;
  font-size: 0.875rem;
`

export const CreateButton = styled.button<{ fullWidth?: boolean }>`
  ${props => props.fullWidth && 'width: 100%;'}
  padding: 0.75rem 1rem;
  background-color: var(--button-bg, #007bff);
  color: var(--button-text, #ffffff);
  border: none;
  border-radius: 0.5rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover:not(:disabled) {
    background-color: var(--button-hover, #0056b3);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const CreateTeamForm = styled.div`
  padding: 1rem;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 0.5rem;
`

export const FormField = styled.div`
  margin-bottom: 1rem;
`

export const Label = styled.label`
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text-color, #1a1a1a);
  margin-bottom: 0.5rem;
`

export const Input = styled.input`
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border-color, #e0e0e0);
  border-radius: 0.375rem;
  background-color: var(--input-bg, #f5f5f5);
  color: var(--text-color, #1a1a1a);
  font-size: 0.875rem;

  &:focus {
    outline: none;
    border-color: var(--button-bg, #007bff);
    box-shadow: 0 0 0 2px var(--button-bg, #007bff)33;
  }

  &::placeholder {
    color: var(--secondary-text, #666666);
  }
`

export const ColorPickerContainer = styled.div`
  margin-bottom: 1rem;
`

export const ColorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
`

export const ColorButton = styled.button<{ color: string; selected: boolean }>`
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 2px solid ${props => props.selected ? 'var(--text-color, #1a1a1a)' : 'var(--border-color, #e0e0e0)'};
  background-color: ${props => props.color};
  cursor: pointer;
  transition: all 0.2s ease;
  transform: ${props => props.selected ? 'scale(1.1)' : 'scale(1)'};

  &:hover {
    transform: scale(1.05);
  }
`

export const FormActions = styled.div`
  display: flex;
  gap: 0.75rem;
`

export const PrimaryButton = styled.button`
  flex: 1;
  padding: 0.5rem 1rem;
  background-color: var(--green, #28a745);
  color: var(--button-text, #ffffff);
  border: none;
  border-radius: 0.375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s ease;

  &:hover:not(:disabled) {
    background-color: #1e7e34;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const SecondaryButton = styled.button`
  padding: 0.5rem 1rem;
  color: var(--secondary-text, #666666);
  background: none;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover:not(:disabled) {
    color: var(--text-color, #1a1a1a);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

export const LeaveTeamButton = styled.button`
  margin-top: 0.75rem;
  padding: 0.5rem 1rem;
  color: var(--red, #dc3545);
  background: none;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s ease;

  &:hover:not(:disabled) {
    color: #c82333;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  [data-theme='dark'] & {
    color: #f87171;
    &:hover:not(:disabled) {
      color: #fecaca;
    }
  }
`

export const TeamsGrid = styled.div`
  display: grid;
  gap: 1rem;
`

export const EmptyState = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--secondary-text, #666666);
`

export const EmptyStateIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 0.5rem;
`

export const EmptyStateText = styled.p`
  margin: 0;
`

export const EmptyStateSubtext = styled.p`
  font-size: 0.875rem;
  margin: 0.25rem 0 0 0;
`

export const GameStatusBox = styled.div`
  margin-top: 1.5rem;
  padding: 1rem;
  background-color: var(--card-bg, #ffffff);
  border-radius: 0.5rem;
`

export const StatusText = styled.div`
  font-size: 0.875rem;
  color: var(--secondary-text, #666666);
  margin-bottom: 0.25rem;
`

export const StatusLabel = styled.strong`
  color: var(--text-color, #1a1a1a);
`

export const WarningStatusText = styled.div`
  font-size: 0.875rem;
  color: var(--orange, #fd7e14);
  margin-top: 0.25rem;

  [data-theme='dark'] & {
    color: #fbbf24;
  }
`