import React from 'react'
import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

export default function AuthLayout() {
	const { colors } = useTheme()

	return (
		<Stack
			screenOptions={{
				headerShown: false,
				// Platform-specific animations
				animation: Platform.select({
					ios: 'slide_from_right',
					android: 'slide_from_right',
					web: 'fade'
				}),
				// Native presentation
				presentation: 'card',
				gestureEnabled: Platform.OS !== 'web',
				// iOS-specific options
				fullScreenGestureEnabled: Platform.OS === 'ios',
				// Styling for when headers are shown
				headerStyle: {
					backgroundColor: colors.background
				},
				headerTintColor: colors.text,
				headerTitleStyle: {
					fontWeight: 'bold'
				}
			}}
		/>
	)
}
