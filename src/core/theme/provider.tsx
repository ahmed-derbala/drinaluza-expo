import React, { createContext, useContext, useState, useEffect } from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { ThemeProvider as NavigationThemeProvider, DefaultTheme as NavigationDefaultTheme, DarkTheme as NavigationDarkTheme, Theme } from 'expo-router/react-navigation'
import { lightColors, darkColors } from './colors'
import { log } from '@/core/log'

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
	themeMode: 'dark',
	setThemeMode: async () => {},
	isDark: true
})

export const useThemeContext = () => useContext(ThemeContext)

interface ThemeProviderProps {
	children: React.ReactNode
}

export function AppThemeProvider({ children }: ThemeProviderProps) {
	const systemScheme = useColorScheme()
	const [themeMode, setThemeModeState] = useState<ThemeMode>('dark')

	useEffect(() => {
		const loadThemeMode = async () => {
			try {
				const savedMode = await AsyncStorage.getItem('app_theme')
				if (savedMode === 'light' || savedMode === 'dark' || savedMode === 'system') {
					setThemeModeState(savedMode)
				} else {
					setThemeModeState('dark')
				}
			} catch (e) {
				log({ level: 'warn', label: 'AppThemeProvider', message: 'Failed to load theme mode', error: e })
			}
		}
		loadThemeMode()
	}, [])

	const setThemeMode = async (mode: ThemeMode) => {
		setThemeModeState(mode)
		try {
			await AsyncStorage.setItem('app_theme', mode)
		} catch (e) {
			log({ level: 'warn', label: 'AppThemeProvider', message: 'Failed to save theme mode', error: e })
		}
	}

	const isDark = true
	const theme = DarkTheme

	return (
		<ThemeContext.Provider value={{ themeMode: 'dark', setThemeMode: async () => {}, isDark }}>
			<NavigationThemeProvider value={theme}>{children}</NavigationThemeProvider>
		</ThemeContext.Provider>
	)
}
