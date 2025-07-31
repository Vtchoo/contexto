
import { GameMode } from '@/api/gameApi';
import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';

interface CustomGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (options: {
    gameMode: GameMode;
    allowTips: boolean;
    allowGiveUp: boolean;
    maxPlayers: number;
    customGameId?: string;
    customDate?: string;
  }) => void;
}

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
    animation: fadeIn 0.18s;
  }
  &::backdrop {
    background: rgba(0,0,0,0.5);
    z-index: 1000;
  }
  /* @keyframes fadeIn {
    from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)); }
    to { opacity: 1; transform: translate(-50%, -50%); }
  } */
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

const Input = styled.input`
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  border: 1.5px solid var(--border-color, #d1d5db);
  background: var(--input-bg, #f8f9fa);
  color: var(--text-color, #222);
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


export const CustomGameModal: React.FC<CustomGameModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [gameMode, setGameMode] = useState<GameMode>('default');
  const [allowTips, setAllowTips] = useState(true);
  const [allowGiveUp, setAllowGiveUp] = useState(true);
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [customGameId, setCustomGameId] = useState('');
  const [customDate, setCustomDate] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Open/close dialog imperatively
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
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

  const handleRandomId = () => {
    // Simple random string (could use snowflake or uuid if available)
    setCustomGameId(Math.random().toString(36).slice(2, 10).toUpperCase());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      gameMode,
      allowTips,
      allowGiveUp,
      maxPlayers,
      customGameId: customGameId.trim() || undefined,
      customDate: customDate.trim() || undefined,
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
            <Label htmlFor="customGameId">ID da Sala</Label>
            <Input
              id="customGameId"
              type="text"
              placeholder="(opcional)"
              value={customGameId}
              onChange={e => setCustomGameId(e.target.value.toUpperCase())}
              style={{ width: 120 }}
            />
            <Button type="button" style={{ minWidth: 0, padding: '0.4rem 0.7rem' }} onClick={handleRandomId}>Aleatório</Button>
          </Row>
          <Row>
            <Label htmlFor="customDate">Data</Label>
            <Input
              id="customDate"
              type="date"
              value={customDate}
              onChange={e => setCustomDate(e.target.value)}
              style={{ width: 160 }}
            />
          </Row>
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
