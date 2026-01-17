import React, { useState, useCallback } from 'react'
import { View, TextInput, Button, Text, TouchableOpacity, Alert, useWindowDimensions, Platform, StyleSheet, ScrollView, KeyboardAvoidingView } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'
import { signIn, signUp, getSavedAuthentications, deleteSavedAuthentication, signInWithToken, SavedAuth } from '../../core/auth/auth.api'
import { secureGetItem } from '../../core/auth/storage'
import { useTheme } from '../../contexts/ThemeContext'
import { showAlert } from '../../utils/popup'
import { useBackButton } from '../../hooks/useBackButton'
import { log } from '../../core/log'
import { useUser } from '../../contexts/UserContext'
import { LANGUAGES, CURRENCIES } from '../../constants/settings'

export default function AuthScreen() {
	const { colors } = useTheme()
	const { translate, setAppLang, setCurrency, appLang, currency } = useUser()
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
				showAlert(translate('error', 'Error'), translate('session_expired', 'Session expired. Please sign in again with your password.'))
				await deleteSavedAuthentication(auth.slug)
				loadSavedAuths()
			}
		} catch (error) {
			showAlert(translate('error', 'Error'), translate('quick_signin_failed', 'Quick sign in failed.'))
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
				// Clear AsyncStorage (works on both Android and web)
				await AsyncStorage.clear()
				setSavedAuths([])

				// Clear web-specific storage
				if (Platform.OS === 'web') {
					// Clear localStorage
					if (typeof localStorage !== 'undefined') {
						localStorage.clear()
					}
					// Clear sessionStorage
					if (typeof sessionStorage !== 'undefined') {
						sessionStorage.clear()
					}
					// Clear all cookies
					if (typeof document !== 'undefined' && document.cookie) {
						document.cookie.split(';').forEach((cookie) => {
							const eqPos = cookie.indexOf('=')
							const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
							document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
						})
					}
				}

				log({ level: 'info', label: 'auth', message: 'App reset performed - all data cleared' })

				if (Platform.OS === 'web') {
					window.location.reload()
				} else {
					Alert.alert(translate('success', 'Success'), translate('reset_success', 'App reset successfully.'), [{ text: translate('ok', 'OK') }])
				}
			} catch (error) {
				log({ level: 'error', label: 'auth', message: 'Failed to reset app', error })
				Alert.alert(translate('error', 'Error'), translate('reset_failed', 'Failed to reset app.'))
			}
		}

		if (Platform.OS === 'web') {
			if (window.confirm(translate('reset_app_confirm', 'Are you sure you want to reset the app? This will clear all data.'))) {
				await performReset()
			}
		} else {
			Alert.alert(translate('reset_app', 'Reset App'), translate('reset_app_confirm', 'Are you sure you want to reset the app? This will clear all data.'), [
				{ text: translate('cancel', 'Cancel'), style: 'cancel' },
				{
					text: translate('reset', 'Reset'),
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
				showAlert(translate('error', 'Error'), translate('signin_failed', 'Sign in failed. Please try again.'))
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
				setErrorMessage(translate('incorrect_password', 'Incorrect password. Try again'))
			} else if (status === 401 || status === '401') {
				showAlert(translate('unauthorized', 'Unauthorized'), message || translate('invalid_credentials', 'Invalid credentials. Please check your username and password.'))
			} else {
				log({
					level: 'error',
					label: 'auth',
					message: 'Generic login error',
					error
				})
				showAlert(translate('error', 'Error'), message || translate('signin_failed', 'Sign in failed. Please check your credentials and try again.'))
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
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
					<ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
						<View style={[styles.innerContainer, isWideScreen && { maxWidth }]}>
							<View style={styles.topUtilityBar}>
								<TouchableOpacity onPress={() => router.replace('/home/feed' as any)} style={[styles.utilityButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
									<Ionicons name="home-outline" size={20} color={colors.primary} />
								</TouchableOpacity>
								<TouchableOpacity onPress={handleResetApp} style={[styles.utilityButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
									<Ionicons name="refresh-outline" size={20} color={colors.primary} />
								</TouchableOpacity>
							</View>
							<Text style={[styles.title, { color: colors.text }]}>{translate('auth_title', 'Drinaluza')}</Text>
							<Text style={[styles.subtitle, { color: colors.textSecondary }]}>{translate('auth_subtitle', 'Seafood Business Manager')}</Text>

							{/* Language and Currency Selection */}
							<View style={styles.settingsSection}>
								<View style={styles.settingsGroup}>
									<Text style={[styles.settingsLabel, { color: colors.textTertiary }]}>{translate('app_lang', 'Language')}</Text>
									<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsScroll}>
										{LANGUAGES.map((lang) => (
											<TouchableOpacity
												key={lang.code}
												style={[
													styles.settingsOption,
													{ backgroundColor: colors.surface, borderColor: colors.border },
													appLang === lang.code && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
												]}
												onPress={() => setAppLang(lang.code)}
											>
												<Text style={styles.flagText}>{lang.flag}</Text>
												<Text style={[styles.optionLabel, { color: colors.text }, appLang === lang.code && { color: colors.primary, fontWeight: '700' }]}>{lang.label}</Text>
											</TouchableOpacity>
										))}
									</ScrollView>
								</View>

								<View style={styles.settingsGroup}>
									<Text style={[styles.settingsLabel, { color: colors.textTertiary }]}>{translate('currency_label', 'Currency')}</Text>
									<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.settingsScroll}>
										{CURRENCIES.map((curr) => (
											<TouchableOpacity
												key={curr.code}
												style={[
													styles.settingsOption,
													{ backgroundColor: colors.surface, borderColor: colors.border },
													currency === curr.code && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
												]}
												onPress={() => setCurrency(curr.code)}
											>
												<View style={[styles.currencySymbolContainer, { backgroundColor: colors.card }]}>
													<Text style={[styles.currencySymbol, { color: colors.primary }]}>{curr.symbol}</Text>
												</View>
												<Text style={[styles.optionLabel, { color: colors.text }, currency === curr.code && { color: colors.primary, fontWeight: '700' }]}>{curr.label}</Text>
											</TouchableOpacity>
										))}
									</ScrollView>
								</View>
							</View>

							{savedAuths.length > 0 && (
								<View style={styles.savedAuthsSection}>
									<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('saved_accounts', 'SAVED ACCOUNTS')}</Text>
									<View style={[styles.savedAuthsContainer, { borderColor: colors.border }]}>
										<ScrollView style={styles.savedAuthsScroll} nestedScrollEnabled={true}>
											{savedAuths.map((auth) => (
												<TouchableOpacity key={auth.slug} style={[styles.savedAuthItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => handleQuickSignIn(auth)}>
													<View style={[styles.authAvatar, { backgroundColor: colors.primaryContainer }]}>
														<Ionicons name="person" size={20} color={colors.primary} />
													</View>
													<View style={styles.savedAuthInfo}>
														<Text style={[styles.savedAuthSlug, { color: colors.text }]}>@{auth.slug}</Text>
														<Text style={[styles.savedAuthDate, { color: colors.textTertiary }]}>
															{translate('last_signin', 'Last')}: {new Date(auth.lastSignIn).toLocaleDateString()}
														</Text>
													</View>
													<TouchableOpacity style={styles.deleteIcon} onPress={() => handleDeleteSavedAuth(auth.slug)}>
														<Ionicons name="trash-outline" size={20} color={colors.error} />
													</TouchableOpacity>
												</TouchableOpacity>
											))}
										</ScrollView>
									</View>
								</View>
							)}

							<View style={styles.inputContainer}>
								<View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.border }]}>
									<Ionicons name="person-outline" size={20} color={colors.textSecondary} />
									<TextInput
										style={[styles.input, { color: colors.text }]}
										placeholder={translate('username', 'Username')}
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
										placeholder={translate('password', 'Password')}
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
									{statusState === '404' ? errorMessage : translate('incorrect_password', 'Incorrect password. Try again')}
								</Text>
							)}

							<View style={statusState === '404' ? styles.buttonContainer : { width: '100%', alignItems: 'center', marginTop: 16 }}>
								{statusState === '404' ? (
									<>
										<TouchableOpacity style={[styles.primaryIconButton, { backgroundColor: colors.primary }]} onPress={handleSignIn}>
											<Ionicons name="log-in-outline" size={24} color={colors.textOnPrimary} />
										</TouchableOpacity>
										<TouchableOpacity style={[styles.secondaryIconButton, { borderColor: colors.primary }]} onPress={handleSignUp}>
											<Ionicons name="person-add-outline" size={24} color={colors.primary} />
										</TouchableOpacity>
									</>
								) : (
									<TouchableOpacity style={[styles.goIconButton, { backgroundColor: colors.primary }]} onPress={handleGo}>
										<Ionicons name="arrow-forward" size={28} color={colors.textOnPrimary} />
									</TouchableOpacity>
								)}
							</View>
						</View>
					</ScrollView>
				</KeyboardAvoidingView>
			</SafeAreaView>
		</SafeAreaProvider>
	)
}

