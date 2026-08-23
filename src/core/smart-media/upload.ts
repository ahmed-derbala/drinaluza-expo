/**
 * Media upload helpers.
 *
 * Uses `POST /api/files/upload` with multipart form-data:
 * - `thumbnail` (single file)
 * - `gallery` (multiple files, max MAX_FILE_COUNT per request)
 * - `targetModelName` (users | products | businesses | default-products)
 * - `targetModelId` (the owning document _id)
 *
 * The backend attaches uploaded files directly to the target model's
 * `media.thumbnail` / `media.gallery` fields.
 */

import { Platform } from 'react-native'
import { getApiClient } from '@/core/api'
import { log } from '@/core/log'
import { parseError } from '@/core/error/errorHandler'
import { ConnectionService } from '@/core/connection'
import { MAX_FILE_COUNT, UPLOAD_TIMEOUT_IMAGE_MS, UPLOAD_TIMEOUT_VIDEO_MS, type TargetModelName } from './constants'
import type { MediaFile } from './types'
import type { PickedMediaFile } from './picker'

/** A file to be uploaded (picked via `pickMediaFiles` or built manually). */
export interface UploadMediaFile extends PickedMediaFile {}

export interface UploadMediaOptions {
	targetModelName: TargetModelName
	targetModelId: string
	/** Single file uploaded under the `thumbnail` field. */
	thumbnail?: UploadMediaFile
	/** Files uploaded under the `gallery` field (max MAX_FILE_COUNT per request). */
	gallery?: UploadMediaFile[]
	onProgress?: (progress: number) => void
}

export interface UploadMediaResult {
	files: MediaFile[]
}

const appendFileToFormData = (formData: FormData, fieldName: 'thumbnail' | 'gallery', file: UploadMediaFile): void => {
	if (Platform.OS === 'web') {
		// On web, expo-document-picker exposes the raw File object.
		const webFile = file.file || file.uri
		formData.append(fieldName, webFile as unknown as Blob)
	} else {
		// On React Native, we need to use the file URI directly
		// Create a proper file object for React Native
		const fileObject = {
			uri: file.uri,
			name: file.name,
			type: file.mimeType
		}
		formData.append(fieldName, fileObject as any)
	}
}

/**
 * Upload one thumbnail and/or several gallery files and return the created files.
 * @throws when the request fails or returns an unexpected payload.
 */
