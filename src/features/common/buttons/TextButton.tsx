import React from 'react'
import { type StyleProp, type ViewStyle, type TextStyle, type AccessibilityRole, type AccessibilityState } from 'react-native'
import { BaseButton, type ButtonVariant } from './BaseButton'

export interface TextButtonProps {
	/** Optional icon name. */
	icon?: any
	/** Icon family to use. */
	iconType?: 'ionicons' | 'material'
	/** Visible text. */
	text: string
	/** Optional accessibility label. Falls back to {@link text}. */
	label?: string
	/** Press handler. */
	onPress: (event?: any) => void
	/** Whether the button is disabled. */
	disabled?: boolean
	/** Whether the button is in a loading state. */
	loading?: boolean
	/** Visual variant. */
	variant?: ButtonVariant
	/** Optional icon color override. */
	iconColor?: string
	/** Button size (affects icon and minimum height). */
	size?: number
	/** Optional container style override. */
	style?: StyleProp<ViewStyle>
	/** Optional text style override. */
	textStyle?: StyleProp<TextStyle>
	/** Optional accessibility role. */
	accessibilityRole?: AccessibilityRole
	/** Optional accessibility state. */
	accessibilityState?: AccessibilityState
}

export function TextButton({
	icon,
	iconType = 'ionicons',
	text,
	label,
	onPress,
	disabled = false,
	loading = false,
	variant = 'primary',
	iconColor,
	size,
	style,
	textStyle,
	accessibilityRole,
	accessibilityState
}: TextButtonProps) {
	return (
		<BaseButton
			icon={icon}
			iconType={iconType}
			label={label}
			text={text}
			textPosition="bottom"
			onPress={onPress}
			disabled={disabled}
			loading={loading}
			variant={variant}
			iconColor={iconColor}
			size={size}
			style={style}
			textStyle={textStyle}
			accessibilityRole={accessibilityRole}
			accessibilityState={accessibilityState}
		/>
	)
}
