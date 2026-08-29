import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { getCacheItem, setCacheItem, invalidateCache as removeCacheItem } from './store'
import type { CacheReadResult } from './store'
import { BackendState, useBackendConnection } from '@/core/connection'
import { log } from '@/core/log'
import { parseError } from '@/core/error/errorHandler'

const pendingFetches = new Map<string, Promise<unknown>>()

// ── Global refresh & status registry for useCacheFirst hooks ─────────
type RefreshCallback = () => Promise<unknown>
const activeRefreshers = new Set<RefreshCallback>()

let activeRefreshingCount = 0
const activeRefreshingListeners = new Set<() => void>()

export const triggerGlobalRefresh = async (): Promise<void> => {
	log({
		level: 'info',
		label: 'useCacheFirst',
		message: `Triggering global refresh for ${activeRefreshers.size} active hooks`
	})
	const promises = Array.from(activeRefreshers).map((rf) => {
		try {
			return rf()
		} catch (e) {
			log({ level: 'error', label: 'useCacheFirst', message: 'Error in global refresh item', error: e })
			return Promise.resolve()
		}
	})
	await Promise.all(promises)
}

export const useGlobalRefreshingState = (): boolean => {
	return useSyncExternalStore(
		(onStoreChange) => {
			activeRefreshingListeners.add(onStoreChange)
			return () => {
				activeRefreshingListeners.delete(onStoreChange)
			}
		},
		() => activeRefreshingCount > 0,
		() => false
	)
}

