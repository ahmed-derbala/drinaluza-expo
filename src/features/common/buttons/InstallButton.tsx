import React from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { TextButton } from './TextButton'
import type { ButtonVariant } from './BaseButton'

export interface InstallButtonProps {
	/** Optional APK file URI. If missing, the button is disabled. */
	fileUri?: string | null
	/** Version to display next to the icon. */
	version?: string | null
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

export function InstallButton({ fileUri, version, variant = 'success', size, disabled, style, onPress }: InstallButtonProps) {
	const { colors } = useTheme()
	const isDisabled = disabled !== undefined ? disabled : !fileUri

	return (
		<TextButton
			icon="archive-outline"
			text={version ? `v${version}` : ''}
			label={translate('install', 'Install')}
			onPress={onPress}
			disabled={isDisabled}
			variant={variant}
			size={size}
			colors={colors}
			style={style}
		/>
	)
}
