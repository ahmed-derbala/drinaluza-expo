import { useTheme as useNavigationTheme } from 'expo-router/react-navigation'
import { Platform } from 'react-native'

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

interface ShadowOptions {
	offsetY?: number
	opacity?: number
	radius?: number
	elevation?: number
	color?: string
}

export function createShadow({ offsetY = 2, opacity = 0.1, radius = 4, elevation = 2, color = '#000000' }: ShadowOptions = {}): any {
	let cssColor = `rgba(0, 0, 0, ${opacity})`
	if (color.startsWith('#')) {
		try {
			let c = color.replace('#', '')
			if (c.length === 3) {
				c = c
					.split('')
					.map((char) => char + char)
					.join('')
			}
			const r = parseInt(c.substring(0, 2), 16)
			const g = parseInt(c.substring(2, 4), 16)
			const b = parseInt(c.substring(4, 6), 16)
			cssColor = `rgba(${r}, ${g}, ${b}, ${opacity})`
		} catch (e) {
			cssColor = color
		}
	} else {
		cssColor = color
	}

	return Platform.select({
		ios: {
			shadowColor: color,
			shadowOffset: { width: 0, height: offsetY },
			shadowOpacity: opacity,
			shadowRadius: radius
		},
		android: {
			elevation
		},
		web: {
			boxShadow: `0px ${offsetY}px ${radius * 2}px ${cssColor}`
		},
		default: {}
	})
}

export function createColorShadow(options: ShadowOptions): any {
	return createShadow(options)
}
