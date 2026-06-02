import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { useTheme } from '@/core/theme'
import { getSmartHeaderOptions } from '@/core/smart-screen-header'

export default function UsersLayout() {
	return (
		<Stack
			screenOptions={{
				...getSmartHeaderOptions(),
				headerShown: true,
				contentStyle: {
					backgroundColor: '#000000'
				}
			}}
		>
			<Stack.Screen name="[userSlug]" />
		</Stack>
	)
}
