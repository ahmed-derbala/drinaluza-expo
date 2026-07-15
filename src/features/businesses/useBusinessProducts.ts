import { useCallback } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getBusinessProductsBySlug } from './businesses.api'
import { BusinessProductsResponse, Product } from './businesses.interface'

export interface UseBusinessProductsOptions {
	businessSlug?: string
	ttlMs?: number
	skipInitialFetch?: boolean
}

export const useBusinessProducts = (options: UseBusinessProductsOptions) => {
	const { businessSlug, ttlMs, skipInitialFetch } = options
	const cacheKey = businessSlug ? `business:${businessSlug}:products` : 'business:anonymous:products'

	const fetchFn = useCallback(async () => {
		if (!businessSlug) throw new Error('No business slug provided')
		return await getBusinessProductsBySlug(businessSlug)
	}, [businessSlug])

	return useCacheFirst<BusinessProductsResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch: skipInitialFetch || !businessSlug
	})
}

export default useBusinessProducts
