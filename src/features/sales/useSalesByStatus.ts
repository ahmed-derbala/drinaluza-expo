import { useCallback } from 'react'
import { useCacheFirst } from '@cache/useCacheFirst'
import { getSales, SalesResponse } from './sales.api'

export interface UseSalesByStatusOptions {
	businessSlug?: string
	customerSlug?: string
	productSlug?: string
	tab?: string
	ttlMs?: number
	skipInitialFetch?: boolean
}

const ITEMS_PER_PAGE = 10

export const useSalesByStatus = (options: UseSalesByStatusOptions) => {
	const { businessSlug, customerSlug, productSlug, tab, ttlMs, skipInitialFetch } = options
	const cacheKey = businessSlug ? `sales:${businessSlug}:${tab || 'all'}:page1` : 'sales:anonymous'

	const fetchFn = useCallback(async () => {
		if (!businessSlug) throw new Error('No business slug provided')
		return await getSales(businessSlug, 1, ITEMS_PER_PAGE, tab, customerSlug, productSlug)
	}, [businessSlug, customerSlug, productSlug, tab])

	return useCacheFirst<SalesResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch: skipInitialFetch || !businessSlug
	})
}

export default useSalesByStatus
