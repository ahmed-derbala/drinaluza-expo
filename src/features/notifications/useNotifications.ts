import { useCallback } from 'react'
import { useCacheFirst } from '@/core/cache/useCacheFirst'
import { getNotifications, getUnseenNotifications } from './notifications.api'
import { NotificationResponse } from './notifications.interface'

export interface UseNotificationsOptions {
	ttlMs?: number
	skipInitialFetch?: boolean
	unseen?: boolean
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
	const { ttlMs, skipInitialFetch, unseen = false } = options
	const cacheKey = unseen ? 'notifications:unseen:page1' : 'notifications:page1'

	const fetchFn = useCallback(async () => {
		return unseen ? await getUnseenNotifications(1, 10) : await getNotifications(1, 10)
	}, [unseen])

	return useCacheFirst<NotificationResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch
	})
}

export default useNotifications
