import React, { useEffect, useRef } from 'react'
import { StyleSheet, View, Text, Platform, Animated, Easing, useWindowDimensions, ActivityIndicator, Pressable } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { SmartKebabMenu } from '@/core/smart-kebab-menu'
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
	fallbackRoute?: string
}

export const HeaderBackButton: React.FC<HeaderBackButtonProps> = React.memo(({ onPress, fallbackRoute = '/(home)/feed' }) => {
	const { colors } = useTheme()
	const router = useRouter()

	const handlePress = () => {
		if (onPress) {
			onPress()
		} else if (router.canGoBack()) {
			router.back()
		} else {
			router.replace(fallbackRoute as any)
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
// 2. HeaderNotificationsButton Component
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

// ----------------------------------------
// 3. HeaderSearchButton Component
// ----------------------------------------
export const HeaderSearchButton: React.FC = React.memo(() => {
	const router = useRouter()
	const { colors } = useTheme()

	return <HeaderActionButton iconName="search-outline" onPress={() => router.push('/search')} accessibilityLabel={translate('search', 'Search')} backgroundColor={colors.surface} size={40} />
})

HeaderSearchButton.displayName = 'HeaderSearchButton'

// ----------------------------------------
// 4. HeaderCartButton Component
// ----------------------------------------
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

// ----------------------------------------
// 5. HeaderSettingsButton Component
// ----------------------------------------
export const HeaderSettingsButton: React.FC = React.memo(() => {
	const router = useRouter()
	const { colors } = useTheme()

	return <HeaderActionButton iconName="settings-outline" onPress={() => router.push('/settings')} accessibilityLabel={translate('settings', 'Settings')} backgroundColor={colors.surface} size={40} />
})

HeaderSettingsButton.displayName = 'HeaderSettingsButton'

// ----------------------------------------
// Main SmartScreenHeader Component Props
// ----------------------------------------
export interface SmartScreenHeaderProps {
	/**
	 * Main title. Can be a string or a custom ReactNode.
	 */
	title?: React.ReactNode
	/**
	 * Optional subtitle. Only rendered if title is a string.
	 */
	subtitle?: string
	/**
	 * Custom left actions. Pass `null` or `false` to hide the back button.
	 */
	headerLeft?: React.ReactNode
	/**
	 * Custom right actions. Rendered to the left of the SmartKebabMenu.
	 */
	headerRight?: React.ReactNode
	/**
	 * Callback for default back button press.
	 */
	onBackPress?: () => void
	/**
	 * Whether the screen is loading. Triggers a linear progress indicator at the bottom.
	 */
	loading?: boolean
	/**
	 * Navigation fallback path if there's no router history. Defaults to `/(home)/feed`.
	 */
	fallbackRoute?: string
	/**
	 * Left offset for center title (to avoid overlapping). Defaults to 60.
	 */
	centerLeftOffset?: number
	/**
	 * Right offset for center title (to avoid overlapping). Defaults to 60 (or 110 if headerRight is present).
	 */
	centerRightOffset?: number

	// React Navigation header props support
	options?: any
	route?: any
	navigation?: any
	back?: any
}

// ----------------------------------------
// SmartScreenHeader Component Implementation
// ----------------------------------------
const SmartScreenHeaderComponent: React.FC<SmartScreenHeaderProps> = ({
	title,
	subtitle,
	headerLeft,
	headerRight,
	onBackPress,
	loading = false,
	fallbackRoute,
	centerLeftOffset,
	centerRightOffset,
	options,
	route,
	navigation,
	back
}) => {
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()

	const loadingAnim = useRef(new Animated.Value(0)).current

	useEffect(() => {
		let animation: Animated.CompositeAnimation | null = null
		if (loading) {
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
	}, [loading, loadingAnim])

	// Resolve title
	let resolvedTitle = title
	if (resolvedTitle === undefined) {
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

	// Resolve headerLeft
	let resolvedHeaderLeft = headerLeft
	if (resolvedHeaderLeft === undefined) {
		if (options !== undefined || back !== undefined) {
			// Rendered via React Navigation layout
			if (typeof options?.headerLeft === 'function') {
				resolvedHeaderLeft = options.headerLeft()
			} else if (options?.headerLeft !== undefined) {
				resolvedHeaderLeft = options.headerLeft
			} else if (back) {
				resolvedHeaderLeft = <HeaderBackButton onPress={onBackPress} fallbackRoute={fallbackRoute} />
			} else {
				resolvedHeaderLeft = null
			}
		} else {
			// Standalone manual rendering: default to rendering back button
			resolvedHeaderLeft = <HeaderBackButton onPress={onBackPress} fallbackRoute={fallbackRoute} />
		}
	}

	// Resolve headerRight
	let resolvedHeaderRight = headerRight
	if (resolvedHeaderRight === undefined) {
		if (typeof options?.headerRight === 'function') {
			resolvedHeaderRight = options.headerRight()
		} else if (options?.headerRight !== undefined) {
			resolvedHeaderRight = options.headerRight
		}
	}

	// Sane defaults to prevent layout shifts
	const leftOffset = centerLeftOffset ?? 60
	const rightOffset = centerRightOffset ?? (resolvedHeaderRight ? 110 : 60)

	const translateX = loadingAnim.interpolate({
		inputRange: [0, 1],
		outputRange: [-width * 0.4, width]
	})

	const renderLeftSection = () => {
		if (resolvedHeaderLeft === null || resolvedHeaderLeft === false) {
			return null
		}
		return resolvedHeaderLeft
	}

	const renderTitleSection = () => {
		if (!resolvedTitle) return null

		if (React.isValidElement(resolvedTitle)) {
			return resolvedTitle
		}

		return (
			<View style={styles.titleContainer}>
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
			</View>
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
				{/* Left Section */}
				<View style={styles.leftSection}>{renderLeftSection()}</View>

				{/* Center Section (Absolutely Centered to avoid layout shifts) */}
				<View
					style={[
						styles.centerSection,
						{
							left: leftOffset,
							right: rightOffset
						}
					]}
				>
					{renderTitleSection()}
				</View>

				{/* Right Section */}
				<View style={styles.rightSection}>
					{resolvedHeaderRight}
					<SmartKebabMenu />
				</View>
			</View>

			{/* Linear Progress/Loading Bar */}
			{loading && (
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
		zIndex: 2,
		minHeight: 38
	},
	rightSection: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		zIndex: 2,
		minHeight: 38,
		gap: 8
	},
	centerSection: {
		position: 'absolute',
		top: 0,
		bottom: 0,
		justifyContent: 'center',
		alignItems: Platform.OS === 'ios' ? 'center' : 'flex-start',
		zIndex: 1
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
	titleContainer: {
		justifyContent: 'center',
		alignItems: Platform.OS === 'ios' ? 'center' : 'flex-start'
	},
	titleRow: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	titleText: {
		fontSize: Platform.OS === 'ios' ? 17 : 18,
		fontWeight: Platform.OS === 'ios' ? '600' : '700'
	},
	titleSpinner: {
		marginLeft: 6
	},
	subtitleText: {
		fontSize: 12,
		marginTop: 1
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
