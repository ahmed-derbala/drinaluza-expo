import { Stack } from 'expo-router'
import { SmartHeader } from '@/core/smart-header'
import { useTheme } from '@/core/theme'

export default function BusinessesLayout() {
	const { colors } = useTheme()

	return (
		<Stack
			screenOptions={{
				headerShown: true,
				header: (props) => <SmartHeader {...props} />,
				contentStyle: {
					backgroundColor: colors.background
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
