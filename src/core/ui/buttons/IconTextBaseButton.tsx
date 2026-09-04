import { type StyleProp, type ViewStyle, type TextStyle, type AccessibilityRole, type AccessibilityState } from 'react-native'
import { BaseButton, type ButtonVariant } from './BaseButton'

export interface IconTextBaseButtonProps {
	icon: any
	iconType?: 'ionicons' | 'material'
	text: string
	label?: string
	onPress: (event?: any) => void
	disabled?: boolean
	loading?: boolean
	variant?: ButtonVariant
	outline?: boolean
	iconColor?: string
	size?: number
	textPosition?: 'right' | 'bottom'
	style?: StyleProp<ViewStyle>
	textStyle?: StyleProp<TextStyle>
	accessibilityRole?: AccessibilityRole
	accessibilityState?: AccessibilityState
}

export function IconTextBaseButton({
	icon,
	iconType = 'ionicons',
	text,
	label,
	onPress,
	disabled = false,
	loading = false,
	variant = 'primary',
	outline,
	iconColor,
	size,
	textPosition = 'right',
	style,
	textStyle,
	accessibilityRole,
	accessibilityState
}: IconTextBaseButtonProps) {
	return (
		<BaseButton
			icon={icon}
			iconType={iconType}
			text={text}
			textPosition={textPosition}
			label={label}
			onPress={onPress}
			disabled={disabled}
			loading={loading}
			variant={variant}
			outline={outline}
			iconColor={iconColor}
			size={size}
			style={style}
			textStyle={textStyle}
			accessibilityRole={accessibilityRole}
			accessibilityState={accessibilityState}
		/>
	)
}

export default IconTextBaseButton
