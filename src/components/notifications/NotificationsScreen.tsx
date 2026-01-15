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

export default function NotificationsScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const [notifications, setNotifications] = useState<NotificationItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const { translate } = useUser()

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
				// Revert on error if needed, but for 'read' status it's usually fine to just log
			}
		}
	}

	const renderItem = ({ item }: { item: NotificationItem }) => {
		const isUnseen = !item.seenAt
		return (
			<TouchableOpacity
				style={[
					styles.card,
					{
						backgroundColor: isUnseen ? colors.primary + '08' : colors.card,
						borderColor: isUnseen ? colors.primary : colors.border,
						borderLeftWidth: isUnseen ? 4 : 1
					}
				]}
				activeOpacity={0.7}
				onPress={() => handleNotificationPress(item)}
			>
				<View style={styles.cardHeader}>
					<View style={styles.headerTitleContainer}>
						{isUnseen && <View style={[styles.dot, { backgroundColor: colors.primary }]} />}
						<Text style={[styles.title, { color: colors.text, fontWeight: isUnseen ? '800' : '600' }]}>{item.title}</Text>
					</View>
					<Text style={[styles.date, { color: isUnseen ? colors.primary : colors.textSecondary, fontWeight: isUnseen ? '600' : '400' }]}>{formatDate(item.createdAt)}</Text>
				</View>
				<Text style={[styles.content, { color: isUnseen ? colors.text : colors.textSecondary, fontWeight: isUnseen ? '500' : '400' }]} numberOfLines={3}>
					{item.content}
				</Text>
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
				rightActions={
					<TouchableOpacity onPress={onRefresh} disabled={refreshing}>
						<Ionicons name={refreshing ? 'hourglass-outline' : 'refresh-outline'} size={24} color={colors.text} />
					</TouchableOpacity>
				}
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
							<Ionicons name="notifications-off-outline" size={48} color={colors.textTertiary} />
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('no_notifications', 'No notifications')}</Text>
						</View>
					) : null
				}
				ListFooterComponent={
					loading && notifications.length > 0 ? (
						<View style={{ padding: 20 }}>
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
		padding: 16
	},
	card: {
		padding: 16,
		borderRadius: 12,
		marginBottom: 12,
		borderWidth: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2
	},
	cardHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
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
	title: {
		fontSize: 16,
		flex: 1
	},
	date: {
		fontSize: 12,
		marginLeft: 8
	},
	content: {
		fontSize: 14,
		lineHeight: 20
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 60,
		gap: 16
	},
	emptyText: {
		fontSize: 16,
		fontWeight: '500'
	}
})
