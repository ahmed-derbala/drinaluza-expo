/**
 * core/disk — central file-system abstraction for internal storage.
 *
 * All modules that touch the app file system (cache / document) must use
 * this layer. Uses `expo-file-system` modern API (`File`, `Directory`, `Paths`)
 * — never `expo-file-system/legacy`.
 */

import { Platform } from 'react-native'
import { log } from '@/core/log'
import type { Directory as DirectoryType, File as FileType } from 'expo-file-system'

let Directory: any
let File: any
let Paths: any
if (Platform.OS !== 'web') {
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const FS = require('expo-file-system')
		Directory = FS.Directory
		File = FS.File
		Paths = FS.Paths
	} catch {}
}
if (Platform.OS === 'web' || !Directory || !File || !Paths) {
	// Web mock — expo-file-system not supported on web, avoid validatePath crash
	class MockDirectory {
		uri: string
		exists = false
		constructor(...args: any[]) {
			this.uri = args.map((a) => String(a)).join('/')
		}
		create() {}
		delete() {}
		list(): any[] {
			return []
		}
		info() {
			return { exists: false, size: 0, uri: this.uri }
		}
		get size() {
			return 0
		}
	}
	class MockFile {
		uri: string
		exists = false
		size = 0
		constructor(...args: any[]) {
			this.uri = args.map((a) => String(a)).join('/')
		}
		delete() {}
		info() {
			return { exists: false, size: 0, uri: this.uri }
		}
		write() {}
		move() {
			return Promise.resolve()
		}
		copy() {
			return Promise.resolve()
		}
		static downloadFileAsync = async () => null as any
	}
	Directory = MockDirectory as any
	File = MockFile as any
	Paths = {
		cache: new MockDirectory('file:///cache'),
		document: new MockDirectory('file:///document'),
		bundle: null,
		availableDiskSpace: 0,
		totalDiskSpace: 0
	} as any
}

export interface DirectoryStats {
	count: number
	bytes: number
}

// ── Directories ────────────────────────────────────────────────────────────

export const getCacheDirectory = (): any | null => {
	if (Platform.OS === 'web') return null as unknown as any
	try {
		return Paths.cache
	} catch {
		return null as unknown as any
	}
}
export const getDocumentDirectory = (): any | null => {
	if (Platform.OS === 'web') return null as unknown as any
	try {
		return Paths.document
	} catch {
		return null as unknown as any
	}
}
export const getBundleDirectory = (): any | null => {
	if (Platform.OS === 'web') return null
	try {
		return Paths.bundle as unknown as any
	} catch {
		return null
	}
}

export const getVideosDirectory = (): any | null => {
	if (Platform.OS === 'web') return null as unknown as any
	try {
		return new Directory(Paths.cache, 'videos')
	} catch {
		return null as unknown as any
	}
}
export const getUpdatesDirectory = (): any | null => {
	if (Platform.OS === 'web') return null as unknown as any
	try {
		return new Directory(Paths.document, 'updates')
	} catch {
		return null as unknown as any
	}
}
export const getQRCodesDirectory = (): any | null => {
	if (Platform.OS === 'web') return null as unknown as any
	try {
		return new Directory(Paths.cache, 'qrcodes')
	} catch {
		return null as unknown as any
	}
}

// ── Helpers ────────────────────────────────────────────────────────────────

const toDirectory = (target: string | any): any => {
	if (Platform.OS === 'web') return { exists: false, uri: String(target ?? ''), create: () => {}, delete: () => {}, list: () => [], info: () => ({ exists: false, size: 0 }) } as unknown as any
	if (target instanceof Directory) return target
	try {
		return new Directory(target as string)
	} catch {
		return { exists: false, uri: String(target ?? ''), create: () => {}, delete: () => {}, list: () => [], info: () => ({ exists: false, size: 0 }) } as unknown as any
	}
}

const toFile = (target: string | any): any => {
	if (Platform.OS === 'web') return { exists: false, uri: String(target ?? ''), delete: () => {}, info: () => ({ exists: false, size: 0 }), size: 0 } as unknown as any
	if (target instanceof File) return target
	try {
		return new File(target as string)
	} catch {
		return { exists: false, uri: String(target ?? ''), delete: () => {}, info: () => ({ exists: false, size: 0 }), size: 0 } as unknown as any
	}
}

// ── Ensure ─────────────────────────────────────────────────────────────────

export const ensureDirectory = async (target: string | any): Promise<void> => {
	if (Platform.OS === 'web') return
	try {
		const dir = toDirectory(target)
		if (!dir.exists) {
			dir.create({ intermediates: true, idempotent: true })
		}
	} catch (err) {
		log({ level: 'warn', label: 'disk', message: `Failed to ensure directory ${String(target)}`, error: err })
	}
}

// ── Stats ──────────────────────────────────────────────────────────────────

