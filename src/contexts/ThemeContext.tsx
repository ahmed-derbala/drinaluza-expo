import React, { createContext, useContext, useEffect, useState, ReactNode, useMemo } from 'react'
import { Appearance, ColorSchemeName, useColorScheme, StyleSheet } from 'react-native'
import { getTheme as getStoredTheme, setTheme as storeTheme, Theme as ThemeType } from '../components/settings/settings.api'

export type Theme = 'light' | 'dark' | 'system'
type SystemTheme = 'light' | 'dark'

export interface ThemeColors {
	// Background colors
	background: string
	surface: string
	surfaceVariant: string
	surfaceDisabled: string

	// Text colors
	text: string
	textSecondary: string
	textTertiary: string
	textDisabled: string
	textOnPrimary: string
	textOnSecondary: string

	// Primary colors
	primary: string
	primaryLight: string
	primaryDark: string
	primaryContainer: string

	// Secondary colors
	secondary: string
	secondaryLight: string
	secondaryDark: string
	secondaryContainer: string

	// Accent color (used in auth screens)
	accent: string

	// Input colors (used in auth screens)
	input: string

	// Status colors
	success: string
	error: string
	warning: string
	info: string

	// UI elements
	border: string
	borderLight: string
	separator: string

	// Buttons
	button: string
	buttonText: string
	buttonDisabled: string
	buttonTextDisabled: string

	// Inputs
	inputBackground: string
	inputBorder: string
	inputText: string
	inputPlaceholder: string

	// Cards
	card: string
	cardElevated: string

	// Modal
	modal: string
	modalOverlay: string

	// Tab bar
	tabBar: string
	tabBarActiveTint: string
	tabBarInactiveTint: string

	// Status bar
	statusBar: string
	statusBarContent: 'light-content' | 'dark-content'
}

const lightColors: ThemeColors = {
	// Background
	background: '#ffffff',
	surface: '#f8f9fa',
	surfaceVariant: '#e9ecef',
	surfaceDisabled: 'rgba(0, 0, 0, 0.12)',

	// Text
	text: '#212529',
	textSecondary: '#495057',
	textTertiary: '#6c757d',
	textDisabled: '#adb5bd',
	textOnPrimary: '#ffffff',
	textOnSecondary: '#000000',

	// Primary
	primary: '#2563eb',
	primaryLight: '#3b82f6',
	primaryDark: '#1d4ed8',
	primaryContainer: '#dbeafe',

	// Secondary
	secondary: '#4f46e5',
	secondaryLight: '#6366f1',
	secondaryDark: '#4338ca',
	secondaryContainer: '#e0e7ff',

	// Status
	success: '#16a34a',
	error: '#dc2626',
	warning: '#ea580c',
	info: '#0284c7',

	// UI Elements
	border: '#dee2e6',
	borderLight: '#e9ecef',
	separator: '#f1f3f5',

	// Buttons
	button: '#2563eb',
	buttonText: '#ffffff',
	buttonDisabled: '#a5b4fc',
	buttonTextDisabled: '#e2e8f0',

	// Inputs
	inputBackground: '#ffffff',
	inputBorder: '#ced4da',
	inputText: '#212529',
	inputPlaceholder: '#6c757d',

	// Cards
	card: '#ffffff',
	cardElevated: '#f8f9fa',

	// Modal
	modal: '#ffffff',
	modalOverlay: 'rgba(0, 0, 0, 0.5)',

	// Tab Bar
	tabBar: '#ffffff',
	tabBarActiveTint: '#2563eb',
	tabBarInactiveTint: '#64748b',

	// Status Bar
	statusBar: '#f8f9fa',
	statusBarContent: 'dark-content',

	// Additional colors for auth screens
	accent: '#4f46e5',
	input: '#ffffff'
}

const darkColors: ThemeColors = {
	// Background
	background: '#121212',
	surface: '#1e1e1e',
	surfaceVariant: '#2d2d2d',
	surfaceDisabled: 'rgba(255, 255, 255, 0.12)',

	// Text
	text: '#f8f9fa',
	textSecondary: '#e9ecef',
	textTertiary: '#ced4da',
	textDisabled: '#6c757d',
	textOnPrimary: '#121212',
	textOnSecondary: '#f8f9fa',

	// Primary
	primary: '#3b82f6',
	primaryLight: '#60a5fa',
	primaryDark: '#2563eb',
	primaryContainer: '#1e40af',

	// Secondary
	secondary: '#6366f1',
	secondaryLight: '#818cf8',
	secondaryDark: '#4f46e5',
	secondaryContainer: '#3730a3',

	// Status
	success: '#22c55e',
	error: '#ef4444',
	warning: '#f97316',
	info: '#0ea5e9',

	// UI Elements
	border: '#2d2d2d',
	borderLight: '#3d3d3d',
	separator: '#2a2a2a',

	// Buttons
	button: '#3b82f6',
	buttonText: '#121212',
	buttonDisabled: '#1e3a8a',
	buttonTextDisabled: '#4b5563',

	// Inputs
	inputBackground: '#2d2d2d',
	inputBorder: '#3d3d3d',
	inputText: '#f8f9fa',
	inputPlaceholder: '#9ca3af',

	// Cards
	card: '#1e1e1e',
	cardElevated: '#2d2d2d',

	// Modal
	modal: '#1e1e1e',
	modalOverlay: 'rgba(0, 0, 0, 0.7)',

	// Tab Bar
	tabBar: '#1e1e1e',
	tabBarActiveTint: '#60a5fa',
	tabBarInactiveTint: '#9ca3af',

	// Status Bar
	statusBar: '#121212',
	statusBarContent: 'light-content' as const,

	// Additional colors for auth screens
	accent: '#818cf8',
	input: '#2d2d2d'
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
	const systemColorScheme = useColorScheme() as SystemTheme | null
	const [theme, setThemeState] = useState<Theme>('system')
	const [isLoading, setIsLoading] = useState(true)

	// Load saved theme on initial render
	useEffect(() => {
		const loadTheme = async () => {
			try {
				const savedTheme = await getStoredTheme()
				if (savedTheme) {
					setThemeState(savedTheme)
				}
			} catch (error) {
				console.error('Failed to load theme', error)
			} finally {
				setIsLoading(false)
			}
		}

		loadTheme()
	}, [])

	const setTheme = async (newTheme: Theme) => {
		try {
			await storeTheme(newTheme)
			setThemeState(newTheme)
		} catch (error) {
			console.error('Failed to save theme', error)
		}
	}

	// Determine which colors to use based on theme preference
	const colors = useMemo(() => {
		const effectiveTheme = theme === 'system' ? systemColorScheme || 'light' : theme
		return effectiveTheme === 'dark' ? darkColors : lightColors
	}, [theme, systemColorScheme])

	const isDark = useMemo(() => {
		return theme === 'system' ? systemColorScheme === 'dark' : theme === 'dark'
	}, [theme, systemColorScheme])

	// Listen to system theme changes
	useEffect(() => {
		const subscription = Appearance.addChangeListener(({ colorScheme }) => {
			// Theme will be updated automatically via the useColorScheme hook
		})
		return () => subscription.remove()
	}, [])

	if (isLoading) {
		return null // or a loading spinner
	}

	return (
		<ThemeContext.Provider
			value={{
				theme,
				colors,
				isDark,
				setTheme
			}}
		>
			{children}
		</ThemeContext.Provider>
	)
}
