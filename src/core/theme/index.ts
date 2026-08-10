import { useTheme as useNavigationTheme } from 'expo-router/react-navigation'

export { AppThemeProvider, DarkTheme } from './provider'
export { themeColors } from './themeColors'
export type { ThemeColors } from './types'

/**
 * Custom hook to access the current theme context,
 * providing standard and extended color tokens in a type-safe way.
 */
export function useTheme() {
	return useNavigationTheme()
}
