import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import * as Keychain from 'react-native-keychain'
import AsyncStorage from '@react-native-async-storage/async-storage'

type Timeout = ReturnType<typeof setTimeout>

// Types
export interface AuthSettings {
	// Token settings
	tokenStorageKey: string
	refreshTokenStorageKey: string
	tokenExpiryBuffer: number // in seconds

	// Session settings
	sessionTimeout: number // in milliseconds
	enableAutoSignOut: boolean

	// Security settings
	useSecureStorage: boolean
	requireBiometricAuth: boolean
	biometricPromptTitle: string
	biometricPromptSubtitle: string

	// API settings
	refreshTokenEndpoint: string
	tokenRefreshThreshold: number // in seconds
	maxRefreshAttempts: number
}

// Default settings
export const defaultAuthSettings: AuthSettings = {
	// Token settings
	tokenStorageKey: 'auth_token',
	refreshTokenStorageKey: 'refresh_token',
	tokenExpiryBuffer: 300, // 5 minutes

	// Session settings
	sessionTimeout: 1000 * 60 * 30, // 30 minutes
	enableAutoSignOut: true,

	// Security settings
	useSecureStorage: Platform.OS !== 'web',
	requireBiometricAuth: false,
	biometricPromptTitle: 'Authenticate',
	biometricPromptSubtitle: 'Please authenticate to continue',

	// API settings
	refreshTokenEndpoint: '/auth/refresh',
	tokenRefreshThreshold: 60, // 1 minute
	maxRefreshAttempts: 3
}

// Token management
export const getToken = async (settings: Partial<AuthSettings> = {}): Promise<string | null> => {
	const config = { ...defaultAuthSettings, ...settings }

	try {
		if (config.useSecureStorage) {
			if (Platform.OS === 'ios' || Platform.OS === 'android') {
				return await SecureStore.getItemAsync(config.tokenStorageKey)
			}
			// For web, fall back to Keychain
			const credentials = await Keychain.getGenericPassword({ service: config.tokenStorageKey })
			return credentials ? credentials.password : null
		}

		// Fallback to AsyncStorage if secure storage is disabled
		return await AsyncStorage.getItem(config.tokenStorageKey)
	} catch (error) {
		console.error('Error retrieving auth token:', error)
		return null
	}
}

export const setToken = async (token: string, settings: Partial<AuthSettings> = {}): Promise<boolean> => {
	const config = { ...defaultAuthSettings, ...settings }

	try {
		if (config.useSecureStorage) {
			if (Platform.OS === 'ios' || Platform.OS === 'android') {
				await SecureStore.setItemAsync(config.tokenStorageKey, token)
				return true
			}
			// For web, use Keychain
			await Keychain.setGenericPassword('auth', token, { service: config.tokenStorageKey })
			return true
		}

		// Fallback to AsyncStorage
		await AsyncStorage.setItem(config.tokenStorageKey, token)
		return true
	} catch (error) {
		console.error('Error storing auth token:', error)
		return false
	}
}

export const removeToken = async (settings: Partial<AuthSettings> = {}): Promise<boolean> => {
	const config = { ...defaultAuthSettings, ...settings }

	try {
		if (config.useSecureStorage) {
			if (Platform.OS === 'ios' || Platform.OS === 'android') {
				await SecureStore.deleteItemAsync(config.tokenStorageKey)
				return true
			}
			// For web, use Keychain
			await Keychain.resetGenericPassword({ service: config.tokenStorageKey })
			return true
		}

		// Fallback to AsyncStorage
		await AsyncStorage.removeItem(config.tokenStorageKey)
		return true
	} catch (error) {
		console.error('Error removing auth token:', error)
		return false
	}
}

// Session management
export const startSessionTimer = (onTimeout: () => void, timeoutMs: number = defaultAuthSettings.sessionTimeout): Timeout => {
	return setTimeout(() => {
		onTimeout()
	}, timeoutMs)
}

export const resetSessionTimer = (timerRef: { current: Timeout | null }, onTimeout: () => void, timeoutMs: number = defaultAuthSettings.sessionTimeout): void => {
	if (timerRef.current) {
		clearTimeout(timerRef.current)
	}
	timerRef.current = startSessionTimer(onTimeout, timeoutMs)
}

// Token validation
export const isTokenExpired = (token: string): boolean => {
	try {
		const payload = JSON.parse(atob(token.split('.')[1]))
		const currentTime = Date.now() / 1000
		return payload.exp < currentTime
	} catch (error) {
		console.error('Error checking token expiration:', error)
		return true
	}
}

// Secure storage for sensitive data
export const secureSetItem = async (key: string, value: string): Promise<boolean> => {
	try {
		if (Platform.OS === 'ios' || Platform.OS === 'android') {
			await SecureStore.setItemAsync(key, value)
		} else {
			await Keychain.setGenericPassword(key, value, { service: key })
		}
		return true
	} catch (error) {
		console.error(`Error setting secure item ${key}:`, error)
		return false
	}
}

export const secureGetItem = async (key: string): Promise<string | null> => {
	try {
		if (Platform.OS === 'ios' || Platform.OS === 'android') {
			return await SecureStore.getItemAsync(key)
		}
		const credentials = await Keychain.getGenericPassword({ service: key })
		return credentials ? credentials.password : null
	} catch (error) {
		console.error(`Error getting secure item ${key}:`, error)
		return null
	}
}

export const secureRemoveItem = async (key: string): Promise<boolean> => {
	try {
		if (Platform.OS === 'ios' || Platform.OS === 'android') {
			await SecureStore.deleteItemAsync(key)
		} else {
			await Keychain.resetGenericPassword({ service: key })
		}
		return true
	} catch (error) {
		console.error(`Error removing secure item ${key}:`, error)
		return false
	}
}
