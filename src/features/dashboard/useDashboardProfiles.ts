import { useCallback } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getDashboardProfiles } from './dashboard.api'
import { DashboardProfilesResponse } from './dashboard.interface'

export interface UseDashboardProfilesOptions {
	ttlMs?: number
	skipInitialFetch?: boolean
}

export const useDashboardProfiles = (options: UseDashboardProfilesOptions = {}) => {
	const { ttlMs, skipInitialFetch } = options
	const cacheKey = 'dashboard:profiles'

	const fetchFn = useCallback(async () => {
		return await getDashboardProfiles()
	}, [])

	return useCacheFirst<DashboardProfilesResponse>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch
	})
}

export default useDashboardProfiles
