/**
 * Video cache cleanup — clear all cached videos and startup sweep.
 */

import { Platform } from 'react-native'
import { log } from '@/core/log'
import { removeItem, getAllKeys } from '@/core/storage'
import { VIDEO_RESUME_KEY_PREFIX, VIDEO_PROGRESS_KEY_PREFIX } from './constants'
import { wipeAndRecreateDirectory } from './filesystem'
import { VIDEOS_FOLDER } from './video-utils'
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

/** Startup sweep removed — .tmp is now only deleted when resume fails (see video-download.ts) */
export const performVideoCacheStartupCleanup = async (): Promise<void> => {
	return
}
