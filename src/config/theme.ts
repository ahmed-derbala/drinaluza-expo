/**
 * Drinaluza Theme Configuration
 *
 * ⚠️ IMPORTANT: This app ONLY supports dark theme with blue variants.
 * There is NO light theme, NO theme switching, and NO theme customization.
 *
 * The dark ocean blue theme is specifically designed for seafood business
 * management and provides optimal visibility and professional appearance.
 *
 * Color Palette:
 * - Background: Deep ocean blues (Slate 950, 900, 800)
 * - Primary: Sky blue (#38BDF8) - vibrant and readable
 * - Secondary: Teal (#2DD4BF) - seafood accent
 * - Text: High contrast light colors for readability
 */

// Deep Ocean Blue Color Palette
export const colors = {
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

	// Secondary - Teal/Cyan (Seafood accent)
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
	input: '#0F172A',

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
	statusBarContent: 'light-content' as const,

	// Additional colors
	accent: '#2DD4BF' // Teal 400
} as const

// Spacing system
export const spacing = {
	xs: 4,
	sm: 8,
	md: 16,
	lg: 24,
	xl: 32,
	xxl: 48
} as const

// Border radius
export const radius = {
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	full: 9999
} as const

// Typography
export const typography = {
	sizes: {
		xs: 11,
		sm: 13,
		md: 15,
		lg: 17,
		xl: 20,
		xxl: 24,
		display: 32
	},
	weights: {
		normal: '400' as const,
		medium: '500' as const,
		semibold: '600' as const,
		bold: '700' as const,
		extrabold: '800' as const
	}
} as const

// Shadows for elevation
export const shadows = {
	sm: {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.2,
		shadowRadius: 2,
		elevation: 2
	},
	md: {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 6
	},
	lg: {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.4,
		shadowRadius: 20,
		elevation: 10
	},
	glow: (color: string) => ({
		shadowColor: color,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 12,
		elevation: 8
	})
} as const

// Export theme object
export const theme = {
	colors,
	spacing,
	radius,
	typography,
	shadows
} as const

export type ThemeColors = typeof colors
export type Theme = typeof theme
