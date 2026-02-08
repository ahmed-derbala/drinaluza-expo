import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../core/contexts/ThemeContext'

interface ErrorStateProps {
	title?: string
	message?: string
	onRetry?: () => void
	icon?: keyof typeof Ionicons.glyphMap
}

const ErrorState: React.FC<ErrorStateProps> = ({
	title = 'Something went wrong',
	message = 'We encountered an error while loading the data. Please check your connection and try again.',
	onRetry,
	icon = 'cloud-offline-outline'
}) => {
	const { colors } = useTheme()

	return (
		<View style={styles.container}>
			<View style={[styles.iconContainer, { backgroundColor: colors.error + '15' }]}>
				<Ionicons name={icon} size={56} color={colors.error} />
			</View>
			<Text style={[styles.title, { color: colors.text }]}>{title}</Text>
			<Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
			{onRetry && (
				<TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={onRetry}>
					<Ionicons name="refresh" size={24} color={colors.textOnPrimary} />
				</TouchableOpacity>
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
	},
	retryButton: {
		width: 56,
		height: 56,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.2,
				shadowRadius: 8
			},
			android: {
				elevation: 6
			}
		})
	}
})

export default ErrorState
