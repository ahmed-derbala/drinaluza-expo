import { Stack } from 'expo-router'
import { Platform } from 'react-native'
import { useTheme } from '@/core/theme'
import { getSmartHeaderOptions } from '@/core/smart-screen-header'

export default function BusinessesLayout() {
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
