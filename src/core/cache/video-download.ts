/**
 * Video download management — download with resume/pause, progress tracking.
 */

import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { log } from '@/core/log'
import { getItem, setItem, removeItem } from '@/core/storage'
import type { MediaFile } from '@/core/smart-media/types'
import { VIDEO_RESUME_KEY_PREFIX, VIDEO_PROGRESS_KEY_PREFIX } from './constants'
import { VIDEOS_FOLDER, ensureVideosFolder, getVideoFileName, getFileInfo, isCacheCompleteBySize } from './video-utils'

const getResumeKey = (fileId: string): string => `${VIDEO_RESUME_KEY_PREFIX}${fileId}`
const getProgressKey = (fileId: string): string => `${VIDEO_PROGRESS_KEY_PREFIX}${fileId}`

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

			const url = file.secure_url || file.url
			if (!url) return null

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

			const doDownload = async (useResume: string | null): Promise<string | null> => {
				const resumable = useResume ? FileSystem.createDownloadResumable(url, tmpUri, {}, progressCallback, useResume) : FileSystem.createDownloadResumable(url, tmpUri, {}, progressCallback)
				activeDownloads.set(fileId, resumable)
				try {
					const result = useResume ? await resumable.resumeAsync() : await resumable.downloadAsync()
					activeDownloads.delete(fileId)
					if (!result?.uri) throw new Error('No uri in download result')
					const status = (result as unknown as { status?: number }).status
					if (status && status !== 200 && status !== 206) throw new Error(`Bad status ${status}`)
					// Success — clear resume/progress and move to final location
					await removeItem(getResumeKey(fileId)).catch(() => {})
					await removeItem(getProgressKey(fileId)).catch(() => {})
					lastProgressPersist.delete(fileId)
					await FileSystem.moveAsync({ from: result.uri, to: fileUri }).catch(async () => fileUri)
					log({ level: 'info', label: 'video-cache', message: 'Video cached', data: { fileId, uri: fileUri } })
					return fileUri
				} catch (e) {
					activeDownloads.delete(fileId)
					// Only delete .tmp when resume fails — per product requirement
					if (useResume) {
						log({ level: 'warn', label: 'video-cache', message: 'Resume failed, deleting .tmp and restarting fresh', error: e })
						await FileSystem.deleteAsync(tmpUri, { idempotent: true }).catch(() => {})
						await removeItem(getResumeKey(fileId)).catch(() => {})
						await removeItem(getProgressKey(fileId)).catch(() => {})
						lastProgressPersist.delete(fileId)
						// Restart fresh download once
						return doDownload(null)
					}
					// Fresh download failed — keep .tmp for next resume attempt (save resumeData if possible)
					try {
						const resume = await (resumable as unknown as { pauseAsync?: () => Promise<{ resumeData?: string }> }).pauseAsync?.()
						if (resume?.resumeData) await setItem(getResumeKey(fileId), resume.resumeData)
					} catch {}
					throw e
				}
			}

			return await doDownload(resumeData)
		} catch (err: unknown) {
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
	cacheVideoFile(file).catch(() => {})
}

/** Clear all download state — called by clearVideoCache. */
export const resetDownloadState = (): void => {
	activeDownloads.clear()
	activeDownloadPromises.clear()
	lastProgressPersist.clear()
}
