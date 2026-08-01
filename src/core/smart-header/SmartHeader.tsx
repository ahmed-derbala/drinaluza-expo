import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import { StyleSheet, View, Platform, Animated, ScrollView as RNScrollView, ScrollViewProps } from 'react-native'
import { FlashList as ShopifyFlashList, FlashListProps } from '@shopify/flash-list'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, Href, usePathname } from 'expo-router'
import { IconButton } from '@/features/common/buttons/IconButton'
import { useTheme, colors as themeColors } from '@/core/theme'
import { translate } from '@/core/translation'
import { useSmartKebabMenu } from '@/core/smart-kebab-menu'
import { SmartKebabMenuItem } from '@/core/smart-kebab-menu/types'
import { useLayout } from '@/core/contexts'
import HeaderActionButton from './HeaderActionButton'
import HeaderRefreshButton from './HeaderRefreshButton'
import HeaderNotificationsButton from './HeaderNotificationsButton'
import HeaderSearchButton from './HeaderSearchButton'
import HeaderCartButton from './HeaderCartButton'
import HeaderActions, { HeaderActionType } from './HeaderActions'
import HeaderTitle from './HeaderTitle'

// Re-export actions for convenience
export { HeaderActionButton, HeaderRefreshButton, HeaderNotificationsButton, HeaderSearchButton, HeaderCartButton }

// ----------------------------------------
// 1. HeaderBackButton Component
// ----------------------------------------
interface HeaderBackButtonProps {
	onPress?: () => void
	fallbackRoute?: Href
}

