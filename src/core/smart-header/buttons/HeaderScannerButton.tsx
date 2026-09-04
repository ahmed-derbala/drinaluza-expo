import { HeaderIconBaseButton } from './HeaderIconBaseButton'

export interface HeaderScannerButtonProps {
	onPress: () => void
	size?: number
	label?: string
}

export function HeaderScannerButton({ onPress, size = 38, label = 'Scan QR Code' }: HeaderScannerButtonProps) {
	return <HeaderIconBaseButton icon="qr-code-scanner" iconType="material" label={label} onPress={onPress} size={size} />
}
