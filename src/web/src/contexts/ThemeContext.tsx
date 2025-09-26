import { createContext, useContext, useState, useEffect, ReactNode, CSSProperties } from 'react'

// Define the structure for distance-specific colors
export interface ThemeColors {
  close?: string    // Distance 0-999 (default: green)
  medium?: string   // Distance 1000-2999 (default: yellow)  
  far?: string      // Distance 3000+ (default: red)
}

// Define the structure for custom theme styles
export interface CustomThemeStyles {
  mainContent?: CSSProperties
  row?: CSSProperties
  rowWrapper?: CSSProperties
  outerBar?: CSSProperties
  innerBar?: CSSProperties
  word?: CSSProperties
  distance?: CSSProperties
  button?: CSSProperties
  modal?: CSSProperties
  endMessage?: CSSProperties
  topBar?: CSSProperties
  title?: CSSProperties
  infoBar?: CSSProperties
  guessHistory?: CSSProperties
  playerList?: CSSProperties
  message?: CSSProperties
  wrapper?: CSSProperties
  dropdown?: CSSProperties
  menuItem?: CSSProperties
  gameInterface?: CSSProperties
  [key: string]: CSSProperties | undefined // Allow arbitrary element names
}

export interface CustomTheme {
  name: string
  styles: CustomThemeStyles
  colors?: ThemeColors
}

interface ThemeContextType {
  theme: 'light' | 'dark'
  customTheme: CustomTheme | null
  toggleTheme: () => void
  setCustomTheme: (theme: CustomTheme | null) => void
  getThemeStyles: (elementName: keyof CustomThemeStyles) => CSSProperties
  getDistanceColor: (distance: number) => string | null
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

// Default themes for fallback
const defaultThemes: Record<string, CustomTheme> = {
  neon: {
    name: "Neon Cyber",
    styles: {
      mainContent: {
        backgroundColor: '#0a0a0a',
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a0a1a 100%)',
        color: '#00ff00'
      },
      row: {
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        border: '1px solid #00ff00',
        color: '#00ff00',
        textShadow: '0 0 5px #00ff00'
      },
      innerBar: {
        background: 'linear-gradient(90deg, #ff0080, #00ff00, #0080ff)',
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
      },
      word: {
        backgroundColor: 'rgba(0, 255, 0, 0.1)',
        border: '2px solid #00ff00',
        color: '#00ff00',
        textShadow: '0 0 5px #00ff00'
      },
      button: {
        backgroundColor: '#00ff00',
        color: '#000000',
        border: 'none',
        boxShadow: '0 0 10px rgba(0, 255, 0, 0.5)'
      }
    },
    colors: {
      close: '#00ff00',   // Bright green
      medium: '#ffff00',  // Bright yellow
      far: '#ff0080'      // Neon pink
    }
  },
  ocean: {
    name: "Ocean Depths",
    styles: {
      mainContent: {
        backgroundColor: '#001122',
        background: 'linear-gradient(180deg, #001122 0%, #002244 50%, #003366 100%)',
        color: '#87ceeb'
      },
      row: {
        backgroundColor: 'rgba(135, 206, 235, 0.1)',
        border: '1px solid rgba(135, 206, 235, 0.3)',
        borderRadius: '12px'
      },
      innerBar: {
        background: 'linear-gradient(90deg, #20b2aa, #4682b4, #1e90ff)',
        borderRadius: '10px'
      },
      word: {
        backgroundColor: 'rgba(135, 206, 235, 0.1)',
        border: '2px solid #4682b4',
        color: '#87ceeb',
        borderRadius: '10px'
      }
    },
    colors: {
      close: '#20b2aa',   // Light sea green
      medium: '#4682b4',  // Steel blue
      far: '#1e90ff'      // Dodger blue
    }
  }
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    // Check local storage first
    const savedTheme = localStorage.getItem('contexto-theme')
    if (savedTheme === 'light' || savedTheme === 'dark') {
      return savedTheme
    }
    
    // Fall back to system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })

  const [customTheme, setCustomThemeState] = useState<CustomTheme | null>(() => {
    // Load custom theme from localStorage
    try {
      const savedCustomTheme = localStorage.getItem('contexto-custom-theme')
      if (savedCustomTheme) {
        return JSON.parse(savedCustomTheme)
      }
    } catch (error) {
      console.error('Failed to load custom theme from localStorage:', error)
    }
    return null
  })

