import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, TextInput, ScrollView, Platform, useWindowDimensions, KeyboardAvoidingView, Keyboard } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { getToken } from '@secure-storage'
import { useTheme, themeColors } from '@theme'
import { useUser } from '@contexts/UserContext'
import { SmartHeader } from '@smart-header'
import { toast } from '@ui/toast/Toast'
import { showConfirm } from '@helpers/popup'
import { config } from '@/config'
import { log } from '@log'
import { getSavedAuthentications, deleteSavedAuthentication, signIn, signUp, signInWithToken, switchUser, SavedAuth } from './auth.api'
import AccountsCard from './AccountsCard'
import AuthCard from './AuthCard'
import LanguageSelectionBlock from './LanguageSelectionBlock'
// ─── Static stylesheet — defined ONCE at module level, never recreated ────────
const S = StyleSheet.create({
	root: { flex: 1, backgroundColor: themeColors.background },
	flex: { flex: 1 },
	scrollContent: { flexGrow: 1 },
	formPane: { flex: 1, justifyContent: 'center', backgroundColor: themeColors.background },
	formContainer: { padding: 24 },
	formContainerTablet: { padding: 48, maxWidth: 480, alignSelf: 'center' as const, width: 480 }
})
// ─── Types for AuthForm props ─────────────────────────────────────────────────
interface AuthFormProps {
	slug: string
	password: string
	saveAccount: boolean
	needPassword: boolean
	showPassword: boolean
	loading: boolean
	slugError: string | null
	isSlugFocused: boolean
	isPasswordFocused: boolean
	savedAccounts: SavedAuth[]
	activeSlug: string
	appLang: string
	passwordInputRef: React.RefObject<TextInput | null>
	slugInputRef: React.RefObject<TextInput | null>
	scrollToInput: (inputRef: React.RefObject<TextInput | null>) => void
	translate: (key: string, fallback: string) => string
	setAppLang: (lang: string) => void
	handleSlugChange: (text: string) => void
	setIsSlugFocused: (v: boolean) => void
	setIsPasswordFocused: (v: boolean) => void
	setSaveAccount: (v: boolean) => void
	setNeedPassword: (v: boolean) => void
	setPassword: (v: string) => void
	setShowPassword: (v: boolean) => void
	focusPasswordField: () => void
	handleSignInSubmit: () => void
	handleSelectSavedAccount: (account: SavedAuth) => void
	handleRemoveSavedAccount: (slug: string) => void
}
// ─── AuthForm — standalone component, never re-created on parent render ───────
const AuthForm = React.memo(
	({
		slug,
		password,
		saveAccount,
		needPassword,
		showPassword,
		loading,
		slugError,
		isSlugFocused,
		isPasswordFocused,
		savedAccounts,
		activeSlug,
		appLang,
		passwordInputRef,
		slugInputRef,
		scrollToInput,
		translate,
		setAppLang,
		handleSlugChange,
		setIsSlugFocused,
		setIsPasswordFocused,
		setSaveAccount,
		setNeedPassword,
		setPassword,
		setShowPassword,
		focusPasswordField,
		handleSignInSubmit,
		handleSelectSavedAccount,
		handleRemoveSavedAccount
	}: AuthFormProps) => {
		return (
			<>
				<LanguageSelectionBlock appLang={appLang} onSelectLang={setAppLang} />
				<AccountsCard savedAccounts={savedAccounts} activeSlug={activeSlug} onSelectAccount={handleSelectSavedAccount} onRemoveAccount={handleRemoveSavedAccount} />
				<AuthCard
					slug={slug}
					password={password}
					saveAccount={saveAccount}
					needPassword={needPassword}
					showPassword={showPassword}
					loading={loading}
					slugError={slugError}
					isSlugFocused={isSlugFocused}
					isPasswordFocused={isPasswordFocused}
					passwordInputRef={passwordInputRef}
					slugInputRef={slugInputRef}
					scrollToInput={scrollToInput}
					translate={translate}
					handleSlugChange={handleSlugChange}
					setIsSlugFocused={setIsSlugFocused}
					setIsPasswordFocused={setIsPasswordFocused}
					setSaveAccount={setSaveAccount}
					setNeedPassword={setNeedPassword}
					setPassword={setPassword}
					setShowPassword={setShowPassword}
					focusPasswordField={focusPasswordField}
					handleSignInSubmit={handleSignInSubmit}
				/>
				<View style={{ height: 32 }} />
			</>
		)
	}
)
AuthForm.displayName = 'AuthForm'
// ─── AuthScreen ───────────────────────────────────────────────────────────────
export default function AuthScreen() {
	const router = useRouter()
	const { colors } = useTheme()
	const { width } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const { appLang, setAppLang, translate, refreshUser, localize, user } = useUser()
	const [savedAccounts, setSavedAccounts] = useState<SavedAuth[]>([])
	const [slug, setSlug] = useState('')
	const [password, setPassword] = useState('')
	const [saveAccount, setSaveAccount] = useState(true)
	const [needPassword, setNeedPassword] = useState(false)
	const [showPassword, setShowPassword] = useState(false)
	const [loading, setLoading] = useState(false)
	const [slugError, setSlugError] = useState<string | null>(null)
	const [isSlugFocused, setIsSlugFocused] = useState(false)
	const [isPasswordFocused, setIsPasswordFocused] = useState(false)
	const loadingRef = useRef(false)
	const passwordInputRef = useRef<TextInput>(null)
	const slugInputRef = useRef<TextInput>(null)
	const scrollViewRef = useRef<ScrollView>(null)
	const contentRef = useRef<View>(null)
	const [keyboardHeight, setKeyboardHeight] = useState(0)
	const scrollToInput = useCallback((inputRef: React.RefObject<TextInput | null>) => {
		if (!scrollViewRef.current || !contentRef.current || !inputRef.current) return
		setTimeout(
			() => {
				inputRef.current?.measureLayout(
					contentRef.current!,
					(x, y) => {
						scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 60), animated: true })
					},
					() => {}
				)
			},
			Platform.OS === 'android' ? 150 : 100
		)
	}, [])
	useEffect(() => {
		const showSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setKeyboardHeight(e.endCoordinates.height))
		const hideSubscription = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0))
		return () => {
			showSubscription.remove()
			hideSubscription.remove()
		}
	}, [])
	useEffect(() => {
		const checkAuthAndRedirect = async () => {
			if (user) {
				const token = await getToken()
				if (token) {
					router.replace('/feed')
				} else {
					await switchUser()
					await refreshUser()
				}
			}
		}
		checkAuthAndRedirect()
	}, [user, router, refreshUser])
	const isTablet = width >= 768
	// Stable: only changes when insets.top changes (safe area, not keyboard)
	const headerH = useMemo(() => 56 + insets.top, [insets.top])
	const scrollContentStyle = useMemo(() => [S.scrollContent, { paddingTop: headerH }], [headerH])
	const focusPasswordField = useCallback(() => {
		setTimeout(() => passwordInputRef.current?.focus(), Platform.OS === 'android' ? 200 : 100)
	}, [])
	const loadSavedAccounts = useCallback(async () => {
		try {
			const accounts = await getSavedAuthentications()
			setSavedAccounts(accounts)
		} catch (err) {
			log({ level: 'error', label: 'AuthScreen', message: 'Failed to load saved accounts', error: err })
		}
	}, [])
	useEffect(() => {
		loadSavedAccounts()
	}, [loadSavedAccounts])
	const handleSlugChange = useCallback(
		(text: string) => {
			const sanitized = text.toLowerCase().replace(/[^a-z0-9-]/g, '')
			setSlug(sanitized)
			if (sanitized.length > 20) setSlugError(translate('username_invalid_len', 'Length cannot exceed 20 characters.'))
			else if (sanitized.startsWith('-') || sanitized.endsWith('-')) setSlugError(translate('username_invalid_hyphen', 'Hyphen (-) cannot be the first or last character.'))
			else setSlugError(null)
		},
		[translate]
	)
	const validateSlug = useCallback(
		(val: string): boolean => {
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
			if (!/^[a-z0-9-]+$/.test(val)) {
				setSlugError(translate('username_invalid_chars', 'Username can only contain lowercase letters, numbers, and hyphens.'))
				return false
			}
			setSlugError(null)
			return true
		},
		[translate]
	)
	const handleSignInSubmit = useCallback(async () => {
		if (!validateSlug(slug)) {
			toast.show({ title: translate('invalid_request_title', 'Validation Error'), content: slugError || translate('username_invalid_chars'), borderColor: themeColors.error })
			return
		}
		if (password.length < 1) {
			toast.show({ title: translate('invalid_request_title', 'Validation Error'), content: translate('password_required', 'Password is required.'), borderColor: themeColors.error })
			passwordInputRef.current?.focus()
			return
		}
		if (password.length > 20) {
			toast.show({ title: translate('invalid_request_title', 'Validation Error'), content: translate('password_too_long', 'Password must not exceed 20 characters.'), borderColor: themeColors.error })
			passwordInputRef.current?.focus()
			return
		}
		try {
			setLoading(true)
			await signIn(slug, password, saveAccount, needPassword)
			await refreshUser()
		} catch (err: any) {
			log({ level: 'error', label: 'AuthScreen', message: 'Sign in submission failed', error: err })
			const status = err.response?.status
			if (status === 404) {
				setLoading(false)
				showConfirm(
					translate('signup_title', 'Create Account?'),
					`${translate('user_not_found_signup', 'User not found. Do you want to sign up?')}\n\nURL: ${config.frontend.url}/u/${slug}`,
					async () => {
						try {
							setLoading(true)
							await signUp(slug, password, {}, saveAccount, needPassword)
							await refreshUser()
						} catch (signUpErr: any) {
							log({ level: 'error', label: 'AuthScreen', message: 'Sign up submission failed', error: signUpErr })
							toast.show({ title: translate('error', 'Signup Failed'), content: signUpErr.response?.data?.message || signUpErr.message || 'Signup failed', borderColor: themeColors.error })
						} finally {
							setLoading(false)
						}
					}
				)
			} else if (status === 409) {
				toast.show({
					title: translate('error', 'Authentication Failed'),
					content: translate('password_incorrect_verify', 'Incorrect password. Please verify and try again.'),
					borderColor: themeColors.error
				})
				focusPasswordField()
			} else {
				toast.show({ title: translate('error', 'Error'), content: err.response?.data?.message || err.message || 'Unable to connect to server.', borderColor: themeColors.error })
			}
		} finally {
			setLoading(false)
		}
	}, [slug, password, saveAccount, needPassword, slugError, validateSlug, translate, refreshUser, router, focusPasswordField])
	const handleSelectSavedAccount = useCallback(
		async (account: SavedAuth) => {
			if (loadingRef.current) return
			loadingRef.current = true
			const populateFormAndFocus = () => {
				setSlug(account.slug)
				setSlugError(null)
				setPassword('')
				setNeedPassword(false)
				focusPasswordField()
			}
			if (account.needPassword || !account.token) {
				setSaveAccount(true)
				toast.show({
					title: translate('switch_requires_password', 'Password Required'),
					content: translate('need_password_notice', 'Please enter your password to switch to this account.'),
					borderColor: colors.primary
				})
				loadingRef.current = false
				populateFormAndFocus()
			} else {
				try {
					setLoading(true)
					const success = await signInWithToken(account.token)
					loadingRef.current = false
					if (success) {
						await refreshUser()
						return
					}
					throw new Error('Quick sign in token failed')
				} catch (err) {
					log({ level: 'error', label: 'AuthScreen', message: 'Quick sign in token error', error: err })
					toast.show({ title: translate('error', 'Switch Failed'), content: translate('quick_signin_failed', 'Quick sign in failed.'), borderColor: themeColors.error })
					setLoading(false)
					loadingRef.current = false
					populateFormAndFocus()
				}
			}
		},
		[translate, colors.primary, refreshUser, router, focusPasswordField]
	)
	const handleRemoveSavedAccount = useCallback(
		(slugToRemove: string) => {
			showConfirm(
				translate('remove_account_title', 'Remove Account?'),
				translate('remove_account_confirm', `Are you sure you want to remove ${slugToRemove} from the saved accounts list?`),
				async () => {
					try {
						await deleteSavedAuthentication(slugToRemove)
						await loadSavedAccounts()
						toast.show({ title: translate('success', 'Success'), content: `${slugToRemove} removed from accounts list.`, borderColor: themeColors.success })
						if (slug === slugToRemove) {
							setSlug('')
							setPassword('')
						}
					} catch {
						toast.show({ title: translate('error', 'Error'), content: 'Failed to remove saved account.', borderColor: themeColors.error })
					}
				}
			)
		},
		[slug, translate, loadSavedAccounts]
	)
	return (
		<View style={S.root}>
			<SmartHeader title={translate('auth_title', 'Drinaluza')} fallbackRoute="/feed" />
			<KeyboardAvoidingView style={S.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? headerH : 0}>
				<ScrollView ref={scrollViewRef} style={S.flex} contentContainerStyle={scrollContentStyle} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
					<View ref={contentRef} style={{ width: '100%', flexGrow: 1 }}>
						{isTablet ? (
							<View style={S.formPane}>
								<View style={[S.formContainerTablet, { pointerEvents: loading ? 'none' : 'auto' }]}>
									<AuthForm
										slug={slug}
										password={password}
										saveAccount={saveAccount}
										needPassword={needPassword}
										showPassword={showPassword}
										loading={loading}
										slugError={slugError}
										isSlugFocused={isSlugFocused}
										isPasswordFocused={isPasswordFocused}
										savedAccounts={savedAccounts}
										activeSlug={slug}
										appLang={appLang}
										passwordInputRef={passwordInputRef}
										slugInputRef={slugInputRef}
										scrollToInput={scrollToInput}
										translate={translate}
										setAppLang={setAppLang}
										handleSlugChange={handleSlugChange}
										setIsSlugFocused={setIsSlugFocused}
										setIsPasswordFocused={setIsPasswordFocused}
										setSaveAccount={setSaveAccount}
										setNeedPassword={setNeedPassword}
										setPassword={setPassword}
										setShowPassword={setShowPassword}
										focusPasswordField={focusPasswordField}
										handleSignInSubmit={handleSignInSubmit}
										handleSelectSavedAccount={handleSelectSavedAccount}
										handleRemoveSavedAccount={handleRemoveSavedAccount}
									/>
									<View style={{ height: Platform.OS === 'android' ? keyboardHeight : 0 }} />
								</View>
							</View>
						) : (
							<View style={[S.formContainer, { pointerEvents: loading ? 'none' : 'auto' }]}>
								<AuthForm
									slug={slug}
									password={password}
									saveAccount={saveAccount}
									needPassword={needPassword}
									showPassword={showPassword}
									loading={loading}
									slugError={slugError}
									isSlugFocused={isSlugFocused}
									isPasswordFocused={isPasswordFocused}
									savedAccounts={savedAccounts}
									activeSlug={slug}
									appLang={appLang}
									passwordInputRef={passwordInputRef}
									slugInputRef={slugInputRef}
									scrollToInput={scrollToInput}
									translate={translate}
									setAppLang={setAppLang}
									handleSlugChange={handleSlugChange}
									setIsSlugFocused={setIsSlugFocused}
									setIsPasswordFocused={setIsPasswordFocused}
									setSaveAccount={setSaveAccount}
									setNeedPassword={setNeedPassword}
									setPassword={setPassword}
									setShowPassword={setShowPassword}
									focusPasswordField={focusPasswordField}
									handleSignInSubmit={handleSignInSubmit}
									handleSelectSavedAccount={handleSelectSavedAccount}
									handleRemoveSavedAccount={handleRemoveSavedAccount}
								/>
								<View style={{ height: Platform.OS === 'android' ? keyboardHeight : 0 }} />
							</View>
						)}
					</View>
				</ScrollView>
			</KeyboardAvoidingView>
		</View>
	)
}
