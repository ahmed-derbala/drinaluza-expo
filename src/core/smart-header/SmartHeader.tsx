import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { StyleSheet, View, Platform, ScrollView as RNScrollView, ScrollViewProps } from 'react-native'
import { FlashList as ShopifyFlashList, FlashListProps } from '@shopify/flash-list'
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated'
import { scheduleOnUI } from 'react-native-worklets'
import { useScrollHandler } from '@/core/scroll'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Href, usePathname } from 'expo-router'
import { HeaderBackButton, HeaderIconButton, HeaderRefreshButton, HeaderSearchButton, HeaderCartButton } from './buttons'
import { useTheme } from '@/core/theme'
import { useSmartKebabMenu } from '@/core/smart-kebab-menu'
import { SmartKebabMenuItem } from '@/core/smart-kebab-menu/types'
import { useLayout } from '@/core/contexts'
import HeaderActions, { HeaderActionType } from './HeaderActions'
import HeaderTitle from './HeaderTitle'
// Re-export actions for convenience
export {
	HeaderBackButton,
	HeaderIconButton,
	HeaderNotificationsButton,
	HeaderRefreshButton,
	HeaderSearchButton,
	HeaderCartButton,
	HeaderQRCodeButton,
	HeaderScannerButton,
	HeaderSalesButton,
	HeaderCreateProductButton,
	HeaderRequestBusinessButton,
	HeaderSwitchUserButton,
	HeaderAllowPushButton
} from './buttons'
export interface SmartHeaderProps {
	title?: React.ReactNode
	subtitle?: string
	showBackButton?: boolean
	onBackPress?: () => void
	headerActions?: (HeaderActionType | React.ReactNode)[]
	SmartKebabMenuItems?: SmartKebabMenuItem[]
	fallbackRoute?: Href
	centerLeftOffset?: number
	centerRightOffset?: number
	disableAnimations?: boolean
	headerBottom?: React.ReactNode
	headerBottomHeight?: number
	// Backward compatibility props
	headerLeft?: React.ReactNode
	headerRight?: React.ReactNode
	// React Navigation header props support
	options?: any
	route?: any
	navigation?: any
	back?: any
}
// ----------------------------------------
// 5. SmartScreenHeader Component Implementation
// ----------------------------------------
const SmartHeaderComponent: React.FC<SmartHeaderProps> = ({
	title,
	subtitle,
	showBackButton,
	onBackPress,
	headerActions,
	SmartKebabMenuItems,
	fallbackRoute,
	headerLeft,
	headerRight,
	options,
	route,
	navigation,
	back,
	headerBottom,
	headerBottomHeight
}) => {
	const { colors } = useTheme()
	const { isHeaderVisible, setHeaderVisible, setTabBarVisible, setHeaderHeight, setHeaderWithBottom } = useLayout()
	const insets = useSafeAreaInsets()
	const pathname = usePathname()
	const resolvedBottom = headerBottom ?? options?.headerBottom
	const resolvedBottomHeight = headerBottomHeight ?? options?.headerBottomHeight ?? 0
	const headerHeight = 56 + insets.top + resolvedBottomHeight
	// Keep layout context headerHeight state updated — only when this header's own screen is focused.
	// Mounted-but-inactive headers (e.g. other tabs that keep a headerBottom) must not overwrite the
	// height entry of the currently displayed screen, otherwise scroll content gets a wrong paddingTop.
	useEffect(() => {
		const isFocused = typeof navigation?.isFocused === 'function' ? navigation.isFocused() : true
		if (isFocused) {
			setHeaderHeight(headerHeight, pathname)
		}
	}, [headerHeight, setHeaderHeight, pathname, navigation])
	useEffect(() => {
		const isFocused = typeof navigation?.isFocused === 'function' ? navigation.isFocused() : true
		if (isFocused) {
			setHeaderWithBottom(!!resolvedBottom)
		}
	}, [resolvedBottom, setHeaderWithBottom, navigation])
	useEffect(() => {
		return () => {
			const isFocused = typeof navigation?.isFocused === 'function' ? navigation.isFocused() : true
			if (isFocused) {
				setHeaderWithBottom(false)
			}
		}
	}, [navigation, setHeaderWithBottom])
	// Ensure header and tab bar are visible on route changes to prevent hidden headers carrying over from previous screen scrolls
	useEffect(() => {
		setHeaderVisible(true)
		setTabBarVisible(true)
	}, [pathname, setHeaderVisible, setTabBarVisible])
	const headerTranslateY = useSharedValue(0)
	const headerOpacity = useSharedValue(1)
	useEffect(() => {
		headerTranslateY.value = withTiming(isHeaderVisible ? 0 : -headerHeight, { duration: 250 })
		headerOpacity.value = withTiming(isHeaderVisible ? 1 : 0, { duration: 250 })
	}, [isHeaderVisible, headerHeight, headerTranslateY, headerOpacity])
	const animatedHeaderStyle = useAnimatedStyle(() => ({
		transform: [{ translateY: headerTranslateY.value }],
		opacity: headerOpacity.value
	}))
	const resolvedSubtitle = useMemo(() => subtitle ?? options?.subtitle, [subtitle, options?.subtitle])
	// Resolve title
	const resolvedTitle = useMemo(() => {
		if (title !== undefined) return title
		if (typeof options?.headerTitle === 'function') {
			return options.headerTitle()
		}
		if (options?.headerTitle !== undefined) {
			return options.headerTitle
		}
		if (options?.title !== undefined) {
			return options.title
		}
		if (route?.name !== undefined && !/[\[\]]/.test(route.name)) {
			return route.name
		}
		return undefined
	}, [title, options?.headerTitle, options?.title, route?.name])
	// Resolve headerLeft (for backward compatibility)
	const resolvedHeaderLeft = useMemo(() => {
		if (headerLeft !== undefined) return headerLeft
		if (typeof options?.headerLeft === 'function') {
			return options.headerLeft()
		}
		return options?.headerLeft
	}, [headerLeft, options?.headerLeft])
	const rootPaths = useMemo(() => ['/', '/feed', '/dashboard', '/profile', '/(home)/feed', '/(home)/dashboard', '/(home)/profile'], [])
	// Determine if we should show the back button
	const resolvedShowBackButton = useMemo(() => {
		const isRootPath = rootPaths.includes(pathname)
		return showBackButton ?? options?.showBackButton ?? !isRootPath
	}, [showBackButton, options?.showBackButton, pathname, rootPaths])
	// Register kebab menu items dynamically
	const screenKebabItems = useMemo(() => SmartKebabMenuItems ?? options?.SmartKebabMenuItems ?? [], [SmartKebabMenuItems, options?.SmartKebabMenuItems])
	useSmartKebabMenu(screenKebabItems)
	// Resolve headerRight (for backward compatibility)
	const resolvedHeaderRight = useMemo(() => {
		if (headerRight !== undefined) return headerRight
		if (typeof options?.headerRight === 'function') {
			return options.headerRight()
		}
		return options?.headerRight
	}, [headerRight, options?.headerRight])
	// The actions this screen wants to show, in addition to (or overriding) the defaults.
	// See `headerActionsConfig.tsx` for how these are merged with the default buttons.
	const screenHeaderActions = useMemo(() => headerActions ?? options?.headerActions ?? [], [headerActions, options?.headerActions])
	const titleSection = <HeaderTitle title={resolvedTitle} subtitle={resolvedSubtitle} />
	return (
		<Animated.View
			style={[
				styles.headerContainer,
				{
					height: headerHeight,
					backgroundColor: colors.background,
					overflow: isHeaderVisible ? 'visible' : 'hidden'
				},
				animatedHeaderStyle
			]}
		>
			<View
				style={{
					height: headerHeight,
					position: 'absolute',
					bottom: 0,
					left: 0,
					right: 0,
					paddingTop: insets.top
				}}
			>
				<View style={styles.headerInner}>
					{/* Left Section: Back button + Title & Subtitle */}
					<View style={styles.leftSection}>
						{resolvedHeaderLeft
							? resolvedHeaderLeft
							: resolvedShowBackButton && <HeaderBackButton onPress={onBackPress ?? options?.onBackPress} fallbackRoute={fallbackRoute ?? options?.fallbackRoute ?? '/feed'} />}
						<View style={[styles.titleContainerWrapper, (resolvedHeaderLeft || resolvedShowBackButton) && { marginLeft: 12 }]}>{titleSection}</View>
					</View>
					{/* Right Section: Actions + Kebab menu (stable container width to guarantee zero layout shifts) */}
					<HeaderActions headerRight={resolvedHeaderRight} headerActions={screenHeaderActions} />
				</View>
				{/* Custom Bottom Content (e.g. status filter bar in sales screen) */}
				{resolvedBottom && <View style={{ height: resolvedBottomHeight, width: '100%' }}>{resolvedBottom}</View>}
			</View>
		</Animated.View>
	)
}
SmartHeaderComponent.displayName = 'SmartHeader'
// ----------------------------------------
// 5. Reusable Scroll Wrappers that auto-hide the header and handle padding - Reanimated + Gesture-Handler enhanced
// ----------------------------------------
const ReanimatedFlashList =
	Platform.OS === 'web' ? (ShopifyFlashList as unknown as typeof ShopifyFlashList) : (Animated.createAnimatedComponent(ShopifyFlashList) as unknown as typeof ShopifyFlashList)

