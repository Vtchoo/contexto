import "./App.css"
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { GameProvider } from './contexts/GameContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
import HomePage from './pages/HomePage'
import GamePage from './pages/GamePage'
import RoomsPage from './pages/RoomsPage'
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

function AppContent() {
  const { getThemeStyles } = useTheme()
  
  return (
    <AppContainer style={getThemeStyles('appContainer')}>
      {/* <Header /> */}
      <MainContent style={getThemeStyles('mainContent')}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/game/:roomId?" element={<GamePage />} />
          <Route path="/rooms" element={<RoomsPage />} />
        </Routes>
      </MainContent>
      <Footer />
    </AppContainer>
  )
}

function App() {
  return (
    <ThemeProvider>
      <GameProvider>
        <Router>
          <AppContent />
        </Router>
      </GameProvider>
    </ThemeProvider>
  )
}

export default App
