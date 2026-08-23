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
import type { MediaFile } from './types'

const VIDEOS_FOLDER = (FileSystem.documentDirectory || '') + 'videos/'

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

export const getCachedVideoUri = async (file: MediaFile): Promise<string | null> => {
	if (Platform.OS === 'web') return null
	if (!file?._id) return null
	try {
		const fileName = getVideoFileName(file)
		const fileUri = VIDEOS_FOLDER + fileName
		const info: any = await FileSystem.getInfoAsync(fileUri)
		if (info.exists && (info.size || 0) > 1024) {
			return fileUri
		}
		return null
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Failed to check cached video', error: err })
		return null
	}
}

export const cacheVideoFile = async (file: MediaFile, onProgress?: (p: number) => void): Promise<string | null> => {
	if (Platform.OS === 'web') return null
	if (!file?.secure_url && !file?.url) return null
	try {
		await ensureVideosFolder()
		const fileName = getVideoFileName(file)
		const fileUri = VIDEOS_FOLDER + fileName
		const info: any = await FileSystem.getInfoAsync(fileUri)
		if (info.exists && (info.size || 0) > 1024) {
			return fileUri
		}
		const url = file.secure_url || file.url
		if (!url) return null
		log({ level: 'info', label: 'video-cache', message: 'Downloading video for cache', data: { fileId: file._id, fileName } })
		const downloadResumable = FileSystem.createDownloadResumable(url, fileUri, {}, (progress) => {
			if (onProgress && progress.totalBytesExpectedToWrite > 0) {
				onProgress(progress.totalBytesWritten / progress.totalBytesExpectedToWrite)
			}
		})
		const result = await downloadResumable.downloadAsync()
		if (result?.uri) {
			log({ level: 'info', label: 'video-cache', message: 'Video cached', data: { fileId: file._id, uri: result.uri } })
			return result.uri
		}
		return null
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Failed to cache video', error: err })
		return null
	}
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

export const VIDEOS_FOLDER_URI = VIDEOS_FOLDER
