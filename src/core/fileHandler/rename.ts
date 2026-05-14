/**
 * File Rename Utilities
 * Handles renaming files
 */

import * as FileSystem from 'expo-file-system'
import { FileRenameOptions, RenameResult } from './types'

/**
 * Rename a local file
 */
export const renameLocalFile = async (options: FileRenameOptions): Promise<RenameResult> => {
	try {
		const { oldUri, newName } = options

		// Check if file exists
		const fileInfo = await FileSystem.getInfoAsync(oldUri)
		if (!fileInfo.exists) {
			return {
				success: false,
				error: 'File does not exist'
			}
		}

		// Extract directory path from old URI
		const pathParts = oldUri.split('/')
		pathParts.pop() // Remove old filename
		const directory = pathParts.join('/')

		// Create new URI
		const newUri = `${directory}/${newName}`

		// Move/rename the file
		await FileSystem.moveAsync({
			from: oldUri,
			to: newUri
		})

		return {
			success: true,
			newUri
		}
	} catch (error: any) {
		return {
			success: false,
			error: error.message || 'Failed to rename file'
		}
	}
}

/**
 * Rename a file on the server
 */
export const renameServerFile = async (fileId: string, newName: string): Promise<RenameResult> => {
	try {
		const apiClient = (await import('../api')).getApiClient()
		await apiClient.patch(`/files/${fileId}`, { name: newName })

		return {
			success: true
		}
	} catch (error: any) {
		return {
			success: false,
			error: error.message || 'Failed to rename file on server'
		}
	}
}

/**
 * Sanitize file name (remove invalid characters)
 */
export const sanitizeFileName = (fileName: string): string => {
	// Remove or replace invalid characters
	return fileName
		.replace(/[<>:"/\\|?*]/g, '_') // Replace invalid characters with underscore
		.replace(/\s+/g, '_') // Replace spaces with underscores
		.substring(0, 255) // Limit length to 255 characters
}

/**
 * Generate unique file name
 */
export const generateUniqueFileName = (originalName: string): string => {
	const timestamp = Date.now()
	const randomString = Math.random().toString(36).substring(2, 8)
	const extension = originalName.split('.').pop()
	const nameWithoutExtension = originalName.replace(`.${extension}`, '')

	return `${nameWithoutExtension}_${timestamp}_${randomString}.${extension}`
}
