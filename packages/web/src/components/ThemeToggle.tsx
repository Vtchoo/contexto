import React from 'react'
import styled from 'styled-components'
import { useGame } from '../contexts/GameContext'

const ToggleContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
`

const ToggleButton = styled.button<{ $active: boolean }>`
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  background: ${props => props.$active ? 'var(--primary-color)' : 'var(--background-color)'};
  color: ${props => props.$active ? 'var(--background-color)' : 'var(--text-color)'};
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.$active ? 'var(--primary-color)' : 'var(--secondary-background)'};
  }
`

const Label = styled.span`
  font-size: 14px;
  color: var(--text-color);
  font-weight: 500;
`

export const ThemeToggle: React.FC = () => {
  const { settings, setTheme } = useGame()

  return (
    <ToggleContainer>
      <Label>Tema:</Label>
      <ToggleButton
        $active={settings.theme === 'light'}
        onClick={() => setTheme('light')}
        title="Modo claro"
      >
        ☀️ Claro
      </ToggleButton>
      <ToggleButton
        $active={settings.theme === 'dark'}
        onClick={() => setTheme('dark')}
        title="Modo escuro"
      >
        🌙 Escuro
      </ToggleButton>
      <ToggleButton
        $active={settings.theme === 'auto'}
        onClick={() => setTheme('auto')}
        title="Automático (sistema)"
      >
        🔄 Auto
      </ToggleButton>
    </ToggleContainer>
  )
}
