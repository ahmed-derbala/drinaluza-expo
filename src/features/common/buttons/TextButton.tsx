import { type StyleProp, type ViewStyle, type TextStyle, type AccessibilityRole, type AccessibilityState } from 'react-native'
import { BaseButton, type ButtonVariant } from './BaseButton'

export interface TextButtonProps {
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
	/** Button size (affects minimum height). */
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

export function TextButton({ text, label, onPress, disabled = false, loading = false, variant = 'primary', size, style, textStyle, accessibilityRole, accessibilityState }: TextButtonProps) {
	return (
		<BaseButton
			label={label}
			text={text}
			textPosition="right"
			onPress={onPress}
			disabled={disabled}
			loading={loading}
			variant={variant}
			size={size}
			style={style}
			textStyle={textStyle}
			accessibilityRole={accessibilityRole}
			accessibilityState={accessibilityState}
		/>
	)
}
