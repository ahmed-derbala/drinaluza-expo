import React from 'react'
import { useTheme } from '@/core/theme'
import { HeaderIconButton } from './HeaderIconButton'

export interface HeaderAllowPushButtonProps {
	onPress: () => void
	size?: number
	label?: string
}

export function HeaderAllowPushButton({ onPress, size = 38, label = 'Allow Notifications' }: HeaderAllowPushButtonProps) {
	const { colors } = useTheme()
	return <HeaderIconButton icon="notifications-outline" label={label} onPress={onPress} size={size} iconColor={colors.warning} />
}
