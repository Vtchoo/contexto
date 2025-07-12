import React from 'react'
import styled from 'styled-components'

const FooterContainer = styled.footer`
  background: var(--card-bg);
  border-top: 1px solid var(--border-color);
  padding: 2rem;
  margin-top: auto;
  text-align: center;
  color: var(--secondary-text);
`

function Footer() {
  return (
    <FooterContainer>
      <p>&copy; 2025 Contexto Web. Built with React & TypeScript.</p>
    </FooterContainer>
  )
}

export default Footer
