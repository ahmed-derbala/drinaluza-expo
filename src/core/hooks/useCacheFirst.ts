import { useCallback, useEffect, useRef, useState } from 'react'
import { getCacheItem, setCacheItem, invalidateCache as removeCacheItem, CacheReadResult } from '@/core/storage'
import { BackendState, useBackendConnection } from '@/core/connection'
import { log } from '@/core/log'

const pendingFetches = new Map<string, Promise<unknown>>()

export interface UseCacheFirstOptions<T> {
	/** Unique, deterministic cache key. */
	cacheKey: string
	/** Factory that returns the fresh network data. */
	fetchFn: () => Promise<T>
	/** TTL in milliseconds. Data older than this is considered stale. Defaults to 5 minutes. */
	ttlMs?: number
	/** Called after fresh data is successfully fetched. */
	onSuccess?: (data: T) => void
	/** Called when the network request fails. The cached value (if any) is still returned. */
	onError?: (error: unknown) => void
	/** If true, the fetch is not triggered automatically on mount. */
	skipInitialFetch?: boolean
}

export interface UseCacheFirstResult<T> {
	/** Current data: cached first, then fresh after a successful fetch. */
	data: T | null
	/**
	 * True while there is no usable data at all (neither cache nor network).
	 * Use this to show the central loading spinner.
	 */
	isInitialLoading: boolean
	/** True whenever a background fetch is in flight. */
	isRefreshing: boolean
	/** True when the last fetch failed but we are still showing cached/stale data. */
	isOffline: boolean
	/** True when the currently displayed data came from cache and is past its TTL. */
	isStale: boolean
	/** Manually trigger a fresh fetch. */
	refresh: () => Promise<void>
	/** Replace the cached entry immediately, e.g. after a local mutation. */
	updateCache: (data: T) => Promise<boolean>
	/** Remove the cached entry. */
	invalidateCache: () => Promise<boolean>
}

/**
 * Generic cache-first data hook.
 *
 * On mount it reads from cache immediately, then fires the network request
 * in parallel. If the cache has a value, the UI can render instantly. Once the
 * network succeeds the cache and the returned data are updated. If it fails,
 * the cached value is preserved and `isOffline` becomes true.
 *
 * The hook is backend-state aware:
 * - When the backend is offline, network requests are skipped and cached data is used.
 * - When the backend comes back online, currently mounted hooks refresh automatically.
 */
export function useCacheFirst<T>(options: UseCacheFirstOptions<T>): UseCacheFirstResult<T> {
	const { cacheKey, fetchFn, ttlMs, onSuccess, onError, skipInitialFetch } = options
	const { backendState } = useBackendConnection()
	const isMountedRef = useRef(true)
	const prevBackendStateRef = useRef<BackendState>(backendState)

	const [cacheResult, setCacheResult] = useState<CacheReadResult<T> | null>(null)
	const [freshData, setFreshData] = useState<T | null>(null)
	const [isInitialLoading, setIsInitialLoading] = useState<boolean>(false)
	const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
	const [fetchError, setFetchError] = useState<unknown>(null)

	const displayedData = freshData ?? cacheResult?.data ?? null
	const isStale = cacheResult?.isStale ?? false
	const isOffline = backendState === 'offline'

	const loadFromCache = useCallback(async () => {
		try {
			const cached = await getCacheItem<T>(cacheKey, ttlMs)
			if (isMountedRef.current) {
				setCacheResult(cached)
			}
			return cached
		} catch (error) {
			log({ level: 'error', label: 'useCacheFirst', message: `Failed to read cache for ${cacheKey}`, error })
			return null
		}
	}, [cacheKey, ttlMs])

	const fetchFresh = useCallback(async () => {
		const existing = pendingFetches.get(cacheKey) as Promise<T | undefined> | undefined
		if (existing) {
			try {
				const data = await existing
				if (data && isMountedRef.current) {
					setFreshData(data)
				}
			} catch {
				// The original fetch failed; error state is handled by the initiator
			}
			return
		}

		let resolve: (value: T | undefined) => void = () => {}
		const promise = new Promise<T | undefined>((res) => {
			resolve = res
		})
		pendingFetches.set(cacheKey, promise)

		setIsRefreshing(true)
		setFetchError(null)
		let result: T | undefined
		try {
			const data = await fetchFn()
			if (isMountedRef.current) {
				setFreshData(data)
			}
			await setCacheItem(cacheKey, data)
			onSuccess?.(data)
			result = data
		} catch (error) {
			if (isMountedRef.current) {
				setFetchError(error)
			}
			onError?.(error)
		} finally {
			resolve(result)
			pendingFetches.delete(cacheKey)
			if (isMountedRef.current) {
				setIsRefreshing(false)
			}
		}
	}, [cacheKey, fetchFn, onError, onSuccess])

	const refresh = useCallback(async () => {
		if (backendState === 'offline') return
		await fetchFresh()
	}, [backendState, fetchFresh])

	const updateCache = useCallback(
		async (data: T) => {
			if (isMountedRef.current) {
				setFreshData(data)
			}
			return await setCacheItem(cacheKey, data)
		},
		[cacheKey]
	)

	const invalidateCache = useCallback(async () => {
		if (isMountedRef.current) {
			setCacheResult(null)
			setFreshData(null)
		}
		return await removeCacheItem(cacheKey)
	}, [cacheKey])

	useEffect(() => {
		isMountedRef.current = true
		let cancelled = false

		const bootstrap = async () => {
			const cached = await loadFromCache()
			const hasCache = cached !== null

			if (!hasCache) {
				setIsInitialLoading(true)
			}

			// Skip network requests while the backend is known to be offline.
			// The hook will auto-refresh as soon as the backend is reachable again.
			if (!skipInitialFetch && backendState !== 'offline') {
				await fetchFresh()
			}

			if (!cancelled) {
				setIsInitialLoading(false)
			}
		}

		bootstrap()

		return () => {
			cancelled = true
			isMountedRef.current = false
		}
	}, [cacheKey, fetchFn, loadFromCache, fetchFresh, skipInitialFetch, backendState])

	// Auto-refresh when the backend transitions from offline/connecting to online.
	useEffect(() => {
		const previous = prevBackendStateRef.current
		prevBackendStateRef.current = backendState

		if (backendState === 'online' && previous !== 'online') {
			fetchFresh()
		}
	}, [backendState, fetchFresh])

	return {
		data: displayedData,
		isInitialLoading,
		isRefreshing,
		isOffline: isOffline && !isRefreshing,
		isStale,
		refresh,
		updateCache,
		invalidateCache
	}
}

export default useCacheFirst
