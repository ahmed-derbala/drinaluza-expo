export interface SmartKebabMenuItem {
	key: string
	label: string
	icon?: string // Name of the Ionicons/MaterialIcons icon
	disabled?: boolean
	destructive?: boolean

	/**
	 * Optional badge.
	 * Examples:
	 * 3
	 * "NEW"
	 * "99+"
	 */
	badge?: string | number

	onPress: () => void | Promise<void>

	// Extensibility / Future Proofing
	type?: 'item' | 'separator'
	group?: string
	roles?: string[]
	permissions?: string[]
	loading?: boolean
	tooltip?: string
}

export interface SmartKebabMenuContextProps {
	screenItems: SmartKebabMenuItem[]
	registerItems: (key: string, items: SmartKebabMenuItem[]) => void
	unregisterItems: (key: string) => void
}
