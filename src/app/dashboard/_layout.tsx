import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { useTheme } from '@/core/theme'
import { getPlatformStackOptions, withThemedHeader } from '@/config/navigation'

export default function DashboardLayout() {
	const { colors } = useTheme()
	const stackOptions = getPlatformStackOptions(
		withThemedHeader(colors, {
			headerShown: true,
			headerTitleStyle: {
				fontWeight: '600'
			},
			headerBackTitle: Platform.select({
				ios: 'Back',
				android: undefined,
				web: 'Back'
			})
		})
	)

	return (
		<Stack screenOptions={stackOptions}>
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
