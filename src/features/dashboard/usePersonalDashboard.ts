import { useCallback } from 'react'
import { useCacheFirst } from '@cache/useCacheFirst'
import { getPersonalDashboard } from './dashboard.api'
import { DashboardResponse } from './dashboard.interface'

export interface UsePersonalDashboardOptions {
	ttlMs?: number
	skipInitialFetch?: boolean
}

export const usePersonalDashboard = (options: UsePersonalDashboardOptions = {}) => {
	const { ttlMs, skipInitialFetch } = options

	const fetchFn = useCallback(async () => await getPersonalDashboard(), [])

	return useCacheFirst<DashboardResponse>({
		cacheKey: 'dashboard:personal',
		fetchFn,
		ttlMs,
		skipInitialFetch
	})
}

export default usePersonalDashboard
