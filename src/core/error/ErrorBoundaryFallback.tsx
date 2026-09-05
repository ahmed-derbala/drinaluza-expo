import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Stack } from 'expo-router'
import { translate } from '@translation'
import { themeColors } from '@theme'
import { SmartHeader } from '@smart-header'
import ErrorBlock from '@error/ErrorBlock'
import { log } from '@log'

export interface ErrorBoundaryFallbackProps {
	error: Error & { digest?: string }
	retry: () => void
	label?: string
}

export function ErrorBoundaryFallback({ error, retry, label = 'RouteErrorBoundary' }: ErrorBoundaryFallbackProps) {
	log({ level: 'error', label, message: error?.message || 'Unhandled segment error', error, data: { digest: (error as any)?.digest } })

	return (
		<SafeAreaView style={{ flex: 1, backgroundColor: themeColors.background }}>
			<Stack.Screen options={{ headerShown: false }} />
			<View style={{ flex: 1, backgroundColor: themeColors.background }}>
				<SmartHeader title={translate('error', 'Error')} fallbackRoute="/feed" />
				<ErrorBlock error={error} onRetry={retry} />
			</View>
		</SafeAreaView>
	)
}

export default ErrorBoundaryFallback
