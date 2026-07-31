import React from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { IconButton } from './IconButton'

export interface CancelButtonProps {
	onPress: () => void
	disabled?: boolean
	style?: StyleProp<ViewStyle>
	label?: string
}

export function CancelButton({ onPress, disabled = false, style, label = translate('cancel', 'Cancel') }: CancelButtonProps) {
	const { colors } = useTheme()

	return <IconButton icon="close-outline" label={label} onPress={onPress} disabled={disabled} variant="danger" colors={colors} style={style} />
}
