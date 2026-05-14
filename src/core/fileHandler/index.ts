/**
 * File Handler - Main Export File
 * Exports all file handling utilities for reuse across the application
 */

// Types
export * from './types'

// Upload utilities
export { getFileInfo, uploadFile, uploadMultipleFiles, uploadFileAsBase64 } from './upload'

// Download utilities
export { downloadFile, downloadAndShare, downloadToCache, getFileSizeFromUrl } from './download'

// Remove utilities
export { removeLocalFile, removeServerFile, clearCache, removeMultipleLocalFiles } from './remove'

// View utilities
export { viewFile, viewImage, viewDocument, isViewable, getFileExtension } from './view'

// Play utilities
export { playAudio, playVideo, playMedia, getAudioDuration } from './play'

// Rename utilities
export { renameLocalFile, renameServerFile, sanitizeFileName, generateUniqueFileName } from './rename'
