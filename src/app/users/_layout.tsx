import { Stack } from 'expo-router'
import { Platform } from 'react-native'

export default function UsersLayout() {
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
			<Stack.Screen name="[userSlug]" />
		</Stack>
	)
}
