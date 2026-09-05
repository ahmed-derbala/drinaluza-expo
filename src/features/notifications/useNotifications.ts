import { useCallback } from 'react'
import { useCacheFirst } from '@cache/useCacheFirst'
import { getNotifications, NotificationFilter } from './notifications.api'
import { NotificationResponse } from './notifications.interface'

export interface UseNotificationsOptions {
	ttlMs?: number
	skipInitialFetch?: boolean
	filter?: NotificationFilter
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
	const { ttlMs, skipInitialFetch, filter = 'all' } = options
	const cacheKey = `notifications:${filter}:page1`

	const fetchFn = useCallback(async () => {
		return await getNotifications(1, 10, filter)
	}, [filter])

	return useCacheFirst<NotificationResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch
	})
}

export default useNotifications
