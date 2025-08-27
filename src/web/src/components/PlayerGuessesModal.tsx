import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { userApi, Guess } from '../api/gameApi';
import Row from './original_Row';

interface PlayerGuessesModalProps {
  isOpen: boolean;
  onClose: () => void;
  playerId: string;
  playerUsername?: string;
  roomId: string;
}

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
`;

const ModalContent = styled.div`
  background: var(--background-color, #fff);
  border-radius: 8px;
  padding: 1.5rem;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color, #e0e0e0);
  padding-bottom: 1rem;
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: var(--text-color, #333);
  font-size: 1.25rem;
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--secondary-text, #666);
  padding: 0.25rem;
  border-radius: 4px;
  
  &:hover {
    background-color: var(--hover-bg, #f0f0f0);
  }
`;

const LoadingMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--secondary-text, #666);
`;

const ErrorMessage = styled.div`
  text-align: center;
  padding: 2rem;
  color: var(--error-color, #d32f2f);
`;

const GuessesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const GuessCount = styled.div`
  margin-bottom: 1rem;
  padding: 0.75rem;
  background-color: var(--card-bg, #f8f9fa);
  border-radius: 6px;
  font-weight: 500;
  text-align: center;
  color: var(--text-color, #333);
`;

export const PlayerGuessesModal: React.FC<PlayerGuessesModalProps> = ({
  isOpen,
  onClose,
  playerId,
  playerUsername,
  roomId
}) => {
  const [guesses, setGuesses] = useState<Guess[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && playerId && roomId) {
      fetchPlayerGuesses();
    }
  }, [isOpen, playerId, roomId]);

  const fetchPlayerGuesses = async () => {
    setLoading(true);
    setError(null);
    try {
      const { guesses: playerGuesses } = await userApi.getPlayerGuesses(roomId, playerId);
      setGuesses(playerGuesses);
    } catch (err) {
      console.error('Failed to fetch player guesses:', err);
      setError('Falha ao carregar tentativas do jogador');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  const validGuesses = guesses.filter(guess => !guess.error);
  const sortedGuesses = [...validGuesses].sort((a, b) => a.distance - b.distance);

  return (
    <ModalOverlay onClick={handleOverlayClick}>
      <ModalContent>
        <ModalHeader>
          <ModalTitle>
            Tentativas de {playerUsername || `Jogador ${playerId}`}
          </ModalTitle>
          <CloseButton onClick={onClose} aria-label="Fechar">
            ×
          </CloseButton>
        </ModalHeader>

        {loading && (
          <LoadingMessage>
            Carregando tentativas...
          </LoadingMessage>
        )}

        {error && (
          <ErrorMessage>
            {error}
          </ErrorMessage>
        )}

        {!loading && !error && (
          <>
            <GuessCount>
              {validGuesses.length} tentativa{validGuesses.length !== 1 ? 's' : ''}
              {validGuesses.length > 0 && (
                <> • Melhor: {Math.min(...validGuesses.map(g => g.distance)) + 1}</>
              )}
            </GuessCount>

            <GuessesContainer>
              {sortedGuesses.length > 0 ? (
                sortedGuesses.map((guess, index) => (
                  <Row
                    key={`${guess.word}-${index}`}
                    word={guess.word}
                    distance={guess.distance}
                    highlight={false}
                  />
                ))
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '2rem', 
                  color: 'var(--secondary-text, #666)' 
                }}>
                  Nenhuma tentativa encontrada
                </div>
              )}
            </GuessesContainer>
          </>
        )}
      </ModalContent>
    </ModalOverlay>
  );
};
