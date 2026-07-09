import { Stack } from 'expo-router'
import { SmartHeader } from '@/core/smart-header'
import { useTheme } from '@/core/theme'

export default function DashboardLayout() {
	const { colors } = useTheme()

	return (
		<Stack
			screenOptions={{
				headerShown: true,
				header: (props) => <SmartHeader {...props} />,
				contentStyle: {
					backgroundColor: colors.background
				}
			}}
		>
			<Stack.Screen name="[businessSlug]/index" />
			<Stack.Screen name="[businessSlug]/edit" />
			<Stack.Screen name="[businessSlug]/sales" />
			<Stack.Screen name="[businessSlug]/products/index" options={{ headerShown: false }} />
			<Stack.Screen name="[businessSlug]/create-product" />
			<Stack.Screen name="[businessSlug]/products/[productSlug]/index" />
			<Stack.Screen name="[businessSlug]/products/[productSlug]/edit" />
		</Stack>
	)
}
