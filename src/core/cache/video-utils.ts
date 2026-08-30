/**
 * Shared video cache utilities — folder management, file naming, size checks.
 */

import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { log } from '@/core/log'
import type { MediaFile } from '@/core/smart-media/types'
import { ensureDirectory } from './filesystem'

export const VIDEOS_FOLDER = (FileSystem.cacheDirectory || '') + 'videos/'
export const VIDEOS_FOLDER_URI = VIDEOS_FOLDER

export const ensureVideosFolder = async (): Promise<void> => {
	if (Platform.OS === 'web') return
	await ensureDirectory(VIDEOS_FOLDER)
}

export const sanitizeBaseName = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_')

export const getVideoFileName = (file: MediaFile): string => {
	// Always cache as .mp4 from secure_url — same URL used for play and cache.
	const rawBase = file._id || file.public_id || file.originalname || 'video'
	const withoutExt = rawBase.includes('.') && !file._id ? rawBase.replace(/\.[^/.]+$/, '') : rawBase
	const safeBase = sanitizeBaseName(withoutExt)
	return `${safeBase}.mp4`
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

export const isCacheCompleteBySize = async (fileUri: string, _expectedSize?: number): Promise<boolean> => {
	// Size checks removed per product requirement — only existence matters.
	// .tmp is only deleted when resume fails (see video-download.ts).
	const info = await getFileInfo(fileUri)
	return !!info?.exists
}

export const getCachedVideoUri = async (file: MediaFile): Promise<string | null> => {
	if (Platform.OS === 'web') return null
	if (!file?._id) return null
	try {
		const fileName = getVideoFileName(file)
		const fileUri = VIDEOS_FOLDER + fileName
		const info = await getFileInfo(fileUri)
		if (!info?.exists) return null
		// Guard against truncated/corrupt files left by an interrupted
		// download that was incorrectly moved or by a previous buggy cache
		// that stored tiny files. Such files cause expo-video to stay in
		// `loading` forever (spinner indefinite) because the decoder never
		// reaches ready nor error.
		if (typeof info.size === 'number' && info.size < 100 * 1024) {
			log({ level: 'warn', label: 'video-cache', message: 'Cached video too small, treating as miss', data: { fileUri, size: info.size } })
			try {
				await FileSystem.deleteAsync(fileUri, { idempotent: true })
			} catch {}
			return null
		}
		if (info?.exists) return fileUri
		return null
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Failed to check cached video', error: err })
		return null
	}
}
