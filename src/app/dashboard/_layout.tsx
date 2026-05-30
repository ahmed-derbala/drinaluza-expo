import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { useTheme } from '@/core/theme'

export default function DashboardLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerTitleStyle: {
					fontWeight: '600'
				},
				headerBackTitle: Platform.select({
					ios: 'Back',
					android: undefined,
					web: 'Back'
				}),
				headerStyle: {
					backgroundColor: '#1C2541'
				},
				headerTintColor: '#F8FAFC',
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
