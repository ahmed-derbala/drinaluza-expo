import React from 'react'
import { type StyleProp, type ViewStyle, type AccessibilityRole, type AccessibilityState } from 'react-native'
import { IconButton } from './IconButton'
import { translate } from '@/core/translation'

export interface EyeButtonProps {
	/** Whether the content is currently visible (eye-off) or hidden (eye). */
	visible: boolean
	/** Press handler. */
	onPress: () => void
	/** Optional style override. */
	style?: StyleProp<ViewStyle>
	/** Optional icon color override. */
	iconColor?: string
	/** Single accessibility label used for both states. */
	label?: string
	/** Accessibility label when content is hidden. Defaults to "Show password". */
	showLabel?: string
	/** Accessibility label when content is visible. Defaults to "Hide password". */
	hideLabel?: string
	/** Optional accessibility role. */
	accessibilityRole?: AccessibilityRole
	/** Optional accessibility state. */
	accessibilityState?: AccessibilityState
}

export function EyeButton({
	visible,
	onPress,
	style,
	iconColor,
	label,
	showLabel = translate('show_password', 'Show password'),
	hideLabel = translate('hide_password', 'Hide password'),
	accessibilityRole,
	accessibilityState
}: EyeButtonProps) {
	const accessibilityLabel = label ? label : visible ? hideLabel : showLabel

	return (
		<IconButton
			icon={visible ? 'eye-off-outline' : 'eye-outline'}
			label={accessibilityLabel}
			onPress={onPress}
			iconColor={iconColor}
			style={style}
			accessibilityRole={accessibilityRole}
			accessibilityState={accessibilityState}
		/>
	)
}
