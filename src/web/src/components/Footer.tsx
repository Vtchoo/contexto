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
      <a href="https://github.com/Vtchoo" target="_blank"><p>Feito com ❤️ por Vtchoo</p></a>
      <a href="https://contexto.me" target="_blank"><p>Jogo original aqui</p></a>
    </FooterContainer>
  )
}

export default Footer
