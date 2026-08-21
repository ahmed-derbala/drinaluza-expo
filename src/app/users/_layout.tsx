import { Stack } from 'expo-router'
import { SmartHeader } from '@/core/smart-header'
import { useTheme } from '@/core/theme'
import { ErrorBoundaryFallback } from '@/core/error/ErrorBoundaryFallback'

export function ErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return <ErrorBoundaryFallback error={error} retry={retry} label="UsersErrorBoundary" />
}

export default function UsersLayout() {
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
			<Stack.Screen name="[userSlug]" />
		</Stack>
	)
}
