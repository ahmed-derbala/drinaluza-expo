/**
 * SmartMedia — unified media (image/video) module.
 *
 * Handles upload, download, delete, view, play, pause and resume of media files.
 */

// Constants
export * from './constants'

// Types & helpers
export * from './types'

// File picking
import { pickMediaFiles, pickSingleMediaFile, PickedMediaFile, PickMediaOptions, PickMediaType } from './picker'
export { pickMediaFiles, pickSingleMediaFile }
export type { PickedMediaFile, PickMediaOptions, PickMediaType }

// Upload
import { uploadMedia, uploadThumbnail, uploadGallery, UploadMediaFile, UploadMediaOptions, UploadMediaResult } from './upload'
export { uploadMedia, uploadThumbnail, uploadGallery }
export type { UploadMediaFile, UploadMediaOptions, UploadMediaResult }

// Delete
import { deleteMediaFile } from './delete'
export { deleteMediaFile }

// Download
import { downloadMediaFile, DownloadMediaOptions } from './download'
export { downloadMediaFile }
export type { DownloadMediaOptions }

// Cache
import { cacheMediaFile, getCachedMediaFile, invalidateMediaCache } from '@cache'
export { cacheMediaFile, getCachedMediaFile, invalidateMediaCache }

// Components
export { SmartMediaView, default as SmartMediaViewDefault } from './view'
export type { SmartMediaViewProps } from './view'

export { SmartVideoPlayer, default as SmartVideoPlayerDefault } from './video'
export type { SmartVideoPlayerProps, SmartVideoPlayerHandle } from './video'

export { SmartMediaCarousel, default as SmartMediaCarouselDefault } from './carousel'
export type { SmartMediaCarouselProps } from './carousel'

export { CarouselCard, default as CarouselCardDefault } from './carousel-card'
export type { CarouselCardProps } from './carousel-card'

export { SmartMediaThumbnailBlock, isDeferredMediaFile, default as SmartMediaThumbnailBlockDefault } from './thumbnail-block'
export type { SmartMediaThumbnailBlockProps, DeferredMediaFile } from './thumbnail-block'

const SmartMedia = {
	uploadMedia,
	uploadThumbnail,
	uploadGallery,
	deleteMediaFile,
	downloadMediaFile,
	pickMediaFiles,
	pickSingleMediaFile,
	cacheMediaFile,
	getCachedMediaFile,
	invalidateMediaCache
}

export default SmartMedia
