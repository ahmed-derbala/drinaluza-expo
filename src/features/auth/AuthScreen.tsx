import React, { useState, useCallback, useRef } from 'react'
import { View, TextInput, Text, TouchableOpacity, Alert, useWindowDimensions, Platform, StyleSheet, ScrollView, KeyboardAvoidingView, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useFocusEffect, Stack } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { StatusBar } from 'expo-status-bar'

import { signIn, signUp, getSavedAuthentications, deleteSavedAuthentication, signInWithToken, SavedAuth } from './auth.api'
import { useTheme } from '@/core/theme'
import { showAlert } from '@/core/helpers/popup'
import { useBackButton } from '@/core/hooks/useBackButton'
import { log } from '@/core/log'
import { useUser } from '@/core/contexts/UserContext'
import { LANGUAGES } from '@/config/settings'
import SmartImage from '@/core/SmartImageViewer'

export default function AuthScreen() {
	const { colors, dark } = useTheme()
	const insets = useSafeAreaInsets()
	const { translate, setAppLang, setContentLang, appLang, refreshUser } = useUser()
	useBackButton()
	const { width } = useWindowDimensions()
	const maxWidth = 500
	const isWideScreen = width > maxWidth
	const router = useRouter()

	// Form fields
	const [slug, setSlug] = useState('')
	const [password, setPassword] = useState('')
	const [saveAccount, setSaveAccount] = useState(true)
	const [needPassword, setNeedPassword] = useState(false)

	// Input focus states for high-fidelity active border glowing effects
	const [slugFocused, setSlugFocused] = useState(false)
	const [passwordFocused, setPasswordFocused] = useState(false)

	const handleSlugChange = (text: string) => {
		const sanitized = text.toLowerCase().replace(/[^a-z0-9-]/g, '')
		setSlug(sanitized)
	}

	// UI and loader states
	const [savedAuths, setSavedAuths] = useState<SavedAuth[]>([])
	const [isLoading, setIsLoading] = useState(false)
	const passwordRef = useRef<TextInput>(null)

	// Load saved accounts from secure storage
	const loadSavedAuths = async () => {
		try {
			const auths = await getSavedAuthentications()
			setSavedAuths(auths)
		} catch (error) {
			log({ level: 'error', label: 'auth', message: 'Failed to load saved authentications', error })
		}
	}

	useFocusEffect(
		useCallback(() => {
			refreshUser()
			loadSavedAuths()
		}, [refreshUser])
	)

	// Handles removing a saved account
	const handleDeleteSavedAuth = async (authSlug: string) => {
		await deleteSavedAuthentication(authSlug)
		await loadSavedAuths()
		toastSuccess(translate('account_removed', 'Account removed successfully!'))
	}

	const toastSuccess = (msg: string) => {
		if (Platform.OS === 'web') {
			log({ level: 'info', label: 'auth', message: msg })
		}
	}

	// Handles switching or logging into a saved account
	const handleSwitchAccount = async (auth: SavedAuth) => {
		if (auth.needPassword) {
			// Require password manually
			setSlug(auth.slug)
			setPassword('')
			setNeedPassword(true)
			// Small timeout to allow input focus
			setTimeout(() => {
				passwordRef.current?.focus()
			}, 150)
			showAlert(translate('switch_requires_password', 'Password Required'), translate('need_password_notice', 'Please enter your password to switch to this account.'))
		} else {
			// Try seamless quick sign-in using the saved token
			setIsLoading(true)
			try {
				const success = await signInWithToken(auth.token)
				if (success) {
					await refreshUser()
					router.replace('/(home)/feed')
				} else {
					// Token expired or invalid
					setSlug(auth.slug)
					setPassword('')
					setTimeout(() => {
						passwordRef.current?.focus()
					}, 150)
					showAlert(translate('session_expired_title', 'Session Expired'), translate('token_expired_notice', 'Session token has expired. Please enter your password.'))
					// Remove the stale authentication entry
					await deleteSavedAuthentication(auth.slug)
					await loadSavedAuths()
				}
			} catch (error) {
				log({ level: 'error', label: 'auth', message: 'Quick sign in token failed', error })
				setSlug(auth.slug)
				setPassword('')
				showAlert(translate('error', 'Error'), translate('token_expired_notice', 'Session token has expired. Please enter your password.'))
			} finally {
				setIsLoading(false)
			}
		}
	}

	// Sign Up workflow
	const handleSignUp = async () => {
		setIsLoading(true)
		try {
			const initialSettings = {
				lang: {
					app: appLang,
					content: appLang
				},
				currency: 'tnd'
			}

			await signUp(slug.trim(), password.trim(), { settings: initialSettings }, saveAccount, needPassword)

			// Update app & content languages in storage with the selected language
			await setAppLang(appLang)
			await setContentLang(appLang)

			await refreshUser()
			router.replace('/(home)/feed')
		} catch (error: any) {
			log({ level: 'error', label: 'auth', message: 'Sign up failed', error })
			const errMsg = error.response?.data?.message || error.message || 'Signup failed. Please try again.'
			showAlert(translate('error', 'Error'), errMsg)
		} finally {
			setIsLoading(false)
		}
	}

	// Single Continue Button Logic
	const handleContinue = async () => {
		const trimmedSlug = slug.trim()
		if (!trimmedSlug) {
			showAlert(translate('error', 'Error'), translate('username_required', 'Username is required.'))
			return
		}

		// Enforce slug validation
		const isValidSlugFormat = /^[a-z0-9-]+$/.test(trimmedSlug)
		if (!isValidSlugFormat) {
			showAlert(translate('error', 'Error'), translate('username_invalid_chars', 'Username can only contain lowercase letters, numbers, and hyphens.'))
			return
		}

		if (trimmedSlug.startsWith('-') || trimmedSlug.endsWith('-')) {
			showAlert(translate('error', 'Error'), translate('username_invalid_hyphen', 'Hyphen (-) cannot be the first or last character of the username.'))
			return
		}

		if (!password.trim()) {
			showAlert(translate('error', 'Error'), translate('password_required', 'Password is required.'))
			return
		}

		setIsLoading(true)
		try {
			log({ level: 'info', label: 'auth', message: 'Attempting to sign in via unified button', data: { slug: trimmedSlug } })
			await signIn(trimmedSlug, password.trim(), saveAccount, needPassword)

			await refreshUser()
			router.replace('/(home)/feed')
		} catch (error: any) {
			const responseData = error.response?.data
			const status = error.response?.status || responseData?.status || responseData?.statusCode

			if (status === 404 || status === '404') {
				setIsLoading(false)
				const frontendUrl = process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://drinaluza.com'
				const profileUrl = `${frontendUrl}/u/${trimmedSlug}`
				const signupMessage = `${translate('user_not_found_signup', 'User not found. Do you want to sign up? Your public profile will be accessible at:')} ${profileUrl}`

				if (Platform.OS === 'web') {
					if (window.confirm(signupMessage)) {
						await handleSignUp()
					}
				} else {
					Alert.alert(translate('user_not_found', 'User Not Found'), signupMessage, [
						{ text: translate('cancel', 'Cancel'), style: 'cancel' },
						{ text: translate('sign_up', 'Sign Up'), onPress: handleSignUp }
					])
				}
			} else if (status === 409 || status === '409') {
				setIsLoading(false)
				setPassword('')
				const verifyMessage = translate('password_incorrect_verify', 'Incorrect password. Please verify and try again.')

				if (Platform.OS === 'web') {
					window.alert(verifyMessage)
				} else {
					Alert.alert(translate('error', 'Error'), verifyMessage)
				}
				passwordRef.current?.focus()
			} else {
				setIsLoading(false)
				const errMsg = responseData?.message || error.message || 'Authentication failed.'
				showAlert(translate('error', 'Error'), errMsg)
			}
		}
	}

	// Resets the app storage completely
	const handleResetApp = async () => {
		const performReset = async () => {
			try {
				await AsyncStorage.clear()
				setSavedAuths([])
				if (Platform.OS === 'web') {
					if (typeof localStorage !== 'undefined') localStorage.clear()
					if (typeof sessionStorage !== 'undefined') sessionStorage.clear()
					if (typeof document !== 'undefined' && document.cookie) {
						document.cookie.split(';').forEach((cookie) => {
							const eqPos = cookie.indexOf('=')
							const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim()
							document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/'
						})
					}
					window.location.reload()
				} else {
					Alert.alert(translate('success', 'Success'), translate('reset_success', 'App reset successfully.'))
				}
			} catch (error) {
				log({ level: 'error', label: 'auth', message: 'Failed to reset app', error })
				Alert.alert(translate('error', 'Error'), translate('reset_failed', 'Failed to reset app.'))
			}
		}

		const confirmMessage = translate('reset_app_confirm', 'Are you sure you want to reset the app? This will clear all data.')
		if (Platform.OS === 'web') {
			if (window.confirm(confirmMessage)) {
				await performReset()
			}
		} else {
			Alert.alert(translate('reset_app', 'Reset App'), confirmMessage, [
				{ text: translate('cancel', 'Cancel'), style: 'cancel' },
				{ text: translate('reset', 'Reset'), style: 'destructive', onPress: performReset }
			])
		}
	}

	const styles = createStyles(colors, dark, isWideScreen)

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'right', 'left']}>
			<StatusBar style="light" />
			<Stack.Screen
				options={{
					headerShown: true,
					headerTitle: translate('auth_title', 'Drinaluza'),
					headerTitleAlign: 'center',
					headerStyle: {
						backgroundColor: colors.card
					},
					headerTintColor: colors.text,
					headerLeft: () => (
						<TouchableOpacity
							onPress={() => router.replace('/(home)/feed')}
							style={[styles.headerIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
							accessibilityLabel="Go to Feed"
						>
							<Ionicons name="home-outline" size={18} color={colors.primary} />
						</TouchableOpacity>
					),
					headerRight: () => (
						<TouchableOpacity onPress={handleResetApp} style={[styles.headerIconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLabel="Reset Storage">
							<Ionicons name="refresh-outline" size={18} color={colors.error} />
						</TouchableOpacity>
					)
				}}
			/>

			<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
				<ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom + 20, 24) }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
					<View style={[styles.innerContent, isWideScreen && styles.desktopCard]}>
						{/* Logo / Branding */}
						<View style={styles.brandingContainer}>
							<View style={[styles.logoIconFrame, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '30' }]}>
								<Ionicons name="shield-checkmark" size={36} color={colors.primary} />
							</View>
							<Text style={[styles.logoText, { color: colors.text }]}>{translate('auth_title', 'Drinaluza')}</Text>
							<Text style={[styles.subtitleText, { color: colors.textSecondary }]}>{translate('auth_subtitle', 'Business Manager')}</Text>
						</View>

						{/* App Language Selection */}
						<View style={styles.langSection}>
							<Text style={[styles.langSectionTitle, { color: colors.textSecondary }]}>{translate('app_lang', 'App Language')}</Text>
							<View style={styles.langSelectorRow}>
								{LANGUAGES.map((lang) => {
									const isSelected = appLang === lang.code
									return (
										<TouchableOpacity
											key={lang.code}
											onPress={() => {
												setAppLang(lang.code)
												setContentLang(lang.code)
											}}
											style={[
												styles.langOptionCard,
												{
													backgroundColor: isSelected ? colors.primary + '12' : colors.surfaceVariant,
													borderColor: isSelected ? colors.primary : colors.border
												}
											]}
											activeOpacity={0.8}
										>
											<Text style={styles.langOptionFlag}>{lang.flag}</Text>
											<Text
												style={[
													styles.langOptionLabel,
													{
														color: isSelected ? colors.primary : colors.text,
														fontWeight: isSelected ? '700' : '500'
													}
												]}
											>
												{lang.label}
											</Text>
										</TouchableOpacity>
									)
								})}
							</View>
						</View>

						{/* Saved Accounts */}
						{savedAuths.length > 0 && (
							<View style={styles.savedSection}>
								<Text style={[styles.savedSectionTitle, { color: colors.textSecondary }]}>{translate('saved_accounts', 'SAVED ACCOUNTS')}</Text>
								<ScrollView style={styles.savedAccountsScroll} contentContainerStyle={styles.savedAccountsList} nestedScrollEnabled>
									{savedAuths.map((auth) => (
										<TouchableOpacity
											key={auth.slug}
											onPress={() => handleSwitchAccount(auth)}
											style={[styles.savedAccountCard, { backgroundColor: colors.surfaceVariant, borderColor: colors.border }]}
											activeOpacity={0.7}
										>
											{auth.photoUrl ? (
												<SmartImage source={auth.photoUrl} style={styles.accountAvatar} entityType="user" />
											) : (
												<View style={[styles.accountAvatar, styles.avatarPlaceholder, { backgroundColor: colors.primary + '18' }]}>
													<Ionicons name="person" size={16} color={colors.primary} />
												</View>
											)}
											<View style={styles.accountInfoContainer}>
												<Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
													{auth.name || auth.slug}
												</Text>
												<Text style={[styles.accountSlug, { color: colors.textSecondary }]}>@{auth.slug}</Text>
												{auth.role && (
													<View style={[styles.roleBadge, { backgroundColor: colors.primary + '12' }]}>
														<Text style={[styles.roleBadgeText, { color: colors.primary }]}>{auth.role}</Text>
													</View>
												)}
											</View>
											{auth.needPassword && (
												<View style={styles.passwordLockIndicator}>
													<Ionicons name="lock-closed" size={15} color={colors.textSecondary} />
												</View>
											)}
											<TouchableOpacity
												onPress={() => handleDeleteSavedAuth(auth.slug)}
												style={[styles.removeAccountBtn, { backgroundColor: colors.error + '10' }]}
												accessibilityLabel="Remove Saved Account"
											>
												<Ionicons name="trash-outline" size={16} color={colors.error} />
											</TouchableOpacity>
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>
						)}

						{/* Credentials inputs */}
						<View style={styles.formSection}>
							{/* Username field */}
							<View style={[styles.inputWrapper, { backgroundColor: colors.surfaceVariant, borderColor: slugFocused ? colors.primary : colors.border }]}>
								<Ionicons name="person-outline" size={18} color={slugFocused ? colors.primary : colors.textSecondary} />
								<TextInput
									style={[styles.textInput, { color: colors.text }]}
									placeholder={translate('username', 'Username')}
									placeholderTextColor={colors.textTertiary}
									value={slug}
									onChangeText={handleSlugChange}
									autoCapitalize="none"
									autoCorrect={false}
									editable={!isLoading}
									onFocus={() => setSlugFocused(true)}
									onBlur={() => setSlugFocused(false)}
								/>
							</View>
							{/* Save Account Checkbox */}
							<TouchableOpacity style={styles.checkboxWrapper} onPress={() => setSaveAccount(!saveAccount)} activeOpacity={0.8} disabled={isLoading}>
								<View style={[styles.customCheckbox, { borderColor: saveAccount ? colors.primary : colors.textSecondary, backgroundColor: saveAccount ? colors.primary : 'transparent' }]}>
									{saveAccount && <Ionicons name="checkmark" size={12} color="#fff" />}
								</View>
								<Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>{translate('save_account_checkbox', 'Save to accounts list')}</Text>
							</TouchableOpacity>

							{/* Password field */}
							<View style={[styles.inputWrapper, { backgroundColor: colors.surfaceVariant, borderColor: passwordFocused ? colors.primary : colors.border }]}>
								<Ionicons name="lock-closed-outline" size={18} color={passwordFocused ? colors.primary : colors.textSecondary} />
								<TextInput
									ref={passwordRef}
									style={[styles.textInput, { color: colors.text }]}
									placeholder={translate('password', 'Password')}
									placeholderTextColor={colors.textTertiary}
									value={password}
									onChangeText={setPassword}
									secureTextEntry
									editable={!isLoading}
									onFocus={() => setPasswordFocused(true)}
									onBlur={() => setPasswordFocused(false)}
								/>
							</View>
							{/* Require Password Checkbox */}
							<TouchableOpacity style={styles.checkboxWrapper} onPress={() => setNeedPassword(!needPassword)} activeOpacity={0.8} disabled={isLoading}>
								<View style={[styles.customCheckbox, { borderColor: needPassword ? colors.primary : colors.textSecondary, backgroundColor: needPassword ? colors.primary : 'transparent' }]}>
									{needPassword && <Ionicons name="checkmark" size={12} color="#fff" />}
								</View>
								<Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>{translate('require_password_checkbox', 'Require password on switch')}</Text>
							</TouchableOpacity>
						</View>

						{/* Single Continue Button */}
						<TouchableOpacity
							style={[styles.continueButton, { backgroundColor: slug.trim() && password.trim() ? colors.primary : colors.primary + '50' }]}
							onPress={handleContinue}
							activeOpacity={0.85}
							disabled={isLoading}
						>
							{isLoading ? (
								<ActivityIndicator size="small" color="#fff" />
							) : (
								<View style={styles.continueButtonContent}>
									<Text style={styles.continueButtonText}>{translate('continue', 'Continue')}</Text>
									<Ionicons name="arrow-forward" size={18} color="#fff" />
								</View>
							)}
						</TouchableOpacity>
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</SafeAreaView>
	)
}

const createStyles = (colors: any, dark: boolean, isWideScreen: boolean) =>
	StyleSheet.create({
		container: {
			flex: 1
		},
		scrollContent: {
			flexGrow: 1,
			paddingHorizontal: isWideScreen ? 40 : 20,
			paddingVertical: isWideScreen ? 50 : 24,
			justifyContent: 'center',
			alignItems: 'center'
		},
		innerContent: {
			width: '100%',
			alignItems: 'stretch'
		},
		desktopCard: {
			maxWidth: 480,
			backgroundColor: colors.card,
			borderRadius: 24,
			padding: 40,
			borderWidth: 1.5,
			borderColor: dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
			...Platform.select({
				web: {
					boxShadow: dark ? '0px 16px 48px rgba(0, 0, 0, 0.4), inset 0px 1px 1px rgba(255, 255, 255, 0.05)' : '0px 16px 48px rgba(0, 0, 0, 0.06), inset 0px 1px 1px rgba(255, 255, 255, 0.9)'
				} as any,
				default: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 8 },
					shadowOpacity: dark ? 0.35 : 0.08,
					shadowRadius: 16,
					elevation: 6
				}
			})
		},
		headerIconBtn: {
			width: 36,
			height: 36,
			borderRadius: 10,
			borderWidth: 1.5,
			justifyContent: 'center',
			alignItems: 'center'
		},
		brandingContainer: {
			alignItems: 'center',
			marginBottom: 32
		},
		logoIconFrame: {
			width: 72,
			height: 72,
			borderRadius: 22,
			borderWidth: 2,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 16,
			...Platform.select({
				web: {
					transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
				} as any,
				default: {}
			})
		},
		logoText: {
			fontSize: 30,
			fontWeight: '800',
			letterSpacing: -0.5
		},
		subtitleText: {
			fontSize: 13,
			fontWeight: '600',
			marginTop: 6,
			textTransform: 'uppercase',
			letterSpacing: 1,
			opacity: 0.8
		},
		langSection: {
			marginBottom: 28
		},
		langSectionTitle: {
			fontSize: 12,
			fontWeight: '700',
			textTransform: 'uppercase',
			letterSpacing: 0.8,
			marginBottom: 12,
			marginLeft: 4,
			opacity: 0.9
		},
		langSelectorRow: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: 8
		},
		langOptionCard: {
			flexGrow: 1,
			flexShrink: 0,
			flexBasis: '30%',
			minWidth: 100,
			borderWidth: 1.5,
			borderRadius: 14,
			paddingVertical: 12,
			alignItems: 'center',
			justifyContent: 'center',
			gap: 6,
			...Platform.select({
				web: {
					transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
				} as any,
				default: {}
			})
		},
		langOptionFlag: {
			fontSize: 22,
			fontWeight: '700'
		},
		langOptionLabel: {
			fontSize: 11,
			textAlign: 'center'
		},
		savedSection: {
			marginBottom: 28
		},
		savedSectionTitle: {
			fontSize: 12,
			fontWeight: '700',
			textTransform: 'uppercase',
			letterSpacing: 0.8,
			marginBottom: 12,
			marginLeft: 4,
			opacity: 0.9
		},
		savedAccountsScroll: {
			maxHeight: 230
		},
		savedAccountsList: {
			gap: 10
		},
		savedAccountCard: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 12,
			borderRadius: 16,
			borderWidth: 1.5
		},
		accountAvatar: {
			width: 42,
			height: 42,
			borderRadius: 12
		},
		avatarPlaceholder: {
			justifyContent: 'center',
			alignItems: 'center'
		},
		accountInfoContainer: {
			flex: 1,
			marginLeft: 12,
			justifyContent: 'center'
		},
		accountName: {
			fontSize: 14,
			fontWeight: '700'
		},
		accountSlug: {
			fontSize: 12,
			marginTop: 1,
			opacity: 0.8
		},
		roleBadge: {
			alignSelf: 'flex-start',
			paddingHorizontal: 6,
			paddingVertical: 2,
			borderRadius: 6,
			marginTop: 4
		},
		roleBadgeText: {
			fontSize: 9,
			fontWeight: '700',
			textTransform: 'capitalize'
		},
		passwordLockIndicator: {
			marginHorizontal: 8
		},
		removeAccountBtn: {
			width: 32,
			height: 32,
			borderRadius: 8,
			justifyContent: 'center',
			alignItems: 'center'
		},
		formSection: {
			gap: 14,
			marginBottom: 28
		},
		inputWrapper: {
			flexDirection: 'row',
			alignItems: 'center',
			borderWidth: 1.5,
			borderRadius: 16,
			paddingHorizontal: 16,
			height: 52,
			gap: 12,
			...Platform.select({
				web: {
					transition: 'all 0.2s ease-in-out'
				} as any,
				default: {}
			})
		},
		textInput: {
			flex: 1,
			fontSize: 15,
			height: '100%',
			paddingVertical: 0
		},
		checkboxWrapper: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 10,
			paddingVertical: 4,
			paddingHorizontal: 4
		},
		customCheckbox: {
			width: 18,
			height: 18,
			borderRadius: 5,
			borderWidth: 1.5,
			justifyContent: 'center',
			alignItems: 'center'
		},
		checkboxLabel: {
			fontSize: 13,
			fontWeight: '500'
		},
		continueButton: {
			height: 52,
			borderRadius: 16,
			justifyContent: 'center',
			alignItems: 'center',
			...Platform.select({
				web: {
					transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
				} as any,
				default: {}
			}),
			...Platform.select({
				ios: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.15,
					shadowRadius: 8
				},
				android: {
					elevation: 4
				}
			})
		},
		continueButtonContent: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8
		},
		continueButtonText: {
			color: '#fff',
			fontSize: 16,
			fontWeight: '700'
		}
	})
