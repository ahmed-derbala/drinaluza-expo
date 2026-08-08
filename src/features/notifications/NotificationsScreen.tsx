import { HeaderRefreshButton, SmartHeader } from '@/core/smart-header'
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, useWindowDimensions, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, Tabs, useFocusEffect } from 'expo-router'
import { useTheme, createShadow, colors as themeColors } from '@/core/theme'
import { useNotification } from '@/features/notifications/NotificationContext'
import { useUser } from '@/core/contexts/UserContext'
import { FlashList } from '@shopify/flash-list'
import ErrorState from '@/features/common/ErrorState'
import EmptyState from '@/features/common/EmptyState'
import Spinner from '@/features/common/Spinner'
import { useNotifications } from './useNotifications'
import { getNotifications, markNotificationSeen } from './notifications.api'
import { NotificationItem } from './notifications.interface'
import { Ionicons } from '@expo/vector-icons'

import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { log } from '@/core/log'

// Priority color mapping
const PRIORITY_COLORS = {
	high: { bg: themeColors.error, border: themeColors.error, text: themeColors.text, icon: 'alert-circle' },
	medium: { bg: themeColors.warning, border: themeColors.warning, text: themeColors.text, icon: 'warning' },
	low: { bg: themeColors.info, border: themeColors.info, text: themeColors.text, icon: 'information-circle' }
} as const

const getPriorityStyles = (priority?: 'low' | 'medium' | 'high') => {
	if (!priority) return null
	const config = PRIORITY_COLORS[priority]
	return {
		backgroundColor: config.border + '20',
		borderColor: config.border,
		textColor: config.border,
		iconName: config.icon as keyof typeof Ionicons.glyphMap
	}
}

