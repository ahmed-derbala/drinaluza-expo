import React from 'react'
import { ThemeProvider as NavigationThemeProvider, DarkTheme as NavigationDarkTheme } from 'expo-router/react-navigation'
import { colors } from './colors'

export const DarkTheme: ReactNavigation.Theme = {
	...NavigationDarkTheme,
	colors: {
		...NavigationDarkTheme.colors,
		...colors
	}
}

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
	return <NavigationThemeProvider value={DarkTheme}>{children}</NavigationThemeProvider>
}
