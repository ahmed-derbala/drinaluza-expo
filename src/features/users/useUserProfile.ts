import { useCallback } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getUserBySlug } from './users.api'
import { UserProfile } from './users.interface'

export interface UseUserProfileOptions {
	userSlug?: string
	ttlMs?: number
	skipInitialFetch?: boolean
}

export const useUserProfile = (options: UseUserProfileOptions) => {
	const { userSlug, ttlMs, skipInitialFetch } = options
	const cacheKey = userSlug ? `user:${userSlug}` : 'user:anonymous'

	const fetchFn = useCallback(async () => {
		if (!userSlug) throw new Error('No user slug provided')
		const response = await getUserBySlug(userSlug)
		return response.data
	}, [userSlug])

	return useCacheFirst<UserProfile>({
		cacheKey,
		fetchFn,
		ttlMs,
		skipInitialFetch: skipInitialFetch || !userSlug
	})
}

export default useUserProfile
