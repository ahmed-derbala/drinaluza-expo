import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { log } from '@/core/log'

// List of all known secure keys used in the app
const SECURE_KEYS = ['authToken', 'refreshToken', 'userData', 'user._id', 'user.slug', 'user.settings', 'saved_authentications', 'expoPushToken']

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
		log({
			level: 'error',
			label: 'storage',
			message: `Error secure-storing item for key: ${key}`,
			error
		})
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
		log({
			level: 'error',
			label: 'storage',
			message: `Error secure-getting item for key: ${key}`,
			error
		})
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
		log({
			level: 'error',
			label: 'storage',
			message: `Error secure-removing item for key: ${key}`,
			error
		})
		return false
	}
}

// Regular (non-secure) storage functions
export const setItem = async (key: string, value: any): Promise<boolean> => {
	try {
		const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
		await AsyncStorage.setItem(key, stringValue)
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: `Error setting item for key: ${key}`,
			error
		})
		return false
	}
}

export const getItem = async <T>(key: string): Promise<T | null> => {
	try {
		const value = await AsyncStorage.getItem(key)
		if (value === null) return null
		try {
			return JSON.parse(value) as T
		} catch {
			return value as unknown as T
		}
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: `Error getting item for key: ${key}`,
			error
		})
		return null
	}
}

export const removeItem = async (key: string): Promise<boolean> => {
	try {
		await AsyncStorage.removeItem(key)
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: `Error removing item for key: ${key}`,
			error
		})
		return false
	}
}

export const multiRemove = async (keys: string[]): Promise<boolean> => {
	try {
		await AsyncStorage.multiRemove(keys)
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: `Error multi-removing keys: ${keys.join(', ')}`,
			error
		})
		return false
	}
}

export const getAllKeys = async (): Promise<string[]> => {
	try {
		const keys = await AsyncStorage.getAllKeys()
		return [...keys]
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: 'Error getting all storage keys',
			error
		})
		return []
	}
}

// Token management shortcuts
export const getToken = async (): Promise<string | null> => {
	return await secureGetItem('authToken')
}

export const setToken = async (token: string): Promise<boolean> => {
	return await secureSetItem('authToken', token)
}

export const removeToken = async (): Promise<boolean> => {
	return await secureRemoveItem('authToken')
}

// Mass storage clear functions
export const clearAllStorage = async (): Promise<boolean> => {
	try {
		// 1. Clear AsyncStorage completely
		await AsyncStorage.clear()

		// 2. Clear known SecureStore keys
		if (Platform.OS !== 'web') {
			for (const key of SECURE_KEYS) {
				try {
					await SecureStore.deleteItemAsync(key)
				} catch (e) {
					// Ignore failures on individual keys
				}
			}
		}

		// 3. Clear web storage
		if (Platform.OS === 'web') {
			localStorage.clear()
			sessionStorage.clear()
		}

		log({
			level: 'info',
			label: 'storage',
			message: 'App storage wiped completely (Reset App)'
		})
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: 'Failed to completely clear app storage',
			error
		})
		return false
	}
}

/**
 * Clears everything from storage except saved authentications.
 * Typically used when switching user accounts.
 */
export const clearStorageExceptSavedAuths = async (): Promise<boolean> => {
	try {
		const SAVED_AUTHS_KEY = 'saved_authentications'

		// 1. Get all keys from AsyncStorage, filter and multiRemove
		const allKeys = await AsyncStorage.getAllKeys()
		const keysToRemove = allKeys.filter((key) => key !== SAVED_AUTHS_KEY)
		await AsyncStorage.multiRemove(keysToRemove)

		// 2. Clear SecureStore keys except SAVED_AUTHS_KEY
		if (Platform.OS !== 'web') {
			for (const key of SECURE_KEYS) {
				if (key !== SAVED_AUTHS_KEY) {
					try {
						await SecureStore.deleteItemAsync(key)
					} catch (e) {
						// Ignore failures on individual keys
					}
				}
			}
		}

		log({
			level: 'info',
			label: 'storage',
			message: 'Cleared app storage except saved accounts'
		})
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: 'Failed to clear storage except saved authentications',
			error
		})
		return false
	}
}
