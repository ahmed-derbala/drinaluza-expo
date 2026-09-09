import { useCallback } from 'react'
import { useCacheFirst } from '@cache/useCacheFirst'
import { getPurchases } from './orders.api'
import { OrderResponse } from './orders.interface'

export interface UsePurchasesByStatusOptions {
	tab?: string
	ttlMs?: number
	skipInitialFetch?: boolean
}

export const usePurchasesByStatus = (options: UsePurchasesByStatusOptions) => {
	const { tab, ttlMs, skipInitialFetch } = options
	const cacheKey = tab ? `purchases:tab:${tab}` : 'purchases:all'

	const fetchFn = useCallback(async () => {
		return await getPurchases(tab)
	}, [tab])

	return useCacheFirst<OrderResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch
	})
}

export default usePurchasesByStatus
