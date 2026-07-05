import React, { useEffect, useRef, useMemo, useCallback } from 'react'
import {
	StyleSheet,
	View,
	Text,
	Platform,
	Animated,
	Easing,
	useWindowDimensions,
	ActivityIndicator,
	Pressable,
	ScrollView as RNScrollView,
	FlatList as RNFlatList,
	ScrollViewProps,
	FlatListProps
} from 'react-native'
import { FlashList as ShopifyFlashList, FlashListProps } from '@shopify/flash-list'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, Href, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { SmartKebabMenu, useSmartKebabMenu } from '@/core/smart-kebab-menu'
import { SmartKebabMenuItem } from '@/core/smart-kebab-menu/types'
import { useNotification } from '@/features/notifications/NotificationContext'
import { useLayout } from '@/core/contexts'
import HeaderActionButton from './HeaderActionButton'
import HeaderRefreshButton from './HeaderRefreshButton'

// Re-export actions for convenience
export { HeaderActionButton, HeaderRefreshButton }

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
		<Pressable
			onPress={handlePress}
			focusable={true}
			accessibilityRole="button"
			accessibilityLabel={translate('go_back', 'Go back')}
			hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
			style={({ hovered, pressed }) => [
				styles.backBtn,
				{
					backgroundColor: hovered ? colors.surfaceVariant || '#3A506B30' : pressed ? colors.primary + '15' : 'transparent'
				}
			]}
		>
			<Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={24} color={colors.text} />
		</Pressable>
	)
})

HeaderBackButton.displayName = 'HeaderBackButton'

// ----------------------------------------
// 2. Predefined Reusable Header Actions
// ----------------------------------------
export const HeaderNotificationsButton: React.FC = React.memo(() => {
	const router = useRouter()
	const { colors } = useTheme()
	const { notificationCount } = useNotification()

	return (
		<HeaderActionButton
			iconName="notifications-outline"
			badgeCount={notificationCount}
			onPress={() => router.push('/notifications')}
			accessibilityLabel={translate('notifications', 'Notifications')}
			backgroundColor={colors.surface}
			size={40}
		/>
	)
})
HeaderNotificationsButton.displayName = 'HeaderNotificationsButton'

export const HeaderSearchButton: React.FC = React.memo(() => {
	const router = useRouter()
	const { colors } = useTheme()

	return <HeaderActionButton iconName="search-outline" onPress={() => router.push('/search')} accessibilityLabel={translate('search', 'Search')} backgroundColor={colors.surface} size={40} />
})
HeaderSearchButton.displayName = 'HeaderSearchButton'

interface HeaderCartButtonProps {
	badgeCount?: number
}
export const HeaderCartButton: React.FC<HeaderCartButtonProps> = React.memo(({ badgeCount = 0 }) => {
	const router = useRouter()
	const { colors } = useTheme()

	return (
		<HeaderActionButton
			iconName="cart-outline"
			onPress={() => router.push('/profile/purchases?status=cart')}
			badgeCount={badgeCount}
			accessibilityLabel={translate('view_cart', 'View Cart')}
			backgroundColor={colors.surface}
			size={40}
		/>
	)
})
HeaderCartButton.displayName = 'HeaderCartButton'

export const HeaderSettingsButton: React.FC = React.memo(() => {
	const router = useRouter()
	const { colors } = useTheme()

	return <HeaderActionButton iconName="settings-outline" onPress={() => router.push('/settings')} accessibilityLabel={translate('settings', 'Settings')} backgroundColor={colors.surface} size={40} />
})
HeaderSettingsButton.displayName = 'HeaderSettingsButton'

// ----------------------------------------
// 3. Skeleton Block component for Loading state
// ----------------------------------------
const SkeletonBlock: React.FC<{ width: number; height: number; borderRadius?: number; disableAnimations?: boolean }> = ({ width, height, borderRadius = 4, disableAnimations = false }) => {
	const opacity = useRef(new Animated.Value(0.3)).current

	useEffect(() => {
		if (disableAnimations) {
			opacity.setValue(0.5)
			return
		}
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(opacity, {
					toValue: 0.7,
					duration: 650,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: Platform.OS !== 'web'
				}),
				Animated.timing(opacity, {
					toValue: 0.3,
					duration: 650,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: Platform.OS !== 'web'
				})
			])
		)
		animation.start()
		return () => animation.stop()
	}, [opacity, disableAnimations])

	return (
		<Animated.View
			style={{
				width,
				height,
				borderRadius,
				backgroundColor: '#3A506B50',
				opacity
			}}
		/>
	)
}

