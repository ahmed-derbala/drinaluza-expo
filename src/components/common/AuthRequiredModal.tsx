import React, { useEffect, useState } from 'react'
import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '../../contexts/ThemeContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { authStateManager } from '../../stores/authStore'

export default function AuthRequiredModal() {
	const { colors } = useTheme()
	const router = useRouter()
	const [visible, setVisible] = useState(false)
	const [message, setMessage] = useState<string>()

	useEffect(() => {
		// Subscribe to auth state changes
		const unsubscribe = authStateManager.subscribe((show, msg) => {
			setVisible(show)
			setMessage(msg)
		})

		return unsubscribe
	}, [])

	const handleClose = () => {
		authStateManager.hideAuthModal()
	}

	const handleSignIn = async () => {
		try {
			// Clear existing auth data
			await AsyncStorage.multiRemove(['authToken', 'userData'])
			handleClose()
			// Navigate to auth screen
			router.replace('/auth')
		} catch (error) {
			console.error('Error clearing auth data:', error)
			// Still navigate to auth even if clearing fails
			handleClose()
			router.replace('/auth')
		}
	}

	const handleDismiss = () => {
		handleClose()
	}

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
			<View style={styles.overlay}>
				<View style={[styles.container, { backgroundColor: colors.card }]}>
					{/* Icon */}
					<View style={[styles.iconContainer, { backgroundColor: colors.error + '20' }]}>
						<MaterialIcons name="lock-outline" size={48} color={colors.error} />
					</View>

					{/* Title */}
					<Text style={[styles.title, { color: colors.text }]}>Authentication Required</Text>

					{/* Message */}
					<Text style={[styles.message, { color: colors.textSecondary }]}>{message || 'Your session has expired. Please sign in again to continue.'}</Text>

					{/* Buttons */}
					<View style={styles.buttonContainer}>
						<TouchableOpacity style={[styles.button, styles.dismissButton, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={handleDismiss}>
							<Text style={[styles.buttonText, { color: colors.textSecondary }]}>Dismiss</Text>
						</TouchableOpacity>

						<TouchableOpacity style={[styles.button, styles.signInButton, { backgroundColor: colors.primary }]} onPress={handleSignIn}>
							<MaterialIcons name="login" size={20} color="#fff" style={styles.buttonIcon} />
							<Text style={[styles.buttonText, styles.signInButtonText]}>Sign In</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.5)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20
	},
	container: {
		width: '100%',
		maxWidth: 400,
		borderRadius: 20,
		padding: 24,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 8,
		elevation: 8
	},
	iconContainer: {
		width: 80,
		height: 80,
		borderRadius: 40,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 20
	},
	title: {
		fontSize: 22,
		fontWeight: 'bold',
		marginBottom: 12,
		textAlign: 'center'
	},
	message: {
		fontSize: 15,
		lineHeight: 22,
		textAlign: 'center',
		marginBottom: 24
	},
	buttonContainer: {
		flexDirection: 'row',
		gap: 12,
		width: '100%'
	},
	button: {
		flex: 1,
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 14,
		paddingHorizontal: 20,
		borderRadius: 12,
		minHeight: 50
	},
	dismissButton: {
		borderWidth: 1
	},
	signInButton: {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2
	},
	buttonIcon: {
		marginRight: 6
	},
	buttonText: {
		fontSize: 16,
		fontWeight: '600'
	},
	signInButtonText: {
		color: '#fff'
	}
})
