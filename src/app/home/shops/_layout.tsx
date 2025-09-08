import React from 'react'
import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'

export default function ShopsLayout() {
	const { colors } = useTheme()

	return (
		<Stack
			screenOptions={{
				animation: Platform.select({
					ios: 'slide_from_right',
					android: 'slide_from_right',
					web: 'fade'
				}) as any, // Type assertion for animation prop
				headerShown: true,
				headerStyle: {
					backgroundColor: '#333'
				},
				headerTintColor: '#fff',
				headerTitleStyle: {
					fontWeight: '600',
					color: '#fff'
				},
				headerBackTitle: 'Back',
				gestureEnabled: true
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					headerShown: false,
					animation: 'fade'
				}}
			/>
			<Stack.Screen
				name="[shopId]/products"
				options={{
					headerTitle: 'Shop Products',
					headerBackTitle: 'Back',
					animation: 'slide_from_right'
				}}
			/>
		</Stack>
	)
}
