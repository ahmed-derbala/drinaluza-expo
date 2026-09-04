import { type StyleProp, type ViewStyle } from 'react-native'
import { translate } from '@/core/translation'
import { IconBaseButton } from '@/core/ui/buttons/IconBaseButton'

export interface ShareButtonProps {
	/** Press handler. */
	onPress: () => void
	/** Optional accessibility label. Defaults to "Share". */
	label?: string
	/** Whether the button is disabled. */
	disabled?: boolean
	/** Optional button size. */
	size?: number
	/** Optional style override. */
	style?: StyleProp<ViewStyle>
}

export function ShareButton({ onPress, label = translate('share', 'Share'), disabled = false, size, style }: ShareButtonProps) {
	return <IconBaseButton icon="share-social-outline" label={label} onPress={onPress} disabled={disabled} variant="secondary" size={size} style={style} />
}
