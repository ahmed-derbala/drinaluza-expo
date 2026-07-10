import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Platform, useWindowDimensions, KeyboardAvoidingView, Keyboard, findNodeHandle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { format, formatDistanceToNow } from 'date-fns'
import { clearAllStorage } from '@/core/storage'

import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import SmartImage from '@/core/SmartImageViewer'
import { SmartHeader } from '@/core/smart-header'
import { useSmartKebabMenu } from '@/core/smart-kebab-menu'

import { toast } from '@/features/common/Toast'
import { showConfirm } from '@/core/helpers/popup'
import { config } from '@/config'
import { log } from '@/core/log'

import { getSavedAuthentications, deleteSavedAuthentication, signIn, signUp, signInWithToken, SavedAuth } from './auth.api'

// ─── Language config ──────────────────────────────────────────────────────────
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

// ─── Static stylesheet — defined ONCE at module level, never recreated ────────
const S = StyleSheet.create({
	root: { flex: 1, backgroundColor: '#000' },
	flex: { flex: 1 },
	scrollContent: { flexGrow: 1 },

	desktopGrid: { flex: 1, flexDirection: 'row', minHeight: '100%' as any },
	brandPane: {
		flex: 1,
		backgroundColor: '#030712',
		padding: 56,
		justifyContent: 'center',
		borderRightWidth: StyleSheet.hairlineWidth,
		borderRightColor: '#1E293B'
	},
	brandLogoRow: { marginBottom: 20 },
	brandIconBox: {
		width: 52,
		height: 52,
		borderRadius: 14,
		backgroundColor: 'rgba(14,165,233,0.1)',
		borderWidth: 1,
		borderColor: 'rgba(14,165,233,0.2)',
		alignItems: 'center',
		justifyContent: 'center'
	},
	brandName: {
		fontSize: 13,
		fontWeight: '900',
		color: '#0EA5E9',
		letterSpacing: 3,
		textTransform: 'uppercase',
		marginBottom: 16
	},
	brandDivider: { width: 40, height: 2, backgroundColor: '#0EA5E9', borderRadius: 1, marginBottom: 24 },
	brandHeadline: { fontSize: 36, fontWeight: '800', color: '#F8FAFC', lineHeight: 44, marginBottom: 16 },
	brandSub: { fontSize: 15, color: '#64748B', lineHeight: 22, marginBottom: 40 },
	featuresList: { gap: 14 },
	featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
	featureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#0EA5E9' },
	featureText: { fontSize: 14, color: '#94A3B8', fontWeight: '500' },
	formPane: { flex: 1, justifyContent: 'center', backgroundColor: '#000' },

	formContainer: { padding: 24 },
	formContainerTablet: { padding: 48, maxWidth: 480, alignSelf: 'center' as const, width: 480 },

	mobileHeader: { marginBottom: 32 },
	mobileLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 28 },
	mobileIconBox: {
		width: 40,
		height: 40,
		borderRadius: 11,
		backgroundColor: 'rgba(14,165,233,0.1)',
		borderWidth: 1,
		borderColor: 'rgba(14,165,233,0.2)',
		alignItems: 'center',
		justifyContent: 'center'
	},
	mobileBrandName: { fontSize: 12, fontWeight: '900', color: '#0EA5E9', letterSpacing: 2.5, textTransform: 'uppercase' },
	mobileTitle: { fontSize: 34, fontWeight: '800', color: '#F8FAFC', lineHeight: 40, marginBottom: 6 },
	mobileSub: { fontSize: 15, color: '#64748B', lineHeight: 20 },

	langSection: { marginBottom: 20 },
	langRow: { flexDirection: 'row', gap: 8, paddingVertical: 2 },
	langChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: '#1E293B',
		backgroundColor: 'transparent'
	},
	langChipActive: { borderColor: '#0EA5E9', backgroundColor: 'rgba(14,165,233,0.08)' },
	langFlag: { fontSize: 18, lineHeight: 22 },
	langBadgeText: { fontSize: 10, fontWeight: '700', color: '#64748B' },
	langBadgeTextActive: { color: '#0EA5E9' },

	accountsSection: { marginBottom: 20 },
	sectionLabel: {
		fontSize: 11,
		fontWeight: '700',
		color: '#475569',
		letterSpacing: 0.8,
		textTransform: 'uppercase',
		marginBottom: 10
	},
	accountsList: { gap: 10, paddingBottom: 4 },
	accountRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		backgroundColor: '#090F1A',
		borderWidth: 1,
		borderColor: '#1E293B',
		borderRadius: 12,
		padding: 10
	},
	accountRowActive: {
		borderColor: '#0EA5E9',
		backgroundColor: '#0A1628'
	},
	accountRowClickable: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center'
	},
	accountAvatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		overflow: 'hidden',
		backgroundColor: '#0F172A',
		borderWidth: 1.5,
		borderColor: '#1E293B'
	},
	accountAvatarActive: {
		borderColor: '#0EA5E9',
		...Platform.select({
			ios: { shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 6 },
			android: { elevation: 4 },
			web: { boxShadow: '0px 0px 10px rgba(14,165,233,0.4)' } as any
		})
	},
	accountAvatarImg: { width: '100%', height: '100%' },
	accountInfo: {
		flex: 1,
		paddingHorizontal: 12
	},
	accountSlug: {
		fontSize: 14,
		fontWeight: '600',
		color: '#F8FAFC'
	},
	accountSlugActive: {
		color: '#0EA5E9'
	},
	accountAccessTime: {
		fontSize: 11,
		color: '#64748B',
		marginTop: 2
	},
	accountRemoveBtn: {
		padding: 10,
		alignItems: 'center',
		justifyContent: 'center'
	},

	divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#1A2332', marginBottom: 24 },

	fieldGroup: { marginBottom: 16 },
	fieldLabel: {
		fontSize: 12,
		fontWeight: '600',
		color: '#64748B',
		letterSpacing: 0.4,
		textTransform: 'uppercase',
		marginBottom: 8
	},
	inputBox: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 50,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#1E293B',
		backgroundColor: '#090F1A',
		paddingHorizontal: 14
	},
	inputBoxFocused: {
		borderColor: '#0EA5E9',
		backgroundColor: '#0A1628',
		...Platform.select({
			ios: { shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.12, shadowRadius: 6 },
			web: { boxShadow: '0px 0px 0px 3px rgba(14,165,233,0.12)' } as any
		})
	},
	inputBoxError: { borderColor: '#EF4444' },
	inputIcon: { marginRight: 10 },
	inputText: { flex: 1, fontSize: 15, color: '#F8FAFC', paddingVertical: 0 },
	eyeBtn: { padding: 6 },
	errorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
	errorText: { fontSize: 12, color: '#EF4444', fontWeight: '500', flex: 1 },

	toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
	toggleBox: {
		width: 18,
		height: 18,
		borderRadius: 5,
		borderWidth: 1.5,
		borderColor: '#334155',
		backgroundColor: 'transparent',
		alignItems: 'center',
		justifyContent: 'center'
	},
	toggleBoxActive: { backgroundColor: '#0EA5E9', borderColor: '#0EA5E9' },
	toggleLabel: { fontSize: 13, color: '#64748B', fontWeight: '500', flex: 1 },

	ctaBtn: {
		height: 52,
		borderRadius: 13,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 8,
		overflow: 'hidden',
		...Platform.select({
			ios: { shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10 },
			android: { elevation: 5 },
			web: { boxShadow: '0px 4px 20px rgba(14,165,233,0.3)' } as any
		})
	},
	ctaBtnText: { fontSize: 16, fontWeight: '700', color: '#fff', letterSpacing: 0.2 }
})

