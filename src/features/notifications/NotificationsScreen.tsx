import { HeaderRefreshButton, SmartHeader } from '@/core/smart-header'
import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator, useWindowDimensions, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, Tabs, useFocusEffect } from 'expo-router'
import { useTheme, createShadow } from '@/core/theme'
import { useNotification } from '@/features/notifications/NotificationContext'
import { useUser } from '@/core/contexts/UserContext'
import { FlashList } from '@shopify/flash-list'
import ErrorState from '../common/ErrorState'
import { getNotifications, markNotificationSeen } from './notifications.api'
import { NotificationItem } from './notifications.interface'
import { Ionicons } from '@expo/vector-icons'

import { parseError, logError } from '../../core/helpers/errorHandler'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { log } from '@/core/log'

// Priority color mapping
const PRIORITY_COLORS = {
	high: { bg: '#FEE2E2', border: '#EF4444', text: '#DC2626', icon: 'alert-circle' },
	medium: { bg: '#FEF3C7', border: '#F59E0B', text: '#D97706', icon: 'warning' },
	low: { bg: '#DBEAFE', border: '#3B82F6', text: '#2563EB', icon: 'information-circle' }
} as const

export default function NotificationsScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const { height: windowHeight } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const [notifications, setNotifications] = useState<NotificationItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
	const { translate, localize } = useUser()
	const { onScroll } = useScrollHandler()

	const checkPermissions = useCallback(async () => {
		if (Platform.OS === 'web') return
		try {
			const Notifications = require('expo-notifications')
			const { status } = await Notifications.getPermissionsAsync()
			setPermissionGranted(status === 'granted')
		} catch (err) {
			console.warn('[NotificationsScreen] Failed to check permissions:', err)
		}
	}, [])

	const requestNotificationPermission = async () => {
		try {
			const Notifications = require('expo-notifications')
			const { status } = await Notifications.requestPermissionsAsync()
			setPermissionGranted(status === 'granted')
		} catch (err) {
			console.warn('[NotificationsScreen] Failed to request permissions:', err)
		}
	}

	const loadNotifications = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
		try {
			if (pageNum === 1 && !isRefresh) setLoading(true)
			setError(null)

			const response = await getNotifications(pageNum, 10)
			const newItems = response.data.docs || []

			if (isRefresh || pageNum === 1) {
				setNotifications(newItems)
			} else {
				setNotifications((prev) => [...prev, ...newItems])
			}

			setHasMore(response.data.pagination.hasNextPage)
			setPage(pageNum)
		} catch (err: any) {
			logError(err, 'loadNotifications')
			const errorInfo = parseError(err)
			setError({
				title: errorInfo.title,
				message: errorInfo.message,
				type: errorInfo.type
			})
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [])

	useFocusEffect(
		useCallback(() => {
			loadNotifications(1, true)
			checkPermissions()
		}, [loadNotifications, checkPermissions])
	)

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		loadNotifications(1, true)
	}, [])

	const loadMore = () => {
		if (hasMore && !loading && !refreshing) {
			loadNotifications(page + 1)
		}
	}

	const formatDate = (dateString: string) => {
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
	}

	const { decrementNotificationCount } = useNotification()

	const handleNotificationPress = async (item: NotificationItem) => {
		if (!item.seenAt) {
			try {
				// Optimistically update UI
				const now = new Date().toISOString()
				setNotifications((prev) => prev.map((n) => (n._id === item._id ? { ...n, seenAt: now } : n)))
				decrementNotificationCount()

				await markNotificationSeen(item._id)
			} catch (error) {
				log({ level: 'error', label: 'NotificationsScreen', message: 'Failed to mark notification as seen', error })
			}
		}
	}

	const getPriorityStyles = (priority?: 'low' | 'medium' | 'high') => {
		if (!priority) return null
		const config = PRIORITY_COLORS[priority]
		// Always use dark theme styles
		return {
			backgroundColor: config.border + '20',
			borderColor: config.border,
			textColor: config.border,
			iconName: config.icon as keyof typeof Ionicons.glyphMap
		}
	}

	const renderItem = ({ item }: { item: NotificationItem }) => {
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
						backgroundColor: priorityStyles ? priorityStyles.backgroundColor : isUnseen ? colors.primary + '08' : colors.card,
						borderColor: priorityStyles ? priorityStyles.borderColor : isUnseen ? colors.primary : colors.info || '#3B82F6',
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
	}

	if (error && notifications.length === 0) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Tabs.Screen options={{ title: translate('notifications_title', 'Notifications'), headerLeft: () => null }} />
				<ErrorState
					title={error.title}
					message={error.message}
					onRetry={() => loadNotifications(1, true)}
					icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
				/>
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
						headerActions: [
							{
								key: 'refresh',
								onPress: onRefresh,
								isRefreshing: refreshing,
								accessibilityLabel: 'Refresh'
							}
						]
					} as any
				}
			/>

			<SmartHeader.FlashList
				data={notifications}
				renderItem={renderItem}
				keyExtractor={(item: NotificationItem) => item._id}
				contentContainerStyle={[styles.list, { paddingBottom: 90 + insets.bottom }]}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
				onEndReached={loadMore}
				onEndReachedThreshold={0.2}
				ListHeaderComponent={
					permissionGranted === false ? (
						<TouchableOpacity
							activeOpacity={0.8}
							onPress={requestNotificationPermission}
							style={[
								{
									backgroundColor: colors.warning + '1A',
									borderColor: colors.warning,
									borderWidth: 1,
									borderRadius: 16,
									padding: 14,
									marginBottom: 16,
									flexDirection: 'row',
									alignItems: 'center',
									gap: 12
								}
							]}
						>
							<Ionicons name="notifications-off" size={22} color={colors.warning} />
							<View style={{ flex: 1 }}>
								<Text style={{ color: colors.text, fontWeight: '700', fontSize: 14, marginBottom: 2 }}>{translate('notifications_disabled_title', 'Notifications Disabled')}</Text>
								<Text style={{ color: colors.textSecondary, fontSize: 12 }}>{translate('notifications_disabled_desc', 'Tap here to allow notifications and get real-time updates.')}</Text>
							</View>
							<Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
						</TouchableOpacity>
					) : null
				}
				ListEmptyComponent={
					!loading ? (
						<View style={styles.emptyContainer}>
							<View style={[styles.emptyIconContainer, { backgroundColor: colors.card }]}>
								<Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
							</View>
							<Text style={[styles.emptyTitle, { color: colors.text }]}>{translate('no_notifications', 'No notifications')}</Text>
							<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{translate('no_notifications_desc', "You're all caught up!")}</Text>
						</View>
					) : null
				}
				ListFooterComponent={
					loading && notifications.length > 0 ? (
						<View style={styles.loadingFooter}>
							<ActivityIndicator size="small" color={colors.primary} />
						</View>
					) : null
				}
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
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 80,
		gap: 12
	},
	emptyIconContainer: {
		width: 96,
		height: 96,
		borderRadius: 48,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 8
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600'
	},
	emptySubtitle: {
		fontSize: 14
	},
	loadingFooter: {
		padding: 24,
		alignItems: 'center'
	}
})
