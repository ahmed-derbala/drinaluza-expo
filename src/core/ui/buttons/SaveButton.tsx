import { type StyleProp, type ViewStyle } from 'react-native'
import { translate } from '@translation'
import { IconBaseButton } from '@buttons/IconBaseButton'

export interface SaveButtonProps {
	onPress: () => void
	disabled?: boolean
	loading?: boolean
	style?: StyleProp<ViewStyle>
	label?: string
	size?: number
}

export function SaveButton({ onPress, disabled = false, loading = false, style, label = translate('save', 'Save'), size }: SaveButtonProps) {
	return <IconBaseButton icon="checkmark-circle" label={label} onPress={onPress} disabled={disabled} loading={loading} variant="success" style={style} size={size} />
}
