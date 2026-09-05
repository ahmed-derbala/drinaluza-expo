/**
 * Video download management — download with resume/pause, progress tracking.
 */

import { Platform } from 'react-native'
import { File, moveFile, getVideosDirectory } from '@disk'
import { log } from '@log'
import { setItem, removeItem } from '@storage'
import type { MediaFile } from '@smart-media/types'
import { VIDEO_PROGRESS_KEY_PREFIX } from './constants'
import { ensureVideosFolder, getVideoFileName, isCacheCompleteBySize } from './video-utils'

const getProgressKey = (fileId: string): string => `${VIDEO_PROGRESS_KEY_PREFIX}${fileId}`

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

	const existingPromise = activeDownloadPromises.get(fileId)
	if (existingPromise) return existingPromise

	const task = (async (): Promise<string | null> => {
		try {
			await ensureVideosFolder()
			const fileName = getVideoFileName(file)
			const videosDir = getVideosDirectory()
			const destFile = new File(videosDir, fileName)
			const tmpFile = new File(videosDir, `${fileName}.tmp`)
			const fileUri = destFile.uri

			if (await isCacheCompleteBySize(fileUri, file.size)) {
				return fileUri
			}

			const url = file.secure_url || file.url
			if (!url) return null

			log({
				level: 'info',
				label: 'video-cache',
				message: 'Downloading video for cache',
				data: { fileId, fileName }
			})

			const progressWrapper = (data: { bytesWritten: number; totalBytes: number }) => {
				if (onProgress && data.totalBytes > 0) {
					onProgress(data.bytesWritten / data.totalBytes)
				}
				if (data.bytesWritten && data.totalBytes) {
					const ratio = data.bytesWritten / data.totalBytes
					if (shouldPersistProgress(fileId, ratio)) {
						lastProgressPersist.set(fileId, { value: ratio, at: Date.now() })
						setItem(getProgressKey(fileId), ratio).catch(() => {})
					}
				}
			}

			// Use modern File.downloadFileAsync — single idempotent download, no resumeData
			// Ensures same secure_url is not fetched twice in parallel via activeDownloadPromises dedupe
			try {
				// Remove stale tmp if exists
				if (tmpFile.exists) {
					try {
						tmpFile.delete()
					} catch {}
				}
				const result = await File.downloadFileAsync(url, tmpFile, { idempotent: true, onProgress: progressWrapper } as any)
				if (!result?.uri) throw new Error('No uri in download result')
				await removeItem(getProgressKey(fileId)).catch(() => {})
				lastProgressPersist.delete(fileId)
				await moveFile(tmpFile.uri, destFile.uri)
				log({ level: 'info', label: 'video-cache', message: 'Video cached', data: { fileId, uri: fileUri } })
				return fileUri
			} catch (e) {
				// Keep tmp for debugging, but clean up on failure
				try {
					if (tmpFile.exists) tmpFile.delete()
				} catch {}
				throw e
			}
		} catch (err: unknown) {
			lastProgressPersist.delete(fileId)
			log({ level: 'warn', label: 'video-cache', message: 'Failed to cache video', error: err })
			return null
		} finally {
			activeDownloadPromises.delete(fileId)
		}
	})()

	activeDownloadPromises.set(fileId, task)
	return task
}

export const pauseVideoDownload = async (fileId: string): Promise<void> => {
	// Modern File.downloadFileAsync does not support pause — no-op, deduped via activeDownloadPromises
	if (Platform.OS === 'web') return
	activeDownloadPromises.delete(fileId)
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
	cacheVideoFile(file).catch(() => {})
}

/** Clear all download state — called by clearVideoCache. */
export const resetDownloadState = (): void => {
	activeDownloadPromises.clear()
	lastProgressPersist.clear()
}
