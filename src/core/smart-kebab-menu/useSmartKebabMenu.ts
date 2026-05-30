import { useEffect, useRef } from 'react'
import { useNavigation } from 'expo-router'
import { useSmartKebabMenuContext } from './SmartKebabMenuProvider'
import { SmartKebabMenuItem } from './types'

export function useSmartKebabMenu(items: SmartKebabMenuItem[]) {
	const { registerItems, unregisterItems } = useSmartKebabMenuContext()
	const navigation = useNavigation()

	// Stable representation of items (excluding onPress callback to prevent infinite re-renders)
	const itemsStableString = JSON.stringify(
		items.map((item) => ({
			key: item.key,
			label: item.label,
			icon: item.icon,
			iconType: item.iconType,
			disabled: item.disabled,
			destructive: item.destructive,
			badge: item.badge,
			type: item.type,
			visible: item.visible,
			loading: item.loading,
			tooltip: item.tooltip
		}))
	)

	// Keep actual items in a ref so we can call the latest onPress callbacks
	const itemsRef = useRef<SmartKebabMenuItem[]>(items)
	useEffect(() => {
		itemsRef.current = items
	}, [items])

	useEffect(() => {
		let isFocused = navigation.isFocused()

		const handleRegister = () => {
			if (!isFocused) return

			const registeredItems = itemsRef.current.map((item) => ({
				...item,
				onPress: async () => {
					// Retrieve latest dynamic reference to onPress callback
					const latestItem = itemsRef.current.find((i) => i.key === item.key)
					if (latestItem && !latestItem.disabled && !latestItem.loading) {
						await latestItem.onPress()
					}
				}
			}))
			registerItems(registeredItems)
		}

		// Initial registration if the screen is already focused
		if (isFocused) {
			handleRegister()
		}

		const unsubscribeFocus = navigation.addListener('focus', () => {
			isFocused = true
			handleRegister()
		})

		const unsubscribeBlur = navigation.addListener('blur', () => {
			isFocused = false
			unregisterItems()
		})

		return () => {
			unsubscribeFocus()
			unsubscribeBlur()
			if (isFocused) {
				unregisterItems()
			}
		}
	}, [navigation, itemsStableString, registerItems, unregisterItems])
}
