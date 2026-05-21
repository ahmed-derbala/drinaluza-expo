/**
 * Drinaluza Theme Context
 *
 * This app uses ONLY a dark theme with blue variants.
 * No light theme or theme switching is supported.
 */

import React, { ReactNode } from 'react'
import { colors, theme, ThemeColors, Theme } from '../theme'

/**
 * Hook to access the app's dark theme
 * @returns The dark theme colors and configuration
 */
export const useTheme = () => {
	return {
		colors,
		theme
	}
}

/**
 * Theme Provider - Kept for compatibility but doesn't do anything
 * since we only have one static dark theme
 */
export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	return <>{children}</>
}

// Re-export theme types and constants for convenience
export type { ThemeColors, Theme }
export { colors, theme }
