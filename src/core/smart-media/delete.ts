/**
 * Media delete helper.
 *
 * Uses `DELETE /api/files/:fileId`.
 */

import { getApiClient } from '@/core/api'
import { log } from '@/core/log'
import { invalidateMediaCache } from './cache'

/** Delete a media file by its id. Resolves when the file was removed. */
export const deleteMediaFile = async (fileId: string): Promise<void> => {
	try {
		await getApiClient().delete(`/files/${fileId}`)
		await invalidateMediaCache(fileId)
	} catch (error) {
		log({ level: 'error', label: 'smart-media', message: `Failed to delete media file: ${fileId}`, error })
		throw error
	}
}
