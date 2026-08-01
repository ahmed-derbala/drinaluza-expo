import React from 'react'
import { type StyleProp, type ViewStyle } from 'react-native'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { IconButton } from './IconButton'

export interface DeleteButtonProps {
	/** Press handler. */
	onPress: () => void
	/** Optional accessibility label. Defaults to "Delete". */
	label?: string
	/** Whether the button is disabled. */
	disabled?: boolean
	/** Optional button size. */
	size?: number
	/** Optional style override. */
	style?: StyleProp<ViewStyle>
}

export function DeleteButton({ onPress, label = translate('delete', 'Delete'), disabled = false, size, style }: DeleteButtonProps) {
	const { colors } = useTheme()

	return <IconButton icon="trash-outline" label={label} onPress={onPress} disabled={disabled} variant="danger" size={size} colors={colors} style={style} />
}
