import React, { useState } from 'react'
import { View, TextInput, Button, Text, TouchableOpacity, Alert, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { signIn, signUp, getSavedAuthentications, deleteSavedAuthentication, signInWithToken, SavedAuth, secureGetItem } from '../../core/auth/auth.api'
import { useTheme } from '../../contexts/ThemeContext'
import { createThemedStyles, commonThemedStyles } from '../../core/theme/createThemedStyles'
import { useFocusEffect } from 'expo-router'
import { useCallback } from 'react'
import { showPopup, showAlert } from '../../utils/popup'

export default function AuthScreen() {
	const { colors, isDark } = useTheme()
	const { width } = useWindowDimensions()
	const maxWidth = 600
	const isWideScreen = width > maxWidth
	const [slug, setUsername] = useState('ahmed')
	const [password, setPassword] = useState('123')
	const [statusState, setStatusState] = useState<'initial' | '404' | '409'>('initial')
	const [errorMessage, setErrorMessage] = useState('')
	const [savedAuths, setSavedAuths] = useState<SavedAuth[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const router = useRouter()

	const styles = createThemedStyles((colors) => ({
		...commonThemedStyles(colors),
		container: {
			flex: 1,
			justifyContent: 'center',
			padding: 20,
			backgroundColor: colors.background,
			alignItems: 'center'
		},
		innerContainer: {
			width: '100%',
			maxWidth: isWideScreen ? maxWidth : undefined,
			alignSelf: isWideScreen ? 'center' : undefined
		},
		title: {
			fontSize: 24,
			fontWeight: 'bold',
			color: colors.text,
			marginBottom: 20,
			textAlign: 'center'
		},
		input: {
			borderWidth: 1,
			borderColor: colors.inputBorder,
			padding: 10,
			marginBottom: 10,
			borderRadius: 5,
			color: colors.text,
			backgroundColor: colors.input
		},
		buttonContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between'
		},
		savedAuthsContainer: {
			width: '100%',
			marginBottom: 24
		},
		savedAuthItem: {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: colors.card,
			padding: 12,
			borderRadius: 12,
			marginBottom: 8,
			borderWidth: 1,
			borderColor: colors.border
		},
		savedAuthInfo: {
			flex: 1
		},
		savedAuthSlug: {
			fontSize: 16,
			fontWeight: '600',
			color: colors.text
		},
		savedAuthDate: {
			fontSize: 12,
			color: colors.textTertiary,
			marginTop: 2
		},
		deleteIcon: {
			padding: 8
		}
	}))(colors)

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
				router.replace('/home' as any)
			} else {
				setUsername(auth.slug)
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

	const handleDeleteSavedAuth = async (slug: string) => {
		await deleteSavedAuthentication(slug)
		loadSavedAuths()
	}

	const handleSignIn = async () => {
		try {
			console.log('Attempting to sign in...')
			const response = await signIn(slug, password)
			console.log('Sign in response:', response)

			// Verify token was stored
			const token = await secureGetItem('authToken')
			console.log('Token stored after sign in:', token ? 'Yes' : 'No')

			if (token) {
				console.log('Navigating to /home')
				router.replace('/home' as any)
			} else {
				console.error('No token received after sign in')
				showAlert('Error', 'Sign in failed. Please try again.')
			}
		} catch (error: any) {
			console.log('Sign in catch block reached')
			const responseData = error.response?.data
			// Check status from both HTTP response and response body (some APIs return it there)
			const status = error.response?.status || responseData?.status || responseData?.statusCode
			const message = responseData?.message || error.message

			console.log('Detected status:', status)
			console.log('Detected message:', message)

			if (status === 404 || status === '404') {
				setStatusState('404')
				setErrorMessage(message)
			} else if (status === 409 || status === '409') {
				console.log('Detected incorrect password (409)')
				setPassword('') // Base clearing
				setStatusState('409')
				setErrorMessage('Try again')
			} else if (status === 401 || status === '401') {
				// Also handle 401 as it's common for unauthorized/wrong password
				showAlert('Unauthorized', message || 'Invalid credentials. Please check your username and password.')
			} else {
				console.log('Showing generic error alert')
				showAlert('Error', message || 'Sign in failed. Please check your credentials and try again.')
			}
		}
	}

	const handleGo = async () => {
		console.log('Go pressed, calling handleSignIn')
		await handleSignIn()
	}

	const handleSignUp = async () => {
		try {
			await signUp(slug, password)
			router.push('/home' as any)
		} catch (error) {
			console.error('Sign up failed:', error)
		}
	}

	return (
		<SafeAreaProvider>
			<SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'right', 'left']}>
				<StatusBar style={isDark ? 'light' : 'dark'} />
				<View style={styles.container}>
					<View style={styles.innerContainer}>
						<Text style={styles.title}>Drinaluza</Text>

						{savedAuths.length > 0 && (
							<View style={styles.savedAuthsContainer}>
								<Text style={[styles.title, { fontSize: 18, marginTop: 10, marginBottom: 16 }]}>Saved Accounts</Text>
								{savedAuths.map((auth) => (
									<TouchableOpacity key={auth.slug} style={styles.savedAuthItem} onPress={() => handleQuickSignIn(auth)}>
										<View style={styles.savedAuthInfo}>
											<Text style={styles.savedAuthSlug}>{auth.slug}</Text>
											<Text style={styles.savedAuthDate}>Last sign in: {new Date(auth.lastSignIn).toLocaleDateString()}</Text>
										</View>
										<TouchableOpacity style={styles.deleteIcon} onPress={() => handleDeleteSavedAuth(auth.slug)}>
											<Ionicons name="trash-outline" size={20} color={colors.error} />
										</TouchableOpacity>
									</TouchableOpacity>
								))}
							</View>
						)}

						<TextInput
							style={styles.input}
							placeholder="Username"
							value={slug}
							onChangeText={(text) => {
								setUsername(text)
								setStatusState('initial')
							}}
						/>
						<TextInput
							style={styles.input}
							placeholder="Password"
							value={password}
							onChangeText={(text) => {
								setPassword(text)
								setStatusState('initial')
							}}
							secureTextEntry
						/>

						{(statusState === '404' || statusState === '409') && (
							<Text
								style={{
									color: statusState === '404' ? colors.error : colors.accent,
									marginBottom: 10,
									textAlign: 'center',
									fontWeight: statusState === '409' ? 'bold' : 'normal'
								}}
							>
								{statusState === '404' ? `${errorMessage}\n` : 'Try again'}
							</Text>
						)}

						<View style={statusState === '404' ? styles.buttonContainer : {}}>
							{statusState === '404' ? (
								<>
									<Button title="Sign In" onPress={handleSignIn} />
									<Button title="Sign Up" onPress={handleSignUp} />
								</>
							) : (
								<Button title="Go" onPress={handleGo} />
							)}
						</View>
						<View style={{ marginTop: 30, alignItems: 'center' }}>
							<TouchableOpacity
								onPress={() => router.replace('/home/feed' as any)}
								style={{
									width: 50,
									height: 50,
									borderRadius: 25,
									backgroundColor: colors.card,
									justifyContent: 'center',
									alignItems: 'center',
									borderWidth: 1,
									borderColor: colors.border,
									shadowColor: '#000',
									shadowOffset: { width: 0, height: 2 },
									shadowOpacity: 0.1,
									shadowRadius: 4,
									elevation: 3
								}}
							>
								<Ionicons name="home" size={24} color={colors.primary} />
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</SafeAreaView>
		</SafeAreaProvider>
	)
}
