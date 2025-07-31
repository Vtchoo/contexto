
import { GameMode } from '@/api/gameApi';
import React, { useState, useRef, useEffect } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { getTodaysGameId } from '../../../utils/misc';

interface CustomGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (options: {
    gameMode: GameMode;
    allowTips: boolean;
    allowGiveUp: boolean;
    maxPlayers: number;
    gameId?: number | Date | 'random';
  }) => void;
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)); }
  to { opacity: 1; transform: translate(-50%, -50%); }
`

const StyledDialog = styled.dialog`
  border: none;
  border-radius: 16px;
  padding: 0;
  background: var(--card-bg, #fff);
  min-width: 340px;
  box-shadow: 0 4px 32px rgba(0,0,0,0.18);
  color: var(--text-color, #222);
  font-family: inherit;
  overflow: visible;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  margin: 0;
  z-index: 1001;
  &[open] {
    animation: ${fadeIn} 0.18s;
  }
  &::backdrop {
    background: rgba(0,0,0,0.5);
    z-index: 1000;
  }
`;

const ModalContent = styled.div`
  padding: 2.2rem 2.5rem 1.5rem 2.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;

const Row = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.2rem;
  margin-bottom: 0.2rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: var(--text-color, #222);
  font-size: 1rem;
`;

const Select = styled.select`
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  border: 1.5px solid var(--border-color, #d1d5db);
  background: var(--input-bg, #f8f9fa);
  color: var(--text-color, #222);
  font-size: 1rem;
`;

const Checkbox = styled.input`
  width: 20px;
  height: 20px;
  accent-color: var(--button-bg, #2d72d9);
`;

const Input = styled.input<{ $invalid?: boolean }>`
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  border: 1.5px solid var(--border-color, #d1d5db);
  background: var(--input-bg, #f8f9fa);
  color: var(--text-color, #222);
  ${({ $invalid }) => $invalid && css`
    border-color: red;
    background: rgba(255, 0, 0, 0.1);
  `}
  width: 70px;
  font-size: 1rem;
`;

const ButtonRow = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 1.2rem;
  margin-top: 1.2rem;
`;

const Button = styled.button`
  padding: 0.6rem 1.4rem;
  border-radius: 8px;
  border: none;
  background: var(--button-bg, #2d72d9);
  color: var(--button-text, #fff);
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.18s;
  &:hover {
    background: var(--button-hover, #1a4e96);
  }
  &[data-variant='cancel'] {
    background: var(--input-bg, #eee);
    color: var(--text-color, #333);
    &:hover {
      background: #ddd;
    }
  }
`;

interface GameIdSelection {
  type: 'today' | 'id' | 'date' | 'random';
  id?: number | Date | 'random';
}

export const CustomGameModal: React.FC<CustomGameModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [gameMode, setGameMode] = useState<GameMode>('default');
  const [allowTips, setAllowTips] = useState(true);
  const [allowGiveUp, setAllowGiveUp] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [gameId, setGameId] = useState<GameIdSelection | undefined>({ type: 'today' });
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open/close dialog imperatively
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.show();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Close on backdrop click
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };
    dialog.addEventListener('cancel', handleCancel);
    return () => dialog.removeEventListener('cancel', handleCancel);
  }, [onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      gameMode,
      allowTips,
      allowGiveUp,
      maxPlayers,
      gameId: gameId?.id
    });
  };

  return (
    <StyledDialog ref={dialogRef} aria-modal="true">
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <Row>
            <Label htmlFor="gameMode">Modo de Jogo</Label>
            <Select id="gameMode" value={gameMode} onChange={e => setGameMode(e.target.value as GameMode)}>
              <option value="default">Clássico</option>
              <option value="competitive">Competitivo</option>
              <option value="battle-royale">Battle Royale</option>
              <option value="stop">Stop</option>
            </Select>
          </Row>
          <Row>
            <Label htmlFor="allowTips">Permitir dicas</Label>
            <Checkbox
              id="allowTips"
              type="checkbox"
              checked={allowTips}
              onChange={e => setAllowTips(e.target.checked)}
            />
          </Row>
          <Row>
            <Label htmlFor="allowGiveUp">Permitir desistir</Label>
            <Checkbox
              id="allowGiveUp"
              type="checkbox"
              checked={allowGiveUp}
              onChange={e => setAllowGiveUp(e.target.checked)}
            />
          </Row>
          <Row>
            <Label htmlFor="maxPlayers">Máx. Jogadores</Label>
            <Input
              id="maxPlayers"
              type="number"
              min={2}
              max={50}
              value={maxPlayers}
              onChange={e => setMaxPlayers(Number(e.target.value))}
            />
          </Row>
          <Row>
            <Button type="button" data-variant={gameId?.type !== "today" ? "cancel" : undefined} onClick={() => setGameId({ type: 'today' })}>Jogo de hoje</Button>
            <Button type="button" data-variant={gameId?.type !== "id" ? "cancel" : undefined} onClick={() => setGameId({ type: 'id' })}>ID</Button>
            <Button type="button" data-variant={gameId?.type !== "date" ? "cancel" : undefined} onClick={() => setGameId({ type: 'date' })}>Data</Button>
            <Button type="button" data-variant={gameId?.type !== "random" ? "cancel" : undefined} onClick={() => setGameId({ type: 'random', id: 'random' })}>Aleatório</Button>
          </Row>
          {gameId && (
            <Row style={{ justifyContent: 'center' }}>
              {gameId.type === 'id' && (
                <Input
                  type="number"
                  placeholder="Digite o ID"
                  value={gameId.id?.toString() || ''}
                  onChange={e => setGameId({ ...gameId, id: Number(e.target.value) })}
                  style={{ width: 120 }}
                  max={getTodaysGameId()}
                  $invalid={Number(gameId.id) > getTodaysGameId()}
                />
              )}
              {gameId.type === 'date' && (
                <Input
                  type="date"
                  value={gameId.id?.toISOString().split('T')[0] || ''}
                  onChange={e => setGameId({ ...gameId, id: new Date(e.target.value) })}
                  style={{ width: 160 }}
                  $invalid={new Date(gameId.id).getTime() > new Date().getTime()}
                />
              )}
            </Row>
          )}
          <ButtonRow>
            <Button type="button" data-variant="cancel" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Criar</Button>
          </ButtonRow>
        </form>
      </ModalContent>
    </StyledDialog>
  );
};

export default CustomGameModal;