export const HeaderBackButton: React.FC<HeaderBackButtonProps> = React.memo(({ onPress, fallbackRoute = '/feed' }) => {
	const { colors } = useTheme()
	const router = useRouter()

	const handlePress = () => {
		if (onPress) {
			onPress()
		} else if (router.canGoBack()) {
			router.back()
		} else {
			router.replace(fallbackRoute)
		}
	}

	return (
		<IconButton
			icon={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'}
			label={translate('go_back', 'Go back')}
			onPress={handlePress}
			colors={colors}
			iconColor={colors.primary}
			size={40}
			style={{ backgroundColor: colors.primary + '15', borderColor: 'transparent' }}
		/>
	)
})

HeaderBackButton.displayName = 'HeaderBackButton'

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
	const { isHeaderVisible, setHeaderVisible, setTabBarVisible, setHeaderHeight } = useLayout()
	const insets = useSafeAreaInsets()
	const pathname = usePathname()

	const resolvedBottom = headerBottom ?? options?.headerBottom
	const resolvedBottomHeight = headerBottomHeight ?? options?.headerBottomHeight ?? 0
	const headerHeight = 56 + insets.top + resolvedBottomHeight

	// Keep layout context headerHeight state updated
	useEffect(() => {
		setHeaderHeight(headerHeight, pathname)
	}, [headerHeight, setHeaderHeight, pathname])

	// Ensure header and tab bar are visible on route changes to prevent hidden headers carrying over from previous screen scrolls
	useEffect(() => {
		setHeaderVisible(true)
		setTabBarVisible(true)
	}, [pathname, setHeaderVisible, setTabBarVisible])
	const visibleAnim = useRef(new Animated.Value(1)).current

	// Setup header hide/show instantly (no animation to prevent screen flickering/lag)
	useEffect(() => {
		visibleAnim.setValue(isHeaderVisible ? 1 : 0)
	}, [isHeaderVisible, visibleAnim])

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

	const rootPaths = useMemo(
		() => ['/', '/feed', '/dashboard', '/notifications', '/profile', '/settings', '/(home)/feed', '/(home)/dashboard', '/(home)/notifications', '/(home)/profile', '/(home)/settings'],
		[]
	)

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

	// Resolve headerActions
	const resolvedActions = useMemo(() => {
		const rawActions: (HeaderActionType | React.ReactNode)[] = headerActions ?? options?.headerActions ?? []
		const hasRefresh = rawActions.some((action) => {
			if (action === 'refresh') return true
			if (action && typeof action === 'object' && 'key' in action && (action as any).key === 'refresh') return true
			return false
		})
		if (!hasRefresh) {
			return [...rawActions, 'refresh']
		}
		return rawActions
	}, [headerActions, options?.headerActions])

	const titleSection = <HeaderTitle title={resolvedTitle} subtitle={resolvedSubtitle} />

	const animatedOpacity = visibleAnim.interpolate({
		inputRange: [0, 0.8, 1],
		outputRange: [0, 0, 1]
	})

	const animatedTranslateY = visibleAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [-headerHeight, 0]
	})

	return (
		<Animated.View
			style={[
				styles.headerContainer,
				{
					height: headerHeight,
					opacity: animatedOpacity,
					transform: [{ translateY: animatedTranslateY }],
					backgroundColor: colors.background,
					overflow: isHeaderVisible ? 'visible' : 'hidden'
				}
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
					<HeaderActions resolvedHeaderRight={resolvedHeaderRight} resolvedActions={resolvedActions} options={options} />
				</View>

				{/* Custom Bottom Content (e.g. status filter bar in sales screen) */}
				{resolvedBottom && <View style={{ height: resolvedBottomHeight, width: '100%' }}>{resolvedBottom}</View>}
			</View>
		</Animated.View>
	)
}

SmartHeaderComponent.displayName = 'SmartHeader'

// ----------------------------------------
// 5. Reusable Scroll Wrappers that auto-hide the header and handle padding
// ----------------------------------------
export const SmartScrollView = React.forwardRef<RNScrollView, ScrollViewProps>(
	({ onScroll: customOnScroll, scrollEventThrottle = 16, contentContainerStyle, scrollIndicatorInsets, ...props }, ref) => {
		const { onScroll } = useScrollHandler()
		const { headerHeight } = useLayout()

		const handleScroll = useCallback(
			(event: any) => {
				onScroll(event)
				if (customOnScroll) {
					customOnScroll(event)
				}
			},
			[onScroll, customOnScroll]
		)

		const mergedContentContainerStyle = useMemo(() => {
			const flattened = StyleSheet.flatten(contentContainerStyle) || {}
			const customPaddingTop = typeof flattened.paddingTop === 'number' ? flattened.paddingTop : 0
			return [contentContainerStyle, { paddingTop: headerHeight + customPaddingTop }]
		}, [headerHeight, contentContainerStyle])

		const mergedScrollIndicatorInsets = useMemo(() => {
			if (Platform.OS === 'web') return scrollIndicatorInsets
			return {
				top: headerHeight,
				...scrollIndicatorInsets
			}
		}, [headerHeight, scrollIndicatorInsets])

		return (
			<RNScrollView
				ref={ref}
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
			onScroll(event)
			if (customOnScroll) {
				customOnScroll(event)
			}
		},
		[onScroll, customOnScroll]
	)

	const mergedContentContainerStyle = useMemo(() => {
		const flattened = StyleSheet.flatten(contentContainerStyle) || {}
		const customPaddingTop = typeof flattened.paddingTop === 'number' ? flattened.paddingTop : 0
		return [contentContainerStyle, { paddingTop: headerHeight + customPaddingTop }]
	}, [headerHeight, contentContainerStyle])

	const mergedScrollIndicatorInsets = useMemo(() => {
		if (Platform.OS === 'web') return scrollIndicatorInsets
		return {
			top: headerHeight,
			...scrollIndicatorInsets
		}
	}, [headerHeight, scrollIndicatorInsets])

	return (
		<ShopifyFlashList
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
MemoizedHeader.ActionButton = HeaderActionButton
MemoizedHeader.RefreshButton = HeaderRefreshButton
MemoizedHeader.NotificationsButton = HeaderNotificationsButton
MemoizedHeader.SearchButton = HeaderSearchButton
MemoizedHeader.CartButton = HeaderCartButton
MemoizedHeader.ScrollView = SmartScrollView
MemoizedHeader.FlashList = SmartFlashList

export const SmartHeader = MemoizedHeader as React.NamedExoticComponent<SmartHeaderProps> & {
	BackButton: typeof HeaderBackButton
	ActionButton: typeof HeaderActionButton
	RefreshButton: typeof HeaderRefreshButton
	NotificationsButton: typeof HeaderNotificationsButton
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
