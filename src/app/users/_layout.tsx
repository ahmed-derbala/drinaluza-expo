import { Stack } from 'expo-router'
import { SmartHeader } from '@/core/smart-header'

export default function UsersLayout() {
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
			<Stack.Screen name="[userSlug]" />
		</Stack>
	)
}
