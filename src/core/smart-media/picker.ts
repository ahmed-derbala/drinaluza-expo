/**
 * Media file picking helpers built on top of expo-document-picker.
 */

import * as DocumentPicker from 'expo-document-picker'
import { log } from '@/core/log'
import { ALLOWED_IMAGE_MIME_TYPES, ALLOWED_VIDEO_MIME_TYPES, MAX_FILE_SIZE } from './constants'

/** A picked file ready to be uploaded. */
export interface PickedMediaFile {
	uri: string
	name: string
	mimeType: string
	size: number
	/** The actual web File object (available on web only). */
	file?: DocumentPicker.DocumentPickerAsset['file']
}

export type PickMediaType = 'image' | 'video' | 'mixed'

export interface PickMediaOptions {
	mediaType?: PickMediaType
	multiple?: boolean
	/** Maximum number of files to keep. Defaults to MAX_FILE_COUNT. */
	maxCount?: number
}

const resolveAcceptedMimeTypes = (mediaType: PickMediaType = 'image'): string[] => {
	if (mediaType === 'video') return ALLOWED_VIDEO_MIME_TYPES
	if (mediaType === 'mixed') return [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES]
	return ALLOWED_IMAGE_MIME_TYPES
}

const isAllowed = (mimeType: string, mediaType: PickMediaType): boolean => {
	const accepted = resolveAcceptedMimeTypes(mediaType)
	return accepted.includes(mimeType.toLowerCase()) || accepted.some((mime) => mime === '*/*')
}

/**
 * Open the system file picker and return the selected files.
 * Files that are not allowed or exceed MAX_FILE_SIZE are skipped.
 * Returns an empty array when the user cancels.
 */
export const pickMediaFiles = async ({ mediaType = 'image', multiple = false, maxCount = 5 }: PickMediaOptions = {}): Promise<PickedMediaFile[]> => {
	try {
		const result = await DocumentPicker.getDocumentAsync({
			type: resolveAcceptedMimeTypes(mediaType),
			copyToCacheDirectory: true,
			multiple
		})

		if (result.canceled) return []

		const assets = result.assets || []
		const picked: PickedMediaFile[] = []

		for (const asset of assets) {
			const mimeType = asset.mimeType || 'image/jpeg'
			if (!isAllowed(mimeType, mediaType)) {
				log({ level: 'warn', label: 'smart-media', message: `Skipped file with unsupported mime type: ${mimeType}` })
				continue
			}
			if (asset.size && asset.size > MAX_FILE_SIZE) {
				log({ level: 'warn', label: 'smart-media', message: `Skipped file larger than ${MAX_FILE_SIZE} bytes: ${asset.name}` })
				continue
			}
			picked.push({
				uri: asset.uri,
				name: asset.name,
				mimeType,
				size: asset.size || 0,
				file: asset.file
			})
			if (picked.length >= maxCount) break
		}

		return picked
	} catch (error) {
		log({ level: 'error', label: 'smart-media', message: 'Failed to pick media files', error })
		return []
	}
}

/** Open the picker and return the first file, or null when cancelled/empty. */
export const pickSingleMediaFile = async (options?: PickMediaOptions): Promise<PickedMediaFile | null> => {
	const files = await pickMediaFiles({ ...options, multiple: false, maxCount: 1 })
	return files[0] ?? null
}
