import { Stack } from 'expo-router'
import { SmartHeader } from '@/core/smart-header'

export default function ProductsLayout() {
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
			<Stack.Screen name="index" />
			<Stack.Screen name="[productSlug]" />
		</Stack>
	)
}
