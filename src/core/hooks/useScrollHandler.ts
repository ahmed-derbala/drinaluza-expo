import { useRef, useCallback } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { useLayout } from '../contexts/LayoutContext'

/**
 * A hook that provides a scroll handler to hide/show the tab bar based on scroll direction.
 * Uses debouncing to prevent rapid UI toggling during scrolling.
 * @param threshold The minimum scroll distance to trigger a visibility change (default: 50)
 * @param debounceMs Minimum time between visibility changes in milliseconds (default: 350)
 */
export const useScrollHandler = (threshold: number = 50, debounceMs: number = 350) => {
	const { isTabBarVisible, setTabBarVisible } = useLayout()
	const lastOffset = useRef(0)
	const lastToggleTime = useRef(0)

	const onScroll = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const currentOffset = event.nativeEvent.contentOffset.y
			const currentTime = Date.now()
			const diff = currentOffset - lastOffset.current
			const timeSinceLastToggle = currentTime - lastToggleTime.current

			// Always show tab bar when at the top
			if (currentOffset <= 0) {
				if (!isTabBarVisible) {
					setTabBarVisible(true)
					lastToggleTime.current = currentTime
				}
				lastOffset.current = currentOffset
				return
			}

			// Only process if we've scrolled more than threshold and enough time has passed
			if (Math.abs(diff) >= threshold && timeSinceLastToggle >= debounceMs) {
				if (diff > 0) {
					// Scrolling down - hide tab bar
					if (isTabBarVisible) {
						setTabBarVisible(false)
						lastToggleTime.current = currentTime
					}
				} else {
					// Scrolling up - show tab bar
					if (!isTabBarVisible) {
						setTabBarVisible(true)
						lastToggleTime.current = currentTime
					}
				}
				lastOffset.current = currentOffset
			}
		},
		[isTabBarVisible, setTabBarVisible, threshold, debounceMs]
	)

	return { onScroll }
}
