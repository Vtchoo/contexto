import { useTheme } from '../contexts/ThemeContext'

export function ThemeDemo() {
  const { theme, customTheme, toggleTheme, setCustomTheme, getThemeStyles } = useTheme()

  const applyNeonTheme = () => {
    const neonTheme = {
      name: "Neon Demo",
      styles: {
        mainContent: {
          backgroundColor: '#0a0a0a',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 100%)',
          color: '#00ff00',
          padding: '20px',
          borderRadius: '10px'
        },
        row: {
          backgroundColor: 'rgba(0, 255, 0, 0.1)',
          border: '1px solid #00ff00',
          color: '#00ff00',
          textShadow: '0 0 5px #00ff00'
        },
        button: {
          backgroundColor: '#00ff00',
          color: '#000000',
          border: 'none',
          boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
        }
      }
    }
    setCustomTheme(neonTheme)
  }

  const resetTheme = () => {
    setCustomTheme(null)
  }

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px dashed #ccc', 
      margin: '20px',
      borderRadius: '8px',
      ...getThemeStyles('wrapper')
    }}>
      <h3 style={getThemeStyles('title')}>🎨 Theme System Demo</h3>
      
      <div style={{ marginBottom: '15px' }}>
        <p><strong>Current Base Theme:</strong> {theme}</p>
        <p><strong>Custom Theme:</strong> {customTheme ? customTheme.name : 'None'}</p>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
        <button 
          onClick={toggleTheme}
          style={{ 
            padding: '8px 16px', 
            borderRadius: '4px',
            ...getThemeStyles('button')
          }}
        >
          Toggle Light/Dark
        </button>
        
        <button 
          onClick={applyNeonTheme}
          style={{ 
            padding: '8px 16px', 
            borderRadius: '4px',
            backgroundColor: '#00ff00',
            color: '#000000',
            border: 'none'
          }}
        >
          Apply Neon Theme
        </button>
        
        <button 
          onClick={resetTheme}
          style={{ 
            padding: '8px 16px', 
            borderRadius: '4px',
            backgroundColor: '#dc3545',
            color: 'white',
            border: 'none'
          }}
        >
          Reset Theme
        </button>
      </div>

      <div style={{ 
        backgroundColor: 'rgba(128, 128, 128, 0.1)', 
        padding: '15px', 
        borderRadius: '4px',
        ...getThemeStyles('message')
      }}>
        <h4>Console Commands Available:</h4>
        <code style={{ display: 'block', marginTop: '10px', fontSize: '12px' }}>
          {`window.setTheme({
  name: "My Theme",
  styles: {
    mainContent: { backgroundColor: "#ff0000" },
    row: { color: "#ffffff" }
  }
})`}
        </code>
      </div>

      <div style={{ 
        marginTop: '15px',
        padding: '10px',
        border: '1px solid currentColor',
        borderRadius: '4px',
        ...getThemeStyles('row')
      }}>
        <strong>Sample themed element</strong> - This demonstrates row theming
      </div>
    </div>
  )
}