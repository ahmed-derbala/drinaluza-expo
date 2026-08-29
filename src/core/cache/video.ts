/**
 * Video file cache — mirrors `UpdatesContext` APK caching but for played videos.
 *
 * Stores MP4s (via `secure_url`) under `FileSystem.cacheDirectory + 'videos/'`
 * so a played video can be replayed offline via the system cache. HLS
 * `playback_url` (.m3u8) is not cached as a single file; we cache the MP4 fallback.
 * Using `cacheDirectory` (purgeable temp) instead of `documentDirectory` keeps
 * videos together with `expo-image` cache and allows OS to reclaim space.
 */

import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { log } from '@/core/log'
import { getItem, setItem, removeItem, getAllKeys } from '@/core/storage'
import type { MediaFile } from '@/core/smart-media/types'
import { VIDEO_MIN_COMPLETE_BYTES, VIDEO_PROGRESS_KEY_PREFIX, VIDEO_RESUME_KEY_PREFIX, VIDEO_SIZE_TOLERANCE } from './constants'
import { ensureDirectory, wipeAndRecreateDirectory } from './filesystem'

const VIDEOS_FOLDER = (FileSystem.cacheDirectory || '') + 'videos/'

const getResumeKey = (fileId: string): string => `${VIDEO_RESUME_KEY_PREFIX}${fileId}`
const getProgressKey = (fileId: string): string => `${VIDEO_PROGRESS_KEY_PREFIX}${fileId}`

const ensureVideosFolder = async (): Promise<void> => {
	if (Platform.OS === 'web') return
	await ensureDirectory(VIDEOS_FOLDER)
}

const sanitizeBaseName = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_')

const getVideoFileName = (file: MediaFile): string => {
	const ext = file.format ? file.format.toLowerCase().replace(/^\./, '') : 'mp4'
	// Use _id as stable filename; fallback to public_id or sanitized originalname without extension
	const rawBase = file._id || file.public_id || file.originalname || 'video'
	const withoutExt = rawBase.includes('.') && !file._id ? rawBase.replace(/\.[^/.]+$/, '') : rawBase
	const safeBase = sanitizeBaseName(withoutExt)
	return `${safeBase}.${ext}`
}

interface FileInfo {
	exists: boolean
	isDirectory?: boolean
	size?: number
	uri?: string
}

const getFileInfo = async (uri: string): Promise<FileInfo | null> => {
	try {
		const info = (await FileSystem.getInfoAsync(uri, { size: true } as any)) as FileInfo & { exists: boolean }
		return info
	} catch {
		return null
	}
}

const isCacheCompleteBySize = async (fileUri: string, expectedSize?: number): Promise<boolean> => {
	const info = await getFileInfo(fileUri)
	if (!info?.exists) return false
	const size = info.size ?? 0
	if (size < VIDEO_MIN_COMPLETE_BYTES) return false
	if (expectedSize && expectedSize > 0) {
		return size >= expectedSize * VIDEO_SIZE_TOLERANCE
	}
	return true
}

export const getCachedVideoUri = async (file: MediaFile): Promise<string | null> => {
	if (Platform.OS === 'web') return null
	if (!file?._id) return null
	try {
		const fileName = getVideoFileName(file)
		const fileUri = VIDEOS_FOLDER + fileName
		if (await isCacheCompleteBySize(fileUri, file.size)) {
			return fileUri
		}
		// Corrupted/truncated file left by kill — delete so next prefetch retries cleanly
		const info = await getFileInfo(fileUri)
		if (info?.exists) await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {})
		return null
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Failed to check cached video', error: err })
		return null
	}
}

const activeDownloads = new Map<string, FileSystem.DownloadResumable>()
const activeDownloadPromises = new Map<string, Promise<string | null>>()

// Throttle progress persistence to avoid AsyncStorage spam
const lastProgressPersist = new Map<string, { value: number; at: number }>()

const shouldPersistProgress = (fileId: string, progress: number): boolean => {
	const now = Date.now()
	const prev = lastProgressPersist.get(fileId)
	if (!prev) return true
	if (now - prev.at < 1000) return false
	if (Math.abs(progress - prev.value) < 0.05) return false
	return true
}

