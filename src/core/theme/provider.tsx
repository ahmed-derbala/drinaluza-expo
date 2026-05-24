import React from 'react'
import { useColorScheme } from 'react-native'
import { ThemeProvider as NavigationThemeProvider, DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme, Theme } from '@react-navigation/native'
import { lightColors, darkColors } from './colors'

export const LightTheme: Theme = {
	...NavigationDefaultTheme,
	colors: {
		...NavigationDefaultTheme.colors,
		...lightColors
	}
}

export const DarkTheme: Theme = {
	...NavigationDarkTheme,
	colors: {
		...NavigationDarkTheme.colors,
		...darkColors
	}
}

interface ThemeProviderProps {
	children: React.ReactNode
}

export function AppThemeProvider({ children }: ThemeProviderProps) {
	const colorScheme = useColorScheme()
	const theme = colorScheme === 'dark' ? DarkTheme : LightTheme

	return <NavigationThemeProvider value={theme}>{children}</NavigationThemeProvider>
}
