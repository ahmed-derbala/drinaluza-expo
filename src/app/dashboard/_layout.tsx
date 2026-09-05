import { Stack } from 'expo-router'
import { SmartHeader } from '@smart-header'
import { useTheme } from '@theme'
import { ErrorBoundaryFallback } from '@error/ErrorBoundaryFallback'

export function ErrorBoundary({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
	return <ErrorBoundaryFallback error={error} retry={retry} label="DashboardErrorBoundary" />
}

export default function DashboardLayout() {
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
			<Stack.Screen name="[businessSlug]/index" />
			<Stack.Screen name="personal/index" />
			<Stack.Screen name="[businessSlug]/edit" />
			<Stack.Screen name="[businessSlug]/sales" />
			<Stack.Screen name="[businessSlug]/sales/[saleId]" />
			<Stack.Screen name="[businessSlug]/products/index" options={{ headerShown: false }} />
			<Stack.Screen name="[businessSlug]/create-product" />
			<Stack.Screen name="[businessSlug]/products/[productSlug]/index" />
		</Stack>
	)
}
