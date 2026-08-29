/**
 * Core offline-first cache store — in-memory tier + AsyncStorage.
 *
 * This module is intentionally free of React dependencies so it can be
 * imported by both `index.ts` and `useCacheFirst.ts` without creating a
 * circular barrel import.
 */

import { getItem, setItem, removeItem, multiRemove, getAllKeys } from '@/core/storage'
import { log } from '@/core/log'
import { DEFAULT_CACHE_TTL_MS, PROTECTED_STORAGE_KEYS } from './constants'

export interface CacheEntry<T> {
	data: T
	cachedAt: number
}

export interface CacheReadResult<T> {
	data: T
	cachedAt: number
	isStale: boolean
}

// In-memory tier: avoids AsyncStorage round-trip for repeat reads within the
// same app session (e.g. re-mounting a screen already visited).
const memoryCache = new Map<string, CacheEntry<unknown>>()

/**
 * Store a value in cache with a cachedAt timestamp.
 * TTL is advisory; stale data is still returned by getCacheItem.
 */
export const setCacheItem = async <T>(key: string, data: T): Promise<boolean> => {
	const entry: CacheEntry<T> = {
		data,
		cachedAt: Date.now()
	}
	memoryCache.set(key, entry as CacheEntry<unknown>)
	return await setItem(key, entry)
}

/**
 * Read a cached value. Always returns the cached data if present.
 * `isStale` is true when the entry is older than `ttlMs`.
 */
export const getCacheItem = async <T>(key: string, ttlMs: number = DEFAULT_CACHE_TTL_MS): Promise<CacheReadResult<T> | null> => {
	const cached = memoryCache.get(key) as CacheEntry<T> | undefined
	const entry = cached ?? (await getItem<CacheEntry<T>>(key))
	if (!entry || entry.data === undefined) return null
	if (!cached) memoryCache.set(key, entry as CacheEntry<unknown>)
	return {
		data: entry.data,
		cachedAt: entry.cachedAt,
		isStale: isCacheStale(entry.cachedAt, ttlMs)
	}
}

/**
 * Determine if a cache entry is stale based on its cachedAt timestamp.
 */
export const isCacheStale = (cachedAt: number, ttlMs: number = DEFAULT_CACHE_TTL_MS): boolean => {
	if (!cachedAt || cachedAt <= 0) return true
	return Date.now() - cachedAt > ttlMs
}

/**
 * Wipe the in-memory tier only. Must be called after any raw storage wipe
 * that bypasses this module (e.g. `clearAllStorage`, `clearStorageExceptSavedAuths`)
 * so stale entries aren't served from memory after the underlying storage was cleared.
 */
export const clearMemoryCache = (): void => {
	memoryCache.clear()
}

/**
 * Remove a single cache entry.
 */
export const invalidateCache = async (key: string): Promise<boolean> => {
	memoryCache.delete(key)
	return await removeItem(key)
}

/**
 * Update a cached resource in-place without clearing the cachedAt timestamp.
 * Use this after local mutations so the UI stays consistent.
 */
export const updateCacheItem = async <T>(key: string, updater: (current: T) => T): Promise<boolean> => {
	const entry = (memoryCache.get(key) as CacheEntry<T> | undefined) ?? (await getItem<CacheEntry<T>>(key))
	if (!entry) return false
	try {
		const next: CacheEntry<T> = {
			data: updater(entry.data),
			cachedAt: entry.cachedAt
		}
		memoryCache.set(key, next as CacheEntry<unknown>)
		return await setItem(key, next)
	} catch (error) {
		log({
			level: 'error',
			label: 'cache',
			message: `Error updating cache item for key: ${key}`,
			error
		})
		return false
	}
}

/**
 * Return true if a key is protected (must not be cleared).
 */
export const isProtectedKey = (key: string): boolean => PROTECTED_STORAGE_KEYS.some((prefix) => key === prefix || key.startsWith(`${prefix}:`))

/**
 * Clears every key that looks like a cache entry.
 * Safe to call on logout/account switch because it does not touch secure keys.
 */
export const clearAllCache = async (): Promise<boolean> => {
	try {
		const allKeys = await getAllKeys()
		const cacheKeys = allKeys.filter((key) => !isProtectedKey(key))
		cacheKeys.forEach((key) => memoryCache.delete(key))
		if (cacheKeys.length === 0) return true
		await multiRemove(cacheKeys)
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'cache',
			message: 'Error clearing cache entries',
			error
		})
		return false
	}
}
