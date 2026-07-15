import { useCallback } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getBusinesses } from './businesses.api'
import { BusinessesResponse } from './businesses.interface'

export interface UseBusinessesOptions {
	ttlMs?: number
	skipInitialFetch?: boolean
}

export const useBusinesses = (options: UseBusinessesOptions = {}) => {
	const { ttlMs, skipInitialFetch } = options
	const cacheKey = 'businesses:all'

	const fetchFn = useCallback(async () => {
		return await getBusinesses(1, 100)
	}, [])

	return useCacheFirst<BusinessesResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch
	})
}

export default useBusinesses
