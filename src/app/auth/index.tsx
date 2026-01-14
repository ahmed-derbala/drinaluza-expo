import React, { useState, useCallback } from 'react'
import { View, TextInput, Button, Text, TouchableOpacity, Alert, useWindowDimensions, Platform, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { signIn, signUp, getSavedAuthentications, deleteSavedAuthentication, signInWithToken, SavedAuth } from '../../core/auth/auth.api'
import { secureGetItem } from '../../core/auth/storage'
import { useTheme } from '../../contexts/ThemeContext'
import { useFocusEffect } from 'expo-router'
import { showAlert } from '../../utils/popup'
import { useBackButton } from '../../hooks/useBackButton'
import { log } from '../../core/log'

export default function AuthScreen() {
	const { colors } = useTheme()
	useBackButton()
	const { width } = useWindowDimensions()
	const maxWidth = 600
	const isWideScreen = width > maxWidth
	const [slug, setSlug] = useState<string>('')
	const [password, setPassword] = useState<string>('')
	const [statusState, setStatusState] = useState<'initial' | '404' | '409'>('initial')
	const [errorMessage, setErrorMessage] = useState('')
	const [savedAuths, setSavedAuths] = useState<SavedAuth[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const router = useRouter()

	const loadSavedAuths = async () => {
		const auths = await getSavedAuthentications()
		setSavedAuths(auths)
	}

	useFocusEffect(
		useCallback(() => {
			loadSavedAuths()
		}, [])
	)

	const handleQuickSignIn = async (auth: SavedAuth) => {
		try {
			setIsLoading(true)
			const success = await signInWithToken(auth.token)
			if (success) {
				router.replace('/home/feed')
			} else {
				setSlug(auth.slug)
				setPassword('')
				showAlert('Error', 'Session expired. Please sign in again with your password.')
				await deleteSavedAuthentication(auth.slug)
				loadSavedAuths()
			}
		} catch (error) {
			showAlert('Error', 'Quick sign in failed.')
		} finally {
			setIsLoading(false)
		}
	}

	const handleDeleteSavedAuth = async (authSlug: string) => {
		await deleteSavedAuthentication(authSlug)
		loadSavedAuths()
	}

	const handleResetApp = async () => {
		const performReset = async () => {
			try {
				await AsyncStorage.clear()
				setSavedAuths([])

				log({ level: 'info', label: 'auth', message: 'App reset performed' })

				if (Platform.OS === 'web') {
					window.location.reload()
				} else {
					Alert.alert('Success', 'App reset successfully.', [{ text: 'OK' }])
				}
			} catch (error) {
				log({ level: 'error', label: 'auth', message: 'Failed to reset app', error })
				Alert.alert('Error', 'Failed to reset app.')
			}
		}

		if (Platform.OS === 'web') {
			if (window.confirm('Are you sure you want to reset the app? This will clear all data.')) {
				await performReset()
			}
		} else {
			Alert.alert('Reset App', 'Are you sure you want to reset the app? This will clear all data.', [
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Reset',
					style: 'destructive',
					onPress: performReset
				}
			])
		}
	}

	const handleSignIn = async () => {
		try {
			log({
				level: 'info',
				label: 'auth',
				message: 'Attempting to sign in',
				data: { slug }
			})
			const response = await signIn(slug, password)
			log({
				level: 'debug',
				label: 'auth',
				message: 'Sign in response received',
				data: { status: response.status }
			})

			const token = await secureGetItem('authToken')
			log({
				level: 'debug',
				label: 'auth',
				message: 'Token verification',
				data: { hasToken: !!token }
			})

			if (token) {
				log({
					level: 'info',
					label: 'auth',
					message: 'Navigating to /home'
				})
				router.replace('/home/feed')
			} else {
				log({
					level: 'error',
					label: 'auth',
					message: 'No token received after sign in'
				})
				showAlert('Error', 'Sign in failed. Please try again.')
			}
		} catch (error: any) {
			log({
				level: 'error',
				label: 'auth',
				message: 'Sign in failed',
				error
			})
			const responseData = error.response?.data
			const status = error.response?.status || responseData?.status || responseData?.statusCode
			const message = responseData?.message || error.message

			log({
				level: 'debug',
				label: 'auth',
				message: 'Error details',
				data: { status, message }
			})

			if (status === 404 || status === '404') {
				setStatusState('404')
				setErrorMessage(message)
			} else if (status === 409 || status === '409') {
				log({
					level: 'warn',
					label: 'auth',
					message: 'Incorrect password attempt'
				})
				setPassword('')
				setStatusState('409')
				setErrorMessage('Try again')
			} else if (status === 401 || status === '401') {
				showAlert('Unauthorized', message || 'Invalid credentials. Please check your username and password.')
			} else {
				log({
					level: 'error',
					label: 'auth',
					message: 'Generic login error',
					error
				})
				showAlert('Error', message || 'Sign in failed. Please check your credentials and try again.')
			}
		}
	}

	const handleGo = async () => {
		log({
			level: 'debug',
			label: 'auth',
			message: 'Go pressed'
		})
		await handleSignIn()
	}

	const handleSignUp = async () => {
		try {
			await signUp(slug, password)
			router.replace('/home/feed')
		} catch (error) {
			log({
				level: 'error',
				label: 'auth',
				message: 'Sign up failed',
				error
			})
		}
	}

	return (
		<SafeAreaProvider>
			<SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top', 'right', 'left']}>
				<StatusBar style="light" />
				<View style={[styles.container, { backgroundColor: colors.background }]}>
					<View style={[styles.innerContainer, isWideScreen && { maxWidth }]}>
						<Text style={[styles.title, { color: colors.text }]}>Drinaluza</Text>
						<Text style={[styles.subtitle, { color: colors.textSecondary }]}>Seafood Business Manager</Text>

						{savedAuths.length > 0 && (
							<View style={styles.savedAuthsContainer}>
								<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>SAVED ACCOUNTS</Text>
								{savedAuths.map((auth) => (
									<TouchableOpacity key={auth.slug} style={[styles.savedAuthItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleQuickSignIn(auth)}>
										<View style={[styles.authAvatar, { backgroundColor: colors.primaryContainer }]}>
											<Ionicons name="person" size={20} color={colors.primary} />
										</View>
										<View style={styles.savedAuthInfo}>
											<Text style={[styles.savedAuthSlug, { color: colors.text }]}>@{auth.slug}</Text>
											<Text style={[styles.savedAuthDate, { color: colors.textTertiary }]}>Last: {new Date(auth.lastSignIn).toLocaleDateString()}</Text>
										</View>
										<TouchableOpacity style={styles.deleteIcon} onPress={() => handleDeleteSavedAuth(auth.slug)}>
											<Ionicons name="trash-outline" size={20} color={colors.error} />
										</TouchableOpacity>
									</TouchableOpacity>
								))}
							</View>
						)}

						<View style={styles.inputContainer}>
							<View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
								<Ionicons name="person-outline" size={20} color={colors.textSecondary} />
								<TextInput
									style={[styles.input, { color: colors.text }]}
									placeholder="Username"
									placeholderTextColor={colors.textTertiary}
									value={slug}
									onChangeText={(text) => {
										setSlug(text)
										setStatusState('initial')
									}}
									autoCapitalize="none"
									autoCorrect={false}
								/>
							</View>
							<View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
								<Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
								<TextInput
									style={[styles.input, { color: colors.text }]}
									placeholder="Password"
									placeholderTextColor={colors.textTertiary}
									value={password}
									onChangeText={(text) => {
										setPassword(text)
										setStatusState('initial')
									}}
									secureTextEntry
								/>
							</View>
						</View>

						{(statusState === '404' || statusState === '409') && (
							<Text
								style={[
									styles.errorText,
									{
										color: statusState === '404' ? colors.error : colors.warning
									}
								]}
							>
								{statusState === '404' ? errorMessage : 'Incorrect password. Try again'}
							</Text>
						)}

						<View style={statusState === '404' ? styles.buttonContainer : undefined}>
							{statusState === '404' ? (
								<>
									<TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleSignIn}>
										<Ionicons name="log-in-outline" size={22} color={colors.textOnPrimary} />
									</TouchableOpacity>
									<TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.primary }]} onPress={handleSignUp}>
										<Ionicons name="person-add-outline" size={22} color={colors.primary} />
									</TouchableOpacity>
								</>
							) : (
								<TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary, width: '100%' }]} onPress={handleGo}>
									<Ionicons name="arrow-forward" size={24} color={colors.textOnPrimary} />
								</TouchableOpacity>
							)}
						</View>

						<View style={styles.bottomActions}>
							<TouchableOpacity onPress={() => router.replace('/home/feed' as any)} style={[styles.homeButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
								<Ionicons name="home" size={24} color={colors.primary} />
							</TouchableOpacity>

							<TouchableOpacity onPress={handleResetApp} style={styles.resetButton}>
								<Ionicons name="refresh" size={16} color={colors.error} />
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</SafeAreaView>
		</SafeAreaProvider>
	)
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1
	},
	container: {
		flex: 1,
		justifyContent: 'center',
		padding: 24,
		alignItems: 'center'
	},
	innerContainer: {
		width: '100%',
		alignItems: 'center'
	},
	title: {
		fontSize: 32,
		fontWeight: '700',
		marginBottom: 4,
		textAlign: 'center'
	},
	subtitle: {
		fontSize: 14,
		marginBottom: 32,
		textAlign: 'center'
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: '600',
		letterSpacing: 0.5,
		marginBottom: 12
	},
	savedAuthsContainer: {
		width: '100%',
		marginBottom: 32
	},
	savedAuthItem: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 14,
		borderRadius: 14,
		marginBottom: 10,
		borderWidth: 1
	},
	authAvatar: {
		width: 44,
		height: 44,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 14
	},
	savedAuthInfo: {
		flex: 1
	},
	savedAuthSlug: {
		fontSize: 16,
		fontWeight: '600'
	},
	savedAuthDate: {
		fontSize: 12,
		marginTop: 2
	},
	deleteIcon: {
		width: 44,
		height: 44,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center'
	},
	inputContainer: {
		width: '100%',
		gap: 12,
		marginBottom: 16
	},
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 14,
		paddingHorizontal: 16,
		paddingVertical: 14,
		gap: 12
	},
	input: {
		flex: 1,
		fontSize: 16
	},
	errorText: {
		marginBottom: 16,
		textAlign: 'center',
		fontWeight: '500'
	},
	buttonContainer: {
		flexDirection: 'row',
		gap: 12,
		width: '100%'
	},
	primaryButton: {
		flex: 1,
		height: 56,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center'
	},
	secondaryButton: {
		flex: 1,
		height: 56,
		borderRadius: 14,
		borderWidth: 2,
		justifyContent: 'center',
		alignItems: 'center'
	},
	bottomActions: {
		marginTop: 40,
		alignItems: 'center',
		gap: 20
	},
	homeButton: {
		width: 56,
		height: 56,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1
	},
	resetButton: {
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	}
})
