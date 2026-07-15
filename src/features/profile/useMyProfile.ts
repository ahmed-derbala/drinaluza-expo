import { useCallback } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getMyProfile } from '@/features/auth/auth.api'
import { UserData } from './profile.interface'

export const MY_PROFILE_CACHE_KEY = 'profile:me'

export interface UseMyProfileOptions {
	ttlMs?: number
}

export interface UseMyProfileResult {
	profile: UserData | null
	isInitialLoading: boolean
	isRefreshing: boolean
	isOffline: boolean
	isStale: boolean
	refresh: () => Promise<void>
	updateCache: (profile: UserData) => Promise<boolean>
	invalidateCache: () => Promise<boolean>
}

export const useMyProfile = (options: UseMyProfileOptions = {}): UseMyProfileResult => {
	const fetchFn = useCallback(async () => {
		const response = await getMyProfile()
		return response.data as UserData
	}, [])

	const { data, isInitialLoading, isRefreshing, isOffline, isStale, refresh, updateCache, invalidateCache } = useCacheFirst<UserData>({
		cacheKey: MY_PROFILE_CACHE_KEY,
		fetchFn,
		ttlMs: options.ttlMs
	})

	return {
		profile: data,
		isInitialLoading,
		isRefreshing,
		isOffline,
		isStale,
		refresh,
		updateCache,
		invalidateCache
	}
}

export default useMyProfile
