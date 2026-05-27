// Configuration file for Drinaluza app
import packagejson from '../../package.json' with { type: 'json' }
import Constants from 'expo-constants'

interface AppConfig {
	app: {
		name: string
		version: string
		timeout: number
		retryAttempts: number
	}
}

// Main configuration - edit these values as needed
const config: AppConfig = {
	app: {
		name: packagejson.name,
		version: packagejson.version,
		timeout: 60000, // 1 minute
		retryAttempts: 3
	}
}

// App configuration
export const APP_NAME = config.app.name
export const APP_VERSION = config.app.version
export const API_TIMEOUT = config.app.timeout
const RETRY_ATTEMPTS = config.app.retryAttempts

// API URL from environment variables
export const API_PREFIX = '/api'
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL
export const NODE_ENV = process.env.EXPO_PUBLIC_NODE_ENV || Constants.expoConfig?.extra?.NODE_ENV || 'development'

export const API_URL = BACKEND_URL ? `${BACKEND_URL.replace(/\/$/, '')}${API_PREFIX}` : undefined

export const UPDATE_CHECK_URL =
	process.env.EXPO_PUBLIC_UPDATE_CHECK_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_UPDATE_CHECK_URL || 'https://api.github.com/repos/ahmed-derbala/drinaluza-expo-releases/releases/latest'
export const UPDATE_DOWNLOAD_ROOT_URL =
	process.env.EXPO_PUBLIC_UPDATE_DOWNLOAD_ROOT_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_UPDATE_DOWNLOAD_ROOT_URL || 'https://github.com/ahmed-derbala/drinaluza-expo-releases/releases/download'
