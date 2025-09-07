import React from 'react'
import { Stack } from 'expo-router'
import { useTheme } from '@/contexts/ThemeContext'

export default function ShopsLayout() {
	const { colors } = useTheme()

	return (
		<Stack
			screenOptions={{
				headerStyle: {
					backgroundColor: colors.background
				},
				headerTintColor: colors.text,
				headerTitleStyle: {
					fontWeight: 'bold'
				}
			}}
		>
			<Stack.Screen
				name="index"
				options={{
					title: 'My Shops',
					headerShown: false
				}}
			/>
			<Stack.Screen
				name="[shopId]/products"
				options={({ route }) => ({
					title: `${(route.params as any)?.shopName || 'Shop'} Products`,
					headerShown: true
				})}
			/>
		</Stack>
	)
}
