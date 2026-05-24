import { Stack } from 'expo-router'
import { Platform } from 'react-native'

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
				})
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
