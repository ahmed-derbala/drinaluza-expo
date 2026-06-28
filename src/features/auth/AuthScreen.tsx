import React, { useState, useEffect, useRef } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { clearAllStorage } from '@/core/storage'

import { useTheme, createShadow, createColorShadow } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import SmartImage from '@/core/SmartImageViewer'
import { SmartHeader } from '@/core/smart-header'
import { useSmartKebabMenu } from '@/core/smart-kebab-menu'
import { KeyboardAvoidingWrapper } from '@/core/keyboard-avoiding-wrapper'

import { toast } from '@/features/common/Toast'
import { showConfirm, showAlert } from '@/core/helpers/popup'
import { config } from '@/config'
import { log } from '@/core/log'

import { getSavedAuthentications, saveAuthentication, deleteSavedAuthentication, signIn, signUp, signInWithToken, SavedAuth } from './auth.api'

// Available languages details
interface LanguageConfig {
	code: 'tn_arab' | 'tn_latn' | 'en' | 'fr' | 'ar'
	flag: string
	badge?: string
	label: string
}

const LANGUAGES_LIST: LanguageConfig[] = [
	{ code: 'tn_arab', flag: '🇹🇳', badge: 'ع', label: 'Tunisian Arabic' },
	{ code: 'tn_latn', flag: '🇹🇳', badge: 'A', label: 'Tunisian Latin' },
	{ code: 'en', flag: '🇺🇸', label: 'English' },
	{ code: 'fr', flag: '🇫🇷', label: 'French' },
	{ code: 'ar', flag: '🇸🇦', label: 'Arabic' }
]

