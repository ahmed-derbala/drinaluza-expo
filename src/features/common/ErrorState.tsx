import React from 'react'
import { View, Pressable, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'

interface ErrorStateProps {
	/** When provided, tapping the icon retries the failed action. */
	onRetry?: () => void
}

const ErrorState: React.FC<ErrorStateProps> = ({ onRetry }) => {
	const { colors } = useTheme()

	const iconEl = (
		<View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
			<Ionicons name="alert-circle-outline" size={56} color={colors.error} />
		</View>
	)

	return (
		<View style={styles.container}>
			{onRetry ? (
				<Pressable onPress={onRetry} hitSlop={12} accessibilityLabel="Retry">
					{iconEl}
				</Pressable>
			) : (
				iconEl
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 40
	},
	iconContainer: {
		width: 110,
		height: 110,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center'
	}
})

export default ErrorState