/**
 * Fast directory size — single `info()` call, O(1). No per-file traversal.
 * Use for `Cache Directory` / `Document Directory` rows in `CacheDetailsCard`
 * for better performance vs `getDirectoryStats`.
 */
export const getDirectorySize = async (target: string | any): Promise<number> => {
	if (Platform.OS === 'web') return 0
	try {
		const dir = toDirectory(target)
		if (!dir.exists) return 0
		// Modern API: directory.size is allocated size (bytes) or null
		const s = (dir as any).size as number | null | undefined
		if (typeof s === 'number' && s !== null) return s
		const info = dir.info()
		return typeof info.size === 'number' ? info.size : 0
	} catch {
		return 0
	}
}

/**
 * Accurate recursive stats (count + bytes) — traverses every entry.
 * Use only when file count is required.
 */
export const getDirectoryStats = async (target: string | any): Promise<DirectoryStats> => {
	if (Platform.OS === 'web') return { count: 0, bytes: 0 }
	try {
		const root = toDirectory(target)
		if (!root.exists) return { count: 0, bytes: 0 }
		let count = 0
		let bytes = 0
		const stack: any[] = [root]
		while (stack.length > 0) {
			const current = stack.pop()!
			let entries: (File | any)[]
			try {
				entries = current.list()
			} catch {
				continue
			}
			for (const entry of entries) {
				try {
					if (entry instanceof Directory) {
						stack.push(entry)
					} else {
						// File
						count += 1
						const f = entry as any
						const sz = typeof f.size === 'number' ? f.size : 0
						if (sz > 0) bytes += sz
						else {
							try {
								const info = f.info()
								if (typeof info.size === 'number') bytes += info.size
							} catch {}
						}
					}
				} catch {}
			}
		}
		return { count, bytes }
	} catch {
		return { count: 0, bytes: 0 }
	}
}

/**
 * Fast known-directory stats for `CacheDetailsCard`:
 * bytes via single `size`, count via shallow `list().length` not recursive
 * to avoid O(n) bridge calls. If precise count needed, use `getDirectoryStats`.
 */
export const getKnownDirectoryStats = async (target: string | any | null | undefined): Promise<DirectoryStats> => {
	if (Platform.OS === 'web' || !target) return { count: 0, bytes: 0 }
	try {
		const dir = toDirectory(target as any)
		if (!dir.exists) return { count: 0, bytes: 0 }
		// Fast path: bytes via directory.size, count via top-level list length
		// For full recursive count use getDirectoryStats — but for performance
		// we show directory size only (count approximated)
		let bytes = 0
		try {
			const sz = (dir as any).size as number | null
			if (typeof sz === 'number' && sz !== null) bytes = sz
			else bytes = dir.info().size ?? 0
		} catch {
			bytes = 0
		}
		// Approximate count as total files recursively but without per-file size calls
		// Fall back to getDirectoryStats only if needed; here we return 0 count
		// and let caller decide to show size-only.
		// For better UX we still compute count via fast traversal without size
		let count = 0
		try {
			const stats = await getDirectoryStats(dir)
			count = stats.count
			// Prefer accurate bytes from traversal if fast size was 0 (some Android returns 4096)
			if (bytes === 0 || bytes === 4096) bytes = stats.bytes
		} catch {}
		return { count, bytes }
	} catch {
		return { count: 0, bytes: 0 }
	}
}

/**
 * Optimized size-only for CacheDetailsCard — avoids recursive traversal entirely.
 * Returns 0 on web/missing.
 */
export const getKnownDirectorySize = async (target: string | any | null | undefined): Promise<number> => {
	if (Platform.OS === 'web' || !target) return 0
	try {
		const dir = toDirectory(target as any)
		if (!dir.exists) return 0
		const info = dir.info()
		return typeof info.size === 'number' ? info.size : 0
	} catch {
		return 0
	}
}

// ── Clear / Delete ─────────────────────────────────────────────────────────

export const clearDirectory = async (target: string | any | null | undefined): Promise<number> => {
	if (Platform.OS === 'web' || !target) return 0
	try {
		const dir = toDirectory(target as any)
		if (!dir.exists) return 0
		const entries = dir.list()
		let removed = 0
		for (const entry of entries) {
			try {
				entry.delete()
				removed += 1
			} catch {}
		}
		return removed
	} catch (err) {
		log({ level: 'warn', label: 'disk', message: `Failed to clear directory ${String(target)}`, error: err })
		return 0
	}
}

export const wipeAndRecreateDirectory = async (target: string | any | null | undefined): Promise<void> => {
	if (Platform.OS === 'web' || !target) return
	try {
		const dir = toDirectory(target as any)
		if (dir.exists) {
			dir.delete()
		}
		// recreate empty
		dir.create({ intermediates: true, idempotent: true })
	} catch (err) {
		log({ level: 'warn', label: 'disk', message: `Failed to wipe directory ${String(target)}`, error: err })
	}
}