export const uploadMedia = async ({ targetModelName, targetModelId, thumbnail, gallery, onProgress }: UploadMediaOptions): Promise<UploadMediaResult> => {
	if (!thumbnail && (!gallery || gallery.length === 0)) {
		throw new Error('uploadMedia requires at least one thumbnail or gallery file')
	}

	const filesToUpload = gallery || []
	if (filesToUpload.length > MAX_FILE_COUNT) {
		throw new Error(`uploadMedia supports up to ${MAX_FILE_COUNT} gallery files per request`)
	}

	// Check backend connection status before attempting upload
	const backendState = ConnectionService.getBackendState()
	if (backendState === 'offline') {
		const error = new Error('Cannot upload: backend is offline')
		log({
			level: 'error',
			label: 'smart-media',
			message: 'Upload aborted - backend is offline',
			data: { targetModelName, targetModelId, backendState }
		})
		throw error
	}

	const formData = new FormData()
	formData.append('targetModelName', targetModelName)
	formData.append('targetModelId', targetModelId)
	if (thumbnail) appendFileToFormData(formData, 'thumbnail', thumbnail)
	filesToUpload.forEach((file) => appendFileToFormData(formData, 'gallery', file))

	const allFilesForTimeout = [...(thumbnail ? [thumbnail] : []), ...filesToUpload]
	const isVideoUpload = allFilesForTimeout.some((f) => f.mimeType?.startsWith('video/') || /\.(mp4|webm|mov|m3u8)$/i.test(f.name))
	const hasLargeFile = allFilesForTimeout.some((f) => (f.size || 0) > 20 * 1024 * 1024)
	let timeout = isVideoUpload ? UPLOAD_TIMEOUT_VIDEO_MS : UPLOAD_TIMEOUT_IMAGE_MS
	if (hasLargeFile && !isVideoUpload) timeout = UPLOAD_TIMEOUT_VIDEO_MS
	// Allow extra time for HLS transcoding (sp_auto) which happens server-side after bytes are received
	if (isVideoUpload) timeout = Math.max(timeout, 300_000)

	// Log FormData contents for debugging
	log({
		level: 'info',
		label: 'smart-media',
		message: 'Attempting upload',
		data: {
			targetModelName,
			targetModelId,
			fileCount: filesToUpload.length + (thumbnail ? 1 : 0),
			hasThumbnail: !!thumbnail,
			backendState,
			isVideoUpload,
			timeout,
			// Don't log actual file data to avoid large logs
			fileNames: filesToUpload.map((f) => f.name),
			thumbnailName: thumbnail?.name
		}
	})

	let response
	try {
		response = await getApiClient().post('/files/upload', formData, {
			// Don't set Content-Type - let React Native handle it with proper boundary
			headers: {},
			timeout,
			// Override the default transformRequest to preserve FormData
			transformRequest: [(data) => data],
			onUploadProgress: (event) => {
				if (onProgress && event.total) {
					onProgress(Math.round((event.loaded * 100) / event.total))
				}
			}
		})
	} catch (error) {
		const parsedError = parseError(error)

		log({
			level: 'error',
			label: 'smart-media',
			message: 'Upload failed',
			error,
			data: {
				targetModelName,
				targetModelId,
				fileCount: filesToUpload.length + (thumbnail ? 1 : 0),
				hasThumbnail: !!thumbnail,
				backendState,
				isVideoUpload,
				timeout,
				parsedError
			}
		})

		// Provide user-friendly error message, especially for network/timeout/cloudinary errors
		let errorMessage = parsedError.message || (error as any)?.message || 'Network error'
		if (parsedError.type === 'network') {
			errorMessage = isVideoUpload
				? 'Media upload failed to reach the server (Cloudinary free plan limit or timeout). The service may be temporarily unavailable — try a smaller file or try again in a few minutes.'
				: 'Network connection failed. Please check your internet connection and try again.'
		} else if (parsedError.type === 'timeout') {
			errorMessage = isVideoUpload
				? 'Video upload is taking longer than expected (large file + HLS transcoding sp_auto). The file was likely saved on the server and is generating its playback stream. Please wait 10–20 seconds and refresh the gallery. If it does not appear, tap Retry.'
				: parsedError.message
		}
		// Surface Cloudinary 499 details when available
		if ((parsedError as any).statusCode === 499) {
			errorMessage =
				'Media service timeout (Cloudinary free plan limit, http 499). Please try a smaller file, or wait a few minutes and retry. Your file may still be processing in the background — refresh the gallery shortly.'
		}

		// Provide more context in the error message
		const enhancedError = new Error(`Upload failed: ${errorMessage}`)
		// @ts-ignore - Attach additional error info
		enhancedError.originalError = error
		// @ts-ignore - Attach parsed error info
		enhancedError.parsedError = parsedError
		// @ts-ignore - Attach retry capability
		enhancedError.canRetry = parsedError.canRetry

		throw enhancedError
	}

	const data = response.data?.data
	if (!Array.isArray(data)) {
		log({
			level: 'error',
			label: 'smart-media',
			message: 'Unexpected upload response format',
			data: { response: response.data }
		})
		throw new Error('Unexpected upload response')
	}
	return { files: data as MediaFile[] }
}

/** Upload a single thumbnail file and return the created file. */
export const uploadThumbnail = async (options: Omit<UploadMediaOptions, 'gallery' | 'thumbnail'> & { file: UploadMediaFile }): Promise<MediaFile> => {
	const { file, ...rest } = options
	try {
		const { files } = await uploadMedia({ ...rest, thumbnail: file })
		return files[0]
	} catch (error) {
		log({
			level: 'error',
			label: 'smart-media',
			message: 'Thumbnail upload failed',
			error,
			data: { fileName: file.name, fileSize: file.size }
		})
		throw error
	}
}

/** Upload several gallery files and return the created files. */
export const uploadGallery = async (options: Omit<UploadMediaOptions, 'thumbnail' | 'gallery'> & { files: UploadMediaFile[] }): Promise<MediaFile[]> => {
	const { files, ...rest } = options
	try {
		const { files: uploaded } = await uploadMedia({ ...rest, gallery: files })
		return uploaded
	} catch (error) {
		log({
			level: 'error',
			label: 'smart-media',
			message: 'Gallery upload failed',
			error,
			data: {
				fileCount: files.length,
				fileNames: files.map((f) => f.name)
			}
		})
		throw error
	}
}
