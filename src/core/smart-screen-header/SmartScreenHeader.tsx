import React, { useEffect, useRef, useMemo } from 'react'
import { StyleSheet, View, Text, Platform, Animated, Easing, useWindowDimensions, ActivityIndicator, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, Href, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { SmartKebabMenu, useSmartKebabMenu } from '@/core/smart-kebab-menu'
import { SmartKebabMenuItem } from '@/core/smart-kebab-menu/types'
import { useNotification } from '@/features/notifications/NotificationContext'
import HeaderActionButton from '@/features/common/HeaderActionButton'
import HeaderRefreshButton from '@/features/common/HeaderRefreshButton'

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
					useNativeDriver: true
				}),
				Animated.timing(opacity, {
					toValue: 0.3,
					duration: 650,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true
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

export interface SmartScreenHeaderProps {
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
const SmartScreenHeaderComponent: React.FC<SmartScreenHeaderProps> = ({
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
	disableAnimations = false
}) => {
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()
	const pathname = usePathname()

	const loadingAnim = useRef(new Animated.Value(0)).current
	const fadeAnim = useRef(new Animated.Value(0)).current

	// Resolve actual loading state from both props
	const isCurrentlyLoading = isLoading || loading

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
					useNativeDriver: true
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
				useNativeDriver: true
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
					backgroundColor={colors.surface}
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
		if (isCurrentlyLoading) {
			const titleLineHeight = Platform.OS === 'ios' ? 22 : 24
			return (
				<View style={styles.titleContainer}>
					<View style={{ height: titleLineHeight, justifyContent: 'center' }}>
						<SkeletonBlock width={120} height={16} borderRadius={4} disableAnimations={disableAnimations} />
					</View>
					{subtitle ? (
						<View style={{ height: 16, marginTop: 2, justifyContent: 'center' }}>
							<SkeletonBlock width={80} height={10} borderRadius={3} disableAnimations={disableAnimations} />
						</View>
					) : null}
				</View>
			)
		}

		if (React.isValidElement(resolvedTitle)) {
			return resolvedTitle
		}

		return (
			<Animated.View style={[styles.titleContainer, { opacity: disableAnimations ? 1 : fadeAnim }]}>
				<View style={styles.titleRow}>
					<Text style={[styles.titleText, { color: colors.text }]} numberOfLines={1} ellipsizeMode="tail">
						{resolvedTitle}
					</Text>
					{loading && <ActivityIndicator size="small" color={colors.primary} style={styles.titleSpinner} />}
				</View>
				{subtitle ? (
					<Text style={[styles.subtitleText, { color: colors.textSecondary }]} numberOfLines={1} ellipsizeMode="tail">
						{subtitle}
					</Text>
				) : null}
			</Animated.View>
		)
	}

	return (
		<View
			style={[
				styles.headerContainer,
				{
					paddingTop: insets.top,
					backgroundColor: colors.card,
					borderBottomColor: colors.borderLight
				}
			]}
		>
			<View style={styles.headerInner}>
				{/* Left Section: Back button + Title & Subtitle */}
				<View style={styles.leftSection}>
					{resolvedHeaderLeft ? resolvedHeaderLeft : resolvedShowBackButton && <HeaderBackButton onPress={onBackPress} fallbackRoute={fallbackRoute || '/feed'} />}
					<View style={[styles.titleContainerWrapper, (resolvedHeaderLeft || resolvedShowBackButton) && { marginLeft: 12 }]}>{renderTitleSection()}</View>
				</View>

				{/* Right Section: Actions + Kebab menu (stable container width to guarantee zero layout shifts) */}
				<View style={styles.rightSection}>
					{resolvedHeaderRight}
					{resolvedActions.map((action, idx) => resolveHeaderAction(action, idx))}
					<SmartKebabMenu />
				</View>
			</View>

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
	)
}

SmartScreenHeaderComponent.displayName = 'SmartScreenHeader'

const MemoizedHeader = React.memo(SmartScreenHeaderComponent) as any

MemoizedHeader.BackButton = HeaderBackButton
MemoizedHeader.ActionButton = HeaderActionButton
MemoizedHeader.RefreshButton = HeaderRefreshButton
MemoizedHeader.NotificationsButton = HeaderNotificationsButton
MemoizedHeader.SearchButton = HeaderSearchButton
MemoizedHeader.CartButton = HeaderCartButton
MemoizedHeader.SettingsButton = HeaderSettingsButton

export const SmartScreenHeader = MemoizedHeader as React.NamedExoticComponent<SmartScreenHeaderProps> & {
	BackButton: typeof HeaderBackButton
	ActionButton: typeof HeaderActionButton
	RefreshButton: typeof HeaderRefreshButton
	NotificationsButton: typeof HeaderNotificationsButton
	SearchButton: typeof HeaderSearchButton
	CartButton: typeof HeaderCartButton
	SettingsButton: typeof HeaderSettingsButton
}

const styles = StyleSheet.create({
	headerContainer: {
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
			},
			web: {
				position: 'sticky',
				top: 0
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
		minWidth: 140, // stable container minimum width to prevent title truncation jumping
		flexShrink: 0,
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
