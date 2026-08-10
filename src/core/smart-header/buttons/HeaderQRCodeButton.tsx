import React from 'react'
import { HeaderIconButton } from './HeaderIconButton'

export interface HeaderQRCodeButtonProps {
	onPress: () => void
	size?: number
	label?: string
}

export function HeaderQRCodeButton({ onPress, size = 38, label = 'QR Code' }: HeaderQRCodeButtonProps) {
	return <HeaderIconButton icon="qr-code-outline" label={label} onPress={onPress} size={size} />
}
