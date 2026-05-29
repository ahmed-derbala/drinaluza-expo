import { Platform } from 'react-native'

export const HEADER_HEIGHT = Platform.select({
	ios: 64,
	android: 56,
	default: 56
})

export const DEFAULT_HIT_SLOP = {
	top: 12,
	bottom: 12,
	left: 12,
	right: 12
}
