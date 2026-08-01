import React from 'react'
import { StyleSheet, type StyleProp, type ViewStyle, type AccessibilityRole, type AccessibilityState } from 'react-native'
import { BaseButton, type ButtonVariant, BASE_BUTTON_SIZE, BASE_BUTTON_RADIUS } from './BaseButton'
import { AppThemeColors } from '@/core/theme'

const SIZE_KEYS = new Set(['width', 'height', 'minWidth', 'minHeight', 'maxWidth', 'maxHeight', 'flex', 'flexGrow', 'flexShrink', 'flexBasis'])

export function stripSizeOverrides(style?: StyleProp<ViewStyle>): ViewStyle | undefined {
	const flat = StyleSheet.flatten(style)
	if (!flat) return undefined
	const result: Record<string, unknown> = {}
	for (const [key, value] of Object.entries(flat)) {
		if (!SIZE_KEYS.has(key)) result[key] = value
	}
	return result as ViewStyle
}

export type IconVariant = ButtonVariant

export interface IconButtonProps {
	icon: any
	iconType?: 'ionicons' | 'material'
	/** Accessibility label only; no visible text is rendered. */
	label: string
	onPress: (event?: any) => void
	disabled?: boolean
	loading?: boolean
	variant?: IconVariant
	iconColor?: string
	colors: AppThemeColors
	size?: number
	style?: StyleProp<ViewStyle>
	accessibilityRole?: AccessibilityRole
	accessibilityState?: AccessibilityState
}

export const ACTION_BUTTON_SIZE = BASE_BUTTON_SIZE
export const ACTION_BUTTON_RADIUS = BASE_BUTTON_RADIUS

export function IconButton({
	icon,
	iconType = 'ionicons',
	label,
	onPress,
	disabled = false,
	loading = false,
	variant = 'secondary',
	iconColor,
	colors,
	size,
	style,
	accessibilityRole,
	accessibilityState
}: IconButtonProps) {
	return (
		<BaseButton
			icon={icon}
			iconType={iconType}
			label={label}
			onPress={onPress}
			disabled={disabled}
			loading={loading}
			variant={variant}
			iconColor={iconColor}
			colors={colors}
			size={size}
			style={stripSizeOverrides(style)}
			accessibilityRole={accessibilityRole}
			accessibilityState={accessibilityState}
		/>
	)
}
