import { Stack } from 'expo-router'
import { SmartScreenHeader } from '@/core/smart-screen-header'

export default function UsersLayout() {
	return (
		<Stack
			screenOptions={{
				headerShown: true,
				header: (props) => <SmartScreenHeader {...props} />,
				contentStyle: {
					backgroundColor: '#000000'
				}
			}}
		>
			<Stack.Screen name="[userSlug]" />
		</Stack>
	)
}
