/**
 * Shared cache constants — single source of truth for TTLs, protected keys,
 * and filesystem thresholds. Import from here instead of duplicating literals.
 */

import { SECURE_KEYS } from '@/core/storage'

// TTL for AsyncStorage cache entries (offline-first layer)
export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

// Media-specific TTL — kept equal to default but explicit for clarity.
export const MEDIA_CACHE_TTL_MS = DEFAULT_CACHE_TTL_MS

// Secure / protected keys that must never be wiped by clearAllCache.
// Re-uses the same list as `SECURE_KEYS` in `core/storage` to prevent drift.
export const PROTECTED_STORAGE_KEYS = SECURE_KEYS

export type ProtectedStorageKey = (typeof PROTECTED_STORAGE_KEYS)[number]

// Memory cache max entries — evicts LRU when exceeded
export const MEMORY_CACHE_MAX_ENTRIES = 1000

// Video cache thresholds
export const VIDEO_MIN_COMPLETE_BYTES = 100 * 1024 // 100 KB
export const VIDEO_SIZE_TOLERANCE = 0.95 // accept 95% of expected size

// Prefix for video resume data keys in AsyncStorage
export const VIDEO_RESUME_KEY_PREFIX = 'video:resume:'
export const VIDEO_PROGRESS_KEY_PREFIX = 'video:progress:'
