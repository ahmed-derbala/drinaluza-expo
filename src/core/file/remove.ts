/**
 * File Remove Utilities
 * Handles removing/deleting files
 */

import * as FileSystem from 'expo-file-system/legacy'
import { getApiClient } from '../api'
import { FileRemoveOptions, RemoveResult } from './types'

/**
 * Remove a local file
 */
const removeLocalFile = async (options: FileRemoveOptions): Promise<RemoveResult> => {
	try {
		const { uri } = options

		// Check if file exists
		const fileInfo = await FileSystem.getInfoAsync(uri)
		if (!fileInfo.exists) {
			return {
				success: false,
				error: 'File does not exist'
			}
		}

		// Delete the file
		await FileSystem.deleteAsync(uri)

		return {
			success: true
		}
	} catch (error: any) {
		return {
			success: false,
			error: error.message || 'Failed to remove file'
		}
	}
}

/**
 * Remove a file from server
 */
const removeServerFile = async (fileId: string): Promise<RemoveResult> => {
	try {
		const apiClient = getApiClient()
		await apiClient.delete(`/files/${fileId}`)

		return {
			success: true
		}
	} catch (error: any) {
		return {
			success: false,
			error: error.message || 'Failed to remove file from server'
		}
	}
}

/**
 * Clear cache directory
 */
const clearCache = async (): Promise<RemoveResult> => {
	try {
		const cacheDir = FileSystem.cacheDirectory
		if (!cacheDir) {
			return {
				success: false,
				error: 'Cache directory not available'
			}
		}

		await FileSystem.deleteAsync(cacheDir, { idempotent: true })

		return {
			success: true
		}
	} catch (error: any) {
		return {
			success: false,
			error: error.message || 'Failed to clear cache'
		}
	}
}

/**
 * Remove multiple local files
 */
const removeMultipleLocalFiles = async (uris: string[]): Promise<RemoveResult[]> => {
	const results: RemoveResult[] = []

	for (const uri of uris) {
		const result = await removeLocalFile({ uri })
		results.push(result)
	}

	return results
}
