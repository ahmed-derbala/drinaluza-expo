import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { useTheme } from '../../../contexts/ThemeContext'

export default function ShopsLayout() {
	const { colors } = useTheme()

	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerStyle: {
					backgroundColor: colors.card
				},
				headerTintColor: colors.text,
				headerTitleStyle: {
					fontWeight: '600'
				},
				headerBackTitle: 'Back',
				animation: Platform.select({
					ios: 'slide_from_right',
					android: 'slide_from_right',
					web: 'fade'
				}) as any
			}}
		>
			<Stack.Screen
				name="[shopId]/index"
				options={{
					headerTitle: 'Shop Details'
				}}
			/>
			<Stack.Screen
				name="[shopId]/products"
				options={{
					headerTitle: 'Products'
				}}
			/>
		</Stack>
	)
}
