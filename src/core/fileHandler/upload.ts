/**
 * File Upload Utilities
 * Handles uploading files to server
 */

import * as FileSystem from 'expo-file-system/legacy'
import { Platform } from 'react-native'
import { getApiClient } from '../api'
import { FileUploadOptions, UploadResult, FileInfo, FileType, FileMimeType } from './types'

/**
 * Get file type from MIME type
 */
const getFileTypeFromMimeType = (mimeType: string): FileType => {
	if (mimeType.startsWith('image/')) return 'image'
	if (mimeType.startsWith('video/')) return 'video'
	if (mimeType.startsWith('audio/')) return 'audio'
	if (mimeType.startsWith('application/') || mimeType.startsWith('text/')) return 'document'
	return 'other'
}

/**
 * Get file info from URI
 */
export const getFileInfo = async (uri: string): Promise<FileInfo> => {
	// On web, skip file info retrieval and return basic info
	if (Platform.OS === 'web') {
		const fileName = uri.split('/').pop() || 'unknown'
		const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''

		// Map extension to MIME type
		const mimeTypeMap: Record<string, FileMimeType> = {
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			gif: 'image/gif',
			webp: 'image/webp',
			mp4: 'video/mp4',
			mpeg: 'video/mpeg',
			mov: 'video/quicktime',
			mp3: 'audio/mpeg',
			wav: 'audio/wav',
			aac: 'audio/aac',
			pdf: 'application/pdf',
			doc: 'application/msword',
			docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
			xls: 'application/vnd.ms-excel',
			xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			txt: 'text/plain',
			zip: 'application/zip'
		}

		const mimeType = mimeTypeMap[fileExtension] || '*/*'
		const type = getFileTypeFromMimeType(mimeType)

		return {
			uri,
			name: fileName,
			size: 0, // Cannot get size on web without File object
			type,
			mimeType
		}
	}

	const fileInfo = await FileSystem.getInfoAsync(uri)
	if (!fileInfo.exists) {
		throw new Error('File does not exist')
	}

	const fileName = uri.split('/').pop() || 'unknown'
	const fileExtension = fileName.split('.').pop()?.toLowerCase() || ''

	// Map extension to MIME type
	const mimeTypeMap: Record<string, FileMimeType> = {
		jpg: 'image/jpeg',
		jpeg: 'image/jpeg',
		png: 'image/png',
		gif: 'image/gif',
		webp: 'image/webp',
		mp4: 'video/mp4',
		mpeg: 'video/mpeg',
		mov: 'video/quicktime',
		mp3: 'audio/mpeg',
		wav: 'audio/wav',
		aac: 'audio/aac',
		pdf: 'application/pdf',
		doc: 'application/msword',
		docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		xls: 'application/vnd.ms-excel',
		xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
		txt: 'text/plain',
		zip: 'application/zip'
	}

	const mimeType = mimeTypeMap[fileExtension] || '*/*'
	const type = getFileTypeFromMimeType(mimeType)

	return {
		uri,
		name: fileName,
		size: fileInfo.size || 0,
		type,
		mimeType,
		lastModified: fileInfo.modificationTime ? new Date(fileInfo.modificationTime).getTime() : undefined
	}
}

/**
 * Upload a file to the server
 */
export const uploadFile = async (options: FileUploadOptions): Promise<UploadResult> => {
	try {
		const { uri, name, type, fileType = 'image', fieldName = 'files', onProgress, headers = {}, fileObj } = options

		console.log('uploadFile called with:', { uri, name, type, fileType, fieldName, hasFileObj: !!fileObj })

		// Get file info (skipped on web)
		const fileInfo = await getFileInfo(uri)
		console.log('File info:', fileInfo)

		// Create form data
		const formData = new FormData()

		// On web, use File object directly; on native, use uri
		if (Platform.OS === 'web') {
			if (fileObj) {
				formData.append(fieldName, fileObj)
				console.log('Appended file object to FormData')
			} else if (uri instanceof File) {
				formData.append(fieldName, uri as any)
				console.log('Appended File instance to FormData')
			} else if (typeof uri === 'string') {
				// Fallback for web if only uri is provided
				const response = await fetch(uri)
				const blob = await response.blob()
				formData.append(fieldName, new File([blob], name, { type: type }))
				console.log('Fetched and appended blob to FormData')
			}
		} else {
			formData.append(fieldName, {
				uri: uri,
				name: name,
				type: type
			} as any)
			console.log('Appended native file object to FormData')
		}

		// Log FormData contents (for debugging)
		console.log('FormData entries:', Array.from(formData.entries()))

		// Upload to server using the specified API endpoint
		const apiClient = getApiClient()

		console.log('Sending request to:', `/files/upload?fileType=${fileType}`)

		// Don't set Content-Type header - let axios set it automatically with the correct boundary
		const response = await apiClient.post(`/files/upload?fileType=${fileType}`, formData, {
			headers: {
				...headers
			},
			onUploadProgress: (progressEvent) => {
				if (onProgress && progressEvent.total) {
					const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total)
					onProgress(progress)
				}
			}
		})

		console.log('Upload response:', response.data)

		return {
			success: true,
			fileUrl: response.data.url,
			fileId: response.data.id
		}
	} catch (error: any) {
		console.error('Upload error:', error)
		console.error('Error response:', error.response?.data)
		return {
			success: false,
			error: error.response?.data?.message || error.message || 'Upload failed'
		}
	}
}

/**
 * Upload multiple files
 */
export const uploadMultipleFiles = async (files: FileUploadOptions[], onProgress?: (current: number, total: number, fileProgress: number) => void): Promise<UploadResult[]> => {
	const results: UploadResult[] = []

	for (let i = 0; i < files.length; i++) {
		const result = await uploadFile({
			...files[i],
			onProgress: (progress) => {
				if (onProgress) {
					onProgress(i + 1, files.length, progress)
				}
			}
		})
		results.push(result)
	}

	return results
}

/**
 * Upload file as base64 string
 */
export const uploadFileAsBase64 = async (uri: string): Promise<string> => {
	try {
		// On web, use FileReader to convert File to base64
		// @ts-ignore - uri can be File object on web
		if (Platform.OS === 'web' && uri instanceof File) {
			return new Promise((resolve, reject) => {
				const reader = new FileReader()
				reader.onload = () => {
					const result = reader.result as string
					// Remove data URL prefix (e.g., "data:image/jpeg;base64,")
					const base64 = result.split(',')[1]
					resolve(base64)
				}
				reader.onerror = () => reject(new Error('Failed to read file'))
				reader.readAsDataURL(uri)
			})
		}

		const base64 = await FileSystem.readAsStringAsync(uri, {
			encoding: 'base64'
		})
		return base64
	} catch (error) {
		throw new Error('Failed to convert file to base64')
	}
}
