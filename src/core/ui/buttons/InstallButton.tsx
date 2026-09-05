import { type StyleProp, type ViewStyle } from 'react-native'
import { translate } from '@translation'
import { IconBaseButton } from './IconBaseButton'
import type { ButtonVariant } from './BaseButton'

export interface InstallButtonProps {
	/** Optional APK file URI. If missing, the button is disabled. */
	fileUri?: string | null
	/** Visual variant. */
	variant?: ButtonVariant
	/** Optional button size. */
	size?: number
	/** Whether the button is disabled. */
	disabled?: boolean
	/** Optional style override. */
	style?: StyleProp<ViewStyle>
	/** Press handler. */
	onPress: () => void
}

export function InstallButton({ fileUri, variant = 'success', size, disabled, style, onPress }: InstallButtonProps) {
	const isDisabled = disabled !== undefined ? disabled : !fileUri

	return <IconBaseButton icon="archive-outline" label={translate('install', 'Install')} onPress={onPress} disabled={isDisabled} variant={variant} size={size} style={style} />
}
