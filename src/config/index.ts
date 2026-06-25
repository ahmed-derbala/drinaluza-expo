import packagejson from '../../package.json' with { type: 'json' }
import Constants from 'expo-constants'

const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.11:5001'

export const config = {
	app: {
		name: packagejson.name,
		version: packagejson.version,
		timeout: Number(process.env.EXPO_PUBLIC_TIMEOUT_MS) || 60000,
		retryAttempts: 3
	},
	backend: {
		url: backendUrl
	},
	api: {
		prefix: '/api',
		url: backendUrl ? `${backendUrl.replace(/\/$/, '')}/api` : undefined
	},
	frontend: {
		url: process.env.EXPO_PUBLIC_FRONTEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_FRONTEND_URL || 'https://drinaluza.vercel.app'
	},
	updateCheckUrl:
		process.env.EXPO_PUBLIC_UPDATE_CHECK_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_UPDATE_CHECK_URL || 'https://api.github.com/repos/ahmed-derbala/drinaluza-expo-releases/releases/latest',
	NODE_ENV: process.env.EXPO_PUBLIC_NODE_ENV || Constants.expoConfig?.extra?.NODE_ENV || 'local'
}
