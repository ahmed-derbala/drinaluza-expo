import { Platform, Linking } from 'react-native'
import axios from 'axios'
import { APP_VERSION, BACKEND_URL } from '../../config'
import { log } from '../log'

// Google Drive / Google Play URLs for APK download
const GOOGLE_DRIVE_URL = 'https://drive.google.com/drive/folders/1euN1ogdssvbiq4wJdxYQBYqMXWbwIpBm'
const GOOGLE_PLAY_URL = '' // TODO: set when published

export interface PlatformVersion {
	latest: string
	min: string
	resetApp?: boolean
}

export interface BackendInfo {
	NODE_ENV: string
	app: {
		name: string
		version: string
	}
	frontend: {
		web: {
			version: PlatformVersion
		}
		android: {
			version: PlatformVersion
		}
	}
}

export type VersionStatus = 'up_to_date' | 'update_available' | 'update_required'

/**
 * Compare two semver version strings.
 * Returns:
 *   -1 if a < b
 *    0 if a === b
 *    1 if a > b
 */
export const compareVersions = (a: string, b: string): number => {
	const pa = a.split('.').map(Number)
	const pb = b.split('.').map(Number)
	const len = Math.max(pa.length, pb.length)

	for (let i = 0; i < len; i++) {
		const na = pa[i] || 0
		const nb = pb[i] || 0
		if (na > nb) return 1
		if (na < nb) return -1
	}
	return 0
}

/**
 * Fetch backend info (the root endpoint response)
 */
export const fetchBackendInfo = async (): Promise<BackendInfo | null> => {
	try {
		const url = BACKEND_URL?.replace(/\/$/, '')
		if (!url) {
			log({ level: 'warn', label: 'versionCheck', message: 'BACKEND_URL is not set' })
			return null
		}

		const response = await axios.get(url, { timeout: 10000 })
		return response.data?.data || null
	} catch (error: any) {
		log({
			level: 'error',
			label: 'versionCheck',
			message: 'Failed to fetch backend info',
			error
		})
		return null
	}
}

/**
 * Get the platform version config for the current platform
 */
export const getPlatformVersion = (backendInfo: BackendInfo): PlatformVersion | null => {
	const v = Platform.OS === 'web' ? backendInfo.frontend?.web?.version : backendInfo.frontend?.android?.version
	return v || null
}

/**
 * Check the version status for the current platform
 */
export const checkVersionStatus = (backendInfo: BackendInfo): VersionStatus => {
	const currentVersion = APP_VERSION
	const platformVersion = getPlatformVersion(backendInfo)

	if (!platformVersion) return 'up_to_date'

	const { latest, min } = platformVersion

	// Check if below minimum required version
	if (min && compareVersions(currentVersion, min) < 0) {
		return 'update_required'
	}

	// Check if below latest version (only relevant for Android — web has no optional prompt)
	if (Platform.OS !== 'web' && latest && compareVersions(currentVersion, latest) < 0) {
		return 'update_available'
	}

	return 'up_to_date'
}

/**
 * Get the version info for display purposes
 */
export const getVersionInfo = (backendInfo: BackendInfo) => {
	const platformVersion = getPlatformVersion(backendInfo)

	return {
		currentVersion: APP_VERSION,
		latestVersion: platformVersion?.latest,
		minVersion: platformVersion?.min,
		resetApp: platformVersion?.resetApp,
		platform: Platform.OS
	}
}

/**
 * Check if the backend requests an app reset for the current platform
 */
export const shouldResetApp = (backendInfo: BackendInfo): boolean => {
	const platformVersion = getPlatformVersion(backendInfo)
	return platformVersion?.resetApp === true
}

/**
 * Handle the update action based on platform
 * - Web: navigate to root URL (hard refresh)
 * - Android: open download link
 */
export const handleUpdate = () => {
	if (Platform.OS === 'web') {
		// Navigate to root URL with hard refresh
		if (typeof window !== 'undefined') {
			window.location.href = '/'
		}
	} else {
		// Open download link for Android
		const url = GOOGLE_PLAY_URL || GOOGLE_DRIVE_URL
		Linking.openURL(url).catch((err) => {
			log({
				level: 'error',
				label: 'versionCheck',
				message: 'Failed to open download URL',
				error: err
			})
		})
	}
}

/**
 * Reset app data on web: clear all browser storage and navigate to root
 */
export const resetWebApp = () => {
	if (typeof window === 'undefined') return

	log({ level: 'info', label: 'versionCheck', message: 'Resetting web app (requested by backend)' })

	try {
		localStorage.clear()
		sessionStorage.clear()
	} catch (e) {
		// Storage might not be available
	}

	window.location.href = '/'
}

/**
 * Reset app data on Android: clear AsyncStorage
 */
export const resetAndroidApp = async () => {
	log({ level: 'info', label: 'versionCheck', message: 'Resetting Android app data (requested by backend)' })

	try {
		const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
		await AsyncStorage.clear()
	} catch (e) {
		log({ level: 'error', label: 'versionCheck', message: 'Failed to clear AsyncStorage', error: e })
	}
}
