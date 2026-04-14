import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { useTheme } from '@/core/contexts/ThemeContext'
import { getPlatformStackOptions, withThemedHeader } from '@/config/navigation'

export default function ProductsLayout() {
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
				name="[productSlug]"
				options={{
					headerShown: false
				}}
			/>
		</Stack>
	)
}
