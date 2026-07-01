import React, { createContext, useContext, useState, ReactNode } from 'react'

interface LayoutContextType {
	isTabBarVisible: boolean
	setTabBarVisible: (visible: boolean) => void
	isSearchBarVisible: boolean
	setSearchBarVisible: (visible: boolean) => void
	isHeaderVisible: boolean
	setHeaderVisible: (visible: boolean) => void
	headerHeight: number
	setHeaderHeight: (height: number) => void
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [isTabBarVisible, setTabBarVisible] = useState(true)
	const [isSearchBarVisible, setSearchBarVisible] = useState(false)
	const [isHeaderVisible, setHeaderVisible] = useState(true)
	const [headerHeight, setHeaderHeight] = useState(56)

	return (
		<LayoutContext.Provider
			value={{
				isTabBarVisible,
				setTabBarVisible,
				isSearchBarVisible,
				setSearchBarVisible,
				isHeaderVisible,
				setHeaderVisible,
				headerHeight,
				setHeaderHeight
			}}
		>
			{children}
		</LayoutContext.Provider>
	)
}

export const useLayout = () => {
	const context = useContext(LayoutContext)
	if (context === undefined) {
		throw new Error('useLayout must be used within a LayoutProvider')
	}
	return context
}
