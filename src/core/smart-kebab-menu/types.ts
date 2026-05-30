export interface SmartKebabMenuItem {
	key: string
	label: string
	icon?: string
	iconType?: 'ionicons' | 'material'
	disabled?: boolean
	destructive?: boolean
	badge?: string | number
	onPress: () => void | Promise<void>
	type?: 'item' | 'separator'
	visible?: boolean
	loading?: boolean
	tooltip?: string
}

export interface SmartKebabMenuContextProps {
	isOpen: boolean
	setIsOpen: (isOpen: boolean) => void
	menuItems: SmartKebabMenuItem[]
	registerItems: (items: SmartKebabMenuItem[]) => void
	unregisterItems: () => void
}
