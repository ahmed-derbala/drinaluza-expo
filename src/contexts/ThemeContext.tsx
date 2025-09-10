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
	background: '#FFFFFF',
	surface: '#F8FAFC',
	surfaceVariant: '#F1F5F9',
	surfaceDisabled: 'rgba(15, 23, 42, 0.08)',

	// Text
	text: '#0F172A',
	textSecondary: '#334155',
	textTertiary: '#64748B',
	textDisabled: '#94A3B8',
	textOnPrimary: '#FFFFFF',
	textOnSecondary: '#0F172A',

	// Primary (Blue)
	primary: '#3B82F6',
	primaryLight: '#60A5FA',
	primaryDark: '#2563EB',
	primaryContainer: '#DBEAFE',

	// Secondary (Indigo)
	secondary: '#6366F1',
	secondaryLight: '#818CF8',
	secondaryDark: '#4F46E5',
	secondaryContainer: '#EEF2FF',

	// Status
	success: '#10B981', // Green 500
	error: '#EF4444', // Red 500
	warning: '#F59E0B', // Amber 500
	info: '#3B82F6', // Blue 500

	// UI Elements
	border: '#E2E8F0',
	borderLight: '#F1F5F9',
	separator: '#F1F5F9',

	// Buttons
	button: '#3B82F6',
	buttonText: '#FFFFFF',
	buttonDisabled: '#BFDBFE',
	buttonTextDisabled: '#94A3B8',

	// Inputs
	inputBackground: '#FFFFFF',
	inputBorder: '#E2E8F0',
	inputText: '#0F172A',
	inputPlaceholder: '#94A3B8',

	// Cards
	card: '#FFFFFF',
	cardElevated: '#F8FAFC',

	// Modal
	modal: '#FFFFFF',
	modalOverlay: 'rgba(15, 23, 42, 0.5)',

	// Tab Bar
	tabBar: '#FFFFFF',
	tabBarActiveTint: '#3B82F6',
	tabBarInactiveTint: '#64748B',

	// Status Bar
	statusBar: '#F8FAFC',
	statusBarContent: 'dark-content',

	// Additional colors
	accent: '#4F46E5',
	input: '#FFFFFF'
}

const darkColors: ThemeColors = {
	// Background
	background: '#0F172A',
	surface: '#1E293B',
	surfaceVariant: '#334155',
	surfaceDisabled: 'rgba(226, 232, 240, 0.12)',

	// Text
	text: '#F8FAFC',
	textSecondary: '#E2E8F0',
	textTertiary: '#94A3B8',
	textDisabled: '#64748B',
	textOnPrimary: '#F8FAFC',
	textOnSecondary: '#F8FAFC',

	// Primary (Blue)
	primary: '#60A5FA',
	primaryLight: '#93C5FD',
	primaryDark: '#3B82F6',
	primaryContainer: '#1E40AF',

	// Secondary (Indigo)
	secondary: '#818CF8',
	secondaryLight: '#A5B4FC',
	secondaryDark: '#6366F1',
	secondaryContainer: '#3730A3',

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
