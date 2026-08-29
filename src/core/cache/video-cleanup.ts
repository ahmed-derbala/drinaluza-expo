/**
 * Video cache cleanup — clear all cached videos and startup sweep.
 */

import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { log } from '@/core/log'
import { getItem, removeItem, getAllKeys } from '@/core/storage'
import { VIDEO_RESUME_KEY_PREFIX, VIDEO_PROGRESS_KEY_PREFIX, VIDEO_MIN_COMPLETE_BYTES } from './constants'
import { wipeAndRecreateDirectory } from './filesystem'
import { VIDEOS_FOLDER, getFileInfo, ensureVideosFolder } from './video-utils'
import { resetDownloadState } from './video-download'

export const clearVideoCache = async (): Promise<void> => {
	if (Platform.OS === 'web') return
	try {
		await wipeAndRecreateDirectory(VIDEOS_FOLDER)
		try {
			const allKeys = await getAllKeys()
			const staleKeys = allKeys.filter((k) => k.startsWith(VIDEO_RESUME_KEY_PREFIX) || k.startsWith(VIDEO_PROGRESS_KEY_PREFIX))
			for (const k of staleKeys) {
				await removeItem(k).catch(() => {})
			}
		} catch {}
		resetDownloadState()
	} catch (err) {
		log({ level: 'warn', label: 'video-cache', message: 'Failed to clear video cache', error: err })
	}
}

const extractFileIdFromTmpName = (tmpFileName: string): string => {
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
					const resumeData = await getItem<string>(`${VIDEO_RESUME_KEY_PREFIX}${fileId}`)
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
