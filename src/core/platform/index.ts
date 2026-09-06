import { Platform, useWindowDimensions } from 'react-native'

// ─── Static flags — evaluated once, safe for non-reactive checks ──────────────
export const OS = Platform.OS

export const isWeb = Platform.OS === 'web'

export const isAndroid = Platform.OS === 'android'

export const isIos = Platform.OS === 'ios'

export const isMobile = isAndroid || isIos

export const isNative = !isWeb

/**
 * Web browser running on an Android device (user agent contains "Android").
 * Used to offer the Android APK download only where it can be installed.
 * Always false on native builds and non-Android browsers.
 */
export const isWebAndroid = (() => {
	if (!isWeb) return false
	try {
		if (typeof navigator === 'undefined') return false
		const ua = (navigator as any).userAgentData?.platform ?? navigator.userAgent ?? ''
		return /android/i.test(String(ua))
	} catch {
		return false
	}
})()

// Re-export Platform.select for convenience
export const select = Platform.select

// ─── Reactive hooks — use when you need resize/orientation updates ────────────
export interface PlatformInfo {
	os: typeof Platform.OS
	isWeb: boolean
	isAndroid: boolean
	isIos: boolean
	isMobile: boolean
	isNative: boolean
	isWebAndroid: boolean
	isLandscape: boolean
	width: number
	height: number
}

export const usePlatform = (): PlatformInfo => {
	const { width, height } = useWindowDimensions()
	const isLandscape = width > height
	return {
		os: Platform.OS,
		isWeb,
		isAndroid,
		isIos,
		isMobile,
		isNative,
		isWebAndroid,
		isLandscape,
		width,
		height
	}
}

export const useIsLandscape = (): boolean => {
	const { width, height } = useWindowDimensions()
	return width > height
}
