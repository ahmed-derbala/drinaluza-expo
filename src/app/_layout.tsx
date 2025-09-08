import { Stack } from 'expo-router'
import React from 'react'
import { Platform } from 'react-native'
import { ThemeProvider } from '../contexts/ThemeContext'

export default function RootLayout() {
	return (
		<ThemeProvider>
			<Stack
				screenOptions={{
					headerShown: false,
					// Platform-specific navigation animations
					animation: Platform.select({
						ios: 'slide_from_right',
						android: 'slide_from_right',
						web: 'fade'
					}),
					// Native-like presentation style
					presentation: Platform.select({
						ios: 'card',
						android: 'card',
						web: 'card'
					}),
					// Gesture handling for native platforms
					gestureEnabled: Platform.OS !== 'web',
					// Full screen gesture on iOS
					fullScreenGestureEnabled: Platform.OS === 'ios'
				}}
			/>
		</ThemeProvider>
	)
}
