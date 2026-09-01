import { Platform, useWindowDimensions } from 'react-native'

// ─── Static flags — evaluated once, safe for non-reactive checks ──────────────
export const OS = Platform.OS

export const isWeb = Platform.OS === 'web'

export const isAndroid = Platform.OS === 'android'

export const isIos = Platform.OS === 'ios'

export const isMobile = isAndroid || isIos

export const isNative = !isWeb

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
		isLandscape,
		width,
		height
	}
}

export const useIsLandscape = (): boolean => {
	const { width, height } = useWindowDimensions()
	return width > height
}
