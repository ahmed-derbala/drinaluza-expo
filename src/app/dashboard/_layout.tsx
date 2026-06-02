import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { useTheme } from '@/core/theme'
import { getSmartHeaderOptions } from '@/core/smart-screen-header'

export default function DashboardLayout() {
	return (
		<Stack
			screenOptions={{
				...getSmartHeaderOptions(),
				headerShown: true,
				contentStyle: {
					backgroundColor: '#000000'
				}
			}}
		>
			<Stack.Screen name="[businessSlug]/index" />
			<Stack.Screen name="[businessSlug]/edit" />
			<Stack.Screen name="[businessSlug]/sales" />
			<Stack.Screen name="[businessSlug]/products/index" />
			<Stack.Screen name="[businessSlug]/products/create" />
			<Stack.Screen name="[businessSlug]/products/[productSlug]/index" />
			<Stack.Screen name="[businessSlug]/products/[productSlug]/edit" />
		</Stack>
	)
}
