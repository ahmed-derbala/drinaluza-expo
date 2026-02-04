import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '../../contexts/ThemeContext'
import { useNotification } from '../../contexts/NotificationContext'
import ScreenHeader from '../common/ScreenHeader'
import ErrorState from '../common/ErrorState'
import { getNotifications, markNotificationSeen } from './notifications.api'
import { NotificationItem } from './notifications.interface'
import { Ionicons } from '@expo/vector-icons'
import { useFocusEffect } from '@react-navigation/native'
import { parseError, logError } from '../../utils/errorHandler'
import { useUser } from '../../contexts/UserContext'

// Priority color mapping
const PRIORITY_COLORS = {
	high: { bg: '#FEE2E2', border: '#EF4444', text: '#DC2626', icon: 'alert-circle' },
	medium: { bg: '#FEF3C7', border: '#F59E0B', text: '#D97706', icon: 'warning' },
	low: { bg: '#DBEAFE', border: '#3B82F6', text: '#2563EB', icon: 'information-circle' }
} as const

export default function NotificationsScreen() {
	const { colors } = useTheme()
	// Determine if dark mode by checking background luminance
	const isDark = colors.background.toLowerCase() !== '#ffffff' && colors.background.toLowerCase() !== '#fff'
	const router = useRouter()
	const [notifications, setNotifications] = useState<NotificationItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const { translate, localize } = useUser()

	const loadNotifications = async (pageNum: number = 1, isRefresh: boolean = false) => {
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
	}

	useFocusEffect(
		useCallback(() => {
			loadNotifications(1, true)
		}, [])
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
				console.error('Failed to mark notification as seen:', error)
			}
		}
	}

	const getPriorityStyles = (priority?: 'low' | 'medium' | 'high') => {
		if (!priority) return null
		const config = PRIORITY_COLORS[priority]
		return {
			backgroundColor: isDark ? config.border + '20' : config.bg,
			borderColor: config.border,
			textColor: isDark ? config.border : config.text,
			iconName: config.icon as keyof typeof Ionicons.glyphMap
		}
	}

	const renderItem = ({ item }: { item: NotificationItem }) => {
		const isUnseen = !item.seenAt
		const priorityStyles = getPriorityStyles(item.priority)
		const isHighPriority = item.priority === 'high'

		return (
			<TouchableOpacity
				style={[
					styles.card,
					{
						backgroundColor: priorityStyles ? priorityStyles.backgroundColor : isUnseen ? colors.primary + '08' : colors.card,
						borderColor: priorityStyles ? priorityStyles.borderColor : isUnseen ? colors.primary : colors.border,
						borderLeftWidth: isUnseen || priorityStyles ? 4 : 1
					}
				]}
				activeOpacity={0.7}
				onPress={() => handleNotificationPress(item)}
			>
				{/* Priority Badge */}
				{item.priority && (
					<View style={[styles.priorityBadge, { backgroundColor: priorityStyles?.borderColor + '20' }]}>
						<Ionicons name={priorityStyles?.iconName || 'information-circle'} size={14} color={priorityStyles?.textColor} />
						<Text style={[styles.priorityText, { color: priorityStyles?.textColor }]}>{translate(`priority_${item.priority}`, item.priority.charAt(0).toUpperCase() + item.priority.slice(1))}</Text>
					</View>
				)}

				{/* Header */}
				<View style={styles.cardHeader}>
					<View style={styles.headerTitleContainer}>
						{isUnseen && !priorityStyles && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
						{isHighPriority && <Ionicons name="warning" size={18} color={priorityStyles?.textColor} style={styles.urgentIcon} />}
						<Text style={[styles.title, { color: priorityStyles?.textColor || colors.text, fontWeight: isUnseen ? '700' : '600' }]} numberOfLines={2}>
							{localize(item.title as any)}
						</Text>
					</View>
				</View>

				{/* Content */}
				<Text style={[styles.content, { color: isUnseen ? colors.text : colors.textSecondary, fontWeight: isUnseen ? '500' : '400' }]} numberOfLines={3}>
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
				<ScreenHeader title={translate('notifications_title', 'Notifications')} showBack={false} />
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
			<ScreenHeader
				title={translate('notifications_title', 'Notifications')}
				subtitle={`${notifications.length} ${notifications.length === 1 ? translate('notification', 'notification') : translate('notifications_plural', 'notifications')}`}
				showBack={false}
				onRefresh={onRefresh}
				isRefreshing={refreshing}
			/>

			<FlatList
				data={notifications}
				renderItem={renderItem}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.list}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onEndReached={loadMore}
				onEndReachedThreshold={0.2}
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
		paddingBottom: 32
	},
	card: {
		padding: 16,
		borderRadius: 16,
		marginBottom: 12,
		borderWidth: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.08,
		shadowRadius: 8,
		elevation: 3
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