export default function NotificationsScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const { height: windowHeight } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const { data: page1Response, isInitialLoading, isRefreshing, isOffline, refresh, updateCache } = useNotifications()
	const page1Notifications = page1Response?.data?.docs ?? []
	const [extraNotifications, setExtraNotifications] = useState<NotificationItem[]>([])
	const notifications = useMemo(() => [...page1Notifications, ...extraNotifications], [page1Notifications, extraNotifications])

	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
	const { translate, localize } = useUser()
	const { onScroll } = useScrollHandler()

	// Reset appended pages whenever page 1 cache refreshes
	useEffect(() => {
		setExtraNotifications([])
		setPage(1)
		setHasMore(true)
	}, [page1Response])

	const checkPermissions = useCallback(async () => {
		if (Platform.OS === 'web') return

		const Constants = require('expo-constants').default
		if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
			return
		}

		try {
			const Notifications = require('expo-notifications')
			const { status } = await Notifications.getPermissionsAsync()
			setPermissionGranted(status === 'granted')
		} catch (err) {
			console.warn('[NotificationsScreen] Failed to check permissions:', err)
		}
	}, [])

	const requestNotificationPermission = useCallback(async () => {
		const Constants = require('expo-constants').default
		if (Platform.OS === 'android' && Constants.appOwnership === 'expo') {
			const { Alert } = require('react-native')
			Alert.alert(
				translate('expo_go_push_unsupported_title', 'Expo Go Limitation'),
				translate('expo_go_push_unsupported_desc', 'Remote push notifications are not supported in Expo Go on Android. Please use a standalone build to test push features.')
			)
			return
		}

		try {
			const Notifications = require('expo-notifications')
			const { status } = await Notifications.requestPermissionsAsync()
			setPermissionGranted(status === 'granted')
		} catch (err) {
			console.warn('[NotificationsScreen] Failed to request permissions:', err)
		}
	}, [translate])

	const loadMoreNotifications = useCallback(async (nextPage: number) => {
		try {
			const response = await getNotifications(nextPage, 10)
			const newItems = response.data.docs || []

			setExtraNotifications((prev) => [...prev, ...newItems])
			setHasMore(response.data.pagination.hasNextPage)
			setPage(nextPage)
		} catch (err: any) {
			log({ level: 'error', label: 'NotificationsScreen', message: 'Failed to load more notifications', error: err })
		}
	}, [])

	const onRefresh = useCallback(() => {
		refresh()
	}, [refresh])

	const loadMore = useCallback(() => {
		if (hasMore && !isInitialLoading && !isRefreshing) {
			loadMoreNotifications(page + 1)
		}
	}, [hasMore, isInitialLoading, isRefreshing, loadMoreNotifications, page])

	const lastFocusRefreshRef = useRef<number>(0)

	useFocusEffect(
		useCallback(() => {
			const now = Date.now()
			if (now - lastFocusRefreshRef.current > 2000) {
				lastFocusRefreshRef.current = now
				refresh()
			}
			checkPermissions()
		}, [refresh, checkPermissions])
	)

	const formatDate = useCallback(
		(dateString: string) => {
			const date = new Date(dateString)
			const now = new Date()
			const diffTime = Math.abs(now.getTime() - date.getTime())
			const diffMinutes = Math.floor(diffTime / (1000 * 60))
			const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
			const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

			if (diffMinutes < 60) return `${diffMinutes}m ${translate('ago', 'ago')}`
			if (diffHours < 24) return `${diffHours}h ${translate('ago', 'ago')}`
			if (diffDays < 7) return `${diffDays}d ${translate('ago', 'ago')}`
			return date.toLocaleDateString()
		},
		[translate]
	)

	const { decrementNotificationCount } = useNotification()

	const handleNotificationPress = useCallback(
		async (item: NotificationItem) => {
			if (!item.seenAt) {
				try {
					// Optimistically update cache
					const now = new Date().toISOString()
					const update = (n: NotificationItem) => (n._id === item._id ? { ...n, seenAt: now } : n)
					if (page1Response) {
						updateCache({ ...page1Response, data: { ...page1Response.data, docs: page1Notifications.map(update) } })
					} else {
						setExtraNotifications((prev) => prev.map(update))
					}
					decrementNotificationCount()

					await markNotificationSeen(item._id)
				} catch (error) {
					log({ level: 'error', label: 'NotificationsScreen', message: 'Failed to mark notification as seen', error })
				}
			}

			if (item.screen) {
				router.push(item.screen as any)
			}
		},
		[page1Response, page1Notifications, updateCache, setExtraNotifications, decrementNotificationCount, router]
	)

	const renderItem = useCallback(
		({ item }: { item: NotificationItem }) => {
			const isUnseen = !item.seenAt
			const priorityStyles = getPriorityStyles(item.priority)
			const isHighPriority = item.priority === 'high'

			const isCompact = windowHeight < 550
			const maxCardHeight = Math.max(100, windowHeight - 140)

			return (
				<TouchableOpacity
					style={[
						styles.card,
						{
							backgroundColor: priorityStyles ? priorityStyles.backgroundColor : isUnseen ? colors.primary + '08' : colors.background,
							borderColor: priorityStyles ? priorityStyles.borderColor : isUnseen ? colors.primary : colors.info,
							borderLeftWidth: isUnseen || priorityStyles ? 4 : 1,
							maxHeight: maxCardHeight,
							padding: isCompact ? 10 : 16,
							marginBottom: isCompact ? 8 : 12
						}
					]}
					activeOpacity={0.7}
					onPress={() => handleNotificationPress(item)}
				>
					{/* Priority Badge */}
					{item.priority && windowHeight >= 520 && (
						<View style={[styles.priorityBadge, { backgroundColor: priorityStyles?.borderColor + '20' }]}>
							<Ionicons name={priorityStyles?.iconName || 'information-circle'} size={14} color={priorityStyles?.textColor} />
							<Text style={[styles.priorityText, { color: priorityStyles?.textColor }]}>{translate(`priority_${item.priority}`, item.priority.charAt(0).toUpperCase() + item.priority.slice(1))}</Text>
						</View>
					)}

					{/* Header */}
					<View style={[styles.cardHeader, { marginBottom: isCompact ? 4 : 8 }]}>
						<View style={styles.headerTitleContainer}>
							{isUnseen && !priorityStyles && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
							{isHighPriority && <Ionicons name="warning" size={18} color={priorityStyles?.textColor} style={styles.urgentIcon} />}
							<Text
								style={[styles.title, { color: priorityStyles?.textColor || colors.text, fontWeight: isUnseen ? '700' : '600', fontSize: isCompact ? 14 : 16, lineHeight: isCompact ? 18 : 22 }]}
								numberOfLines={windowHeight < 500 ? 1 : 2}
							>
								{localize(item.title as any)}
							</Text>
						</View>
					</View>

					{/* Content */}
					<Text
						style={[
							styles.content,
							{
								color: isUnseen ? colors.text : colors.textSecondary,
								fontWeight: isUnseen ? '500' : '400',
								fontSize: isCompact ? 12 : 14,
								lineHeight: isCompact ? 17 : 21,
								marginBottom: isCompact ? 6 : 12
							}
						]}
						numberOfLines={windowHeight < 500 ? 1 : windowHeight < 650 ? 2 : 3}
					>
						{localize(item.content as any)}
					</Text>

					{/* Footer */}
					<View style={styles.cardFooter}>
						<View style={styles.timeContainer}>
							<Ionicons name="time-outline" size={14} color={priorityStyles?.textColor || colors.textTertiary} />
							<Text style={[styles.date, { color: priorityStyles?.textColor || colors.textSecondary }]}>{formatDate(item.createdAt)}</Text>
						</View>
						<TouchableOpacity
							style={[styles.seenButton, { backgroundColor: isUnseen ? colors.primary + '15' : colors.success + '15' }]}
							onPress={(e) => {
								e.stopPropagation()
								handleNotificationPress(item)
							}}
							hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
						>
							<Ionicons name={isUnseen ? 'eye-off-outline' : 'checkmark-circle'} size={18} color={isUnseen ? colors.primary : colors.success} />
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			)
		},
		[colors, windowHeight, handleNotificationPress, translate, localize, formatDate]
	)

	const headerActions = useMemo(() => {
		const actions: any[] = []
		if (permissionGranted === false) {
			actions.push({
				key: 'allow-push',
				iconName: 'notifications-outline',
				onPress: requestNotificationPermission,
				accessibilityLabel: translate('notifications_disabled_title', 'Notifications Disabled'),
				iconColor: colors.warning,
				backgroundColor: colors.warning + '1A'
			})
		}
		actions.push({
			key: 'refresh',
			onPress: onRefresh,
			isRefreshing: isRefreshing,
			accessibilityLabel: 'Refresh'
		})
		return actions
	}, [permissionGranted, isRefreshing, colors.warning, translate, onRefresh, requestNotificationPermission])

	const renderEmpty = useCallback(() => {
		if (isInitialLoading) return null
		return <EmptyState style={styles.empty} />
	}, [isInitialLoading])

	const renderFooter = useCallback(() => {
		if (!isInitialLoading || notifications.length === 0) return null
		return <Spinner size="small" expand={false} />
	}, [isInitialLoading, notifications.length])

	if (isOffline && notifications.length === 0) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Tabs.Screen options={{ title: translate('notifications_title', 'Notifications'), headerLeft: () => null }} />
				<ErrorState />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Tabs.Screen
				options={
					{
						title: translate('notifications_title', 'Notifications'),
						subtitle: `${notifications.length} ${notifications.length === 1 ? translate('notification', 'notification') : translate('notifications_plural', 'notifications')}`,
						headerLeft: () => null,
						headerActions: headerActions
					} as any
				}
			/>

			<SmartHeader.FlashList
				data={notifications}
				renderItem={renderItem}
				keyExtractor={(item: NotificationItem) => item._id}
				estimatedItemSize={96}
				contentContainerStyle={[styles.list, { paddingBottom: 90 + insets.bottom }]}
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
				onEndReached={loadMore}
				onEndReachedThreshold={0.2}
				ListEmptyComponent={renderEmpty}
				ListFooterComponent={renderFooter}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	list: {
		padding: 16,
		paddingBottom: 90
	},
	card: {
		padding: 16,
		borderRadius: 16,
		marginBottom: 12,
		borderWidth: 1,
		...createShadow({ offsetY: 4, opacity: 0.08, radius: 8, elevation: 3 })
	},
	priorityBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		marginBottom: 10,
		gap: 4
	},
	priorityText: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		marginBottom: 8
	},
	headerTitleContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 8
	},
	dot: {
		width: 8,
		height: 8,
		borderRadius: 4
	},
	urgentIcon: {
		marginRight: 4
	},
	title: {
		fontSize: 16,
		flex: 1,
		lineHeight: 22
	},
	content: {
		fontSize: 14,
		lineHeight: 21,
		marginBottom: 12
	},
	cardFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 4
	},
	timeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4
	},
	date: {
		fontSize: 12
	},
	seenButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center'
	},
	empty: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 80
	},
	loadingFooter: {
		padding: 24,
		alignItems: 'center'
	}
})
