/**
 * Video file cache — mirrors `UpdatesContext` APK caching but for played videos.
 *
 * Stores MP4s (via `secure_url`) under `FileSystem.documentDirectory + 'videos/'`
 * so a played video can be replayed offline without re-streaming HLS.
 * HLS `playback_url` (.m3u8) is not cached as a single file; we cache the MP4 fallback.
 */

import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { log } from '@/core/log'
import { getItem, setItem, removeItem } from '@/core/storage'
import type { MediaFile } from './types'

const VIDEOS_FOLDER = (FileSystem.documentDirectory || '') + 'videos/'

const getResumeKey = (fileId: string) => `video:resume:${fileId}`
const getProgressKey = (fileId: string) => `video:progress:${fileId}`

const ensureVideosFolder = async (): Promise<void> => {
	if (Platform.OS === 'web') return
	try {
		const info = await FileSystem.getInfoAsync(VIDEOS_FOLDER)
		if (!info.exists) {
			await FileSystem.makeDirectoryAsync(VIDEOS_FOLDER, { intermediates: true })
		}
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Failed to create videos folder', error: err })
	}
}

const getVideoFileName = (file: MediaFile): string => {
	const ext = file.format ? file.format.toLowerCase() : 'mp4'
	// Use _id as stable filename; fallback to public_id or sanitized originalname
	const base = file._id || file.public_id || file.originalname || 'video'
	const safeBase = base.replace(/[^a-zA-Z0-9._-]/g, '_')
	return `${safeBase}.${ext}`
}

const isCacheCompleteBySize = async (fileUri: string, expectedSize?: number): Promise<boolean> => {
	try {
		const info: any = await FileSystem.getInfoAsync(fileUri)
		if (!info.exists) return false
		const size = info.size || 0
		if (size < 100 * 1024) return false
		if (expectedSize && expectedSize > 0) {
			// Only size matters — must be at least 95% of expected (like UpdatesContext)
			return size >= expectedSize * 0.95
		}
		return size > 100 * 1024
	} catch {
		return false
	}
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
		// Corrupted/truncated file left by kill — delete so next prefetch retries cleanly (only by size)
		try {
			const info: any = await FileSystem.getInfoAsync(fileUri)
			if (info.exists) await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {})
		} catch {}
		return null
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Failed to check cached video', error: err })
		return null
	}
}

const activeDownloads = new Map<string, FileSystem.DownloadResumable>()

