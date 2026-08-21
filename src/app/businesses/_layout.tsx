import { Stack } from 'expo-router'
import { SmartHeader } from '@/core/smart-header'
import { useTheme } from '@/core/theme'
import { ErrorBoundaryFallback } from '@/core/error/ErrorBoundaryFallback'

export function ErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return <ErrorBoundaryFallback error={error} retry={retry} label="BusinessesErrorBoundary" />
}

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