// ─── Types for AuthForm props ─────────────────────────────────────────────────
interface AuthFormProps {
	isTablet: boolean
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

const formatLastAccess = (dateStr?: string) => {
	if (!dateStr) return ''
	try {
		const date = new Date(dateStr)
		if (isNaN(date.getTime())) return ''
		return `${format(date, 'MMM d, yyyy, h:mm a')} (${formatDistanceToNow(date, { addSuffix: true })})`
	} catch {
		return ''
	}
}

// ─── AuthForm — standalone component, never re-created on parent render ───────
const AuthForm = React.memo(
	({
		isTablet,
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
	}: AuthFormProps) => (
		<>
			{/* Mobile-only hero */}
			{!isTablet && (
				<View style={S.mobileHeader}>
					<View style={S.mobileLogoRow}>
						<View style={S.mobileIconBox}>
							<Ionicons name="business" size={22} color="#0EA5E9" />
						</View>
						<Text style={S.mobileBrandName}>DRINALUZA</Text>
					</View>
					<Text style={S.mobileTitle}>{translate('welcome_back', 'Welcome back.')}</Text>
					<Text style={S.mobileSub}>{translate('auth_subtitle', 'Sign in to your business account.')}</Text>
				</View>
			)}

			{/* Language selector */}
			<View style={S.langSection}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.langRow} keyboardShouldPersistTaps="handled">
					{LANGUAGES_LIST.map((lang) => {
						const selected = appLang === lang.code
						return (
							<TouchableOpacity
								key={lang.code}
								style={[S.langChip, selected && S.langChipActive]}
								onPress={() => setAppLang(lang.code)}
								activeOpacity={0.75}
								accessibilityLabel={lang.label}
								accessibilityRole="button"
							>
								<Text style={S.langFlag}>{lang.flag}</Text>
								{lang.badge && <Text style={[S.langBadgeText, selected && S.langBadgeTextActive]}>{lang.badge}</Text>}
							</TouchableOpacity>
						)
					})}
				</ScrollView>
			</View>

			{/* Saved accounts chip strip */}
			{savedAccounts.length > 0 && (
				<View style={S.accountsSection}>
					<Text style={S.sectionLabel}>{translate('saved_accounts', 'Saved Accounts')}</Text>
					<View style={S.accountsList}>
						{savedAccounts.map((account) => {
							const isActive = activeSlug === account.slug
							return (
								<View key={account.slug} style={[S.accountRow, isActive && S.accountRowActive]}>
									<TouchableOpacity style={S.accountRowClickable} onPress={() => handleSelectSavedAccount(account)} activeOpacity={0.75} accessibilityLabel={`Switch to @${account.slug}`}>
										<View style={[S.accountAvatar, isActive && S.accountAvatarActive]}>
											<SmartImage source={account.photoUrl} style={S.accountAvatarImg} entityType="user" />
										</View>
										<View style={S.accountInfo}>
											<Text style={[S.accountSlug, isActive && S.accountSlugActive]} numberOfLines={1}>
												@{account.slug}
											</Text>
											{account.lastSignIn && (
												<Text style={S.accountAccessTime} numberOfLines={2}>
													{formatLastAccess(account.lastSignIn)}
												</Text>
											)}
										</View>
									</TouchableOpacity>
									<TouchableOpacity style={S.accountRemoveBtn} onPress={() => handleRemoveSavedAccount(account.slug)} activeOpacity={0.7} accessibilityLabel={`Remove @${account.slug}`}>
										<Ionicons name="trash-outline" size={18} color="#EF4444" />
									</TouchableOpacity>
								</View>
							)
						})}
					</View>
				</View>
			)}

			<View style={S.divider} />

			{/* Username */}
			<View style={S.fieldGroup}>
				<Text style={S.fieldLabel}>{translate('username', 'Username')}</Text>
				<View style={[S.inputBox, isSlugFocused && S.inputBoxFocused, !!slugError && S.inputBoxError]}>
					<Ionicons name="at-outline" size={17} color={isSlugFocused ? '#0EA5E9' : '#64748B'} style={S.inputIcon} />
					<TextInput
						ref={slugInputRef}
						style={S.inputText}
						value={slug}
						onChangeText={handleSlugChange}
						placeholder={translate('username_placeholder', 'your-username')}
						placeholderTextColor="#3D4F66"
						autoCapitalize="none"
						autoCorrect={false}
						maxLength={25}
						onFocus={() => {
							setIsSlugFocused(true)
							scrollToInput(slugInputRef)
						}}
						onBlur={() => setIsSlugFocused(false)}
						returnKeyType="next"
						onSubmitEditing={focusPasswordField}
						accessibilityLabel={translate('username', 'Username')}
					/>
				</View>
				{slugError && (
					<View style={S.errorRow}>
						<Ionicons name="alert-circle-outline" size={13} color="#EF4444" />
						<Text style={S.errorText}>{slugError}</Text>
					</View>
				)}
			</View>

			{/* Save account toggle */}
			<TouchableOpacity style={S.toggleRow} onPress={() => setSaveAccount(!saveAccount)} activeOpacity={0.75} accessibilityRole="checkbox" accessibilityState={{ checked: saveAccount }}>
				<View style={[S.toggleBox, saveAccount && S.toggleBoxActive]}>{saveAccount && <Ionicons name="checkmark" size={12} color="#fff" />}</View>
				<Text style={S.toggleLabel}>{translate('save_account_checkbox', 'Save to accounts list')}</Text>
			</TouchableOpacity>

			{/* Password */}
			<View style={S.fieldGroup}>
				<Text style={S.fieldLabel}>{translate('password', 'Password')}</Text>
				<View style={[S.inputBox, isPasswordFocused && S.inputBoxFocused]}>
					<Ionicons name="lock-closed-outline" size={17} color={isPasswordFocused ? '#0EA5E9' : '#64748B'} style={S.inputIcon} />
					<TextInput
						ref={passwordInputRef}
						style={S.inputText}
						value={password}
						onChangeText={setPassword}
						placeholder="••••••••"
						placeholderTextColor="#3D4F66"
						secureTextEntry={!showPassword}
						autoCapitalize="none"
						autoCorrect={false}
						maxLength={20}
						onFocus={() => {
							setIsPasswordFocused(true)
							scrollToInput(passwordInputRef)
						}}
						onBlur={() => setIsPasswordFocused(false)}
						returnKeyType="done"
						onSubmitEditing={handleSignInSubmit}
						accessibilityLabel={translate('password', 'Password')}
					/>
					<TouchableOpacity style={S.eyeBtn} onPress={() => setShowPassword(!showPassword)} accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
						<Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={isPasswordFocused ? '#0EA5E9' : '#64748B'} />
					</TouchableOpacity>
				</View>
			</View>

			{/* Require password on switch */}
			<TouchableOpacity style={S.toggleRow} onPress={() => setNeedPassword(!needPassword)} activeOpacity={0.75} accessibilityRole="checkbox" accessibilityState={{ checked: needPassword }}>
				<View style={[S.toggleBox, needPassword && S.toggleBoxActive]}>{needPassword && <Ionicons name="checkmark" size={12} color="#fff" />}</View>
				<Text style={S.toggleLabel}>{translate('require_password_checkbox', 'Require password on switch')}</Text>
			</TouchableOpacity>

			{/* CTA */}
			<TouchableOpacity style={S.ctaBtn} onPress={handleSignInSubmit} disabled={loading} activeOpacity={0.85} accessibilityLabel={translate('continue', 'Continue')} accessibilityRole="button">
				<LinearGradient colors={loading ? ['#1e293b', '#1e293b'] : ['#0EA5E9', '#0284C7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
				{loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={S.ctaBtnText}>{translate('continue', 'Continue')}</Text>}
			</TouchableOpacity>

			<View style={{ height: 32 }} />
		</>
	)
)

AuthForm.displayName = 'AuthForm'

// ─── BrandPane — static left panel for tablet/desktop ────────────────────────
const BrandPane = React.memo(({ translate }: { translate: (k: string, d: string) => string }) => (
	<View style={S.brandPane}>
		<View style={S.brandLogoRow}>
			<View style={S.brandIconBox}>
				<Ionicons name="business" size={28} color="#0EA5E9" />
			</View>
		</View>
		<Text style={S.brandName}>DRINALUZA</Text>
		<View style={S.brandDivider} />
		<Text style={S.brandHeadline}>{translate('branding_heading', 'Manage your\nbusiness with ease.')}</Text>
		<Text style={S.brandSub}>{translate('branding_subheading', 'The complete dashboard for modern business owners and their teams.')}</Text>
		<View style={S.featuresList}>
			{[translate('feature_1', 'Real-time sales tracking'), translate('feature_2', 'Multi-language support'), translate('feature_3', 'Saved accounts & fast-switching')].map((feat, i) => (
				<View key={i} style={S.featureRow}>
					<View style={S.featureDot} />
					<Text style={S.featureText}>{feat}</Text>
				</View>
			))}
		</View>
	</View>
))

BrandPane.displayName = 'BrandPane'

// ─── AuthScreen ───────────────────────────────────────────────────────────────
export default function AuthScreen() {
	const router = useRouter()
	const { colors } = useTheme()
	const { width } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const { appLang, setAppLang, translate, refreshUser, localize } = useUser()

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
			toast.show({ title: translate('invalid_request_title', 'Validation Error'), message: slugError || translate('username_invalid_chars'), color: '#EF4444' })
			return
		}
		if (password.length < 1) {
			toast.show({ title: translate('invalid_request_title', 'Validation Error'), message: translate('password_required', 'Password is required.'), color: '#EF4444' })
			passwordInputRef.current?.focus()
			return
		}
		if (password.length > 20) {
			toast.show({ title: translate('invalid_request_title', 'Validation Error'), message: translate('password_too_long', 'Password must not exceed 20 characters.'), color: '#EF4444' })
			passwordInputRef.current?.focus()
			return
		}
		try {
			setLoading(true)
			await signIn(slug, password, saveAccount, needPassword)
			await refreshUser()
			router.replace('/feed')
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
							router.replace('/feed')
						} catch (signUpErr: any) {
							log({ level: 'error', label: 'AuthScreen', message: 'Sign up submission failed', error: signUpErr })
							toast.show({ title: translate('error', 'Signup Failed'), message: signUpErr.response?.data?.message || signUpErr.message || 'Signup failed', color: '#EF4444' })
						} finally {
							setLoading(false)
						}
					}
				)
			} else if (status === 409) {
				toast.show({ title: translate('error', 'Authentication Failed'), message: translate('password_incorrect_verify', 'Incorrect password. Please verify and try again.'), color: '#EF4444' })
				focusPasswordField()
			} else {
				toast.show({ title: translate('error', 'Error'), message: err.response?.data?.message || err.message || 'Unable to connect to server.', color: '#EF4444' })
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
					message: translate('need_password_notice', 'Please enter your password to switch to this account.'),
					color: colors.primary
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
						router.replace('/feed')
						return
					}
					throw new Error('Quick sign in token failed')
				} catch (err) {
					log({ level: 'error', label: 'AuthScreen', message: 'Quick sign in token error', error: err })
					toast.show({ title: translate('error', 'Switch Failed'), message: translate('quick_signin_failed', 'Quick sign in failed.'), color: '#EF4444' })
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
				translate('remove_account_confirm', `Are you sure you want to remove @${slugToRemove} from the saved accounts list?`),
				async () => {
					try {
						await deleteSavedAuthentication(slugToRemove)
						await loadSavedAccounts()
						toast.show({ title: translate('success', 'Success'), message: `@${slugToRemove} removed from accounts list.`, color: '#10B981' })
						if (slug === slugToRemove) {
							setSlug('')
							setPassword('')
						}
					} catch {
						toast.show({ title: translate('error', 'Error'), message: 'Failed to remove saved account.', color: '#EF4444' })
					}
				}
			)
		},
		[slug, translate, loadSavedAccounts]
	)

	const handleDestroyStorage = useCallback(() => {
		showConfirm(translate('reset_app', 'Reset App'), translate('reset_app_confirm', 'Are you sure you want to reset the app? This will clear all data.'), async () => {
			try {
				setLoading(true)
				await clearAllStorage()
				await refreshUser()
				await loadSavedAccounts()
				setSlug('')
				setPassword('')
				toast.show({ title: translate('reset_success', 'App reset successfully.'), message: '', color: '#10B981' })
			} catch {
				toast.show({ title: translate('error', 'Reset Failed'), message: translate('reset_failed', 'Failed to reset app.'), color: '#EF4444' })
			} finally {
				setLoading(false)
			}
		})
	}, [translate, refreshUser, loadSavedAccounts])

	useSmartKebabMenu([
		{
			key: 'reset-app',
			label: translate('reset_app', 'Reset App'),
			icon: 'trash-outline',
			destructive: true,
			onPress: handleDestroyStorage
		}
	])

	return (
		<View style={S.root}>
			<SmartHeader title={translate('auth_title', 'Drinaluza')} fallbackRoute="/feed" loading={loading} />

			<KeyboardAvoidingView style={S.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? headerH : 0}>
				<ScrollView ref={scrollViewRef} style={S.flex} contentContainerStyle={scrollContentStyle} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
					<View ref={contentRef} style={{ width: '100%', flexGrow: 1 }}>
						{isTablet ? (
							<View style={S.desktopGrid}>
								<BrandPane translate={translate} />
								<View style={S.formPane}>
									<View style={S.formContainerTablet} pointerEvents={loading ? 'none' : 'auto'}>
										<AuthForm
											isTablet={isTablet}
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
							</View>
						) : (
							<View style={S.formContainer} pointerEvents={loading ? 'none' : 'auto'}>
								<AuthForm
									isTablet={isTablet}
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