// ----------------------------------------
// 4. Header Actions configuration types
// ----------------------------------------
export type HeaderActionType =
	| 'search'
	| 'notifications'
	| 'cart'
	| 'settings'
	| 'refresh'
	| 'scanner'
	| {
			key: string
			iconName: string
			iconType?: 'material' | 'ionicons'
			badgeCount?: number
			onPress: () => void
			accessibilityLabel: string
			disabled?: boolean
	  }

export interface SmartHeaderProps {
	title?: React.ReactNode
	subtitle?: string
	showBackButton?: boolean
	onBackPress?: () => void
	headerActions?: (HeaderActionType | React.ReactNode)[]
	SmartKebabMenuItems?: SmartKebabMenuItem[]
	isLoading?: boolean
	fallbackRoute?: Href
	centerLeftOffset?: number
	centerRightOffset?: number
	disableAnimations?: boolean
	headerBottom?: React.ReactNode
	headerBottomHeight?: number

	// Backward compatibility props
	loading?: boolean
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
	isLoading = false,
	fallbackRoute,
	loading = false,
	headerLeft,
	headerRight,
	centerLeftOffset,
	centerRightOffset,
	options,
	route,
	navigation,
	back,
	disableAnimations = false,
	headerBottom,
	headerBottomHeight
}) => {
	const { colors } = useTheme()
	const { isHeaderVisible, setHeaderVisible, setTabBarVisible, setHeaderHeight } = useLayout()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const pathname = usePathname()

	const resolvedBottom = headerBottom ?? options?.headerBottom
	const resolvedBottomHeight = headerBottomHeight ?? options?.headerBottomHeight ?? 0
	const headerHeight = 56 + insets.top + resolvedBottomHeight

	// Keep layout context headerHeight state updated
	useEffect(() => {
		setHeaderHeight(headerHeight)
	}, [headerHeight, setHeaderHeight])

	const loadingAnim = useRef(new Animated.Value(0)).current
	const fadeAnim = useRef(new Animated.Value(0)).current

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

	// Resolve actual loading state from both props and navigation options
	const isCurrentlyLoading = isLoading || loading || options?.isLoading || options?.loading || options?.isRefreshing
	const resolvedSubtitle = subtitle ?? options?.subtitle

	// Setup top linear progress bar animation if loading
	useEffect(() => {
		if (disableAnimations) {
			loadingAnim.setValue(0)
			return
		}
		let animation: Animated.CompositeAnimation | null = null
		if (isCurrentlyLoading) {
			loadingAnim.setValue(0)
			animation = Animated.loop(
				Animated.timing(loadingAnim, {
					toValue: 1,
					duration: 1500,
					easing: Easing.linear,
					useNativeDriver: Platform.OS !== 'web'
				})
			)
			animation.start()
		} else {
			loadingAnim.setValue(0)
		}
		return () => {
			if (animation) {
				animation.stop()
			}
		}
	}, [isCurrentlyLoading, loadingAnim, disableAnimations])

	// Setup title fade-in transition when loading resolves
	useEffect(() => {
		if (disableAnimations) {
			fadeAnim.setValue(1)
			return
		}
		if (!isCurrentlyLoading) {
			Animated.timing(fadeAnim, {
				toValue: 1,
				duration: 250,
				useNativeDriver: Platform.OS !== 'web'
			}).start()
		} else {
			fadeAnim.setValue(0)
		}
	}, [isCurrentlyLoading, fadeAnim, disableAnimations])

	// Resolve title
	let resolvedTitle = title
	if (isCurrentlyLoading) {
		resolvedTitle = translate('loading', 'Loading...')
	} else if (resolvedTitle === undefined) {
		if (typeof options?.headerTitle === 'function') {
			resolvedTitle = options.headerTitle()
		} else if (options?.headerTitle !== undefined) {
			resolvedTitle = options.headerTitle
		} else if (options?.title !== undefined) {
			resolvedTitle = options.title
		} else if (route?.name !== undefined) {
			resolvedTitle = route.name
		}
	}

	// Resolve headerLeft (for backward compatibility)
	let resolvedHeaderLeft = headerLeft
	if (resolvedHeaderLeft === undefined) {
		if (typeof options?.headerLeft === 'function') {
			resolvedHeaderLeft = options.headerLeft()
		} else if (options?.headerLeft !== undefined) {
			resolvedHeaderLeft = options.headerLeft
		}
	}

	// Determine if we should show the back button
	const rootPaths = ['/', '/feed', '/dashboard', '/notifications', '/profile', '/settings', '/(home)/feed', '/(home)/dashboard', '/(home)/notifications', '/(home)/profile', '/(home)/settings']
	const isRootPath = rootPaths.includes(pathname)
	const resolvedShowBackButton = showBackButton ?? options?.showBackButton ?? !isRootPath

	// Register kebab menu items dynamically
	const screenKebabItems = SmartKebabMenuItems ?? options?.SmartKebabMenuItems ?? []
	useSmartKebabMenu(screenKebabItems)

	// Resolve headerRight (for backward compatibility)
	let resolvedHeaderRight = headerRight
	if (resolvedHeaderRight === undefined) {
		if (typeof options?.headerRight === 'function') {
			resolvedHeaderRight = options.headerRight()
		} else if (options?.headerRight !== undefined) {
			resolvedHeaderRight = options.headerRight
		}
	}

	// Resolve headerActions
	const resolvedActions: (HeaderActionType | React.ReactNode)[] = headerActions ?? options?.headerActions ?? []

	const resolveHeaderAction = (action: HeaderActionType | React.ReactNode, index: number) => {
		if (React.isValidElement(action)) {
			return React.cloneElement(action as React.ReactElement, { key: `custom-action-${index}` })
		}

		if (typeof action === 'string') {
			switch (action) {
				case 'search':
					return <HeaderSearchButton key="predefined-search" />
				case 'notifications':
					return <HeaderNotificationsButton key="predefined-notifications" />
				case 'cart':
					return <HeaderCartButton key="predefined-cart" />
				case 'settings':
					return <HeaderSettingsButton key="predefined-settings" />
				case 'refresh':
					return <HeaderRefreshButton key="predefined-refresh" onRefresh={options?.onRefresh} isRefreshing={options?.isRefreshing} />
				case 'scanner':
					if (Platform.OS === 'web') return null
					return (
						<HeaderActionButton
							key="predefined-scanner"
							iconName="qr-code-scanner"
							iconType="material"
							onPress={() => {
								if (typeof options?.onScannerPress === 'function') {
									options.onScannerPress()
								}
							}}
							accessibilityLabel="Scan QR Code"
							backgroundColor={colors.surface}
							size={40}
						/>
					)
				default:
					return null
			}
		}

		if (action && typeof action === 'object' && 'key' in action) {
			const config = action as any
			if (config.key === 'refresh') {
				return <HeaderRefreshButton key={config.key} onRefresh={config.onPress} isRefreshing={config.isRefreshing} />
			}
			return (
				<HeaderActionButton
					key={config.key}
					iconName={config.iconName}
					iconType={config.iconType || 'ionicons'}
					badgeCount={config.badgeCount}
					onPress={config.onPress}
					accessibilityLabel={config.accessibilityLabel}
					backgroundColor={config.backgroundColor || colors.surface}
					iconColor={config.iconColor}
					size={40}
				/>
			)
		}

		return null
	}

	const translateX = loadingAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [-width * 0.4, width]
	})

	const renderTitleSection = () => {
		if (React.isValidElement(resolvedTitle)) {
			return resolvedTitle
		}

		const titleLineHeight = Platform.OS === 'ios' ? 22 : 24

		return (
			<View style={styles.titleContainer}>
				{/* Title Wrapper */}
				<View style={{ height: titleLineHeight, justifyContent: 'center' }}>
					{isCurrentlyLoading ? (
						<SkeletonBlock width={120} height={16} borderRadius={4} disableAnimations={disableAnimations} />
					) : (
						<Animated.View style={[styles.titleRow, { opacity: disableAnimations ? 1 : fadeAnim }]}>
							<Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
								{resolvedTitle}
							</Text>
							{loading && <ActivityIndicator size="small" color={colors.primary} style={styles.titleSpinner} />}
						</Animated.View>
					)}
				</View>

				{/* Subtitle Wrapper */}
				{resolvedSubtitle ? (
					<View style={{ height: 16, marginTop: 2, justifyContent: 'center' }}>
						{isCurrentlyLoading ? (
							<SkeletonBlock width={80} height={10} borderRadius={3} disableAnimations={disableAnimations} />
						) : (
							<Animated.View style={{ opacity: disableAnimations ? 1 : fadeAnim }}>
								<Text style={[styles.subtitleText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
									{resolvedSubtitle}
								</Text>
							</Animated.View>
						)}
					</View>
				) : null}
			</View>
		)
	}

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
			key={`header-${headerHeight}`}
			style={[
				styles.headerContainer,
				{
					height: headerHeight,
					opacity: animatedOpacity,
					transform: [{ translateY: animatedTranslateY }],
					borderBottomWidth: StyleSheet.hairlineWidth,
					backgroundColor: colors.header,
					borderBottomColor: colors.borderLight,
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
						<View style={[styles.titleContainerWrapper, (resolvedHeaderLeft || resolvedShowBackButton) && { marginLeft: 12 }]}>{renderTitleSection()}</View>
					</View>

					{/* Right Section: Actions + Kebab menu (stable container width to guarantee zero layout shifts) */}
					<View style={styles.rightSection}>
						{resolvedHeaderRight}
						{resolvedActions.map((action, idx) => resolveHeaderAction(action, idx))}
						<SmartKebabMenu />
					</View>
				</View>

				{/* Custom Bottom Content (e.g. status filter bar in sales screen) */}
				{resolvedBottom && <View style={{ height: resolvedBottomHeight, width: '100%' }}>{resolvedBottom}</View>}

				{/* Linear Progress/Loading Bar */}
				{isCurrentlyLoading && !disableAnimations && (
					<View style={[styles.loadingBarContainer, { backgroundColor: colors.borderLight || '#1E293B' }]}>
						<Animated.View
							style={[
								styles.loadingBar,
								{
									backgroundColor: colors.primary,
									width: '40%',
									transform: [{ translateX }]
								}
							]}
						/>
					</View>
				)}
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

export const SmartFlatList = React.forwardRef<RNFlatList, FlatListProps<any>>(({ onScroll: customOnScroll, scrollEventThrottle = 16, contentContainerStyle, scrollIndicatorInsets, ...props }, ref) => {
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
		<RNFlatList
			ref={ref}
			onScroll={handleScroll}
			scrollEventThrottle={scrollEventThrottle}
			contentContainerStyle={mergedContentContainerStyle}
			scrollIndicatorInsets={mergedScrollIndicatorInsets}
			{...props}
		/>
	)
})
SmartFlatList.displayName = 'SmartHeader.FlatList'

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
MemoizedHeader.SettingsButton = HeaderSettingsButton
MemoizedHeader.ScrollView = SmartScrollView
MemoizedHeader.FlatList = SmartFlatList
MemoizedHeader.FlashList = SmartFlashList

export const SmartHeader = MemoizedHeader as React.NamedExoticComponent<SmartHeaderProps> & {
	BackButton: typeof HeaderBackButton
	ActionButton: typeof HeaderActionButton
	RefreshButton: typeof HeaderRefreshButton
	NotificationsButton: typeof HeaderNotificationsButton
	SearchButton: typeof HeaderSearchButton
	CartButton: typeof HeaderCartButton
	SettingsButton: typeof HeaderSettingsButton
	ScrollView: any
	FlatList: any
	FlashList: any
}

/** @deprecated Use SmartHeader instead */
export const SmartScreenHeader = SmartHeader
/** @deprecated Use SmartHeaderProps instead */
export type SmartScreenHeaderProps = SmartHeaderProps

const styles = StyleSheet.create({
	headerContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		width: '100%',
		borderBottomWidth: StyleSheet.hairlineWidth,
		zIndex: 100,
		...Platform.select({
			ios: {
				shadowColor: '#000000',
				shadowOffset: { width: 0, height: 1 },
				shadowOpacity: 0.15,
				shadowRadius: 2
			},
			android: {
				elevation: 2
			}
		})
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
	rightSection: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		width: 180, // stable container width to guarantee zero layout shifts
		flexShrink: 0,
		flexGrow: 0,
		zIndex: 2,
		minHeight: 38,
		gap: 8
	},
	backBtn: {
		width: 38,
		height: 38,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				cursor: 'pointer',
				transition: 'background-color 0.2s ease',
				outlineStyle: 'none'
			} as any
		})
	},
	titleContainerWrapper: {
		flex: 1
	},
	titleContainer: {
		flexDirection: 'column',
		justifyContent: 'center',
		alignItems: 'flex-start'
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	titleText: {
		fontSize: Platform.OS === 'ios' ? 17 : 18,
		fontWeight: Platform.OS === 'ios' ? '600' : '700',
		lineHeight: Platform.OS === 'ios' ? 22 : 24
	},
	titleSpinner: {
		marginLeft: 6
	},
	subtitleText: {
		fontSize: 12,
		marginTop: 2,
		lineHeight: 16
	},
	loadingBarContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: 2.5,
		overflow: 'hidden',
		zIndex: 10
	},
	loadingBar: {
		height: '100%'
	}
})
