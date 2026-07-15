import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { log } from '@/core/log'

// List of all known secure keys used in the app
const SECURE_KEYS = ['authToken', 'refreshToken', 'userData', 'user._id', 'user.slug', 'user.settings', 'saved_authentications', 'expoPushToken']

// Secure storage functions
export const secureSetItem = async (key: string, value: string): Promise<boolean> => {
	try {
		if (Platform.OS === 'web') {
			await AsyncStorage.setItem(key, value)
		} else {
			try {
				await SecureStore.setItemAsync(key, value)
			} catch (e) {
				// Fallback to AsyncStorage if SecureStore fails
				await AsyncStorage.setItem(key, value)
			}
		}
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: `Error secure-storing item for key: ${key}`,
			error
		})
		return false
	}
}

export const secureGetItem = async (key: string): Promise<string | null> => {
	try {
		if (Platform.OS === 'web') {
			return await AsyncStorage.getItem(key)
		} else {
			try {
				const value = await SecureStore.getItemAsync(key)
				if (value !== null) return value
				return await AsyncStorage.getItem(key)
			} catch (e) {
				return await AsyncStorage.getItem(key)
			}
		}
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: `Error secure-getting item for key: ${key}`,
			error
		})
		return null
	}
}

export const secureRemoveItem = async (key: string): Promise<boolean> => {
	try {
		if (Platform.OS === 'web') {
			await AsyncStorage.removeItem(key)
		} else {
			try {
				await SecureStore.deleteItemAsync(key)
				await AsyncStorage.removeItem(key)
			} catch (e) {
				await AsyncStorage.removeItem(key)
			}
		}
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: `Error secure-removing item for key: ${key}`,
			error
		})
		return false
	}
}

// Regular (non-secure) storage functions
export const setItem = async (key: string, value: any): Promise<boolean> => {
	try {
		const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
		await AsyncStorage.setItem(key, stringValue)
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: `Error setting item for key: ${key}`,
			error
		})
		return false
	}
}

export const getItem = async <T>(key: string): Promise<T | null> => {
	try {
		const value = await AsyncStorage.getItem(key)
		if (value === null) return null
		try {
			return JSON.parse(value) as T
		} catch {
			return value as unknown as T
		}
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: `Error getting item for key: ${key}`,
			error
		})
		return null
	}
}

export const removeItem = async (key: string): Promise<boolean> => {
	try {
		await AsyncStorage.removeItem(key)
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: `Error removing item for key: ${key}`,
			error
		})
		return false
	}
}

export const multiRemove = async (keys: string[]): Promise<boolean> => {
	try {
		await AsyncStorage.multiRemove(keys)
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: `Error multi-removing keys: ${keys.join(', ')}`,
			error
		})
		return false
	}
}

export const getAllKeys = async (): Promise<string[]> => {
	try {
		const keys = await AsyncStorage.getAllKeys()
		return [...keys]
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: 'Error getting all storage keys',
			error
		})
		return []
	}
}

// Token management shortcuts
export const getToken = async (): Promise<string | null> => {
	return await secureGetItem('authToken')
}

export const setToken = async (token: string): Promise<boolean> => {
	return await secureSetItem('authToken', token)
}

export const removeToken = async (): Promise<boolean> => {
	return await secureRemoveItem('authToken')
}

// Mass storage clear functions
export const clearAllStorage = async (): Promise<boolean> => {
	try {
		// 1. Clear AsyncStorage completely
		await AsyncStorage.clear()

		// 2. Clear known SecureStore keys
		if (Platform.OS !== 'web') {
			for (const key of SECURE_KEYS) {
				try {
					await SecureStore.deleteItemAsync(key)
				} catch (e) {
					// Ignore failures on individual keys
				}
			}
		}

		// 3. Clear web storage
		if (Platform.OS === 'web') {
			localStorage.clear()
			sessionStorage.clear()
		}

		log({
			level: 'info',
			label: 'storage',
			message: 'App storage wiped completely (Reset App)'
		})
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: 'Failed to completely clear app storage',
			error
		})
		return false
	}
}

