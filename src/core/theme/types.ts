import 'expo-router/react-navigation'

export interface AppThemeColors {
	primary: string
	background: string
	card: string
	text: string
	border: string
	notification: string
	// Custom extended color tokens
	primaryContainer: string
	surface: string
	surfaceVariant: string
	modalOverlay: string
	error: string
	success: string
	warning: string
	info: string
	buttonText: string
	textSecondary: string
	textTertiary: string
	borderLight: string
	textOnPrimary: string
	inputBorder: string
}

declare module '@react-navigation/native' {
	export interface Theme {
		dark: boolean
		colors: AppThemeColors
	}
}
