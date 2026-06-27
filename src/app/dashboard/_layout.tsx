import { Stack } from 'expo-router'
import { SmartHeader } from '@/core/smart-header'

export default function DashboardLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				header: (props) => <SmartHeader {...props} />,
				contentStyle: {
					backgroundColor: '#000000'
				}
			}}
		>
			<Stack.Screen name="[businessSlug]/index" />
			<Stack.Screen name="[businessSlug]/edit" />
			<Stack.Screen name="[businessSlug]/sales" />
			<Stack.Screen name="[businessSlug]/products/index" options={{ headerShown: false }} />
			<Stack.Screen name="[businessSlug]/products/create" />
			<Stack.Screen name="[businessSlug]/products/[productSlug]/index" />
			<Stack.Screen name="[businessSlug]/products/[productSlug]/edit" />
		</Stack>
	)
}
