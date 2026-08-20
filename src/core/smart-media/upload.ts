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
import { MAX_FILE_COUNT, type TargetModelName } from './constants'
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
		formData.append(fieldName, {
			uri: file.uri,
			name: file.name,
			type: file.mimeType
		} as unknown as Blob)
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

	const formData = new FormData()
	formData.append('targetModelName', targetModelName)
	formData.append('targetModelId', targetModelId)
	if (thumbnail) appendFileToFormData(formData, 'thumbnail', thumbnail)
	filesToUpload.forEach((file) => appendFileToFormData(formData, 'gallery', file))

	let response
	try {
		response = await getApiClient().post('/files/upload', formData, {
			headers: { 'Content-Type': 'multipart/form-data' },
			onUploadProgress: (event) => {
				if (onProgress && event.total) {
					onProgress(Math.round((event.loaded * 100) / event.total))
				}
			}
		})
	} catch (error) {
		log({ level: 'error', label: 'smart-media', message: 'Upload failed', error })
		throw error
	}

	const data = response.data?.data
	if (!Array.isArray(data)) {
		throw new Error('Unexpected upload response')
	}
	return { files: data as MediaFile[] }
}

/** Upload a single thumbnail file and return the created file. */
export const uploadThumbnail = async (options: Omit<UploadMediaOptions, 'gallery' | 'thumbnail'> & { file: UploadMediaFile }): Promise<MediaFile> => {
	const { file, ...rest } = options
	const { files } = await uploadMedia({ ...rest, thumbnail: file })
	return files[0]
}

/** Upload several gallery files and return the created files. */
export const uploadGallery = async (options: Omit<UploadMediaOptions, 'thumbnail' | 'gallery'> & { files: UploadMediaFile[] }): Promise<MediaFile[]> => {
	const { files, ...rest } = options
	const { files: uploaded } = await uploadMedia({ ...rest, gallery: files })
	return uploaded
}
