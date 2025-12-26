// Configuration file for Drinaluza app
import packagejson from '../../package.json' with { type: 'json' }
import Constants from 'expo-constants'

export interface AppConfig {
	app: {
		name: string
		version: string
		timeout: number
		retryAttempts: number
	}
}

// Main configuration - edit these values as needed
export const config: AppConfig = {
	app: {
		name: packagejson.name,
		version: packagejson.version,
		timeout: 10000, // 10 seconds
		retryAttempts: 3
	}
}

// App configuration
export const APP_NAME = config.app.name
export const APP_VERSION = config.app.version
export const API_TIMEOUT = config.app.timeout
export const RETRY_ATTEMPTS = config.app.retryAttempts

// API URL from environment variables
export const API_PREFIX = '/api'
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL

// Debug logging to verify environment variables are loaded
if (__DEV__) {
	console.log('[Config] BACKEND_URL from process.env:', process.env.EXPO_PUBLIC_BACKEND_URL)
	console.log('[Config] BACKEND_URL from Constants:', Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL)
	console.log('[Config] Final BACKEND_URL:', BACKEND_URL)
}

export const API_URL = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}${API_PREFIX}` : undefined
