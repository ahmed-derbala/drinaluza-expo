/**
 * File Download Utilities
 * Handles downloading files from server
 */

import * as FileSystem from 'expo-file-system/legacy'
import { FileDownloadOptions, DownloadResult } from './types'

/**
 * Download a file from URL
 */
const downloadFile = async (options: FileDownloadOptions): Promise<DownloadResult> => {
	try {
		const { url, fileName, destination, onProgress, headers = {} } = options

		// Determine destination path - require destination to be provided or use a temp path
		const fileUri = destination || `${FileSystem.cacheDirectory || ''}${fileName}`

		// Create download resumable
		const downloadResumable = FileSystem.createDownloadResumable(
			url,
			fileUri,
			{
				headers
			},
			(downloadProgress) => {
				if (onProgress) {
					const progress = downloadProgress.totalBytesExpectedToWrite > 0 ? Math.round((downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100) : 0
					onProgress(progress)
				}
			}
		)

		// Start download
		const result = await downloadResumable.downloadAsync()

		if (result && result.uri) {
			return {
				success: true,
				localUri: result.uri
			}
		} else {
			return {
				success: false,
				error: 'Download failed'
			}
		}
	} catch (error: any) {
		return {
			success: false,
			error: error.message || 'Download failed'
		}
	}
}

/**
 * Download and share a file
 * Note: Requires expo-sharing to be installed
 */
const downloadAndShare = async (options: FileDownloadOptions): Promise<DownloadResult> => {
	try {
		const downloadResult = await downloadFile(options)

		if (downloadResult.success && downloadResult.localUri) {
			// Try to use expo-sharing if available
			try {
				const Sharing = require('expo-sharing')
				const isAvailable = await Sharing.isAvailableAsync()
				if (isAvailable) {
					await Sharing.shareAsync(downloadResult.localUri)
				}
			} catch (shareError) {
				// expo-sharing not installed, skip sharing
				console.warn('expo-sharing not installed, skipping share functionality')
			}
		}

		return downloadResult
	} catch (error: any) {
		return {
			success: false,
			error: error.message || 'Download and share failed'
		}
	}
}

/**
 * Download file to cache directory
 */
const downloadToCache = async (url: string, fileName: string): Promise<DownloadResult> => {
	return downloadFile({
		url,
		fileName,
		destination: `${FileSystem.cacheDirectory || ''}${fileName}`
	})
}

/**
 * Get file size from URL (without downloading)
 */
const getFileSizeFromUrl = async (url: string): Promise<number> => {
	try {
		const response = await fetch(url, { method: 'HEAD' })
		const contentLength = response.headers.get('content-length')
		return contentLength ? parseInt(contentLength, 10) : 0
	} catch (error) {
		return 0
	}
}
