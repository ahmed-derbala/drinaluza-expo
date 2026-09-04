import { HeaderIconBaseButton } from './HeaderIconBaseButton'

export interface HeaderQRCodeButtonProps {
	onPress: () => void
	size?: number
	label?: string
}

export function HeaderQRCodeButton({ onPress, size = 38, label = 'QR Code' }: HeaderQRCodeButtonProps) {
	return <HeaderIconBaseButton icon="qr-code-outline" label={label} onPress={onPress} size={size} />
}
