import React from 'react'
import { ThemeProvider as NavigationThemeProvider, DarkTheme as NavigationDarkTheme } from 'expo-router/react-navigation'
import { themeColors } from './themeColors'

export const DarkTheme: ReactNavigation.Theme = {
	...NavigationDarkTheme,
	colors: {
		...NavigationDarkTheme.colors,
		...themeColors
	}
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
	return <NavigationThemeProvider value={DarkTheme}>{children}</NavigationThemeProvider>
}
