import { useCallback } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getNotifications } from './notifications.api'
import { NotificationResponse } from './notifications.interface'

export interface UseNotificationsOptions {
	ttlMs?: number
	skipInitialFetch?: boolean
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
	const { ttlMs, skipInitialFetch } = options
	const cacheKey = 'notifications:page1'

	const fetchFn = useCallback(async () => {
		return await getNotifications(1, 10)
	}, [])

	return useCacheFirst<NotificationResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch
	})
}

export default useNotifications
