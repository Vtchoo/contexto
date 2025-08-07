import styled from 'styled-components'

const HeaderContainer = styled.header`
  background: var(--card-bg);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 2rem;
  box-shadow: 0 2px 4px var(--shadow);
`

const Nav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  max-width: 1200px;
  margin: 0 auto;
`

const Logo = styled.h1`
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-color);
`

const NavLinks = styled.div`
  display: flex;
  gap: 1rem;
  align-items: center;
`

const ThemeToggle = styled.button`
  background: var(--input-bg);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 0.5rem;
  color: var(--text-color);
  transition: all 0.2s ease;

  &:hover {
    background: var(--hover-bg);
  }
`

function Header() {
  return (
    <HeaderContainer>
      <Nav>
        <Logo>CONTEXTO</Logo>
        <NavLinks>
          <ThemeToggle>🌙</ThemeToggle>
        </NavLinks>
      </Nav>
    </HeaderContainer>
  )
}

export default Header
