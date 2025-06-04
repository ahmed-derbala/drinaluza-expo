import AsyncStorage from '@react-native-async-storage/async-storage'
import { Theme } from './settings.interface'

export const setTheme = async (theme: Theme) => {
	await AsyncStorage.setItem('theme', theme)
}

export const getTheme = async (): Promise<Theme> => {
	const theme = await AsyncStorage.getItem('theme')
	return (theme as Theme) || 'dark'
}