const updateRefreshingCount = (delta: number): void => {
	activeRefreshingCount = Math.max(0, activeRefreshingCount + delta)
	activeRefreshingListeners.forEach((listener) => {
		try {
			listener()
		} catch {
			// ignore
		}
	})
}

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
	/**
	 * If true, the initial-mount fetch is skipped entirely when cached data is
	 * still fresh (within `ttlMs`), avoiding a redundant network call. Manual
	 * `refresh()`, the offline-to-online transition, and global refresh triggers
	 * still always fetch. Defaults to false (always fetch on mount) to preserve
	 * existing behavior for consumers that need eventual consistency on every mount.
	 */
	skipFetchIfFresh?: boolean
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
	refresh: () => Promise<T | undefined>
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
	const { cacheKey, ttlMs, skipInitialFetch, skipFetchIfFresh } = options
	const { backendState } = useBackendConnection()

	// Stabilize fetchFn / callbacks via refs so the hook does not re-bootstrap
	// on every render when callers pass inline functions.
	const fetchFnRef = useRef(options.fetchFn)
	const onSuccessRef = useRef(options.onSuccess)
	const onErrorRef = useRef(options.onError)
	useEffect(() => {
		fetchFnRef.current = options.fetchFn
		onSuccessRef.current = options.onSuccess
		onErrorRef.current = options.onError
	}, [options.fetchFn, options.onSuccess, options.onError])

	const isMountedRef = useRef(true)
	const prevBackendStateRef = useRef<BackendState>(backendState)

	const [cacheResult, setCacheResult] = useState<CacheReadResult<T> | null>(null)
	const [freshData, setFreshData] = useState<T | null>(null)
	const [isInitialLoading, setIsInitialLoading] = useState<boolean>(!skipInitialFetch)
	const [isRefreshing, setIsRefreshing] = useState<boolean>(false)
	const [hasConnectionError, setHasConnectionError] = useState<boolean>(false)

	const displayedData = freshData ?? cacheResult?.data ?? null
	// Once freshData is present, the displayed data is not stale (just fetched)
	const isStale = freshData !== null ? false : (cacheResult?.isStale ?? false)
	const isOffline = backendState === 'offline' || hasConnectionError

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

	const fetchFresh = useCallback(async (): Promise<T | undefined> => {
		// Deduplicate concurrent requests for the same cache key
		const existing = pendingFetches.get(cacheKey) as Promise<T | undefined> | undefined
		if (existing) {
			const data = await existing
			if (data !== undefined && isMountedRef.current) {
				setFreshData(data)
			}
			return data
		}

		if (isMountedRef.current) {
			setIsRefreshing(true)
		}

		let result: T | undefined
		const promise = new Promise<T | undefined>((resolve) => {
			;(async () => {
				try {
					const data = await fetchFnRef.current()
					if (isMountedRef.current) {
						setFreshData(data)
						setHasConnectionError(false)
					}
					await setCacheItem(cacheKey, data)
					onSuccessRef.current?.(data)
					result = data
					resolve(data)
				} catch (error) {
					if (isMountedRef.current) {
						const { type } = parseError(error)
						setHasConnectionError(type === 'network' || type === 'timeout')
					}
					onErrorRef.current?.(error)
					resolve(undefined)
				} finally {
					pendingFetches.delete(cacheKey)
					if (isMountedRef.current) {
						setIsRefreshing(false)
					}
				}
			})()
		})

		pendingFetches.set(cacheKey, promise)
		return promise
	}, [cacheKey])

	const refresh = useCallback(async () => {
		return await fetchFresh()
	}, [fetchFresh])

	const updateCache = useCallback(
		async (data: T) => {
			if (isMountedRef.current) {
				setFreshData(data)
			}
			return await setCacheItem(cacheKey, data)
		},
		[cacheKey]
	)

	const invalidateCacheCb = useCallback(async () => {
		if (isMountedRef.current) {
			setCacheResult(null)
			setFreshData(null)
		}
		return await removeCacheItem(cacheKey)
	}, [cacheKey])

	useEffect(() => {
		isMountedRef.current = true
		let cancelled = false

		const bootstrap = async (): Promise<void> => {
			// 1. Read cache first — this is fast (local storage)
			const cached = await loadFromCache()
			if (cancelled) return

			// 2. If we have cached data, unblock the UI immediately.
			const hasData = Boolean(cached?.data !== null && cached?.data !== undefined)
			if (hasData) {
				setIsInitialLoading(false)
			}

			// 3. Fire network fetch in the background.
			const hasFreshCache = Boolean(cached && !cached.isStale)
			if (!skipInitialFetch && backendState !== 'offline' && !(skipFetchIfFresh && hasFreshCache)) {
				await fetchFresh()
				if (cancelled) return
			}

			// 4. After network fetch completes (or was skipped), always unblock.
			if (!cancelled) {
				setIsInitialLoading(false)
			}
		}

		// Show loading spinner only if there is no cached data yet (first ever load).
		// cacheResult is null on first mount; subsequent mounts with warm memoryCache
		// will have already set cacheResult, but bootstrap will still read and unblock quickly.
		setIsInitialLoading(!skipInitialFetch)

		bootstrap()

		return () => {
			cancelled = true
			isMountedRef.current = false
		}
		// Only re-bootstrap when cacheKey or the skip flags change — not on fetchFn identity
		// nor backendState (offline->online is handled by the dedicated effect below).
	}, [cacheKey, loadFromCache, fetchFresh, skipInitialFetch, skipFetchIfFresh])

	// Auto-refresh when the backend transitions from offline/connecting to online.
	useEffect(() => {
		const previous = prevBackendStateRef.current
		prevBackendStateRef.current = backendState

		if (!skipInitialFetch && backendState === 'online' && previous !== 'online') {
			fetchFresh()
		}
	}, [backendState, fetchFresh, skipInitialFetch])

	// Register refresh callback globally.
	// Hooks that opt out of automatic fetching (skipInitialFetch) must not be
	// swept up by unrelated global/manual refresh triggers either.
	useEffect(() => {
		if (skipInitialFetch) return
		activeRefreshers.add(refresh)
		return () => {
			activeRefreshers.delete(refresh)
		}
	}, [refresh, skipInitialFetch])

	// Synchronize loading/refreshing state globally
	const isLoading = isInitialLoading || isRefreshing
	useEffect(() => {
		if (isLoading) {
			updateRefreshingCount(1)
			return () => {
				updateRefreshingCount(-1)
			}
		}
	}, [isLoading])

	return {
		data: displayedData,
		isInitialLoading,
		isRefreshing,
		isOffline: isOffline && !isRefreshing,
		isStale,
		refresh,
		updateCache,
		invalidateCache: invalidateCacheCb
	}
}

export default useCacheFirst
