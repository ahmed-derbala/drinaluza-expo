import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, Platform, type StyleProp, type TextStyle, type ViewStyle, type AccessibilityRole, type AccessibilityState } from 'react-native'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme, ThemeColors } from '@/core/theme'
import { hexToRgba } from '@/core/helpers/colors'
import Spinner from '@/features/common/Spinner'

export type ButtonVariant = 'primary' | 'success' | 'warning' | 'info' | 'secondary' | 'danger'

const SOLID_VARIANT_COLOR: Partial<Record<ButtonVariant, keyof ThemeColors>> = {
	primary: 'primary',
	success: 'success',
	warning: 'warning',
	info: 'info'
}

const BASE_BUTTON_SIZE = 44
const BASE_BUTTON_RADIUS = 14

export interface BaseButtonProps {
	/** Optional icon name. */
	icon?: any
	/** Icon family to use. */
	iconType?: 'ionicons' | 'material'
	/** Optional visible text. */
	text?: string
	/** Position of the text relative to the icon. */
	textPosition?: 'right' | 'bottom'
	/** Optional style for the text element. */
	textStyle?: StyleProp<TextStyle>
	/** Accessibility label. Falls back to {@link text}. */
	label?: string
	/** Press handler. */
	onPress: (event?: any) => void
	/** Whether the button is disabled. */
	disabled?: boolean
	/** Whether the button is in a loading state. */
	loading?: boolean
	/** Visual variant. */
	variant?: ButtonVariant
	/** When true, renders a tinted background with a colored border/icon instead of a solid fill. */
	outline?: boolean
	/** Optional icon color override. */
	iconColor?: string
	/** Button size (affects icon and minimum height). */
	size?: number
	/** Optional container style override. */
	style?: StyleProp<ViewStyle>
	/** Optional accessibility role. */
	accessibilityRole?: AccessibilityRole
	/** Optional accessibility state. */
	accessibilityState?: AccessibilityState
}

export function BaseButton({
	icon,
	iconType = 'ionicons',
	text,
	textPosition = 'bottom',
	textStyle,
	label,
	onPress,
	disabled = false,
	loading = false,
	variant = 'secondary',
	outline = false,
	iconColor: iconColorOverride,
	size,
	style,
	accessibilityRole,
	accessibilityState
}: BaseButtonProps) {
	const { colors } = useTheme()
	const isDanger = variant === 'danger'
	const solidColorKey = SOLID_VARIANT_COLOR[variant]
	const accentColor = solidColorKey ? colors[solidColorKey] : undefined
	const useOutline = outline || isDanger
	const outlineColor = accentColor ?? (isDanger ? colors.error : colors.textSecondary)

	const backgroundColor = disabled ? colors.surfaceVariant : useOutline ? hexToRgba(outlineColor, 0.1) : accentColor ? accentColor : colors.surface

	const borderColor = disabled ? colors.surfaceVariant : useOutline ? hexToRgba(outlineColor, 0.25) : accentColor ? accentColor : colors.border

	const resolvedIconColor = iconColorOverride ?? (disabled ? colors.textTertiary : useOutline ? outlineColor : accentColor ? colors.buttonText : colors.textSecondary)

	const accessibilityLabel = text && label && label !== text ? `${label} ${text}` : label || text

	const buttonSize = size ?? BASE_BUTTON_SIZE
	const isRow = textPosition === 'right'
	const hasText = !!text
	const iconSize = Math.max(14, Math.round(buttonSize * 0.55))

	const defaultTextStyle: TextStyle = {
		color: resolvedIconColor,
		fontSize: isRow ? 14 : 11,
		fontWeight: '600',
		textAlign: 'center'
	}

	const sizeStyle: ViewStyle = {
		minHeight: buttonSize + (hasText && !isRow ? 18 : 0),
		...(isRow ? { paddingHorizontal: Math.round(buttonSize * 0.35) } : hasText ? { minWidth: buttonSize, paddingHorizontal: Math.round(buttonSize * 0.2) } : { width: buttonSize })
	}

	const Icon = iconType === 'material' ? MaterialIcons : Ionicons

	if (loading) {
		return <Spinner size="small" expand={false} style={[styles.baseButton, sizeStyle, { opacity: disabled ? 0.5 : 1 }, style]} />
	}

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled}
			activeOpacity={0.1}
			accessibilityLabel={accessibilityLabel}
			accessibilityRole={accessibilityRole}
			accessibilityState={accessibilityState}
			style={[styles.baseButton, sizeStyle, { backgroundColor, borderColor, opacity: disabled ? 0.5 : 1 }, style]}
		>
			<View style={isRow ? styles.contentRow : styles.contentColumn}>
				{icon ? <Icon name={icon} size={iconSize} color={resolvedIconColor} style={styles.icon} /> : null}
				{text ? (
					<Text style={[defaultTextStyle, textStyle]} numberOfLines={isRow ? 1 : undefined} adjustsFontSizeToFit={isRow} minimumFontScale={0.5}>
						{text}
					</Text>
				) : null}
			</View>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	baseButton: {
		borderRadius: BASE_BUTTON_RADIUS,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		...Platform.select({
			web: { cursor: 'pointer' } as any,
			default: {}
		})
	},
	contentRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6
	},
	contentColumn: {
		flexDirection: 'column',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 2
	},
	icon: {
		lineHeight: 24,
		textAlign: 'center',
		textAlignVertical: 'center'
	}
})