export const SmartScrollView = React.forwardRef<RNScrollView, ScrollViewProps>(
	({ onScroll: customOnScroll, scrollEventThrottle = 16, contentContainerStyle, scrollIndicatorInsets, ...props }, ref) => {
		const { onScroll } = useScrollHandler()
		const { headerHeight } = useLayout()
		const handleScroll = useCallback(
			(event: any) => {
				// Run header hide/show worklet on UI thread for 60fps, keep custom callback on JS
				try {
					scheduleOnUI(onScroll as any, event)
				} catch {
					;(onScroll as any)(event)
				}
				if (customOnScroll) {
					customOnScroll(event)
				}
			},
			[onScroll, customOnScroll]
		)
		const mergedContentContainerStyle = useMemo(() => {
			const flattened = StyleSheet.flatten(contentContainerStyle) as Record<string, unknown> | null
			const base = (flattened as any) || {}
			const customPaddingTop = typeof base.paddingTop === 'number' ? (base.paddingTop as number) : 0
			// Flatten to single object — array causes web "CSSStyleDeclaration[0]" error in FlashList/ScrollView
			return { ...base, paddingTop: headerHeight + customPaddingTop }
		}, [headerHeight, contentContainerStyle])
		const mergedScrollIndicatorInsets = useMemo(() => {
			if (Platform.OS === 'web') return scrollIndicatorInsets
			return {
				top: headerHeight,
				...scrollIndicatorInsets
			}
		}, [headerHeight, scrollIndicatorInsets])
		return (
			<Animated.ScrollView
				ref={ref as any}
				onScroll={handleScroll}
				scrollEventThrottle={scrollEventThrottle}
				contentContainerStyle={mergedContentContainerStyle}
				scrollIndicatorInsets={mergedScrollIndicatorInsets}
				{...props}
			/>
		)
	}
)
SmartScrollView.displayName = 'SmartHeader.ScrollView'
export const SmartFlashList = React.forwardRef<any, FlashListProps<any>>(({ onScroll: customOnScroll, scrollEventThrottle = 16, contentContainerStyle, scrollIndicatorInsets, ...props }, ref) => {
	const { onScroll } = useScrollHandler()
	const { headerHeight } = useLayout()
	const handleScroll = useCallback(
		(event: any) => {
			try {
				scheduleOnUI(onScroll as any, event)
			} catch {
				;(onScroll as any)(event)
			}
			if (customOnScroll) {
				customOnScroll(event)
			}
		},
		[onScroll, customOnScroll]
	)
	const mergedContentContainerStyle = useMemo(() => {
		const flattened = StyleSheet.flatten(contentContainerStyle) as Record<string, unknown> | null
		const base = (flattened as any) || {}
		const customPaddingTop = typeof base.paddingTop === 'number' ? (base.paddingTop as number) : 0
		return { ...base, paddingTop: headerHeight + customPaddingTop }
	}, [headerHeight, contentContainerStyle])
	const mergedScrollIndicatorInsets = useMemo(() => {
		if (Platform.OS === 'web') return scrollIndicatorInsets
		return {
			top: headerHeight,
			...scrollIndicatorInsets
		}
	}, [headerHeight, scrollIndicatorInsets])
	return (
		<ReanimatedFlashList
			ref={ref}
			onScroll={handleScroll}
			scrollEventThrottle={scrollEventThrottle}
			contentContainerStyle={mergedContentContainerStyle as any}
			scrollIndicatorInsets={mergedScrollIndicatorInsets}
			{...props}
		/>
	)
})
SmartFlashList.displayName = 'SmartHeader.FlashList'
const MemoizedHeader = React.memo(SmartHeaderComponent) as any
MemoizedHeader.BackButton = HeaderBackButton
MemoizedHeader.ActionButton = HeaderIconButton
MemoizedHeader.RefreshButton = HeaderRefreshButton
MemoizedHeader.SearchButton = HeaderSearchButton
MemoizedHeader.CartButton = HeaderCartButton
MemoizedHeader.ScrollView = SmartScrollView
MemoizedHeader.FlashList = SmartFlashList
export const SmartHeader = MemoizedHeader as React.NamedExoticComponent<SmartHeaderProps> & {
	BackButton: typeof HeaderBackButton
	ActionButton: typeof HeaderIconButton
	RefreshButton: typeof HeaderRefreshButton
	SearchButton: typeof HeaderSearchButton
	CartButton: typeof HeaderCartButton
	ScrollView: any
	FlashList: any
}
const styles = StyleSheet.create({
	headerContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		width: '100%',
		zIndex: 100
	},
	headerInner: {
		height: 56,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 16,
		position: 'relative'
	},
	leftSection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 16,
		minHeight: 38
	},
	titleContainerWrapper: {
		flex: 1
	}
})
