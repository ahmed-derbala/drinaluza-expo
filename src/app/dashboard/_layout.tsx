import { Stack } from 'expo-router'

export default function DashboardLayout() {
	return (
		<Stack>
			<Stack.Screen name="[businessSlug]/index" options={{ headerShown: false }} />
			<Stack.Screen name="[businessSlug]/sales" options={{ headerShown: false }} />
			<Stack.Screen name="[businessSlug]/products/index" options={{ headerShown: false }} />
			<Stack.Screen name="[businessSlug]/products/create" options={{ headerShown: false }} />
			<Stack.Screen name="[businessSlug]/products/[productSlug]/index" options={{ headerShown: false }} />
			<Stack.Screen name="[businessSlug]/products/[productSlug]/edit" options={{ headerShown: false }} />
		</Stack>
	)
}