const styles = StyleSheet.create({
	safeArea: {
		flex: 1
	},
	scrollContainer: {
		flexGrow: 1,
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
	savedAuthsSection: {
		width: '100%',
		marginBottom: 32
	},
	savedAuthsContainer: {
		width: '100%',
		maxHeight: 220,
		borderRadius: 16,
		overflow: 'hidden'
	},
	savedAuthsScroll: {
		width: '100%'
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
	buttonText: {
		fontSize: 16,
		fontWeight: '700',
		marginRight: 8
	},
	errorText: {
		marginBottom: 16,
		textAlign: 'center',
		fontWeight: '600',
		fontSize: 13
	},
	buttonContainer: {
		flexDirection: 'row',
		gap: 12,
		width: '100%',
		marginTop: 8
	},
	goIconButton: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.3,
				shadowRadius: 8
			},
			android: {
				elevation: 8
			}
		})
	},
	primaryIconButton: {
		width: 56,
		height: 56,
		borderRadius: 28,
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
	},
	secondaryIconButton: {
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 2
	},
	topUtilityBar: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		width: '100%',
		gap: 12,
		marginBottom: 24
	},
	utilityButton: {
		width: 44,
		height: 44,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1
	},
	settingsSection: {
		width: '100%',
		marginBottom: 24,
		gap: 16
	},
	settingsGroup: {
		gap: 8
	},
	settingsLabel: {
		fontSize: 12,
		fontWeight: '600',
		marginLeft: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	settingsScroll: {
		gap: 10,
		paddingRight: 24
	},
	settingsOption: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
		borderWidth: 1.5,
		gap: 8,
		minWidth: 100
	},
	flagText: {
		fontSize: 20
	},
	optionLabel: {
		fontSize: 13,
		fontWeight: '500'
	},
	currencySymbolContainer: {
		width: 24,
		height: 24,
		borderRadius: 6,
		justifyContent: 'center',
		alignItems: 'center'
	},
	currencySymbol: {
		fontSize: 12,
		fontWeight: '700'
	}
})
