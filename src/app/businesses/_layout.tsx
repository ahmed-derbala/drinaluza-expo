import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { useTheme } from '@/core/theme'
import { getPlatformStackOptions, withThemedHeader } from '@/config/navigation'

export default function BusinessesLayout() {
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
			<Stack.Screen
				name="index"
				options={{
					headerTitle: 'Browse Businesses'
				}}
			/>
			<Stack.Screen name="[businessSlug]/index" />
			<Stack.Screen name="[businessSlug]/products/index" />
			<Stack.Screen name="[businessSlug]/products/[productSlug]" />
		</Stack>
	)
}
