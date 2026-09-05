import { useCallback, useEffect } from 'react'
import { Platform } from 'react-native'
import { useLayout } from '@contexts/LayoutContext'
import { usePathname } from 'expo-router'
import { useSharedValue, useAnimatedScrollHandler } from 'react-native-reanimated'
import { scheduleOnRN, scheduleOnUI } from 'react-native-worklets'

type UseScrollHandlerOptions = {
	threshold?: number
	debounceMs?: number
	scrollUpThreshold?: number
	enabled?: boolean
}

const DEFAULT_THRESHOLD = 50
const DEFAULT_DEBOUNCE_MS = 400
const DEFAULT_SCROLL_UP_THRESHOLD = 150
const TOP_SNAP_OFFSET = 50

const isValidOffset = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export const useScrollHandler = (
	thresholdOrOptions: number | UseScrollHandlerOptions = DEFAULT_THRESHOLD,
	debounceMs = DEFAULT_DEBOUNCE_MS,
	scrollUpThreshold: number = DEFAULT_SCROLL_UP_THRESHOLD
) => {
	const opts: UseScrollHandlerOptions = typeof thresholdOrOptions === 'object' && thresholdOrOptions !== null ? thresholdOrOptions : { threshold: thresholdOrOptions, debounceMs, scrollUpThreshold }

	const threshold = opts.threshold ?? DEFAULT_THRESHOLD
	const debounce = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS
	const upThreshold = opts.scrollUpThreshold ?? DEFAULT_SCROLL_UP_THRESHOLD
	const enabled = opts.enabled ?? true

	const { isTabBarVisible, setTabBarVisible, isHeaderVisible, setHeaderVisible, isHeaderWithBottom } = useLayout()
	const pathname = usePathname()

	// Shared values — single source of truth for both Native and Web (Reanimated supports Web)
	const lastOffsetSV = useSharedValue(0)
	const accumulatedSV = useSharedValue(0)
	const lastDirectionSV = useSharedValue<0 | 1 | -1>(0)
	const lastToggleTimeSV = useSharedValue(performance.now())
	const thresholdSV = useSharedValue(threshold)
	const debounceSV = useSharedValue(debounce)
	const upThresholdSV = useSharedValue(upThreshold)
	const enabledSV = useSharedValue(enabled ? 1 : 0)
	const isHeaderWithBottomSV = useSharedValue(isHeaderWithBottom ? 1 : 0)
	const isHeaderVisibleSV = useSharedValue(isHeaderVisible ? 1 : 0)
	const isTabBarVisibleSV = useSharedValue(isTabBarVisible ? 1 : 0)

	// Consolidated sync — minimal effects to avoid desync during rapid scrolls
	useEffect(() => {
		thresholdSV.value = threshold
		debounceSV.value = debounce
		upThresholdSV.value = upThreshold
		enabledSV.value = enabled ? 1 : 0
	}, [threshold, debounce, upThreshold, enabled, thresholdSV, debounceSV, upThresholdSV, enabledSV])

	useEffect(() => {
		isHeaderWithBottomSV.value = isHeaderWithBottom ? 1 : 0
		isHeaderVisibleSV.value = isHeaderVisible ? 1 : 0
		isTabBarVisibleSV.value = isTabBarVisible ? 1 : 0
	}, [isHeaderWithBottom, isHeaderVisible, isTabBarVisible, isHeaderWithBottomSV, isHeaderVisibleSV, isTabBarVisibleSV])

	useEffect(() => {
		lastOffsetSV.value = 0
		accumulatedSV.value = 0
		lastDirectionSV.value = 0
		lastToggleTimeSV.value = performance.now()
		if (isHeaderWithBottom && !isHeaderVisible) {
			setHeaderVisible(true)
		}
	}, [pathname, isHeaderWithBottom, isHeaderVisible, setHeaderVisible, lastOffsetSV, accumulatedSV, lastDirectionSV, lastToggleTimeSV])

	const showFromWorklet = useCallback(() => {
		// No stale closure guard — worklet already checks SVs; unconditional set avoids capturing stale isTabBarVisible/isHeaderVisible
		setTabBarVisible(true)
		setHeaderVisible(true)
		lastToggleTimeSV.value = performance.now()
	}, [setTabBarVisible, setHeaderVisible, lastToggleTimeSV])

	const hideFromWorklet = useCallback(
		(hideHeader: boolean) => {
			setTabBarVisible(false)
			if (hideHeader) setHeaderVisible(false)
			lastToggleTimeSV.value = performance.now()
		},
		[setTabBarVisible, setHeaderVisible, lastToggleTimeSV]
	)

	// Core logic as worklet — used by both native animated handler and web document listener
	const handleOffsetWorklet = (y: number) => {
		'use worklet'
		if (enabledSV.value === 0) {
			lastOffsetSV.value = y
			return
		}
		if (typeof y !== 'number' || !Number.isFinite(y)) {
			lastOffsetSV.value = y
			return
		}
		const now = performance.now()
		if (y <= TOP_SNAP_OFFSET) {
			if (isTabBarVisibleSV.value === 0 || isHeaderVisibleSV.value === 0) {
				scheduleOnRN(showFromWorklet)
			}
			accumulatedSV.value = 0
			lastOffsetSV.value = y
			lastDirectionSV.value = 0
			return
		}
		const timeSince = now - lastToggleTimeSV.value
		if (timeSince < debounceSV.value) {
			lastOffsetSV.value = y
			accumulatedSV.value = 0
			return
		}
		const diff = y - lastOffsetSV.value
		const dir = diff > 0 ? 1 : diff < 0 ? -1 : 0
		if (dir !== 0 && dir !== lastDirectionSV.value) {
			accumulatedSV.value = 0
			lastDirectionSV.value = dir as 0 | 1 | -1
		}
		if (dir !== 0) accumulatedSV.value += Math.abs(diff)
		if (timeSince >= debounceSV.value) {
			if (lastDirectionSV.value === 1 && accumulatedSV.value >= thresholdSV.value) {
				const hideHeader = isHeaderVisibleSV.value === 1 && isHeaderWithBottomSV.value === 0
				const shouldHideTab = isTabBarVisibleSV.value === 1
				if (shouldHideTab || hideHeader) {
					scheduleOnRN(hideFromWorklet, hideHeader)
					accumulatedSV.value = 0
				}
			} else if (lastDirectionSV.value === -1 && accumulatedSV.value >= upThresholdSV.value) {
				if (isTabBarVisibleSV.value === 0 || isHeaderVisibleSV.value === 0) {
					scheduleOnRN(showFromWorklet)
					accumulatedSV.value = 0
				}
			}
		}
		lastOffsetSV.value = y
	}

	const animatedScrollHandler = useAnimatedScrollHandler(
		{
			onScroll: (event: any) => {
				'use worklet'
				const y = event?.contentOffset?.y ?? event?.nativeEvent?.contentOffset?.y
				handleOffsetWorklet(y as number)
			}
		},
		[handleOffsetWorklet]
	)

	// Web: modal-aware window/document scroll — writes directly via worklet (Reanimated supports Web)
	useEffect(() => {
		if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') return

		const handleWebScroll = (e: Event) => {
			const target = e.target as HTMLElement | Document | Window | null
			if (!target) return
			if (target instanceof HTMLElement && target.closest?.('[data-base-modal]')) return

			let y: number | null = null
			if (target === document || target === window) y = window.scrollY ?? document.documentElement.scrollTop ?? 0
			else if (target instanceof HTMLElement) {
				if (typeof target.scrollTop === 'number' && target.scrollHeight > target.clientHeight) {
					const isHorizontal = target.scrollWidth > target.clientWidth && target.scrollHeight <= target.clientHeight
					if (isHorizontal) return
					y = target.scrollTop
				} else return
			}
			if (!isValidOffset(y)) return
			// Invoke worklet cleanly on UI thread for unified execution
			scheduleOnUI(handleOffsetWorklet, y as number)
		}

		document.addEventListener('scroll', handleWebScroll, { capture: true, passive: true } as AddEventListenerOptions)
		return () => document.removeEventListener('scroll', handleWebScroll, { capture: true } as EventListenerOptions)
	}, [handleOffsetWorklet])

	const onScroll = useCallback(
		(event: any) => {
			const y = event?.nativeEvent?.contentOffset?.y ?? event?.contentOffset?.y
			if (!isValidOffset(y)) return
			scheduleOnUI(handleOffsetWorklet, y as number)
		},
		[handleOffsetWorklet]
	)

	return {
		/** Pass to Reanimated components (<AnimatedFlashList />, <Animated.ScrollView />) */
		animatedScrollHandler,
		/** Pass to standard components (<FlashList />, <ScrollView />, <FlatList />) */
		onScroll
	}
}
