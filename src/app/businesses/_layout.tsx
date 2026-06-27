import { Stack } from 'expo-router'
import { SmartHeader } from '@/core/smart-header'

export default function BusinessesLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				header: (props) => <SmartHeader {...props} />,
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
