import { useCallback } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getSales, SalesResponse } from './sales.api'

export interface UseSalesByStatusOptions {
	businessSlug?: string
	customerSlug?: string
	productSlug?: string
	status?: string
	ttlMs?: number
	skipInitialFetch?: boolean
}

const ITEMS_PER_PAGE = 10

export const useSalesByStatus = (options: UseSalesByStatusOptions) => {
	const { businessSlug, customerSlug, productSlug, status, ttlMs, skipInitialFetch } = options
	const cacheKey = businessSlug ? `sales:${businessSlug}:${status || 'all'}:page1` : 'sales:anonymous'

	const fetchFn = useCallback(async () => {
		if (!businessSlug) throw new Error('No business slug provided')
		return await getSales(businessSlug, 1, ITEMS_PER_PAGE, status === 'all' ? undefined : status, customerSlug, productSlug)
	}, [businessSlug, customerSlug, productSlug, status])

	return useCacheFirst<SalesResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch: skipInitialFetch || !businessSlug
	})
}

export default useSalesByStatus