export const deleteFile = async (target: string | any): Promise<void> => {
	if (Platform.OS === 'web') return
	try {
		const file = toFile(target)
		if (file.exists) file.delete()
	} catch {}
}

export const deletePath = async (target: string | any | any, options?: { idempotent?: boolean }): Promise<void> => {
	if (Platform.OS === 'web') return
	try {
		if (target instanceof File) {
			if (target.exists) target.delete()
		} else if (target instanceof Directory) {
			if (target.exists) target.delete()
		} else {
			const uri = String(target)
			// Try as file first, then directory
			try {
				const f = new File(uri)
				if (f.exists) {
					f.delete()
					return
				}
			} catch {}
			try {
				const d = new Directory(uri)
				if (d.exists) d.delete()
			} catch {}
		}
	} catch {}
}

// ── File helpers ───────────────────────────────────────────────────────────

export interface FileInfo {
	exists: boolean
	isDirectory: boolean | null
	size?: number
	uri?: string
}

export const getFileInfo = async (target: string | any | any): Promise<FileInfo | null> => {
	if (Platform.OS === 'web') return null
	try {
		if (target instanceof File) {
			const info = target.info()
			return { exists: target.exists, isDirectory: false, size: info.size, uri: target.uri }
		}
		if (target instanceof Directory) {
			const info = target.info()
			return { exists: target.exists, isDirectory: true, size: info.size, uri: target.uri }
		}
		const uri = String(target)
		// Try file then directory
		try {
			const f = new File(uri)
			if (f.exists || uri.endsWith('.tmp') || uri.includes('.')) {
				const info = f.info()
				return { exists: f.exists, isDirectory: false, size: info.size, uri: f.uri }
			}
		} catch {}
		const d = new Directory(uri)
		return { exists: d.exists, isDirectory: d.exists ? true : null, size: d.info().size, uri: d.uri }
	} catch {
		return null
	}
}

export const writeBase64File = async (target: string | any, base64: string): Promise<void> => {
	if (Platform.OS === 'web') return
	const file = toFile(target)
	// Ensure parent exists
	try {
		const parent = file.parentDirectory
		if (!parent.exists) parent.create({ intermediates: true, idempotent: true })
	} catch {}
	// Modern API: any.write with encoding
	try {
		// @ts-ignore — encoding option varies by version
		file.write(base64, { encoding: 'base64' })
	} catch (err) {
		// Fallback: create then write
		try {
			if (!file.exists) file.create({ intermediates: true })
			file.write(base64, { encoding: 'base64' as any })
		} catch {}
	}
}

export const moveFile = async (from: string | any, to: string | any): Promise<void> => {
	if (Platform.OS === 'web') return
	try {
		const src = toFile(from)
		const dest = toFile(to)
		// Ensure dest parent exists
		try {
			const parent = dest.parentDirectory
			if (!parent.exists) parent.create({ intermediates: true, idempotent: true })
		} catch {}
		await src.move(dest, { overwrite: true })
	} catch {
		// Fallback: try copy + delete
		try {
			const src = toFile(from)
			const dest = toFile(to)
			await src.copy(dest, { overwrite: true } as any)
			src.delete()
		} catch {}
	}
}

// ── Storage ────────────────────────────────────────────────────────────────

export const getFreeDiskStorage = async (): Promise<number> => {
	if (Platform.OS === 'web') return 0
	try {
		return Paths.availableDiskSpace ?? 0
	} catch {
		return 0
	}
}

export const getTotalDiskStorage = async (): Promise<number> => {
	if (Platform.OS === 'web') return 0
	try {
		return Paths.totalDiskSpace ?? 0
	} catch {
		return 0
	}
}

// ── Download ───────────────────────────────────────────────────────────────

export const downloadFile = async (url: string, destination: any | any, options?: { idempotent?: boolean; headers?: Record<string, string> }): Promise<File | null> => {
	if (Platform.OS === 'web') return null
	try {
		const dest = destination instanceof File || destination instanceof Directory ? destination : new File(destination as any)
		const file = await File.downloadFileAsync(url, dest, options as any)
		return file
	} catch (err) {
		log({ level: 'warn', label: 'disk', message: `Download failed ${url}`, error: err })
		return null
	}
}

export const listDirectory = (target: string | any): (File | any)[] => {
	if (Platform.OS === 'web') return []
	try {
		const dir = toDirectory(target)
		if (!dir.exists) return []
		return dir.list()
	} catch {
		return []
	}
}

export const listDirectoryNames = (target: string | any): string[] => {
	return listDirectory(target).map((e) => (e instanceof Directory ? e.name : (e as any).name))
}

export const getContentUri = (fileUri: string): string => {
	try {
		const f = new File(fileUri)
		return (f as any).contentUri ?? fileUri
	} catch {
		return fileUri
	}
}

// Re-export modern primitives for advanced use (web-safe)
export { Directory, File, Paths }
