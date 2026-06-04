import { useTheme as useNavigationTheme } from 'expo-router/react-navigation'

export { AppThemeProvider, LightTheme, DarkTheme, useThemeContext } from './provider'
export { colors, lightColors, darkColors } from './colors'
export type { AppThemeColors } from './types'

/**
 * Custom hook to access the current theme context,
 * providing standard and extended color tokens in a type-safe way.
 */
export function useTheme() {
	return useNavigationTheme()
}
