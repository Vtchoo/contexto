import React from 'react'
import styled from 'styled-components'
import { ThemeToggle } from './ThemeToggle'

const SettingsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: var(--card-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  box-shadow: 0 2px 4px var(--shadow);
`

const SettingsTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: 8px;
  text-align: center;
`

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);

  &:last-child {
    border-bottom: none;
  }
`

export const Settings: React.FC = () => {
  return (
    <SettingsContainer>
      <SettingsTitle>Configurações</SettingsTitle>
      <SettingRow>
        <ThemeToggle />
      </SettingRow>
    </SettingsContainer>
  )
}
