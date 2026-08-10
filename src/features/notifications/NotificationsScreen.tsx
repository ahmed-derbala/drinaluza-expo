import { HeaderAllowPushButton, HeaderRefreshButton, SmartHeader } from '@/core/smart-header'
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, StyleSheet, RefreshControl, Platform, Linking } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, Stack, useNavigation, useFocusEffect } from 'expo-router'
import { useTheme } from '@/core/theme'
import { useNotification } from '@/features/notifications/NotificationContext'
import { useUser } from '@/core/contexts/UserContext'
import ErrorState from '@/features/common/ErrorState'
import EmptyState from '@/features/common/EmptyState'
import Spinner from '@/features/common/Spinner'
import { useNotifications } from './useNotifications'
import { getNotifications, markNotificationSeen } from './notifications.api'
import { NotificationItem } from './notifications.interface'
import { NotificationCard } from './components/NotificationCard'

import { useBackButton } from '@/core/hooks/useBackButton'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { log } from '@/core/log'

export default function NotificationsScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const navigation = useNavigation()
	useBackButton()
	const insets = useSafeAreaInsets()
	const { data: page1Response, isInitialLoading, isRefreshing, isOffline, refresh, updateCache } = useNotifications()
	const page1Notifications = page1Response?.data?.docs ?? []
	const [extraNotifications, setExtraNotifications] = useState<NotificationItem[]>([])
	const notifications = useMemo(() => [...page1Notifications, ...extraNotifications], [page1Notifications, extraNotifications])

	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null)
	const { translate } = useUser()
	const { onScroll } = useScrollHandler()

	// Reset appended pages whenever page 1 cache refreshes
	useEffect(() => {
		setExtraNotifications([])
		setPage(1)
		setHasMore(true)
	}, [page1Response])

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

	const requestNotificationPermission = useCallback(async () => {
		try {
			const Notifications = require('expo-notifications')
			const { status, granted, canAskAgain } = await Notifications.requestPermissionsAsync()

			setPermissionGranted(granted)

			if (Platform.OS === 'android' && !granted && !canAskAgain) {
				// User checked "Don't ask again" / permanently denied — open settings so they can enable it manually.
				Linking.openSettings()
			} else if (Platform.OS === 'android' && !granted) {
				log({ level: 'info', label: 'NotificationsScreen', message: `Notification permission request returned ${status}` })
			}
		} catch (err) {
			console.warn('[NotificationsScreen] Failed to request permissions:', err)
		}
	}, [])

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

	const renderItem = useCallback(({ item }: { item: NotificationItem }) => <NotificationCard item={item} onPress={handleNotificationPress} />, [handleNotificationPress])

	const headerActions = useMemo(() => {
		const actions: any[] = []
		if (permissionGranted === false) {
			actions.push(<HeaderAllowPushButton key="allow-push" onPress={requestNotificationPermission} label={translate('notifications_disabled_title', 'Notifications Disabled')} />)
		}
		actions.push(<HeaderRefreshButton key="refresh" onRefresh={onRefresh} isRefreshing={isRefreshing} />)
		return actions
	}, [permissionGranted, isRefreshing, translate, onRefresh, requestNotificationPermission])

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
				<Stack.Screen options={{ headerShown: false }} />
				<SmartHeader navigation={navigation} title={translate('notifications_title', 'Notifications')} back={navigation.canGoBack() ? { title: 'Back' } : undefined} />
				<ErrorState />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />
			<SmartHeader
				navigation={navigation}
				title={translate('notifications_title', 'Notifications')}
				subtitle={`${notifications.length}`}
				back={navigation.canGoBack() ? { title: 'Back' } : undefined}
				headerActions={headerActions}
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
	empty: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 80
	}
})
