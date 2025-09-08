import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Appearance, ColorSchemeName } from 'react-native'
import { getTheme, setTheme, Theme } from '../components/settings/settings.api'

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
	background: '#f8fafc',
	surface: '#ffffff',
	primary: '#2563eb', // Vibrant blue-600
	secondary: '#4f46e5', // Indigo-600
	text: '#1e293b', // Slate-800
	textSecondary: '#64748b', // Slate-500
	border: '#e2e8f0', // Slate-200
	accent: '#2563eb', // Blue-600
	error: '#dc2626', // Red-600
	success: '#16a34a', // Green-600
	warning: '#ea580c', // Orange-600
	card: '#ffffff',
	button: '#2563eb', // Blue-600
	buttonText: '#ffffff',
	input: '#ffffff',
	inputBorder: '#cbd5e1', // Slate-300
	modal: '#ffffff',
	modalOverlay: 'rgba(0, 0, 0, 0.5)'
}

const darkTheme: ThemeColors = {
	background: '#0f172a', // Slate-900
	surface: '#1e293b', // Slate-800
	primary: '#3b82f6', // Blue-500
	secondary: '#818cf8', // Indigo-400
	text: '#f8fafc', // Slate-50
	textSecondary: '#94a3b8', // Slate-400
	border: '#334155', // Slate-700
	accent: '#60a5fa', // Blue-400
	error: '#f87171', // Red-400
	success: '#4ade80', // Green-400
	warning: '#fb923c', // Orange-400
	card: '#1e293b', // Slate-800
	button: '#3b82f6', // Blue-500
	buttonText: '#ffffff',
	input: '#1e293b', // Slate-800
	inputBorder: '#334155', // Slate-700
	modal: '#1e293b', // Slate-800
	modalOverlay: 'rgba(15, 23, 42, 0.8)' // Slate-900 with opacity
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
