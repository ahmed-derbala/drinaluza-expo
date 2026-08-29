/**
 * Shared video cache utilities — folder management, file naming, size checks.
 */

import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { log } from '@/core/log'
import type { MediaFile } from '@/core/smart-media/types'
import { VIDEO_MIN_COMPLETE_BYTES, VIDEO_SIZE_TOLERANCE } from './constants'
import { ensureDirectory } from './filesystem'

export const VIDEOS_FOLDER = (FileSystem.cacheDirectory || '') + 'videos/'
export const VIDEOS_FOLDER_URI = VIDEOS_FOLDER

export const ensureVideosFolder = async (): Promise<void> => {
	if (Platform.OS === 'web') return
	await ensureDirectory(VIDEOS_FOLDER)
}

export const sanitizeBaseName = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_')

export const getVideoFileName = (file: MediaFile): string => {
	const ext = file.format ? file.format.toLowerCase().replace(/^\./, '') : 'mp4'
	const rawBase = file._id || file.public_id || file.originalname || 'video'
	const withoutExt = rawBase.includes('.') && !file._id ? rawBase.replace(/\.[^/.]+$/, '') : rawBase
	const safeBase = sanitizeBaseName(withoutExt)
	return `${safeBase}.${ext}`
}

export interface FileInfo {
	exists: boolean
	isDirectory?: boolean
	size?: number
	uri?: string
}

export const getFileInfo = async (uri: string): Promise<FileInfo | null> => {
	try {
		const info = (await FileSystem.getInfoAsync(uri, { size: true } as any)) as FileInfo & { exists: boolean }
		return info
	} catch {
		return null
	}
}

export const isCacheCompleteBySize = async (fileUri: string, expectedSize?: number): Promise<boolean> => {
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
		const info = await getFileInfo(fileUri)
		if (info?.exists) await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {})
		return null
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Failed to check cached video', error: err })
		return null
	}
}
