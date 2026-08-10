import React from 'react'
import { HeaderIconButton } from './HeaderIconButton'

export interface HeaderRequestBusinessButtonProps {
	onPress: () => void
	size?: number
	label?: string
	iconColor?: string
}

export function HeaderRequestBusinessButton({ onPress, size = 38, label = 'Request Business', iconColor }: HeaderRequestBusinessButtonProps) {
	return <HeaderIconButton icon="briefcase" label={label} onPress={onPress} size={size} iconColor={iconColor} />
}
