import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react'
import { usePathname } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

/** Height of the floating bottom tab bar pill, excluding safe area / margin. */
export const TAB_BAR_HEIGHT = 52
/** Space between the bottom tab bar and the bottom safe area edge. */
export const TAB_BAR_BOTTOM_MARGIN = 16

interface LayoutContextType {
	isTabBarVisible: boolean
	setTabBarVisible: (visible: boolean) => void
	isSearchBarVisible: boolean
	setSearchBarVisible: (visible: boolean) => void
	isHeaderVisible: boolean
	setHeaderVisible: (visible: boolean) => void
	headerHeight: number
	setHeaderHeight: (height: number, routePath?: string) => void
	isHeaderWithBottom: boolean
	setHeaderWithBottom: (hasBottom: boolean) => void
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined)

export const LayoutProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const [isTabBarVisible, setTabBarVisible] = useState(true)
	const [isSearchBarVisible, setSearchBarVisible] = useState(false)
	const [isHeaderVisible, setHeaderVisible] = useState(true)
	const [isHeaderWithBottom, setHeaderWithBottom] = useState(false)
	const [headerHeights, setHeaderHeights] = useState<Record<string, number>>({})
	const pathname = usePathname()
	const insets = useSafeAreaInsets()

	const currentHeight = headerHeights[pathname] ?? 56 + insets.top

	const setHeaderHeight = useCallback(
		(height: number, routePath?: string) => {
			const key = routePath || pathname
			setHeaderHeights((prev) => {
				if (prev[key] === height) return prev
				return { ...prev, [key]: height }
			})
		},
		[pathname]
	)

	const value = useMemo(
		() => ({
			isTabBarVisible,
			setTabBarVisible,
			isSearchBarVisible,
			setSearchBarVisible,
			isHeaderVisible,
			setHeaderVisible,
			headerHeight: currentHeight,
			setHeaderHeight,
			isHeaderWithBottom,
			setHeaderWithBottom
		}),
		[isTabBarVisible, setTabBarVisible, isSearchBarVisible, setSearchBarVisible, isHeaderVisible, setHeaderVisible, currentHeight, setHeaderHeight, isHeaderWithBottom, setHeaderWithBottom]
	)

	return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export const useLayout = () => {
	const context = useContext(LayoutContext)
	if (context === undefined) {
		throw new Error('useLayout must be used within a LayoutProvider')
	}
	return context
}
