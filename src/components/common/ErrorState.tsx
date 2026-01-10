import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'

interface ErrorStateProps {
	title?: string
	message?: string
	onRetry?: () => void
	icon?: keyof typeof Ionicons.glyphMap
}

const ErrorState: React.FC<ErrorStateProps> = ({
	title = 'Something went wrong',
	message = 'We encountered an error while loading the data. please check your connection and try again.',
	onRetry,
	icon = 'cloud-offline-outline'
}) => {
	const { colors } = useTheme()

	return (
		<View style={styles.container}>
			<View style={[styles.iconContainer, { backgroundColor: colors.error + '10' }]}>
				<Ionicons name={icon} size={64} color={colors.error} />
			</View>
			<Text style={[styles.title, { color: colors.text }]}>{title}</Text>
			<Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
			{onRetry && (
				<TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={onRetry}>
					<Ionicons name="refresh-outline" size={20} color="#fff" style={styles.retryIcon} />
					<Text style={styles.retryText}>Try Again</Text>
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
		padding: 40,
		textAlign: 'center'
	},
	iconContainer: {
		width: 120,
		height: 120,
		borderRadius: 60,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 24
	},
	title: {
		fontSize: 22,
		fontWeight: 'bold',
		marginBottom: 12,
		textAlign: 'center'
	},
	message: {
		fontSize: 16,
		textAlign: 'center',
		lineHeight: 24,
		marginBottom: 32
	},
	retryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 24,
		paddingVertical: 12,
		borderRadius: 24,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4
	},
	retryIcon: {
		marginRight: 8
	},
	retryText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600'
	}
})

export default ErrorState
