import { Platform } from 'react-native'
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack'

type NavigationColors = {
	background?: string
	text?: string
}

/**
 * Base stack navigation options that mirror the native behavior on each platform.
 * Keeps animations, gestures and presentation style consistent across stacks.
 */
export const getPlatformStackOptions = (overrides: NativeStackNavigationOptions = {}): NativeStackNavigationOptions => ({
	animation: Platform.select({
		ios: 'default',
		android: 'default',
		web: 'fade'
	}),
	presentation: Platform.select({
		ios: 'card',
		android: 'card',
		web: 'card'
	}),
	gestureEnabled: Platform.OS !== 'web',
	fullScreenGestureEnabled: Platform.OS === 'ios',
	...overrides
})

/**
 * Applies consistent header styling that adapts to the current theme.
 */
export const withThemedHeader = (colors?: NavigationColors, overrides: NativeStackNavigationOptions = {}): NativeStackNavigationOptions => ({
	headerStyle: {
		backgroundColor: colors?.background
	},
	headerTintColor: colors?.text,
	headerTitleStyle: {
		fontWeight: '600'
	},
	...overrides
})