export default function AuthScreen() {
	const router = useRouter()
	const { colors } = useTheme()
	const { width, height } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const { appLang, setAppLang, translate, refreshUser } = useUser()

	// State variables
	const [savedAccounts, setSavedAccounts] = useState<SavedAuth[]>([])
	const [slug, setSlug] = useState('')
	const [password, setPassword] = useState('')
	const [saveAccount, setSaveAccount] = useState(true)
	const [needPassword, setNeedPassword] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [loading, setLoading] = useState(false)
	const [slugError, setSlugError] = useState<string | null>(null)

	// Refs for focus management
	const passwordInputRef = useRef<TextInput>(null)
	const scrollViewRef = useRef<ScrollView>(null)

	// Load saved authentications from local storage
	const loadSavedAccounts = async () => {
		try {
			const accounts = await getSavedAuthentications()
			setSavedAccounts(accounts)
		} catch (err) {
			log({
				level: 'error',
				label: 'AuthScreen',
				message: 'Failed to load saved accounts',
				error: err
			})
		}
	}

	useEffect(() => {
		loadSavedAccounts()
	}, [])

	// Determine if layout is wide (tablet or desktop browser)
	const isTablet = width >= 768
	const styles = createStyles(colors, isTablet, width, height)

	// Custom slug sanitization and checking
	const handleSlugChange = (text: string) => {
		// Only allow lowercase latin, latin numbers, and dashes
		const sanitized = text.toLowerCase().replace(/[^a-z0-9-]/g, '')
		setSlug(sanitized)

		// Basic reactive validation
		if (sanitized.length > 20) {
			setSlugError(translate('username_invalid_len', 'Length cannot exceed 20 characters.'))
		} else if (sanitized.startsWith('-') || sanitized.endsWith('-')) {
			setSlugError(translate('username_invalid_hyphen', 'Hyphen (-) cannot be the first or last character.'))
		} else {
			setSlugError(null)
		}
	}

	// Validate slug strictly before form submission
	const validateSlug = (val: string): boolean => {
		if (val.length < 1) {
			setSlugError(translate('username_required', 'Username is required.'))
			return false
		}
		if (val.length > 20) {
			setSlugError(translate('username_invalid_len', 'Length must be between 1 and 20 characters.'))
			return false
		}
		if (val.startsWith('-') || val.endsWith('-')) {
			setSlugError(translate('username_invalid_hyphen', 'Hyphen (-) cannot be the first or last character of the username.'))
			return false
		}
		const regex = /^[a-z0-9-]+$/
		if (!regex.test(val)) {
			setSlugError(translate('username_invalid_chars', 'Username can only contain lowercase letters, numbers, and hyphens.'))
			return false
		}
		setSlugError(null)
		return true
	}

	// Handle Submit (Sign In / Authenticate)
	const handleSignInSubmit = async () => {
		if (!validateSlug(slug)) {
			toast.show({
				title: translate('invalid_request_title', 'Validation Error'),
				message: slugError || translate('username_invalid_chars'),
				color: '#EF4444'
			})
			return
		}

		if (password.length < 1) {
			toast.show({
				title: translate('invalid_request_title', 'Validation Error'),
				message: translate('password_required', 'Password is required.'),
				color: '#EF4444'
			})
			passwordInputRef.current?.focus()
			return
		}

		if (password.length > 20) {
			toast.show({
				title: translate('invalid_request_title', 'Validation Error'),
				message: translate('password_too_long', 'Password must not exceed 20 characters.'),
				color: '#EF4444'
			})
			passwordInputRef.current?.focus()
			return
		}

		try {
			setLoading(true)

			// Trigger API signin request
			await signIn(slug, password, saveAccount, needPassword)

			// Set active user state in context
			await refreshUser()

			toast.show({
				title: translate('success', 'Welcome!'),
				message: translate('signin_success_msg', 'Successfully logged in.'),
				color: '#10B981'
			})

			// Redirect to feed page
			router.replace('/(home)/feed')
		} catch (err: any) {
			const status = err.response?.status
			if (status === 404) {
				// No user found - Ask if they want to sign up
				setLoading(false)
				const signupTitle = translate('signup_title', 'Create Account?')
				const signupMessage = `${translate('user_not_found_signup', 'User not found. Do you want to sign up?')}\n\nURL: ${config.frontend.url}/u/${slug}`

				showConfirm(signupTitle, signupMessage, async () => {
					try {
						setLoading(true)
						// Trigger signup
						await signUp(slug, password, {}, saveAccount, needPassword)
						await refreshUser()

						toast.show({
							title: translate('success', 'Account Created!'),
							message: translate('signup_success_msg', 'Your account has been registered.'),
							color: '#10B981'
						})

						router.replace('/(home)/feed')
					} catch (signUpErr: any) {
						const msg = signUpErr.response?.data?.message || signUpErr.message || 'Signup failed'
						toast.show({
							title: translate('error', 'Signup Failed'),
							message: msg,
							color: '#EF4444'
						})
					} finally {
						setLoading(false)
					}
				})
			} else if (status === 409) {
				// Password incorrect - Inform user and focus on password field
				toast.show({
					title: translate('error', 'Authentication Failed'),
					message: translate('password_incorrect_verify', 'Incorrect password. Please verify and try again.'),
					color: '#EF4444'
				})
				passwordInputRef.current?.focus()
			} else {
				// Any other errors
				const errMsg = err.response?.data?.message || err.message || 'Unable to connect to server.'
				toast.show({
					title: translate('error', 'Error'),
					message: errMsg,
					color: '#EF4444'
				})
			}
		} finally {
			setLoading(false)
		}
	}

	// Trigger quick-switch account instantly
	const handleSelectSavedAccount = async (account: SavedAuth) => {
		if (loading) return

		if (account.needPassword || !account.token) {
			// Populate welcome form and focus password input
			setSlug(account.slug)
			setSaveAccount(true)
			setNeedPassword(true)
			toast.show({
				title: translate('switch_requires_password', 'Password Required'),
				message: translate('need_password_notice', 'Please enter your password to switch to this account.'),
				color: colors.primary
			})
			passwordInputRef.current?.focus()
		} else {
			// Instant switch via stored token
			try {
				setLoading(true)
				const success = await signInWithToken(account.token)
				if (success) {
					await refreshUser()
					toast.show({
						title: translate('success', 'Account Switched'),
						message: `@${account.slug} logged in.`,
						color: '#10B981'
					})
					router.replace('/(home)/feed')
				} else {
					throw new Error('Quick sign in token failed')
				}
			} catch (err) {
				log({
					level: 'error',
					label: 'AuthScreen',
					message: 'Quick sign in token error',
					error: err
				})
				toast.show({
					title: translate('error', 'Switch Failed'),
					message: translate('quick_signin_failed', 'Quick sign in failed.'),
					color: '#EF4444'
				})
				// Require password instead
				setSlug(account.slug)
				setNeedPassword(true)
				passwordInputRef.current?.focus()
			} finally {
				setLoading(false)
			}
		}
	}

	// Remove account from saved authenticator list
	const handleRemoveSavedAccount = async (slugToRemove: string) => {
		try {
			await deleteSavedAuthentication(slugToRemove)
			await loadSavedAccounts()
			toast.show({
				title: translate('success', 'Success'),
				message: `@${slugToRemove} removed from accounts list.`,
				color: '#10B981'
			})
			// Clear fields if removing currently populated slug
			if (slug === slugToRemove) {
				setSlug('')
				setPassword('')
			}
		} catch (err) {
			toast.show({
				title: translate('error', 'Error'),
				message: 'Failed to remove saved account.',
				color: '#EF4444'
			})
		}
	}

	// Destroy app storage (Reset application)
	const handleDestroyStorage = () => {
		showConfirm(translate('reset_app', 'Reset App'), translate('reset_app_confirm', 'Are you sure you want to reset the app? This will clear all data.'), async () => {
			try {
				setLoading(true)
				await clearAllStorage()
				await refreshUser()
				await loadSavedAccounts()
				setSlug('')
				setPassword('')
				toast.show({
					title: translate('reset_success', 'App reset successfully.'),
					message: '',
					color: '#10B981'
				})
			} catch (err) {
				toast.show({
					title: translate('error', 'Reset Failed'),
					message: translate('reset_failed', 'Failed to reset app.'),
					color: '#EF4444'
				})
			} finally {
				setLoading(false)
			}
		})
	}

	// Localized name helper
	const getAccountDisplayName = (account: SavedAuth) => {
		if (!account.name) return `@${account.slug}`
		if (typeof account.name === 'string') return account.name
		return account.name[appLang] || account.name['en'] || `@${account.slug}`
	}

	// Simple date formatter
	const formatLastAccessedDate = (isoString: string) => {
		try {
			const date = new Date(isoString)
			return date.toLocaleDateString(undefined, {
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			})
		} catch (e) {
			return isoString
		}
	}

	// Register dynamic kebab menu items for auth screen
	useSmartKebabMenu([
		{
			key: 'reset-app',
			label: translate('reset_app', 'Reset App'),
			icon: 'trash-outline',
			destructive: true,
			onPress: () => handleDestroyStorage()
		}
	])

	return (
		<View style={styles.outerContainer}>
			<SmartHeader title={translate('auth_title', 'Drinaluza')} fallbackRoute="/(home)/feed" loading={loading} />

			<KeyboardAvoidingWrapper scrollable scrollViewRef={scrollViewRef} style={styles.flex} contentContainerStyle={styles.scrollContent}>
				<View style={[styles.scrollContentInner, { paddingBottom: 40 + insets.bottom }]}>
					{/* Glassmorphic Auth Panel Container */}
					<View style={styles.authCard}>
						<Text style={styles.cardTitle}>{translate('welcome_back', 'Welcome back 👋')}</Text>
						<Text style={styles.cardSubtitle}>{translate('auth_subtitle', 'Business Manager')}</Text>

						{/* Languages Flag Selector */}
						<View style={styles.sectionContainer}>
							<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.languagesScroll}>
								{LANGUAGES_LIST.map((lang) => {
									const isSelected = appLang === lang.code
									return (
										<TouchableOpacity key={lang.code} style={[styles.langBadge, isSelected && styles.langBadgeSelected]} onPress={() => setAppLang(lang.code)} activeOpacity={0.8}>
											<View style={styles.flagWrapper}>
												<Text style={styles.flagEmoji}>{lang.flag}</Text>
												{lang.badge && (
													<View style={styles.flagTextBadge}>
														<Text style={styles.flagTextBadgeText}>{lang.badge}</Text>
													</View>
												)}
											</View>
										</TouchableOpacity>
									)
								})}
							</ScrollView>
						</View>

						{/* Saved Accounts Vertical Scroll Area */}
						{savedAccounts.length > 0 && (
							<View style={[styles.sectionContainer, styles.accountsSection]}>
								<Text style={styles.sectionLabel}>{translate('saved_accounts', 'SAVED ACCOUNTS')}</Text>
								<View style={styles.accountsScrollContainer}>
									<ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true} contentContainerStyle={styles.accountsVerticalList}>
										{savedAccounts.map((account) => (
											<View key={account.slug} style={styles.accountItem}>
												<TouchableOpacity style={styles.accountPressable} onPress={() => handleSelectSavedAccount(account)} activeOpacity={0.7}>
													<View style={styles.accountPhotoWrapper}>
														<SmartImage source={account.photoUrl} style={styles.accountPhoto} entityType="user" />
													</View>
													<View style={styles.accountDetails}>
														<Text style={styles.accountName} numberOfLines={1}>
															{getAccountDisplayName(account)}
														</Text>
														<Text style={styles.accountSlug} numberOfLines={1}>
															@{account.slug}
														</Text>
														<Text style={styles.accountDate} numberOfLines={1}>
															{translate('last_signin', 'Last')}: {formatLastAccessedDate(account.lastSignIn)}
														</Text>
													</View>
												</TouchableOpacity>

												<TouchableOpacity style={styles.accountRemoveBtn} onPress={() => handleRemoveSavedAccount(account.slug)} accessibilityLabel={`Remove account ${account.slug}`}>
													<Ionicons name="close-circle" size={20} color={colors.textTertiary} />
												</TouchableOpacity>
											</View>
										))}
									</ScrollView>
								</View>
							</View>
						)}

						{/* Welcome Credentials Form */}
						<View style={styles.formContainer}>
							{/* Username (Slug) Textfield */}
							<View style={styles.inputWrapper}>
								<View style={styles.inputIconContainer}>
									<Ionicons name="person-outline" size={18} color={colors.textSecondary} />
								</View>
								<TextInput
									style={styles.inputField}
									value={slug}
									onChangeText={handleSlugChange}
									placeholder={translate('username', 'Username')}
									placeholderTextColor={colors.textTertiary}
									autoCapitalize="none"
									autoCorrect={false}
									maxLength={25}
									editable={!loading}
									onFocus={() => {
										setTimeout(
											() => {
												scrollViewRef.current?.scrollToEnd({ animated: true })
											},
											Platform.OS === 'android' ? 250 : 100
										)
									}}
								/>
							</View>
							{slugError && <Text style={styles.errorText}>{slugError}</Text>}

							{/* Checkbox: Save account */}
							<TouchableOpacity style={styles.checkboxRow} onPress={() => !loading && setSaveAccount(!saveAccount)} activeOpacity={0.8}>
								<Ionicons name={saveAccount ? 'checkbox' : 'square-outline'} size={20} color={saveAccount ? colors.primary : colors.textSecondary} />
								<Text style={styles.checkboxLabel}>{translate('save_account_checkbox', 'Save to accounts list')}</Text>
							</TouchableOpacity>

							{/* Password Textfield */}
							<View style={[styles.inputWrapper, { marginTop: 12 }]}>
								<View style={styles.inputIconContainer}>
									<Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
								</View>
								<TextInput
									ref={passwordInputRef}
									style={styles.inputField}
									value={password}
									onChangeText={setPassword}
									placeholder={translate('password', 'Password')}
									placeholderTextColor={colors.textTertiary}
									secureTextEntry={!showPassword}
									autoCapitalize="none"
									autoCorrect={false}
									maxLength={20}
									editable={!loading}
									onFocus={() => {
										setTimeout(
											() => {
												scrollViewRef.current?.scrollToEnd({ animated: true })
											},
											Platform.OS === 'android' ? 250 : 100
										)
									}}
								/>
								<TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
									<Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textSecondary} />
								</TouchableOpacity>
							</View>

							{/* Checkbox: Require password switch */}
							<TouchableOpacity style={styles.checkboxRow} onPress={() => !loading && setNeedPassword(!needPassword)} activeOpacity={0.8}>
								<Ionicons name={needPassword ? 'checkbox' : 'square-outline'} size={20} color={needPassword ? colors.primary : colors.textSecondary} />
								<Text style={styles.checkboxLabel}>{translate('require_password_checkbox', 'Require password on switch')}</Text>
							</TouchableOpacity>

							{/* Continue / Sign In Action Button */}
							<TouchableOpacity style={[styles.continueBtn, loading && styles.continueBtnDisabled]} onPress={handleSignInSubmit} disabled={loading} activeOpacity={0.8}>
								{loading ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.continueBtnText}>{translate('continue', 'Continue')}</Text>}
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</KeyboardAvoidingWrapper>
		</View>
	)
}

