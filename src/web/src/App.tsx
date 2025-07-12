import "./App.css"
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { GameProvider } from './contexts/GameContext'
import { ThemeProvider } from './contexts/ThemeContext'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import RoomsPage from './pages/RoomsPage'
import Header from './components/Header'
import Footer from './components/Footer'
import styled from 'styled-components'

const AppContainer = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`

const MainContent = styled.main`
  flex: 1;
  display: flex;
  flex-direction: column;
`

function App() {
  return (
    <ThemeProvider>
      <GameProvider>
        <Router>
          <AppContainer>
            {/* <Header /> */}
            <MainContent>
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/game/:roomId?" element={<GamePage />} />
                <Route path="/rooms" element={<RoomsPage />} />
              </Routes>
            </MainContent>
            <Footer />
          </AppContainer>
        </Router>
      </GameProvider>
    </ThemeProvider>
  )
}

export default App
