import { Stack } from 'expo-router'
import { Platform } from 'react-native'

export default function BusinessesLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerTitleStyle: {
					fontWeight: '600'
				},
				headerBackTitle: Platform.select({
					ios: 'Back',
					android: undefined,
					web: 'Back'
				})
			}}
		>
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
