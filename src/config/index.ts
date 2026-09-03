import packagejson from '../../package.json' with { type: 'json' }
import Constants from 'expo-constants'

export const config = {
	app: {
		env: process.env.EXPO_PUBLIC_APP_ENV || 'local',
		name: packagejson.name,
		version: packagejson.version,
		timeout: Number(process.env.EXPO_PUBLIC_TIMEOUT_MS) || 60000
	},
	api: {
		prefix: '/api',
		url: `${process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.11:5001'}/api`,
		timeout: Number(process.env.EXPO_PUBLIC_API_TIMEOUT_MS) || 60000
	},
	backend: {
		url: process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.11:5001'
	},
	frontend: {
		url: process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://drinaluza.vercel.app'
	},
	updates: {
		checkUrl: process.env.EXPO_PUBLIC_UPDATES_CHECK_URL || 'https://api.github.com/repos/ahmed-derbala/drinaluza-expo-releases/releases/latest',
		minFreeStorageGB: Number(process.env.EXPO_PUBLIC_UPDATES_MIN_FREE_STORAGE_GB || Constants.expoConfig?.extra?.EXPO_PUBLIC_UPDATES_MIN_FREE_STORAGE_GB || 2),
		maxApkInstallersCount: Number(process.env.EXPO_PUBLIC_UPDATES_MAX_APK_INSTALLERS_COUNT || Constants.expoConfig?.extra?.EXPO_PUBLIC_UPDATES_MAX_APK_INSTALLERS_COUNT || 5)
	},
	nodeEnv: process.env.EXPO_PUBLIC_NODE_ENV || 'local'
}