export const cacheVideoFile = async (file: MediaFile, onProgress?: (p: number) => void): Promise<string | null> => {
	if (Platform.OS === 'web') return null
	if (!file?.secure_url && !file?.url) return null
	const fileId = file._id
	if (!fileId) return null

	// Deduplicate concurrent requests for the same file
	const existingPromise = activeDownloadPromises.get(fileId)
	if (existingPromise) return existingPromise

	const task = (async (): Promise<string | null> => {
		try {
			await ensureVideosFolder()
			const fileName = getVideoFileName(file)
			const fileUri = VIDEOS_FOLDER + fileName
			const tmpUri = `${fileUri}.tmp`

			if (await isCacheCompleteBySize(fileUri, file.size)) {
				return fileUri
			}
			// If a completed file exists but size mismatched, remove it
			const staleInfo = await getFileInfo(fileUri)
			if (staleInfo?.exists) await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {})

			const url = file.secure_url || file.url
			if (!url) return null

			// Try to resume from previous tmp + resumeData (secure_url supports HTTP Range via Cloudinary)
			let resumeData: string | null = null
			try {
				resumeData = await getItem<string>(getResumeKey(fileId))
			} catch {}
			if (resumeData) {
				try {
					const tmpInfo = await getFileInfo(tmpUri)
					if (!tmpInfo?.exists) {
						resumeData = null
						await removeItem(getResumeKey(fileId)).catch(() => {})
					}
				} catch {
					resumeData = null
				}
			}

			log({
				level: 'info',
				label: 'video-cache',
				message: resumeData ? 'Resuming video download' : 'Downloading video for cache',
				data: { fileId, fileName, resume: !!resumeData }
			})

			const progressCallback = (progress: FileSystem.DownloadProgressData): void => {
				if (onProgress && progress.totalBytesExpectedToWrite > 0) {
					onProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite)
				}
				if (progress.totalBytesWritten && progress.totalBytesExpectedToWrite) {
					const ratio = progress.totalBytesWritten / progress.totalBytesExpectedToWrite
					if (shouldPersistProgress(fileId, ratio)) {
						lastProgressPersist.set(fileId, { value: ratio, at: Date.now() })
						setItem(getProgressKey(fileId), ratio).catch(() => {})
					}
				}
			}

			let downloadResumable: FileSystem.DownloadResumable
			if (resumeData) {
				downloadResumable = FileSystem.createDownloadResumable(url, tmpUri, {}, progressCallback, resumeData)
			} else {
				downloadResumable = FileSystem.createDownloadResumable(url, tmpUri, {}, progressCallback)
			}
			activeDownloads.set(fileId, downloadResumable)

			const result = resumeData ? await downloadResumable.resumeAsync() : await downloadResumable.downloadAsync()
			activeDownloads.delete(fileId)
			await removeItem(getResumeKey(fileId)).catch(() => {})
			await removeItem(getProgressKey(fileId)).catch(() => {})
			lastProgressPersist.delete(fileId)

			if (!result?.uri) {
				await FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {})
				return null
			}
			const status = (result as unknown as { status?: number }).status
			if (status && status !== 200 && status !== 206) {
				await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {})
				return null
			}
			if (!(await isCacheCompleteBySize(result.uri, file.size))) {
				// Keep tmp for resume if partial content
				if (status === 206) {
					try {
						const resume = await (downloadResumable as unknown as { pauseAsync?: () => Promise<{ resumeData?: string }> }).pauseAsync?.()
						if (resume?.resumeData) await setItem(getResumeKey(fileId), resume.resumeData)
					} catch {}
				} else {
					await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {})
				}
				return null
			}
			await FileSystem.moveAsync({ from: result.uri, to: fileUri }).catch(async () => fileUri)
			log({ level: 'info', label: 'video-cache', message: 'Video cached', data: { fileId, uri: fileUri } })
			return fileUri
		} catch (err: unknown) {
			// If download was paused, persist resumeData for next resume
			try {
				const dl = activeDownloads.get(fileId)
				if (dl) {
					const resume = await (dl as unknown as { pauseAsync?: () => Promise<{ resumeData?: string }> }).pauseAsync?.()
					if (resume?.resumeData) await setItem(getResumeKey(fileId), resume.resumeData)
					activeDownloads.delete(fileId)
				}
			} catch {}
			lastProgressPersist.delete(fileId)
			log({ level: 'warn', label: 'video-cache', message: 'Failed to cache video', error: err })
			return null
		} finally {
			activeDownloadPromises.delete(fileId)
			activeDownloads.delete(fileId)
		}
	})()

	activeDownloadPromises.set(fileId, task)
	return task
}

