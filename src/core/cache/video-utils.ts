/**
 * Shared video cache utilities — folder management, file naming, size checks.
 */

import { Platform } from 'react-native'
import { log } from '@/core/log'
import type { MediaFile } from '@/core/smart-media/types'
import { ensureDirectory, getVideosDirectory, getFileInfo as diskGetFileInfo, deletePath } from '@/core/disk'

export const VIDEOS_FOLDER = (() => {
	if (Platform.OS === 'web') return ''
	try {
		const dir = getVideosDirectory()
		return (dir as any)?.uri ? (dir as any).uri + '/' : ''
	} catch {
		return ''
	}
})()
export const VIDEOS_FOLDER_URI = VIDEOS_FOLDER

export const ensureVideosFolder = async (): Promise<void> => {
	if (Platform.OS === 'web') return
	await ensureDirectory(getVideosDirectory())
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
		// Use disk layer (modern File) — accepts string uri
		const info = await diskGetFileInfo(uri)
		return info as FileInfo | null
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
				await deletePath(fileUri)
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