  useEffect(() => {
    // Apply base theme to document
    document.documentElement.setAttribute('data-theme', theme)
    
    // Save base theme to localStorage
    localStorage.setItem('contexto-theme', theme)
  }, [theme])

  useEffect(() => {
    // Save custom theme to localStorage
    if (customTheme) {
      localStorage.setItem('contexto-custom-theme', JSON.stringify(customTheme))
    } else {
      localStorage.removeItem('contexto-custom-theme')
    }
  }, [customTheme])

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }

  const setCustomTheme = (newTheme: CustomTheme | null) => {
    setCustomThemeState(newTheme)
  }

  const getThemeStyles = (elementName: keyof CustomThemeStyles): CSSProperties => {
    if (customTheme && customTheme.styles[elementName]) {
      const style = customTheme.styles[elementName]
      if (style && typeof style === 'object') {
        return style as CSSProperties
      }
    }
    return {}
  }

  const getDistanceColor = (distance: number): string | null => {
    if (!customTheme || !customTheme.colors) {
      return null
    }

    const colors = customTheme.colors
    
    // Determine distance category based on the same logic as getBarColor
    if (distance < 1000) {
      return colors.close || null
    } else if (distance < 3000) {
      return colors.medium || null
    } else {
      return colors.far || null
    }
  }

  // Expose theme functions to window for console access
  useEffect(() => {
    const windowWithTheme = window as any
    
    windowWithTheme.setTheme = (themeData: CustomTheme) => {
      try {
        // Validate theme structure
        if (!themeData || typeof themeData !== 'object') {
          throw new Error('Theme must be an object')
        }
        if (!themeData.name || typeof themeData.name !== 'string') {
          throw new Error('Theme must have a name property (string)')
        }
        if (!themeData.styles || typeof themeData.styles !== 'object') {
          throw new Error('Theme must have a styles property (object)')
        }

        setCustomTheme(themeData)
        console.log(`✅ Custom theme "${themeData.name}" applied successfully!`)
        return true
      } catch (error) {
        console.error('❌ Failed to apply theme:', error)
        return false
      }
    }

    windowWithTheme.resetTheme = () => {
      setCustomTheme(null)
      console.log('✅ Custom theme reset to default')
    }

    windowWithTheme.getCurrentTheme = () => {
      return {
        baseTheme: theme,
        customTheme: customTheme
      }
    }

    windowWithTheme.getDefaultThemes = () => {
      return defaultThemes
    }

    windowWithTheme.applyDefaultTheme = (themeName: string) => {
      const defaultTheme = defaultThemes[themeName]
      if (defaultTheme) {
        setCustomTheme(defaultTheme)
        console.log(`✅ Applied default theme: ${defaultTheme.name}`)
        return true
      } else {
        console.error(`❌ Default theme "${themeName}" not found. Available themes:`, Object.keys(defaultThemes))
        return false
      }
    }

    // Log helpful info for developers
    console.log('🎨 Theme system loaded! Available console commands:')
    console.log('• window.setTheme(themeObject) - Apply custom theme')
    console.log('• window.resetTheme() - Reset to default theme')  
    console.log('• window.getCurrentTheme() - Get current theme info')
    console.log('• window.getDefaultThemes() - See available default themes')
    console.log('• window.applyDefaultTheme("neon" | "ocean") - Apply a default theme')
    console.log('\nExample usage:')
    console.log('window.setTheme({')
    console.log('  name: "My Custom Theme",')
    console.log('  styles: {')
    console.log('    mainContent: { backgroundColor: "#ff0000" },')
    console.log('    row: { color: "#ffffff", border: "2px solid #00ff00" }')
    console.log('  }')
    console.log('})')

    // Cleanup
    return () => {
      delete windowWithTheme.setTheme
      delete windowWithTheme.resetTheme
      delete windowWithTheme.getCurrentTheme
      delete windowWithTheme.getDefaultThemes
      delete windowWithTheme.applyDefaultTheme
    }
  }, [theme, customTheme, setCustomTheme])

  return (
    <ThemeContext.Provider value={{ 
      theme, 
      customTheme, 
      toggleTheme, 
      setCustomTheme, 
      getThemeStyles,
      getDistanceColor
    }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
