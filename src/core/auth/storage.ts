import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'

// Secure storage functions
export const secureSetItem = async (key: string, value: string): Promise<boolean> => {
	try {
		if (Platform.OS === 'web') {
			await AsyncStorage.setItem(key, value)
		} else {
			try {
				await SecureStore.setItemAsync(key, value)
			} catch (e) {
				// Fallback to AsyncStorage if SecureStore fails
				await AsyncStorage.setItem(key, value)
			}
		}
		return true
	} catch (error) {
		console.error('Error storing item:', error)
		return false
	}
}

export const secureGetItem = async (key: string): Promise<string | null> => {
	try {
		if (Platform.OS === 'web') {
			return await AsyncStorage.getItem(key)
		} else {
			try {
				const value = await SecureStore.getItemAsync(key)
				if (value !== null) return value
				return await AsyncStorage.getItem(key)
			} catch (e) {
				return await AsyncStorage.getItem(key)
			}
		}
	} catch (error) {
		console.error('Error getting item:', error)
		return null
	}
}

export const secureRemoveItem = async (key: string): Promise<boolean> => {
	try {
		if (Platform.OS === 'web') {
			await AsyncStorage.removeItem(key)
		} else {
			try {
				await SecureStore.deleteItemAsync(key)
				await AsyncStorage.removeItem(key)
			} catch (e) {
				await AsyncStorage.removeItem(key)
			}
		}
		return true
	} catch (error) {
		console.error('Error removing item:', error)
		return false
	}
}

// Token management
export const getToken = async (): Promise<string | null> => {
	return await secureGetItem('authToken')
}

export const setToken = async (token: string): Promise<boolean> => {
	return await secureSetItem('authToken', token)
}

export const removeToken = async (): Promise<boolean> => {
	return await secureRemoveItem('authToken')
}