export const pauseVideoDownload = async (fileId: string): Promise<void> => {
	if (Platform.OS === 'web') return
	const dl = activeDownloads.get(fileId)
	if (!dl) return
	try {
		const result = (await dl.pauseAsync()) as unknown as { resumeData?: string }
		if (result?.resumeData) await setItem(getResumeKey(fileId), result.resumeData)
		activeDownloads.delete(fileId)
		activeDownloadPromises.delete(fileId)
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Failed to pause video download', error: err })
	}
}

export const resumeVideoDownload = async (file: MediaFile): Promise<string | null> => {
	return cacheVideoFile(file)
}

/**
 * Fire-and-forget background cache — call when a video starts playing.
 * Does not block playback; next play will use the local file.
 */
export const prefetchVideoToCache = (file: MediaFile): void => {
	if (Platform.OS === 'web') return
	// Don't await — run in background
	cacheVideoFile(file).catch(() => {})
}

export const clearVideoCache = async (): Promise<void> => {
	if (Platform.OS === 'web') return
	try {
		await wipeAndRecreateDirectory(VIDEOS_FOLDER)
		// Clean orphaned resume/progress keys
		try {
			const allKeys = await getAllKeys()
			const staleKeys = allKeys.filter((k) => k.startsWith(VIDEO_RESUME_KEY_PREFIX) || k.startsWith(VIDEO_PROGRESS_KEY_PREFIX))
			for (const k of staleKeys) {
				await removeItem(k).catch(() => {})
			}
		} catch {}
		activeDownloads.clear()
		activeDownloadPromises.clear()
		lastProgressPersist.clear()
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Failed to clear video cache', error: err })
	}
}

const extractFileIdFromTmpName = (tmpFileName: string): string => {
	// tmpFileName is like "65f123abc.mp4.tmp" or "video_123.mov.tmp"
	// Remove .tmp first, then remove final extension
	const withoutTmp = tmpFileName.endsWith('.tmp') ? tmpFileName.slice(0, -4) : tmpFileName
	const dotIdx = withoutTmp.lastIndexOf('.')
	if (dotIdx === -1) return withoutTmp
	return withoutTmp.slice(0, dotIdx)
}

/** Startup sweep — keep .tmp with resumeData for resume, delete stale/corrupted */
export const performVideoCacheStartupCleanup = async (): Promise<void> => {
	if (Platform.OS === 'web') return
	try {
		await ensureVideosFolder()
		const files = await FileSystem.readDirectoryAsync(VIDEOS_FOLDER)
		for (const file of files) {
			const filePath = VIDEOS_FOLDER + file
			if (file.endsWith('.tmp')) {
				const fileId = extractFileIdFromTmpName(file)
				let hasResume = false
				try {
					const resumeData = await getItem<string>(getResumeKey(fileId))
					hasResume = !!resumeData
				} catch {}
				if (hasResume) continue
				try {
					const info = await getFileInfo(filePath)
					if (info?.exists && (info.size ?? 0) >= VIDEO_MIN_COMPLETE_BYTES) continue
				} catch {}
				await FileSystem.deleteAsync(filePath, { idempotent: true }).catch(() => {})
				continue
			}
			if (!file.endsWith('.mp4') && !file.endsWith('.mov') && !file.endsWith('.webm') && !file.endsWith('.m3u8')) {
				continue
			}
			const info = await getFileInfo(filePath)
			if (!info?.exists || (info.size ?? 0) < VIDEO_MIN_COMPLETE_BYTES) {
				await FileSystem.deleteAsync(filePath, { idempotent: true }).catch(() => {})
			}
		}
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Video startup cleanup failed', error: err })
	}
}

export const VIDEOS_FOLDER_URI = VIDEOS_FOLDER
