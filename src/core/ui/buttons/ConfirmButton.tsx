import { type StyleProp, type ViewStyle } from 'react-native'
import { translate } from '@/core/translation'
import { IconBaseButton, type IconVariant } from '@/core/ui/buttons/IconBaseButton'

export interface ConfirmButtonProps {
	onPress: () => void
	disabled?: boolean
	loading?: boolean
	style?: StyleProp<ViewStyle>
	label?: string
	size?: number
	icon?: string
	variant?: IconVariant
}

export function ConfirmButton({ onPress, disabled = false, loading = false, style, label = translate('confirm', 'Confirm'), size, icon = 'checkmark', variant = 'primary' }: ConfirmButtonProps) {
	return <IconBaseButton icon={icon} label={label} onPress={onPress} disabled={disabled} loading={loading} variant={variant} style={style} size={size} />
}
