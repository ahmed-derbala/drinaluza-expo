import { useMemo } from 'react'
import { useWindowDimensions, Platform } from 'react-native'

export interface GridDimensions {
	numColumns: number
	gap: number
	padding: number
	itemWidth: number
	isWeb: boolean
	width: number
}

export function useResponsiveGrid(customGap = 16, customPadding = 16): GridDimensions {
	const { width } = useWindowDimensions()
	const isWeb = Platform.OS === 'web'

	const numColumns = useMemo(() => {
		if (width < 500) return 1
		if (width < 800) return 2
		if (width < 1100) return 3
		if (width < 1440) return 4
		return 5
	}, [width])

	const itemWidth = useMemo(() => {
		return (width - customPadding * 2 - customGap * (numColumns - 1)) / numColumns
	}, [width, customPadding, customGap, numColumns])

	return {
		numColumns,
		gap: customGap,
		padding: customPadding,
		itemWidth,
		isWeb,
		width
	}
}
