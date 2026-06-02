import { Stack } from 'expo-router'
import { SmartScreenHeader } from '@/core/smart-screen-header'

export default function DashboardLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				header: (props) => <SmartScreenHeader {...props} />,
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
