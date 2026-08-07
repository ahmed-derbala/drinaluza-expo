import packagejson from '../../package.json' with { type: 'json' }
import Constants from 'expo-constants'

export const config = {
	app: {
		env: process.env.EXPO_PUBLIC_APP_ENV || Constants.expoConfig?.extra?.APP_ENV || 'local',
		name: packagejson.name,
		version: packagejson.version
	},
	api: {
		prefix: '/api',
		url: `${process.env.EXPO_PUBLIC_BACKEND_URL}/api` || `${Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL}/api` || 'http://192.168.1.11:5001/api',
		timeout: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS) || 60000
	},
	backend: {
		url: process.env.EXPO_PUBLIC_BACKEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.11:5001'
	},
	frontend: {
		url: process.env.EXPO_PUBLIC_FRONTEND_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_FRONTEND_URL || 'https://drinaluza.com'
	},
	updates: {
		checkUrl:
			process.env.EXPO_PUBLIC_UPDATE_CHECK_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_UPDATE_CHECK_URL || 'https://api.github.com/repos/ahmed-derbala/drinaluza-expo-releases/releases/latest',
		minFreeStorage: Number(process.env.EXPO_PUBLIC_UPDATE_MIN_FREE_STORAGE_MB || Constants.expoConfig?.extra?.EXPO_PUBLIC_UPDATE_MIN_FREE_STORAGE_MB || 1000),
		maxApkInstallersCount: Number(process.env.EXPO_PUBLIC_UPDATE_MAX_APK_INSTALLERS_COUNT || Constants.expoConfig?.extra?.EXPO_PUBLIC_UPDATE_MAX_APK_INSTALLERS_COUNT || 3)
	},
	nodeEnv: process.env.EXPO_PUBLIC_NODE_ENV || Constants.expoConfig?.extra?.NODE_ENV || 'local',
	cache: {
		ttl: Number(process.env.EXPO_PUBLIC_CACHE_TTL_MS) || 60
	}
}
