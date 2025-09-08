import React from 'react'
import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

export default function ShopsLayout() {
	const { colors } = useTheme()

	return (
		<Stack
			screenOptions={{
				// Platform-specific animations
				animation: Platform.select({
					ios: 'slide_from_right',
					android: 'slide_from_right',
					web: 'fade'
				}),
				headerShown: true,
				// Native presentation
				presentation: 'card',
				gestureEnabled: Platform.OS !== 'web',
				fullScreenGestureEnabled: Platform.OS === 'ios',
				// Header styling
				headerStyle: {
					backgroundColor: '#333' // Changed to ensure visibility against dark screen
				},
				headerTintColor: colors.text,
				headerTitleStyle: {
					fontWeight: Platform.select({
						ios: '600',
						android: '500',
						web: '600'
					}),
					fontSize: Platform.select({
						ios: 17,
						android: 20,
						web: 18
					})
				},
				// Clean back button without title
				headerBackVisible: true
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					title: 'Shops',
					headerShown: false
				}}
			/>
			<Stack.Screen
				name="[shopId]/products"
				options={({ route }) => ({
					title: `${(route.params as any)?.shopName || 'Shop'} Products`,
					headerShown: true,
					headerBackVisible: true,
					headerBackTitleVisible: false
				})}
			/>
		</Stack>
	)
}
