import { useCallback, useMemo } from 'react'
import { useCacheFirst } from '@/core/hooks/useCacheFirst'
import { getFeed } from './feed.api'
import { FeedItem, NormalizedFeedResponse } from './feed.interface'

const EMPTY_ITEMS: FeedItem[] = []

const buildCacheKey = (filter: string) => `feed:page1:filter:${filter || 'all'}`

const PAGE_SIZE = 10

export interface UseFeedOptions {
	filter?: string
	ttlMs?: number
}

export interface UseFeedResult {
	items: FeedItem[]
	response: NormalizedFeedResponse | null
	isInitialLoading: boolean
	isRefreshing: boolean
	isOffline: boolean
	isStale: boolean
	refresh: () => Promise<void>
}

export const useFeed = (options: UseFeedOptions = {}): UseFeedResult => {
	const filter = options.filter || 'all'
	const cacheKey = buildCacheKey(filter)

	const fetchFn = useCallback(async () => {
		const apiFilter = filter === 'all' ? undefined : filter
		return await getFeed(1, PAGE_SIZE, apiFilter)
	}, [filter])

	const { data, isInitialLoading, isRefreshing, isOffline, isStale, refresh } = useCacheFirst<NormalizedFeedResponse>({
		cacheKey,
		fetchFn,
		ttlMs: options.ttlMs
	})

	const items = useMemo(() => data?.data.docs ?? EMPTY_ITEMS, [data])

	return {
		items,
		response: data,
		isInitialLoading,
		isRefreshing,
		isOffline,
		isStale,
		refresh
	}
}

export default useFeed
