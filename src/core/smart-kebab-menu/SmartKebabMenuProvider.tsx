import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { usePathname } from 'expo-router'
import { SmartKebabMenuItem, SmartKebabMenuContextProps } from './types'

const SmartKebabMenuContext = createContext<SmartKebabMenuContextProps | undefined>(undefined)

export const useSmartKebabMenuContext = () => {
	const context = useContext(SmartKebabMenuContext)
	if (!context) {
		throw new Error('useSmartKebabMenuContext must be used within a SmartKebabMenuProvider')
	}
	return context
}

interface SmartKebabMenuProviderProps {
	children: React.ReactNode
}

export const SmartKebabMenuProvider: React.FC<SmartKebabMenuProviderProps> = ({ children }) => {
	const [isOpen, setIsOpenState] = useState(false)
	const [menuItems, setMenuItems] = useState<SmartKebabMenuItem[]>([])
	const pathname = usePathname()

	const setIsOpen = useCallback((open: boolean) => {
		setIsOpenState(open)
	}, [])

	const registerItems = useCallback((items: SmartKebabMenuItem[]) => {
		setMenuItems(items)
	}, [])

	const unregisterItems = useCallback(() => {
		setMenuItems([])
		setIsOpenState(false)
	}, [])

	// Automatically close the menu when route changes
	useEffect(() => {
		setIsOpenState(false)
	}, [pathname])

	return (
		<SmartKebabMenuContext.Provider
			value={{
				isOpen,
				setIsOpen,
				menuItems,
				registerItems,
				unregisterItems
			}}
		>
			{children}
		</SmartKebabMenuContext.Provider>
	)
}
