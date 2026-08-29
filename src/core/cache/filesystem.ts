/**
 * Shared filesystem helpers for cache-related directories.
 * Centralizes traversal, deletion and ensure-dir logic that was previously
 * duplicated across CacheDetailsCard, ResetAppCard and video cache.
 */

import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { log } from '@/core/log'

export interface DirectoryStats {
	count: number
	bytes: number
}

/**
 * Recursively collect file count and total bytes for a directory.
 * Uses a breadth-first stack and tolerates missing entries.
 * Runs getInfo calls sequentially to avoid overwhelming the bridge.
 */
export const getDirectoryStats = async (dirUri: string): Promise<DirectoryStats> => {
	let count = 0
	let bytes = 0
	const stack: string[] = [dirUri]

	while (stack.length > 0) {
		const current = stack.pop()!
		let entries: string[]
		try {
			entries = await FileSystem.readDirectoryAsync(current)
		} catch {
			continue
		}
		for (const entry of entries) {
			const entryUri = current.endsWith('/') ? current + entry : `${current}/${entry}`
			try {
				const info: any = await FileSystem.getInfoAsync(entryUri, { size: true } as any)
				if (!info.exists) continue
				if (info.isDirectory) {
					stack.push(entryUri.endsWith('/') ? `${entryUri}/` : `${entryUri}/`)
				} else {
					count += 1
					if (typeof info.size === 'number') bytes += info.size
				}
			} catch {
				// ignore unreadable entry
			}
		}
	}

	return { count, bytes }
}

/**
 * Get stats for a well-known directory (cache / document). Returns zeros on web
 * or when the directory does not exist.
 */
export const getKnownDirectoryStats = async (dirUri: string | null | undefined): Promise<DirectoryStats> => {
	if (Platform.OS === 'web' || !dirUri) return { count: 0, bytes: 0 }
	try {
		const info = await FileSystem.getInfoAsync(dirUri)
		if (!info.exists) return { count: 0, bytes: 0 }
		return await getDirectoryStats(dirUri)
	} catch {
		return { count: 0, bytes: 0 }
	}
}

/**
 * Delete all entries directly inside a directory (non-recursive top-level delete
 * that still removes subdirectories via FileSystem.deleteAsync recursion).
 * Returns the number of entries removed.
 */
export const clearDirectory = async (dirUri: string | null | undefined): Promise<number> => {
	if (Platform.OS === 'web' || !dirUri) return 0
	let removed = 0
	try {
		const files = await FileSystem.readDirectoryAsync(dirUri)
		for (const file of files) {
			try {
				await FileSystem.deleteAsync(dirUri + file, { idempotent: true })
				removed += 1
			} catch {}
		}
	} catch (err) {
		log({ level: 'warn', label: 'filesystem', message: `Failed to clear directory ${dirUri}`, error: err })
	}
	return removed
}

/**
 * Ensure a directory exists (no-op on web).
 */
export const ensureDirectory = async (dirUri: string | null | undefined): Promise<void> => {
	if (Platform.OS === 'web' || !dirUri) return
	try {
		const info = await FileSystem.getInfoAsync(dirUri)
		if (!info.exists) {
			await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true })
		}
	} catch (err) {
		log({ level: 'warn', label: 'filesystem', message: `Failed to ensure directory ${dirUri}`, error: err })
	}
}

/**
 * Recursively clear a directory and recreate it empty.
 * Useful for fully wiping video cache while keeping the folder.
 */
export const wipeAndRecreateDirectory = async (dirUri: string | null | undefined): Promise<void> => {
	if (Platform.OS === 'web' || !dirUri) return
	try {
		const info = await FileSystem.getInfoAsync(dirUri)
		if (info.exists) {
			await FileSystem.deleteAsync(dirUri, { idempotent: true })
			await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true })
		}
	} catch (err) {
		log({ level: 'warn', label: 'filesystem', message: `Failed to wipe directory ${dirUri}`, error: err })
	}
}
