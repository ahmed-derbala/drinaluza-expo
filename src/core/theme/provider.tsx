import React, { createContext, useContext, useState, useEffect } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
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

export type ThemeMode = 'light' | 'dark' | 'system'

interface ThemeContextType {
	themeMode: ThemeMode
	setThemeMode: (mode: ThemeMode) => Promise<void>
	isDark: boolean
}

const ThemeContext = createContext<ThemeContextType>({
	themeMode: 'system',
	setThemeMode: async () => {},
	isDark: false
})

export const useThemeContext = () => useContext(ThemeContext)

interface ThemeProviderProps {
	children: React.ReactNode
}

export function AppThemeProvider({ children }: ThemeProviderProps) {
	const systemScheme = useColorScheme()
	const [themeMode, setThemeModeState] = useState<ThemeMode>('system')

	useEffect(() => {
		const loadThemeMode = async () => {
			try {
				const savedMode = await AsyncStorage.getItem('app_theme')
				if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
					setThemeModeState(savedMode)
				}
			} catch (e) {
				console.warn('Failed to load theme mode:', e)
			}
		}
		loadThemeMode()
	}, [])

	const setThemeMode = async (mode: ThemeMode) => {
		setThemeModeState(mode)
		try {
			await AsyncStorage.setItem('app_theme', mode)
		} catch (e) {
			console.warn('Failed to save theme mode:', e)
		}
	}

	const isDark = themeMode === 'system' ? systemScheme === 'dark' : themeMode === 'dark'
	const theme = isDark ? DarkTheme : LightTheme

	return (
		<ThemeContext.Provider value={{ themeMode, setThemeMode, isDark }}>
			<NavigationThemeProvider value={theme}>{children}</NavigationThemeProvider>
		</ThemeContext.Provider>
	)
}
