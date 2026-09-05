import { type StyleProp, type ViewStyle } from 'react-native'
import { IconTextBaseButton } from '@buttons/IconTextBaseButton'
import { translate } from '@translation'

export interface ResetAppButtonProps {
	onPress: () => void
	loading?: boolean
	disabled?: boolean
	style?: StyleProp<ViewStyle>
}

export function ResetAppButton({ onPress, loading = false, disabled = false, style }: ResetAppButtonProps) {
	return (
		<IconTextBaseButton
			icon="trash-outline"
			text={translate('reset_app', 'Reset App')}
			label={translate('reset_app', 'Reset App')}
			onPress={onPress}
			loading={loading}
			disabled={disabled || loading}
			variant="danger"
			textPosition="right"
			style={style}
		/>
	)
}

export default ResetAppButton
