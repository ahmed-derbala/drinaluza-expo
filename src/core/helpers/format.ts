/**
 * Shared formatting helpers.
 * Keep lightweight and dependency-free so they can be used anywhere
 * (including cache, updates, media).
 */

/**
 * Format bytes into a human-readable string.
 * Examples: 0 -> "0 B", 1024 -> "1 KB", 1536 -> "1.5 KB"
 */
export const formatBytes = (bytes: number): string => {
	if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
	const k = 1024
	const sizes = ['B', 'KB', 'MB', 'GB', 'TB'] as const
	const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1)
	const val = bytes / Math.pow(k, i)
	// Keep 0 decimals for bytes and for values >= 10, else 1 decimal
	const decimals = i === 0 || val >= 10 ? 0 : 1
	return `${val.toFixed(decimals)} ${sizes[i]}`
}
