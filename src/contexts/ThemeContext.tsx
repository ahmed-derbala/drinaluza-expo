import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Appearance, ColorSchemeName } from 'react-native'
import { getTheme, setTheme, Theme } from '@/components/settings/settings.api'

export interface ThemeColors {
	background: string
	surface: string
	primary: string
	secondary: string
	text: string
	textSecondary: string
	border: string
	accent: string
	error: string
	success: string
	warning: string
	card: string
	button: string
	buttonText: string
	input: string
	inputBorder: string
	modal: string
	modalOverlay: string
}

const lightTheme: ThemeColors = {
	background: '#ffffff',
	surface: '#f8f9fa',
	primary: '#007bff',
	secondary: '#6c757d',
	text: '#212529',
	textSecondary: '#6c757d',
	border: '#dee2e6',
	accent: '#28a745',
	error: '#dc3545',
	success: '#28a745',
	warning: '#ffc107',
	card: '#ffffff',
	button: '#007bff',
	buttonText: '#ffffff',
	input: '#ffffff',
	inputBorder: '#ced4da',
	modal: '#ffffff',
	modalOverlay: 'rgba(0, 0, 0, 0.5)'
}

const darkTheme: ThemeColors = {
	background: '#1a1a1a',
	surface: '#2d2d2d',
	primary: '#0d6efd',
	secondary: '#6c757d',
	text: '#ffffff',
	textSecondary: '#adb5bd',
	border: '#495057',
	accent: '#20c997',
	error: '#dc3545',
	success: '#198754',
	warning: '#ffc107',
	card: '#2d2d2d',
	button: '#0d6efd',
	buttonText: '#ffffff',
	input: '#333333',
	inputBorder: '#555555',
	modal: '#2d2d2d',
	modalOverlay: 'rgba(0, 0, 0, 0.7)'
}

interface ThemeContextType {
	theme: Theme
	colors: ThemeColors
	isDark: boolean
	setTheme: (theme: Theme) => Promise<void>
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export const useTheme = () => {
	const context = useContext(ThemeContext)
	if (!context) {
		throw new Error('useTheme must be used within a ThemeProvider')
	}
	return context
}

interface ThemeProviderProps {
	children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
	const [theme, setThemeState] = useState<Theme>('dark')
	const [systemTheme, setSystemTheme] = useState<ColorSchemeName>('dark')
	const [isInitialized, setIsInitialized] = useState(false)

	// Get the effective theme (resolves 'system' to actual system theme)
	const effectiveTheme = theme === 'system' ? systemTheme : theme
	const isDark = effectiveTheme === 'dark'
	const colors = isDark ? darkTheme : lightTheme

	// Load saved theme on mount
	useEffect(() => {
		const loadTheme = async () => {
			try {
				const savedTheme = await getTheme()
				setThemeState(savedTheme)
			} catch (error) {
				console.error('Failed to load theme:', error)
			} finally {
				setIsInitialized(true)
			}
		}
		loadTheme()
	}, [])

	// Listen to system theme changes
	useEffect(() => {
		const subscription = Appearance.addChangeListener(({ colorScheme }) => {
			setSystemTheme(colorScheme)
		})

		// Set initial system theme
		setSystemTheme(Appearance.getColorScheme())

		return () => subscription?.remove()
	}, [])

	const handleSetTheme = async (newTheme: Theme) => {
		try {
			setThemeState(newTheme)
			await setTheme(newTheme)
		} catch (error) {
			console.error('Failed to save theme:', error)
		}
	}

	// Don't render children until theme is initialized
	if (!isInitialized) {
		return null
	}

	return (
		<ThemeContext.Provider
			value={{
				theme,
				colors,
				isDark,
				setTheme: handleSetTheme
			}}
		>
			{children}
		</ThemeContext.Provider>
	)
}
