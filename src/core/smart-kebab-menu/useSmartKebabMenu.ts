import { useContext, useEffect, useId, useRef } from 'react'
import { SmartKebabMenuContext } from './SmartKebabMenuProvider'
import { SmartKebabMenuItem } from './types'

/**
 * Hook for screens to register dynamic Kebab Menu items.
 * Items will be automatically cleaned up when the screen unmounts.
 *
 * @param items Array of menu item configurations
 */
export const useSmartKebabMenu = (items: SmartKebabMenuItem[]) => {
	const context = useContext(SmartKebabMenuContext)
	if (!context) {
		throw new Error('useSmartKebabMenu must be used within a SmartKebabMenuProvider')
	}

	const { registerItems, unregisterItems } = context
	const registrationId = useId()

	// Stringify layout-critical properties to prevent infinite loop re-renders
	// if items is passed as an inline array literal.
	const itemsStringified = JSON.stringify(
		items.map((item) => ({
			key: item.key,
			label: item.label,
			icon: item.icon,
			disabled: item.disabled,
			destructive: item.destructive,
			badge: item.badge
		}))
	)

	// Keep a ref to the latest items array. This avoids stale closures
	// inside click handlers while preventing redundant effect executions.
	const itemsRef = useRef(items)
	useEffect(() => {
		itemsRef.current = items
	}, [items])

	useEffect(() => {
		registerItems(registrationId, itemsRef.current)

		return () => {
			unregisterItems(registrationId)
		}
	}, [registrationId, itemsStringified, registerItems, unregisterItems])
}
