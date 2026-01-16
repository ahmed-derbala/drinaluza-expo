import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'
import { getPlatformStackOptions, withThemedHeader } from '../../../config/navigation'

export default function ShopsLayout() {
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
					headerTitle: 'Browse Shops',
					headerShown: false
				}}
			/>
			<Stack.Screen
				name="[shopId]/index"
				options={{
					headerShown: false
				}}
			/>
			<Stack.Screen
				name="[shopId]/products"
				options={{
					headerShown: false
				}}
			/>
		</Stack>
	)
}
