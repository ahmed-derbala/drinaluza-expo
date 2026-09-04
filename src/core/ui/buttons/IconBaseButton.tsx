import { StyleSheet, type StyleProp, type ViewStyle, type AccessibilityRole, type AccessibilityState } from 'react-native'
import { BaseButton, type ButtonVariant } from './BaseButton'

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

export interface IconBaseButtonProps {
	icon: any
	iconType?: 'ionicons' | 'material'
	/** Accessibility label only; no visible text is rendered. */
	label: string
	onPress: (event?: any) => void
	disabled?: boolean
	loading?: boolean
	variant?: IconVariant
	outline?: boolean
	iconColor?: string
	size?: number
	style?: StyleProp<ViewStyle>
	accessibilityRole?: AccessibilityRole
	accessibilityState?: AccessibilityState
}

export function IconBaseButton({
	icon,
	iconType = 'ionicons',
	label,
	onPress,
	disabled = false,
	loading = false,
	variant = 'secondary',
	outline,
	iconColor,
	size,
	style,
	accessibilityRole,
	accessibilityState
}: IconBaseButtonProps) {
	return (
		<BaseButton
			icon={icon}
			iconType={iconType}
			label={label}
			onPress={onPress}
			disabled={disabled}
			loading={loading}
			variant={variant}
			outline={outline}
			iconColor={iconColor}
			size={size}
			style={stripSizeOverrides(style)}
			accessibilityRole={accessibilityRole}
			accessibilityState={accessibilityState}
		/>
	)
}
