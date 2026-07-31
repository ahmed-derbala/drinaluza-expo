import React from 'react'
import { StyleSheet, Text, TouchableOpacity, Platform, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { AppThemeColors } from '@/core/theme'
import { hexToRgba } from '@/core/helpers/colors'

export type IconVariant = 'primary' | 'success' | 'secondary' | 'danger'

export interface IconButtonProps {
	icon: React.ComponentProps<typeof Ionicons>['name']
	label: string
	subtitle?: string
	onPress: () => void
	disabled?: boolean
	variant?: IconVariant
	colors: AppThemeColors
	style?: StyleProp<ViewStyle>
}

export function IconButton({ icon, label, subtitle, onPress, disabled = false, variant = 'secondary', colors, style }: IconButtonProps) {
	const isPrimary = variant === 'primary'
	const isSuccess = variant === 'success'
	const isDanger = variant === 'danger'

	const backgroundColor = disabled ? colors.surfaceVariant : isPrimary ? colors.primary : isSuccess ? colors.success : isDanger ? hexToRgba(colors.error, 0.1) : colors.surface

	const borderColor = disabled ? colors.surfaceVariant : isPrimary ? colors.primary : isSuccess ? colors.success : isDanger ? hexToRgba(colors.error, 0.25) : colors.borderLight

	const iconColor = disabled ? colors.textTertiary : isPrimary || isSuccess ? colors.textOnPrimary : isDanger ? colors.error : colors.textSecondary

	const accessibilityLabel = subtitle ? `${label} ${subtitle}` : label

	const flattenedStyle = StyleSheet.flatten(style)
	const minWidth = typeof flattenedStyle?.minWidth === 'number' ? flattenedStyle.minWidth : 50

	const contentWidth = React.useMemo(() => {
		if (subtitle) {
			return Math.min(120, Math.max(minWidth, Math.ceil(subtitle.length * 7) + 12))
		}
		return minWidth
	}, [subtitle, minWidth])

	return (
		<TouchableOpacity
			onPress={onPress}
			disabled={disabled}
			activeOpacity={0.8}
			accessibilityLabel={accessibilityLabel}
			style={[styles.iconButton, { width: contentWidth, height: subtitle ? 62 : 50 }, { backgroundColor, borderColor, opacity: disabled ? 0.5 : 1 }, style]}
		>
			<Ionicons name={icon} size={24} color={iconColor} />
			{subtitle ? (
				<Text style={{ fontSize: 11, fontWeight: '600', color: iconColor, textAlign: 'center', marginTop: 2 }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.25}>
					{subtitle}
				</Text>
			) : null}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	iconButton: {
		width: 50,
		height: 50,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		...Platform.select({
			web: { cursor: 'pointer' } as any,
			default: {}
		})
	}
})
