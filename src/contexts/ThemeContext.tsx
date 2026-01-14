import React, { createContext, useContext, ReactNode } from 'react'
import { colors, theme, ThemeColors, Theme } from '../constants/theme'

interface ThemeContextType {
	colors: ThemeColors
	theme: Theme
}

const ThemeContext = createContext<ThemeContextType>({
	colors,
	theme
})

export const useTheme = () => useContext(ThemeContext)

interface ThemeProviderProps {
	children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
	return (
		<ThemeContext.Provider
			value={{
				colors,
				theme
			}}
		>
			{children}
		</ThemeContext.Provider>
	)
}

// Re-export theme types for convenience
export type { ThemeColors, Theme }
