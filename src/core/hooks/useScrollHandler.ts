import { useRef, useCallback } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { useLayout } from '../contexts/LayoutContext'

/**
 * A hook that provides a scroll handler to hide/show the tab bar based on scroll direction.
 * @param threshold The minimum scroll distance to trigger a visibility change
 */
export const useScrollHandler = (threshold: number = 20) => {
	const { isTabBarVisible, setTabBarVisible, isSearchBarVisible, setSearchBarVisible } = useLayout()
	const lastOffset = useRef(0)
	const isScrolling = useRef(false)

	const onScroll = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const currentOffset = event.nativeEvent.contentOffset.y
			const diff = currentOffset - lastOffset.current

			// Only trigger if we've scrolled more than the threshold
			if (Math.abs(diff) > threshold) {
				if (diff > 0) {
					// Scrolling down - hide UI
					if (isTabBarVisible) setTabBarVisible(false)
					if (isSearchBarVisible) setSearchBarVisible(false)
				} else {
					// Scrolling up - show UI
					if (!isTabBarVisible) setTabBarVisible(true)
					if (!isSearchBarVisible) setSearchBarVisible(true)
				}
				lastOffset.current = currentOffset
			}

			// Show UI when reaching the top
			if (currentOffset <= 0) {
				if (!isTabBarVisible) setTabBarVisible(true)
				if (!isSearchBarVisible) setSearchBarVisible(true)
			}
		},
		[isTabBarVisible, setTabBarVisible, isSearchBarVisible, setSearchBarVisible, threshold]
	)

	return { onScroll }
}
