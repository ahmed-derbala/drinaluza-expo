import { useCallback } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getBusinessBySlug } from './businesses.api'
import { BusinessResponse } from './businesses.interface'

export interface UseBusinessBySlugOptions {
	businessSlug?: string
	ttlMs?: number
	skipInitialFetch?: boolean
}

export const useBusinessBySlug = (options: UseBusinessBySlugOptions) => {
	const { businessSlug, ttlMs, skipInitialFetch } = options
	const cacheKey = businessSlug ? `business:${businessSlug}` : 'business:anonymous'

	const fetchFn = useCallback(async () => {
		if (!businessSlug) throw new Error('No business slug provided')
		return await getBusinessBySlug(businessSlug)
	}, [businessSlug])

	return useCacheFirst<BusinessResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch: skipInitialFetch || !businessSlug
	})
}

export default useBusinessBySlug
