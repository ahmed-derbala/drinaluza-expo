import React, { useState } from 'react'
import { View, TextInput, Button, Text, TouchableOpacity, Alert, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { signIn, signUp } from '../../core/auth/auth.api'
import { useTheme } from '../../contexts/ThemeContext'
import { createThemedStyles, commonThemedStyles } from '../../core/theme/createThemedStyles'

export default function AuthScreen() {
	const { colors, isDark } = useTheme()
	const { width } = useWindowDimensions()
	const maxWidth = 600
	const isWideScreen = width > maxWidth
	const [slug, setUsername] = useState('ahmed')
	const [password, setPassword] = useState('123')
	const [statusState, setStatusState] = useState<'initial' | '404' | '409'>('initial')
	const [errorMessage, setErrorMessage] = useState('')
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
		}
	}))(colors)

	const handleSignIn = async () => {
		try {
			console.log('Attempting to sign in...')
			const response = await signIn(slug, password)
			console.log('Sign in response:', response)

			// Verify token was stored
			const token = await AsyncStorage.getItem('authToken')
			console.log('Token stored after sign in:', token ? 'Yes' : 'No')

			if (token) {
				console.log('Navigating to /home')
				router.replace('/home' as any)
			} else {
				console.error('No token received after sign in')
				Alert.alert('Error', 'Sign in failed. Please try again.')
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
				Alert.alert('Unauthorized', message || 'Invalid credentials. Please check your username and password.')
			} else {
				console.log('Showing generic error alert')
				Alert.alert('Error', message || 'Sign in failed. Please check your credentials and try again.')
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
					</View>
				</View>
			</SafeAreaView>
		</SafeAreaProvider>
	)
}
