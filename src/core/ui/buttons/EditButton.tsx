import { type StyleProp, type ViewStyle } from 'react-native'
import { translate } from '@translation'
import { IconBaseButton } from '@buttons/IconBaseButton'

export interface EditButtonProps {
	onPress: () => void
	disabled?: boolean
	loading?: boolean
	style?: StyleProp<ViewStyle>
	label?: string
	size?: number
}

export function EditButton({ onPress, disabled = false, loading = false, style, label = translate('edit', 'Edit'), size }: EditButtonProps) {
	return <IconBaseButton icon="create-outline" label={label} onPress={onPress} disabled={disabled} loading={loading} style={style} size={size} />
}
