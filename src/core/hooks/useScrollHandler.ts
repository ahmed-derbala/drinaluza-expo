import { useRef, useCallback } from 'react'
import { NativeScrollEvent, NativeSyntheticEvent } from 'react-native'
import { useLayout } from '../contexts/LayoutContext'

/**
 * A hook that provides a scroll handler to hide/show the tab bar based on scroll direction.
 * Uses debouncing to prevent rapid UI toggling during scrolling.
 * @param threshold The minimum scroll distance to trigger a visibility change (default: 50)
 * @param debounceMs Minimum time between visibility changes in milliseconds (default: 350)
 */
export const useScrollHandler = (
	threshold: number = 50, // scroll down threshold (default: 50)
	debounceMs: number = 400, // increased to 400ms to allow layout transitions to complete
	scrollUpThreshold: number = 150 // scroll up threshold (default: 150)
) => {
	const { isTabBarVisible, setTabBarVisible, isHeaderVisible, setHeaderVisible } = useLayout()
	const lastOffset = useRef(0)
	const accumulatedDistance = useRef(0)
	const lastDirection = useRef<'up' | 'down' | null>(null)
	const lastToggleTime = useRef(0)

	// Track current visibility via refs to avoid stale closures
	const isTabBarVisibleRef = useRef(isTabBarVisible)
	isTabBarVisibleRef.current = isTabBarVisible

	const isHeaderVisibleRef = useRef(isHeaderVisible)
	isHeaderVisibleRef.current = isHeaderVisible

	const onScroll = useCallback(
		(event: NativeSyntheticEvent<NativeScrollEvent>) => {
			const currentOffset = event.nativeEvent.contentOffset.y
			const currentTime = Date.now()

			// Always show when near the top of the scroll view
			if (currentOffset <= 50) {
				let didToggle = false
				if (!isTabBarVisibleRef.current) {
					setTabBarVisible(true)
					didToggle = true
				}
				if (!isHeaderVisibleRef.current) {
					setHeaderVisible(true)
					didToggle = true
				}
				if (didToggle) {
					lastToggleTime.current = currentTime
				}
				accumulatedDistance.current = 0
				lastOffset.current = currentOffset
				lastDirection.current = null
				return
			}

			const timeSinceLastToggle = currentTime - lastToggleTime.current

			// Ignore scroll events during the layout/animation transition debounce period
			// to prevent layout-shift scroll deltas from triggering reverse toggles.
			if (timeSinceLastToggle < debounceMs) {
				lastOffset.current = currentOffset
				accumulatedDistance.current = 0
				return
			}

			const diff = currentOffset - lastOffset.current
			const currentDirection = diff > 0 ? 'down' : diff < 0 ? 'up' : null

			// If scroll direction changes, reset the accumulated distance
			if (currentDirection !== null && currentDirection !== lastDirection.current) {
				accumulatedDistance.current = 0
				lastDirection.current = currentDirection
			}

			// Accumulate delta
			if (currentDirection !== null) {
				accumulatedDistance.current += Math.abs(diff)
			}

			if (timeSinceLastToggle >= debounceMs) {
				if (lastDirection.current === 'down') {
					// Scrolling down - hide header & tab bar
					if (accumulatedDistance.current >= threshold) {
						let didToggle = false
						if (isTabBarVisibleRef.current) {
							setTabBarVisible(false)
							didToggle = true
						}
						if (isHeaderVisibleRef.current) {
							setHeaderVisible(false)
							didToggle = true
						}
						if (didToggle) {
							lastToggleTime.current = currentTime
							accumulatedDistance.current = 0
						}
					}
				} else if (lastDirection.current === 'up') {
					// Scrolling up - show header & tab bar (less sensitive)
					if (accumulatedDistance.current >= scrollUpThreshold) {
						let didToggle = false
						if (!isTabBarVisibleRef.current) {
							setTabBarVisible(true)
							didToggle = true
						}
						if (!isHeaderVisibleRef.current) {
							setHeaderVisible(true)
							didToggle = true
						}
						if (didToggle) {
							lastToggleTime.current = currentTime
							accumulatedDistance.current = 0
						}
					}
				}
			}

			lastOffset.current = currentOffset
		},
		[setTabBarVisible, setHeaderVisible, threshold, scrollUpThreshold, debounceMs]
	)

	return { onScroll }
}
