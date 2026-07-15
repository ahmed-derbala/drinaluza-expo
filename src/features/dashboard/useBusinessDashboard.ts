import { useCallback } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getBusinessDashboard } from './dashboard.api'
import { DashboardResponse } from './dashboard.interface'

export interface UseBusinessDashboardOptions {
	businessSlug?: string
	ttlMs?: number
	skipInitialFetch?: boolean
}

export const useBusinessDashboard = (options: UseBusinessDashboardOptions) => {
	const { businessSlug, ttlMs, skipInitialFetch } = options
	const cacheKey = businessSlug ? `dashboard:business:${businessSlug}` : 'dashboard:business:anonymous'

	const fetchFn = useCallback(async () => {
		if (!businessSlug) throw new Error('No business slug provided')
		return await getBusinessDashboard(businessSlug)
	}, [businessSlug])

	return useCacheFirst<DashboardResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch: skipInitialFetch || !businessSlug
	})
}

export default useBusinessDashboard
