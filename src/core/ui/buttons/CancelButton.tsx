import { type StyleProp, type ViewStyle } from 'react-native'
import { translate } from '@/core/translation'
import { IconBaseButton } from '@/core/ui/buttons/IconBaseButton'

export interface CancelButtonProps {
	onPress: () => void
	disabled?: boolean
	loading?: boolean
	style?: StyleProp<ViewStyle>
	label?: string
	size?: number
}

export function CancelButton({ onPress, disabled = false, loading = false, style, label = translate('cancel', 'Cancel'), size }: CancelButtonProps) {
	return <IconBaseButton icon="close-outline" label={label} onPress={onPress} disabled={disabled} loading={loading} variant="danger" style={style} size={size} />
}
