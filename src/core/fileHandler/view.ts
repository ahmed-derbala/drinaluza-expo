/**
 * File View Utilities
 * Handles viewing images and documents
 */

import * as Linking from 'expo-linking'
import { FileViewOptions, ViewResult } from './types'

/**
 * Open a file using the default viewer
 */
export const viewFile = async (options: FileViewOptions): Promise<ViewResult> => {
	try {
		const { uri, type } = options

		// Check if the URI can be opened
		const canOpen = await Linking.canOpenURL(uri)
		if (!canOpen) {
			return {
				success: false,
				error: 'Cannot open this file type'
			}
		}

		// Open the file
		await Linking.openURL(uri)

		return {
			success: true
		}
	} catch (error: any) {
		return {
			success: false,
			error: error.message || 'Failed to open file'
		}
	}
}

/**
 * View an image
 */
export const viewImage = async (uri: string): Promise<ViewResult> => {
	return viewFile({ uri, type: 'image' })
}

/**
 * View a document
 */
export const viewDocument = async (uri: string): Promise<ViewResult> => {
	return viewFile({ uri, type: 'document' })
}

/**
 * Check if a file type is viewable
 */
export const isViewable = (type: string): boolean => {
	const viewableTypes = [
		'image/jpeg',
		'image/png',
		'image/gif',
		'image/webp',
		'application/pdf',
		'text/plain',
		'application/msword',
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		'application/vnd.ms-excel',
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	]
	return viewableTypes.includes(type)
}

/**
 * Get file extension from URI
 */
export const getFileExtension = (uri: string): string => {
	const parts = uri.split('.')
	return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : ''
}
