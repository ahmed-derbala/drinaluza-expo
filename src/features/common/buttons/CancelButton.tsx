import React from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import { translate } from '@/core/translation'
import { IconButton } from './IconButton'

export interface CancelButtonProps {
	onPress: () => void
	disabled?: boolean
	loading?: boolean
	style?: StyleProp<ViewStyle>
	label?: string
}

export function CancelButton({ onPress, disabled = false, loading = false, style, label = translate('cancel', 'Cancel') }: CancelButtonProps) {
	return <IconButton icon="close-outline" label={label} onPress={onPress} disabled={disabled} loading={loading} variant="danger" style={style} />
}
