import packagejson from '../../package.json' with { type: 'json' }
import Constants from 'expo-constants'

const env = (key: string, fallback: string) => {
	const fromProcess = process.env[key]
	if (typeof fromProcess === 'string' && fromProcess.length > 0) return fromProcess
	const fromExtra = Constants.expoConfig?.extra?.[key]
	if (typeof fromExtra === 'string' && fromExtra.length > 0) return fromExtra
	return fallback
}

export const config = {
	app: {
		env: env('EXPO_PUBLIC_APP_ENV', 'local'),
		name: packagejson.name,
		version: packagejson.version,
		timeout: Number(process.env.EXPO_PUBLIC_TIMEOUT_MS) || 60000
	},
	api: {
		prefix: '/api',
		url: `${env('EXPO_PUBLIC_BACKEND_URL', 'http://192.168.1.11:5001')}/api`,
		timeout: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS) || 60000
	},
	backend: {
		url: env('EXPO_PUBLIC_BACKEND_URL', 'http://192.168.1.11:5001')
	},
	frontend: {
		url: env('EXPO_PUBLIC_FRONTEND_URL', 'https://drinaluza.com')
	},
	updates: {
		checkUrl: env('EXPO_PUBLIC_UPDATES_CHECK_URL', 'https://api.github.com/repos/ahmed-derbala/drinaluza-expo-releases/releases/latest'),
		minFreeStorageGB: Number(process.env.EXPO_PUBLIC_UPDATES_MIN_FREE_STORAGE_GB || Constants.expoConfig?.extra?.EXPO_PUBLIC_UPDATES_MIN_FREE_STORAGE_GB || 2),
		maxApkInstallersCount: Number(process.env.EXPO_PUBLIC_UPDATES_MAX_APK_INSTALLERS_COUNT || Constants.expoConfig?.extra?.EXPO_PUBLIC_UPDATES_MAX_APK_INSTALLERS_COUNT || 5)
	},
	nodeEnv: env('EXPO_PUBLIC_NODE_ENV', 'local')
}