// ───────────────────────────────────────────────────────────────────────────────
// Cache helpers (offline-first layer)
// ───────────────────────────────────────────────────────────────────────────────

export interface CacheEntry<T> {
	data: T
	cachedAt: number
}

export interface CacheReadResult<T> {
	data: T
	cachedAt: number
	isStale: boolean
}

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Store a value in cache with a cachedAt timestamp.
 * TTL is advisory; stale data is still returned by getCacheItem.
 */
export const setCacheItem = async <T>(key: string, data: T): Promise<boolean> => {
	const entry: CacheEntry<T> = {
		data,
		cachedAt: Date.now()
	}
	return await setItem(key, entry)
}

/**
 * Read a cached value. Always returns the cached data if present.
 * `isStale` is true when the entry is older than `ttlMs`.
 */
export const getCacheItem = async <T>(key: string, ttlMs: number = DEFAULT_CACHE_TTL_MS): Promise<CacheReadResult<T> | null> => {
	const entry = await getItem<CacheEntry<T>>(key)
	if (!entry || entry.data === undefined) return null
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
 * Remove a single cache entry.
 */
export const invalidateCache = async (key: string): Promise<boolean> => {
	return await removeItem(key)
}

/**
 * Update a cached resource in-place without clearing the cachedAt timestamp.
 * Use this after local mutations so the UI stays consistent.
 */
export const updateCacheItem = async <T>(key: string, updater: (current: T) => T): Promise<boolean> => {
	const entry = await getItem<CacheEntry<T>>(key)
	if (!entry) return false
	try {
		const next: CacheEntry<T> = {
			data: updater(entry.data),
			cachedAt: entry.cachedAt
		}
		return await setItem(key, next)
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: `Error updating cache item for key: ${key}`,
			error
		})
		return false
	}
}

/**
 * Clears every key that looks like a cache entry.
 * Safe to call on logout/account switch because it does not touch secure keys.
 */
export const clearAllCache = async (): Promise<boolean> => {
	try {
		const allKeys = await getAllKeys()
		// A cache key is any non-secure, non-token key. We keep the list
		// of protected prefixes explicit so we never wipe auth data.
		const protectedPrefixes = ['authToken', 'refreshToken', 'userData', 'user._id', 'user.slug', 'user.settings', 'saved_authentications', 'expoPushToken']
		const cacheKeys = allKeys.filter((key) => !protectedPrefixes.some((prefix) => key === prefix || key.startsWith(`${prefix}:`)))
		await multiRemove(cacheKeys)
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: 'Error clearing cache entries',
			error
		})
		return false
	}
}

/**
 * Clears everything from storage except saved authentications.
 * Typically used when switching user accounts.
 */
export const clearStorageExceptSavedAuths = async (): Promise<boolean> => {
	try {
		const SAVED_AUTHS_KEY = 'saved_authentications'

		// 1. Get all keys from AsyncStorage, filter and multiRemove
		const allKeys = await AsyncStorage.getAllKeys()
		const keysToRemove = allKeys.filter((key) => key !== SAVED_AUTHS_KEY)
		await AsyncStorage.multiRemove(keysToRemove)

		// 2. Clear SecureStore keys except SAVED_AUTHS_KEY
		if (Platform.OS !== 'web') {
			for (const key of SECURE_KEYS) {
				if (key !== SAVED_AUTHS_KEY) {
					try {
						await SecureStore.deleteItemAsync(key)
					} catch (e) {
						// Ignore failures on individual keys
					}
				}
			}
		}

		log({
			level: 'info',
			label: 'storage',
			message: 'Cleared app storage except saved accounts'
		})
		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'storage',
			message: 'Failed to clear storage except saved authentications',
			error
		})
		return false
	}
}
