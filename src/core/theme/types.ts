import 'expo-router/react-navigation'

export interface AppThemeColors {
	background: string
	background0: string
	background25: string
	background5: string
	background50: string
	background75: string
	background95: string
	backgroundSecondary: string
	border: string
	buttonText: string
	buttonText10: string
	buttonText20: string
	buttonText30: string
	buttonText40: string
	buttonText5: string
	email: string
	email10: string
	error: string
	facebook: string
	google: string
	info: string
	inputBorder: string
	instagram: string
	modalOverlay: string
	notification: string
	primary: string
	primaryContainer: string
	primaryContainer20: string
	primaryContainer30: string
	primaryContainer40: string
	slate: string
	success: string
	surface: string
	surfaceVariant: string
	surfaceVariant25: string
	text: string
	textSecondary: string
	textTertiary: string
	textTertiary8: string
	tiktok: string
	warning: string
	warning10: string
	whatsApp: string
	whatsApp10: string
}

declare global {
	namespace ReactNavigation {
		interface Theme {
			dark: boolean
			colors: AppThemeColors
		}
	}
}
