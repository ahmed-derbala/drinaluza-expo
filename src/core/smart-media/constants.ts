/**
 * Media constants mirrored from the backend (src/core/files/files.constant.js).
 */

export const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/webp', 'image/png', 'image/heic', 'image/heif']

export const ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'webm', 'mov', 'm3u8']
export const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'application/x-mpegURL', 'application/vnd.apple.mpegurl']

export const ALLOWED_EXTENSIONS = [...ALLOWED_IMAGE_EXTENSIONS, ...ALLOWED_VIDEO_EXTENSIONS]
export const ALLOWED_MIME_TYPES = [...ALLOWED_IMAGE_MIME_TYPES, ...ALLOWED_VIDEO_MIME_TYPES]

/** Maximum file size accepted by the backend: 100MB. */
export const MAX_FILE_SIZE = 100 * 1024 * 1024

/** Maximum number of files accepted per `gallery` upload request. */
export const MAX_FILE_COUNT = 5

/** Upload timeouts — video transcoding (HLS sp_auto) can take >60s, so use longer timeouts. */
export const UPLOAD_TIMEOUT_IMAGE_MS = 120_000
export const UPLOAD_TIMEOUT_VIDEO_MS = 300_000

/** Collections that can own media (targetModelName field of the upload API). */
export const TARGET_MODEL_NAMES = ['users', 'products', 'businesses', 'default-products'] as const

export type TargetModelName = (typeof TARGET_MODEL_NAMES)[number]
