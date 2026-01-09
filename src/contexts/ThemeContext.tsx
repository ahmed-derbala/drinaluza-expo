import React, { createContext, useContext, ReactNode } from 'react'

export type Theme = 'light' | 'dark' | 'system'

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

	// Accent color
	accent: string

	// Input colors
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

const seafoodDarkColors: ThemeColors = {
	// Background - Deep Ocean Blues
	background: '#020617', // Slate 950 - effectively black/deepest blue
	surface: '#0F172A', // Slate 900
	surfaceVariant: '#1E293B', // Slate 800
	surfaceDisabled: 'rgba(30, 41, 59, 0.5)',

	// Text - High contrast light text
	text: '#F8FAFC', // Slate 50
	textSecondary: '#CBD5E1', // Slate 300
	textTertiary: '#94A3B8', // Slate 400
	textDisabled: '#475569', // Slate 600
	textOnPrimary: '#0F172A', // Dark text on bright primary
	textOnSecondary: '#FFFFFF',

	// Primary - Ocean/Sky Blue
	primary: '#38BDF8', // Sky 400 - vibrant, readable on dark
	primaryLight: '#7DD3FC', // Sky 300
	primaryDark: '#0EA5E9', // Sky 500
	primaryContainer: '#0C4A6E', // Sky 900

	// Secondary - Teal/Cyan
	secondary: '#2DD4BF', // Teal 400
	secondaryLight: '#5EEAD4', // Teal 300
	secondaryDark: '#14B8A6', // Teal 500
	secondaryContainer: '#134E4A', // Teal 800

	// Status
	success: '#34D399', // Emerald 400
	error: '#F87171', // Red 400
	warning: '#FBBF24', // Amber 400
	info: '#38BDF8', // Sky 400

	// UI Elements
	border: '#1E293B', // Slate 800
	borderLight: '#334155', // Slate 700
	separator: '#1E293B', // Slate 800

	// Buttons
	button: '#38BDF8', // Sky 400
	buttonText: '#0F172A', // Slate 900
	buttonDisabled: '#1E293B',
	buttonTextDisabled: '#64748B',

	// Inputs
	inputBackground: '#0F172A', // Slate 900
	inputBorder: '#334155', // Slate 700
	inputText: '#F8FAFC',
	inputPlaceholder: '#64748B',

	// Cards
	card: '#0F172A', // Slate 900
	cardElevated: '#1E293B', // Slate 800

	// Modal
	modal: '#0F172A',
	modalOverlay: 'rgba(2, 6, 23, 0.8)', // Slate 950 with opacity

	// Tab Bar
	tabBar: '#020617', // Slate 950
	tabBarActiveTint: '#38BDF8',
	tabBarInactiveTint: '#64748B',

	// Status Bar
	statusBar: '#020617',
	statusBarContent: 'light-content',

	// Additional colors
	accent: '#2DD4BF', // Teal 400
	input: '#0F172A'
}

interface ThemeContextType {
	theme: Theme
	colors: ThemeColors
	isDark: boolean
	setTheme: (theme: Theme) => Promise<void>
}

const ThemeContext = createContext<ThemeContextType>({
	theme: 'dark',
	colors: seafoodDarkColors,
	isDark: true,
	setTheme: async () => {}
})

export const useTheme = () => useContext(ThemeContext)

interface ThemeProviderProps {
	children: ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
	// No state needed, always return the fixed theme
	return (
		<ThemeContext.Provider
			value={{
				theme: 'dark',
				colors: seafoodDarkColors,
				isDark: true,
				setTheme: async () => {} // No-op
			}}
		>
			{children}
		</ThemeContext.Provider>
	)
}
