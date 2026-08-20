/**
 * Media cache helpers built on top of `core/cache`.
 */

import { getCacheItem, setCacheItem, invalidateCache } from '@/core/cache'
import type { MediaFile } from './types'

const CACHE_TTL_MS = 5 * 60 * 1000

const mediaCacheKey = (fileId: string): string => `media:file:${fileId}`

/** Persist a media file (usually right after fetching or uploading it). */
export const cacheMediaFile = async (file: MediaFile): Promise<boolean> => {
	if (!file?._id) return false
	return await setCacheItem(mediaCacheKey(file._id), file)
}

/** Read a media file from the cache. Returns null when missing. */
export const getCachedMediaFile = async (fileId: string): Promise<MediaFile | null> => {
	if (!fileId) return null
	const entry = await getCacheItem<MediaFile>(mediaCacheKey(fileId), CACHE_TTL_MS)
	return entry?.data ?? null
}

/** Remove a media file from the cache. */
export const invalidateMediaCache = async (fileId: string): Promise<boolean> => {
	if (!fileId) return false
	return await invalidateCache(mediaCacheKey(fileId))
}
