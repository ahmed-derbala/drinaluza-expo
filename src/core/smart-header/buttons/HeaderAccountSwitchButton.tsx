import { HeaderIconBaseButton } from './HeaderIconBaseButton'

export interface HeaderAccountSwitchButtonProps {
	onPress: () => void
	size?: number
	label?: string
	iconColor?: string
}

export function HeaderAccountSwitchButton({ onPress, size = 38, label = 'Switch Account', iconColor }: HeaderAccountSwitchButtonProps) {
	return <HeaderIconBaseButton icon="people-outline" label={label} onPress={onPress} size={size} iconColor={iconColor} />
}