// Generate premium responsive stylesheet
const createStyles = (colors: any, isTablet: boolean, width: number, height: number) => {
	const cardMaxWidth = 450
	const cardWidth = isTablet ? cardMaxWidth : '100%'

	return StyleSheet.create({
		outerContainer: {
			flex: 1,
			backgroundColor: colors.background
		},

		flex: {
			flex: 1
		},
		scrollContent: {
			flexGrow: 1
		},
		scrollContentInner: {
			flexGrow: 1,
			width: '100%',
			alignItems: 'center',
			justifyContent: 'center',
			padding: 16,
			paddingBottom: 40
		},
		authCard: {
			width: cardWidth,
			borderRadius: 24,
			padding: 24,
			backgroundColor: colors.card,
			borderWidth: 1,
			borderColor: colors.borderLight,
			...createShadow({ offsetY: 12, opacity: 0.25, radius: 16, elevation: 8 }),
			marginVertical: isTablet ? 30 : 0
		},
		cardTitle: {
			fontSize: 24,
			fontWeight: '800',
			color: colors.text,
			textAlign: 'center',
			marginBottom: 4
		},
		cardSubtitle: {
			fontSize: 14,
			color: colors.textSecondary,
			textAlign: 'center',
			fontWeight: '500',
			marginBottom: 20
		},
		sectionContainer: {
			width: '100%',
			marginBottom: 16
		},
		languagesScroll: {
			flexDirection: 'row',
			justifyContent: 'center',
			alignItems: 'center',
			width: '100%',
			gap: 14,
			paddingVertical: 4
		},
		langBadge: {
			width: 48,
			height: 48,
			borderRadius: 24,
			backgroundColor: colors.background,
			borderWidth: 2,
			borderColor: colors.borderLight,
			alignItems: 'center',
			justifyContent: 'center',
			...createShadow({ offsetY: 2, opacity: 0.1, radius: 4, elevation: 2 })
		},
		langBadgeSelected: {
			borderColor: colors.primary,
			backgroundColor: colors.primaryContainer,
			transform: [{ scale: 1.05 }]
		},
		flagWrapper: {
			position: 'relative',
			width: '100%',
			height: '100%',
			alignItems: 'center',
			justifyContent: 'center'
		},
		flagEmoji: {
			fontSize: 26,
			lineHeight: 28,
			textAlign: 'center'
		},
		flagTextBadge: {
			position: 'absolute',
			bottom: -2,
			right: -2,
			backgroundColor: colors.surface,
			borderWidth: 1,
			borderColor: colors.border,
			width: 16,
			height: 16,
			borderRadius: 8,
			alignItems: 'center',
			justifyContent: 'center',
			...createShadow({ offsetY: 1, opacity: 0.2, radius: 1, elevation: 1 })
		},
		flagTextBadgeText: {
			fontSize: 8,
			fontWeight: '700',
			color: colors.text,
			textAlign: 'center'
		},
		accountsSection: {
			marginTop: 4
		},
		sectionLabel: {
			fontSize: 11,
			fontWeight: '700',
			color: colors.textSecondary,
			letterSpacing: 1,
			marginBottom: 8,
			textTransform: 'uppercase'
		},
		accountsScrollContainer: {
			maxHeight: 210,
			borderWidth: 1,
			borderColor: colors.borderLight,
			borderRadius: 16,
			backgroundColor: colors.background,
			padding: 4
		},
		accountsVerticalList: {
			paddingHorizontal: 8,
			paddingVertical: 6,
			gap: 8
		},
		accountItem: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: 10,
			borderRadius: 12,
			backgroundColor: colors.card,
			borderWidth: 1,
			borderColor: colors.borderLight,
			...createShadow({ offsetY: 2, opacity: 0.05, radius: 3, elevation: 1 })
		},
		accountPressable: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center'
		},
		accountPhotoWrapper: {
			width: 42,
			height: 42,
			borderRadius: 21,
			overflow: 'hidden',
			marginRight: 12,
			backgroundColor: colors.background,
			borderWidth: 1,
			borderColor: colors.borderLight
		},
		accountPhoto: {
			width: '100%',
			height: '100%'
		},
		accountDetails: {
			flex: 1,
			justifyContent: 'center'
		},
		accountName: {
			fontSize: 14,
			fontWeight: '700',
			color: colors.text,
			lineHeight: 16
		},
		accountSlug: {
			fontSize: 12,
			color: colors.textSecondary,
			lineHeight: 14,
			marginTop: 1
		},
		accountDate: {
			fontSize: 10,
			color: colors.textTertiary,
			lineHeight: 12,
			marginTop: 2
		},
		accountRemoveBtn: {
			padding: 4,
			marginLeft: 6
		},
		formContainer: {
			width: '100%',
			marginTop: 8
		},
		inputWrapper: {
			flexDirection: 'row',
			alignItems: 'center',
			height: 48,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: colors.inputBorder,
			backgroundColor: colors.background,
			paddingHorizontal: 12
		},
		inputIconContainer: {
			marginRight: 10
		},
		inputField: {
			flex: 1,
			fontSize: 15,
			color: colors.text,
			paddingVertical: 0
		},
		eyeBtn: {
			padding: 6
		},
		errorText: {
			fontSize: 12,
			color: colors.error,
			marginTop: 4,
			marginLeft: 4,
			fontWeight: '500'
		},
		checkboxRow: {
			flexDirection: 'row',
			alignItems: 'center',
			marginTop: 10,
			paddingVertical: 4
		},
		checkboxLabel: {
			fontSize: 13,
			color: colors.textSecondary,
			marginLeft: 8,
			fontWeight: '500'
		},
		continueBtn: {
			height: 48,
			borderRadius: 12,
			backgroundColor: colors.primary,
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: 24,
			...createColorShadow({ color: colors.primary, offsetY: 4, opacity: 0.3, radius: 8, elevation: 4 })
		},
		continueBtnDisabled: {
			backgroundColor: colors.borderLight,
			shadowOpacity: 0,
			elevation: 0
		},
		continueBtnText: {
			fontSize: 16,
			fontWeight: '700',
			color: '#FFFFFF'
		}
	})
}
