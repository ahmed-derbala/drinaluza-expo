import { Stack } from 'expo-router'

export default function DashboardLayout() {
	return (
		<Stack>
			<Stack.Screen name="personal" options={{ headerShown: false }} />
			<Stack.Screen name="business/[businessSlug]/index" options={{ headerShown: false }} />
			<Stack.Screen name="business/[businessSlug]/sales" options={{ headerShown: false }} />
			<Stack.Screen name="business/[businessSlug]/products/index" options={{ headerShown: false }} />
			<Stack.Screen name="business/[businessSlug]/products/create" options={{ headerShown: false }} />
		</Stack>
	)
}
