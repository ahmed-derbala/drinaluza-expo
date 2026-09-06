/**
 * AuthCard — sign-in form card for the auth screen.
 *
 * Purpose: collect username and password, expose save-account and
 * require-password toggles, and submit via the Continue action.
 * All state and submit logic live in the parent screen; this card is
 * presentational only. Based on BaseCard, view mode only.
 */
import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, type StyleProp, type ViewStyle } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, type ThemeColors } from '@theme'
import { BaseCard } from '@cards/BaseCard'
import Spinner from '@ui/spinner/Spinner'
import { EyeButton } from '@buttons'

interface AuthCardProps {
	slug: string
	password: string
	saveAccount: boolean
	needPassword: boolean
	showPassword: boolean
	loading: boolean
	slugError: string | null
	isSlugFocused: boolean
	isPasswordFocused: boolean
	passwordInputRef: React.RefObject<TextInput | null>
	slugInputRef: React.RefObject<TextInput | null>
	scrollToInput: (inputRef: React.RefObject<TextInput | null>) => void
	translate: (key: string, fallback: string) => string
	handleSlugChange: (text: string) => void
	setIsSlugFocused: (v: boolean) => void
	setIsPasswordFocused: (v: boolean) => void
	setSaveAccount: (v: boolean) => void
	setNeedPassword: (v: boolean) => void
	setPassword: (v: string) => void
	setShowPassword: (v: boolean) => void
	focusPasswordField: () => void
	handleSignInSubmit: () => void
	style?: StyleProp<ViewStyle>
}

const AuthCard: React.FC<AuthCardProps> = ({
	slug,
	password,
	saveAccount,
	needPassword,
	showPassword,
	loading,
	slugError,
	isSlugFocused,
	isPasswordFocused,
	passwordInputRef,
	slugInputRef,
	scrollToInput,
	translate,
	handleSlugChange,
	setIsSlugFocused,
	setIsPasswordFocused,
	setSaveAccount,
	setNeedPassword,
	setPassword,
	setShowPassword,
	focusPasswordField,
	handleSignInSubmit,
	style
}) => {
	const { colors } = useTheme()
	const styles = useMemo(() => createStyles(colors), [colors])

	return (
		<BaseCard style={[styles.card, style]}>
			{/* Username */}
			<View style={styles.fieldGroup}>
				<Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>{translate('username', 'Username')}</Text>
				<View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.surface }, isSlugFocused && styles.inputBoxFocused, !!slugError && styles.inputBoxError]}>
					<Ionicons name="at-outline" size={17} color={isSlugFocused ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
					<TextInput
						ref={slugInputRef}
						style={[styles.inputText, { color: colors.text }]}
						value={slug}
						onChangeText={handleSlugChange}
						placeholder={translate('username_placeholder', 'ali-salah')}
						placeholderTextColor={colors.slate}
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
					<View style={styles.errorRow}>
						<Ionicons name="alert-circle-outline" size={13} color={colors.error} />
						<Text style={[styles.errorText, { color: colors.error }]}>{slugError}</Text>
					</View>
				)}
			</View>
			{/* Save account toggle */}
			<TouchableOpacity style={styles.toggleRow} onPress={() => setSaveAccount(!saveAccount)} activeOpacity={0.75} accessibilityRole="checkbox" accessibilityState={{ checked: saveAccount }}>
				<View style={[styles.toggleBox, { borderColor: colors.inputBorder }, saveAccount && styles.toggleBoxActive]}>
					{saveAccount && <Ionicons name="checkmark" size={12} color={colors.buttonText} />}
				</View>
				<Text style={[styles.toggleLabel, { color: colors.textTertiary }]}>{translate('save_account_checkbox', 'Save to accounts list')}</Text>
			</TouchableOpacity>
			{/* Password */}
			<View style={styles.fieldGroup}>
				<Text style={[styles.fieldLabel, { color: colors.textTertiary }]}>{translate('password', 'Password')}</Text>
				<View style={[styles.inputBox, { borderColor: colors.border, backgroundColor: colors.surface }, isPasswordFocused && styles.inputBoxFocused]}>
					<Ionicons name="lock-closed-outline" size={17} color={isPasswordFocused ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
					<TextInput
						ref={passwordInputRef}
						style={[styles.inputText, { color: colors.text }]}
						value={password}
						onChangeText={setPassword}
						placeholder="••••••••"
						placeholderTextColor={colors.slate}
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
				</View>
			</View>
			{/* Require password on switch */}
			<View style={styles.toggleRow}>
				<TouchableOpacity
					style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 }}
					onPress={() => setNeedPassword(!needPassword)}
					activeOpacity={0.75}
					accessibilityRole="checkbox"
					accessibilityState={{ checked: needPassword }}
				>
					<View style={[styles.toggleBox, { borderColor: colors.inputBorder }, needPassword && styles.toggleBoxActive]}>
						{needPassword && <Ionicons name="checkmark" size={12} color={colors.buttonText} />}
					</View>
					<Text style={[styles.toggleLabel, { color: colors.textTertiary }]}>{translate('require_password_checkbox', 'Require password on switch')}</Text>
				</TouchableOpacity>
				<EyeButton visible={showPassword} onPress={() => setShowPassword(!showPassword)} iconColor={isPasswordFocused ? colors.primary : colors.textTertiary} style={styles.eyeBtn} />
			</View>
			{/* CTA */}
			{loading ? (
				<Spinner size="small" expand={false} />
			) : (
				<TouchableOpacity style={styles.ctaBtn} onPress={handleSignInSubmit} activeOpacity={0.85} accessibilityLabel={translate('continue', 'Continue')} accessibilityRole="button">
					<LinearGradient colors={[colors.primary, colors.info]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
					<Text style={[styles.ctaBtnText, { color: colors.buttonText }]}>{translate('continue', 'Continue')}</Text>
				</TouchableOpacity>
			)}
		</BaseCard>
	)
}

const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
		card: {
			marginBottom: 0
		},
		fieldGroup: {
			marginBottom: 16
		},
		fieldLabel: {
			fontSize: 12,
			fontWeight: '600',
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
			paddingHorizontal: 14
		},
		inputBoxFocused: {
			borderColor: colors.primary,
			backgroundColor: colors.primaryContainer20
		},
		inputBoxError: {
			borderColor: colors.error
		},
		inputIcon: {
			marginRight: 10
		},
		inputText: {
			flex: 1,
			fontSize: 15,
			paddingVertical: 0
		},
		eyeBtn: {
			padding: 6
		},
		errorRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4,
			marginTop: 6
		},
		errorText: {
			fontSize: 12,
			fontWeight: '500',
			flex: 1
		},
		toggleRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 10,
			marginBottom: 16
		},
		toggleBox: {
			width: 18,
			height: 18,
			borderRadius: 5,
			borderWidth: 1.5,
			backgroundColor: 'transparent',
			alignItems: 'center',
			justifyContent: 'center'
		},
		toggleBoxActive: {
			backgroundColor: colors.primary,
			borderColor: colors.primary
		},
		toggleLabel: {
			fontSize: 13,
			fontWeight: '500',
			flex: 1
		},
		ctaBtn: {
			height: 52,
			borderRadius: 13,
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: 8,
			overflow: 'hidden'
		},
		ctaBtnText: {
			fontSize: 16,
			fontWeight: '700',
			letterSpacing: 0.2
		}
	})

export default React.memo(AuthCard)
