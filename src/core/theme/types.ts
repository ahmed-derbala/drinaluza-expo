import 'expo-router/react-navigation'

export interface ThemeColors {
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
	error06: string
	error10: string
	error12: string
	error25: string
	error30: string
	facebook: string
	google: string
	info: string
	info06: string
	info10: string
	info12: string
	info25: string
	info30: string
	inputBorder: string
	instagram: string
	modalOverlay: string
	notification: string
	primary: string
	primary06: string
	primary10: string
	primary12: string
	primary25: string
	primary30: string
	primaryContainer: string
	primaryContainer20: string
	primaryContainer30: string
	primaryContainer40: string
	slate: string
	success: string
	success06: string
	success10: string
	success12: string
	success25: string
	success30: string
	surface: string
	surfaceVariant: string
	surfaceVariant25: string
	text: string
	textSecondary: string
	textSecondary06: string
	textSecondary10: string
	textSecondary12: string
	textSecondary25: string
	textSecondary30: string
	textTertiary: string
	textTertiary06: string
	textTertiary10: string
	textTertiary12: string
	textTertiary25: string
	textTertiary30: string
	textTertiary8: string
	tiktok: string
	warning: string
	warning06: string
	warning10: string
	warning12: string
	warning25: string
	warning30: string
	focus: string
	focus06: string
	focus10: string
	focus12: string
	focus25: string
	focus30: string
	focusContainer: string
	focusContainer20: string
	focusContainer30: string
	focusContainer40: string
	whatsApp: string
	whatsApp10: string
}

declare global {
	namespace ReactNavigation {
		interface Theme {
			dark: boolean
			colors: ThemeColors
		}
	}
}
