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
	originalname?: string
	url: string
	secure_url?: string
	playback_url?: string
	duration?: number
	mimetype?: string
	size?: number
	asset_id?: string
	public_id?: string
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

/** Extract the playback URL for video (prefers HLS playback_url when available). */
export const getVideoUrl = (media: MediaSource): string | null => {
	if (typeof media === 'string') return getMediaUrl(media)
	if (media && typeof media === 'object') {
		const file = media as MediaFile
		if (file.playback_url && typeof file.playback_url === 'string' && file.playback_url.trim().length > 0) {
			return file.playback_url.trim()
		}
		// If no explicit playback_url, try to construct HLS URL from Cloudinary secure_url for videos
		// This enables immediate HLS playback even before backend populates the field
		const isVideo = getMediaType(media) === 'video'
		const baseUrl = file.secure_url || file.url
		if (isVideo && baseUrl && baseUrl.includes('/video/upload/') && !baseUrl.includes('/sp_auto/')) {
			try {
				const urlObj = new URL(baseUrl)
				urlObj.pathname = urlObj.pathname.replace('/video/upload/', '/video/upload/sp_auto/')
				urlObj.pathname = urlObj.pathname.replace(/\.[^/.]+$/, '.m3u8')
				return urlObj.toString()
			} catch {
				return baseUrl.replace('/video/upload/', '/video/upload/sp_auto/').replace(/\.[^/.]+(\?.*)?$/, '.m3u8$1')
			}
		}
	}
	return getMediaUrl(media)
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

		// Fallback to mimetype — also handle HLS mime types
		const mime = (media.mimetype || '').toLowerCase()
		if (mime.startsWith('video/')) return 'video'
		if (mime.startsWith('image/')) return 'image'
		if (mime === 'application/x-mpegurl' || mime === 'application/vnd.apple.mpegurl') return 'video'

		// Fallback to extension from format field, playback_url or URL
		const urlForExt = (media as MediaFile).playback_url || media.secure_url || media.url
		const extension = media.format ? media.format.toLowerCase() : getPathExtension(urlForExt || '')
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
