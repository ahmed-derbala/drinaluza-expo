import { useCallback } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getPurchases } from './orders.api'
import { OrderResponse } from './orders.interface'

export interface UsePurchasesByStatusOptions {
	status?: string
	ttlMs?: number
	skipInitialFetch?: boolean
}

export const usePurchasesByStatus = (options: UsePurchasesByStatusOptions) => {
	const { status, ttlMs, skipInitialFetch } = options
	const cacheKey = status ? `purchases:${status}` : 'purchases:all'

	const fetchFn = useCallback(async () => {
		return await getPurchases(status === 'all' ? undefined : status)
	}, [status])

	return useCacheFirst<OrderResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch
	})
}

export default usePurchasesByStatus
