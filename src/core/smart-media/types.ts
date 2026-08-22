import type { ImageContentFit } from 'expo-image'
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native'
import { ALLOWED_VIDEO_EXTENSIONS } from './constants'

/**
 * User reference as returned in file responses
 */
export interface UserRef {
	_id: string
	slug: string
	name: {
		en: string
		tn_latn: string
		tn_arab: string
	}
	role: string
}

/**
 * Target model reference showing which model owns this file
 */
export interface TargetModel {
	targetModelName: string
	targetModelId: string
	targetModelMediaField: 'thumbnail' | 'gallery'
}

/**
 * A media file as returned by the backend /files API
 * (also the shape stored inside `media.thumbnail` / `media.gallery`).
 */
export interface MediaFile {
	_id: string
	user?: UserRef
	url: string
	secure_url?: string
	originalname?: string
	mimetype?: string
	size?: number
	asset_id?: string
	width?: number
	height?: number
	format?: string
	resource_type?: string
	asset_folder?: string
	access_mode?: string
	targetModels?: TargetModel[]
	createdAt?: string
	updatedAt?: string
}

/**
 * The `media` field found on models like users, products and businesses:
 * ```json
 * { "gallery": [MediaFile], "thumbnail": MediaFile }
 * ```
 */
export interface MediaField {
	thumbnail?: MediaFile | null
	gallery?: MediaFile[]
}

/** Anything that can be displayed by SmartMediaView: a URL or a full file object. */
export type MediaSource = string | MediaFile | null | undefined

export type MediaType = 'image' | 'video'

/** Extract the displayable URL from a media source. */
export const getMediaUrl = (media: MediaSource): string | null => {
	if (typeof media === 'string') return media.trim().length > 0 ? media.trim() : null
	if (media) {
		// Prioritize secure_url (HTTPS) over url (HTTP)
		const url = media.secure_url || media.url
		if (typeof url === 'string' && url.trim().length > 0) return url.trim()
	}
	return null
}

const getPathExtension = (value: string): string => {
	try {
		const path = value.split('?')[0]
		const match = path.match(/\.([a-zA-Z0-9]+)$/)
		return match ? match[1].toLowerCase() : ''
	} catch {
		return ''
	}
}

/** Determine whether a media source is an image or a video (based on resource_type, mime type or extension). */
export const getMediaType = (media: MediaSource): MediaType | null => {
	if (typeof media === 'object' && media) {
		// Prioritize resource_type from the new schema
		const resourceType = (media.resource_type || '').toLowerCase()
		if (resourceType === 'video') return 'video'
		if (resourceType === 'image') return 'image'

		// Fallback to mimetype
		const mime = (media.mimetype || '').toLowerCase()
		if (mime.startsWith('video/')) return 'video'
		if (mime.startsWith('image/')) return 'image'

		// Fallback to extension from format field or URL
		const url = media.secure_url || media.url
		const extension = media.format ? media.format.toLowerCase() : getPathExtension(url)
		if (ALLOWED_VIDEO_EXTENSIONS.includes(extension as (typeof ALLOWED_VIDEO_EXTENSIONS)[number])) return 'video'
		return 'image'
	}
	const url = getMediaUrl(media)
	if (!url) return null
	const extension = getPathExtension(url)
	if (ALLOWED_VIDEO_EXTENSIONS.includes(extension as (typeof ALLOWED_VIDEO_EXTENSIONS)[number])) return 'video'
	return 'image'
}

export const isVideoMedia = (media: MediaSource): boolean => getMediaType(media) === 'video'

export const isImageMedia = (media: MediaSource): boolean => getMediaType(media) === 'image'

/** Legacy resizeMode alias used by the former SmartImageViewer. */
export type LegacyResizeMode = 'cover' | 'contain' | 'stretch' | 'center'

/** Shared style props for media display components. */
export interface SmartMediaStyleProps {
	style?: StyleProp<ImageStyle | ViewStyle>
	containerStyle?: StyleProp<ViewStyle>
	contentFit?: ImageContentFit
	resizeMode?: LegacyResizeMode
	width?: number
	height?: number
	borderRadius?: number
}
