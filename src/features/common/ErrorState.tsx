import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { IconButton } from './buttons/IconButton'

interface ErrorStateProps {
	title?: string
	message?: string
	onRetry?: () => void
	icon?: keyof typeof Ionicons.glyphMap
	/** Render only the icon, hiding title, message and retry button */
	iconOnly?: boolean
}

const ErrorState: React.FC<ErrorStateProps> = ({
	title = 'Something went wrong',
	message = 'We encountered an error while loading the data. Please check your connection and try again.',
	onRetry,
	icon = 'cloud-offline-outline',
	iconOnly = false
}) => {
	const { colors } = useTheme()

	if (iconOnly) {
		return (
			<View style={styles.container}>
				<View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
					<Ionicons name={icon} size={56} color={colors.error} />
				</View>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
				<Ionicons name={icon} size={56} color={colors.error} />
			</View>
			<Text style={[styles.title, { color: colors.text }]}>{title}</Text>
			<Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
			{onRetry && <IconButton icon="refresh" label="Retry" onPress={onRetry} variant="primary" colors={colors} />}
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
		alignItems: 'center',
		marginBottom: 28
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 10,
		textAlign: 'center'
	},
	message: {
		fontSize: 15,
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: 32,
		maxWidth: 300
	}
})

export default ErrorState
