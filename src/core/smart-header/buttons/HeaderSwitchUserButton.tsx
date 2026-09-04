import { HeaderIconBaseButton } from './HeaderIconBaseButton'

export interface HeaderSwitchUserButtonProps {
	onPress: () => void
	size?: number
	label?: string
	iconColor?: string
	backgroundColor?: string
}

export function HeaderSwitchUserButton({ onPress, size = 38, label = 'Switch User', iconColor, backgroundColor }: HeaderSwitchUserButtonProps) {
	return <HeaderIconBaseButton icon="people" label={label} onPress={onPress} size={size} iconColor={iconColor} style={{ backgroundColor }} />
}
