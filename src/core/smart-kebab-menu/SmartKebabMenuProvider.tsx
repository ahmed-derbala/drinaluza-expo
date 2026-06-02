import React, { createContext, useState, useCallback, useMemo } from 'react'
import { SmartKebabMenuItem, SmartKebabMenuContextProps } from './types'

export const SmartKebabMenuContext = createContext<SmartKebabMenuContextProps | undefined>(undefined)

export const SmartKebabMenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [registry, setRegistry] = useState<Record<string, SmartKebabMenuItem[]>>({})

	const registerItems = useCallback((key: string, items: SmartKebabMenuItem[]) => {
		setRegistry((prev) => {
			// To avoid unnecessary re-renders, perform a JSON serialization comparison check
			if (JSON.stringify(prev[key]) === JSON.stringify(items)) {
				return prev
			}
			return {
				...prev,
				[key]: items
			}
		})
	}, [])

	const unregisterItems = useCallback((key: string) => {
		setRegistry((prev) => {
			if (!(key in prev)) {
				return prev
			}
			const next = { ...prev }
			delete next[key]
			return next
		})
	}, [])

	// Memoize the flattened items array to optimize performance
	const screenItems = useMemo(() => {
		return Object.values(registry).flat()
	}, [registry])

	const contextValue = useMemo(
		() => ({
			screenItems,
			registerItems,
			unregisterItems
		}),
		[screenItems, registerItems, unregisterItems]
	)

	return <SmartKebabMenuContext.Provider value={contextValue}>{children}</SmartKebabMenuContext.Provider>
}
