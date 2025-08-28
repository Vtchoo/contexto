import React, { useRef, useEffect, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (username: string) => void;
  initialUsername?: string;
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translate(-50%, calc(-50% + 16px)); }
  to { opacity: 1; transform: translate(-50%, -50%); }
`;

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
  width: 100%;
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
  &:disabled {
    background: var(--disabled-bg, #ccc);
    cursor: not-allowed;
  }
`;

export const EditUserModal: React.FC<EditUserModalProps> = ({ isOpen, onClose, onSave, initialUsername = '' }) => {
  const [username, setUsername] = useState(initialUsername);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    setUsername(initialUsername);
  }, [initialUsername, isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.show();
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

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
    if (username.trim().length > 0) {
      onSave(username.trim());
    }
  };

  const usernameIsValid = username.trim().length > 0;

  return (
    <StyledDialog ref={dialogRef} aria-modal="true">
      <ModalContent>
        <form onSubmit={handleSubmit}>
          <Row>
            <Label htmlFor="username">Nome de usuário</Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              $invalid={!usernameIsValid}
              placeholder="Digite o nome de usuário"
              autoFocus
            />
          </Row>
          <ButtonRow>
            <Button type="button" data-variant="cancel" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={!usernameIsValid}>Salvar</Button>
          </ButtonRow>
        </form>
      </ModalContent>
    </StyledDialog>
  );
};

export default EditUserModal;
