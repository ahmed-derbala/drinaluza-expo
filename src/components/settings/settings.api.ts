import AsyncStorage from '@react-native-async-storage/async-storage'
import { Theme } from './settings.interface'

export { Theme } from './settings.interface'

export const setTheme = async (theme: Theme) => {
	// Check if we're in a browser environment
	if (typeof window === 'undefined') {
		return // Skip AsyncStorage operations during server-side rendering
	}
	await AsyncStorage.setItem('theme', theme)
}

export const getTheme = async (): Promise<Theme> => {
	// Check if we're in a browser environment
	if (typeof window === 'undefined') {
		return 'dark' // Return default theme for server-side rendering
	}
	const theme = await AsyncStorage.getItem('theme')
	return (theme as Theme) || 'dark'
}
