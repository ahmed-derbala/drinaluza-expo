import React, { createContext, useContext } from 'react'
import { ThemeProvider as NavigationThemeProvider, DarkTheme as NavigationDarkTheme } from 'expo-router/react-navigation'
import { colors } from './colors'

export const DarkTheme: ReactNavigation.Theme = {
	...NavigationDarkTheme,
	colors: {
		...NavigationDarkTheme.colors,
		...colors
	}
}

interface ThemeContextType {
	isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>({
	isDark: true
})

export const useThemeContext = () => useContext(ThemeContext)

interface ThemeProviderProps {
	children: React.ReactNode
}

export function AppThemeProvider({ children }: ThemeProviderProps) {
	return (
		<ThemeContext.Provider value={{ isDark: true }}>
			<NavigationThemeProvider value={DarkTheme}>{children}</NavigationThemeProvider>
		</ThemeContext.Provider>
	)
}