export const cacheVideoFile = async (file: MediaFile, onProgress?: (p: number) => void): Promise<string | null> => {
	if (Platform.OS === 'web') return null
	if (!file?.secure_url && !file?.url) return null
	const fileId = file._id
	if (!fileId) return null
	try {
		await ensureVideosFolder()
		const fileName = getVideoFileName(file)
		const fileUri = VIDEOS_FOLDER + fileName
		const tmpUri = fileUri + '.tmp'
		if (await isCacheCompleteBySize(fileUri, file.size)) {
			return fileUri
		}
		// If a completed file exists but size mismatched, remove it
		try {
			const info: any = await FileSystem.getInfoAsync(fileUri)
			if (info.exists) await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {})
		} catch {}
		const url = file.secure_url || file.url
		if (!url) return null
		// Try to resume from previous tmp + resumeData (secure_url supports HTTP Range via Cloudinary)
		let resumeData: string | null = null
		try {
			resumeData = await getItem<string>(getResumeKey(fileId))
		} catch {}
		let downloadResumable: FileSystem.DownloadResumable
		if (resumeData) {
			try {
				const tmpInfo: any = await FileSystem.getInfoAsync(tmpUri)
				if (!tmpInfo.exists) {
					resumeData = null
					await removeItem(getResumeKey(fileId)).catch(() => {})
				}
			} catch {
				resumeData = null
			}
		}
		log({ level: 'info', label: 'video-cache', message: resumeData ? 'Resuming video download' : 'Downloading video for cache', data: { fileId, fileName, resume: !!resumeData } })
		if (resumeData) {
			downloadResumable = FileSystem.createDownloadResumable(
				url,
				tmpUri,
				{},
				(progress) => {
					if (onProgress && progress.totalBytesExpectedToWrite > 0) {
						onProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite)
					}
					if (progress.totalBytesWritten && progress.totalBytesExpectedToWrite) {
						setItem(getProgressKey(fileId), progress.totalBytesWritten / progress.totalBytesExpectedToWrite).catch(() => {})
					}
				},
				resumeData
			)
		} else {
			downloadResumable = FileSystem.createDownloadResumable(url, tmpUri, {}, (progress) => {
				if (onProgress && progress.totalBytesExpectedToWrite > 0) {
					onProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite)
				}
			})
		}
		activeDownloads.set(fileId, downloadResumable)
		const result = resumeData ? await downloadResumable.resumeAsync() : await downloadResumable.downloadAsync()
		activeDownloads.delete(fileId)
		await removeItem(getResumeKey(fileId)).catch(() => {})
		await removeItem(getProgressKey(fileId)).catch(() => {})
		if (!result?.uri) {
			await FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {})
			return null
		}
		if ((result as any).status && (result as any).status !== 200 && (result as any).status !== 206) {
			await FileSystem.deleteAsync(result.uri, { idempotent: true }).catch(() => {})
			return null
		}
		if (!(await isCacheCompleteBySize(result.uri, file.size))) {
			// Keep tmp for resume if not complete and not a final 200
			if ((result as any).status === 206) {
				try {
					const resume = await (downloadResumable as any).pauseAsync?.()
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
	} catch (err: any) {
		// If download was paused, persist resumeData for next resume
		try {
			const dl = activeDownloads.get(fileId)
			if (dl) {
				const resume = await (dl as any).pauseAsync?.()
				if (resume?.resumeData) await setItem(getResumeKey(fileId), resume.resumeData)
				activeDownloads.delete(fileId)
			}
		} catch {}
		log({ level: 'warn', label: 'video-cache', message: 'Failed to cache video', error: err })
		return null
	}
}

export const pauseVideoDownload = async (fileId: string): Promise<void> => {
	if (Platform.OS === 'web') return
	const dl = activeDownloads.get(fileId)
	if (!dl) return
	try {
		const result: any = await dl.pauseAsync()
		if (result?.resumeData) await setItem(getResumeKey(fileId), result.resumeData)
		activeDownloads.delete(fileId)
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
		const info = await FileSystem.getInfoAsync(VIDEOS_FOLDER)
		if (info.exists) {
			await FileSystem.deleteAsync(VIDEOS_FOLDER, { idempotent: true })
			await FileSystem.makeDirectoryAsync(VIDEOS_FOLDER, { intermediates: true })
		}
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Failed to clear video cache', error: err })
	}
}

/** Startup sweep — like UpdatesContext.performStartupCleanup: keep .tmp with resumeData for resume, delete stale/corrupted */
export const performVideoCacheStartupCleanup = async (): Promise<void> => {
	if (Platform.OS === 'web') return
	try {
		await ensureVideosFolder()
		const files = await FileSystem.readDirectoryAsync(VIDEOS_FOLDER)
		for (const file of files) {
			const filePath = VIDEOS_FOLDER + file
			if (file.endsWith('.tmp')) {
				// Keep tmp if we have resumeData for its fileId (supports pause/resume via secure_url Range)
				const fileId = file.replace(/\.tmp$/, '').replace(/\.[^.]+$/, '')
				try {
					const resumeData = await getItem<string>(getResumeKey(fileId))
					if (resumeData) continue
				} catch {}
				// No resumeData — check size, keep only if >100KB (may be resumable without resumeData on some FS)
				try {
					const info: any = await FileSystem.getInfoAsync(filePath)
					if (info.exists && (info.size || 0) >= 100 * 1024) continue
				} catch {}
				await FileSystem.deleteAsync(filePath, { idempotent: true }).catch(() => {})
				continue
			}
			if (!file.endsWith('.mp4') && !file.endsWith('.mov') && !file.endsWith('.webm') && !file.endsWith('.m3u8')) {
				continue
			}
			// Only size matters for completion — like UpdatesContext verifyFileIntegrity 95% check
			const info: any = await FileSystem.getInfoAsync(filePath)
			if (!info.exists || (info.size || 0) < 100 * 1024) {
				await FileSystem.deleteAsync(filePath, { idempotent: true }).catch(() => {})
			}
		}
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Video startup cleanup failed', error: err })
	}
}

export const VIDEOS_FOLDER_URI = VIDEOS_FOLDER
