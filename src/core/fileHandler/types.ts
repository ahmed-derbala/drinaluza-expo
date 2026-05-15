/**
 * File Handler Types and Interfaces
 * Defines types for file operations including upload, download, view, play, remove, and rename
 */

export type FileType = 'image' | 'video' | 'audio' | 'document' | 'other'

export type FileMimeType =
	| 'image/jpeg'
	| 'image/png'
	| 'image/gif'
	| 'image/webp'
	| 'video/mp4'
	| 'video/mpeg'
	| 'video/quicktime'
	| 'audio/mpeg'
	| 'audio/wav'
	| 'audio/aac'
	| 'application/pdf'
	| 'application/msword'
	| 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
	| 'application/vnd.ms-excel'
	| 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	| 'text/plain'
	| 'application/zip'
	| '*/*'

export interface FileInfo {
	uri: string
	name: string
	size: number
	type: FileType
	mimeType: FileMimeType
	lastModified?: number
}

export interface FileUploadOptions {
	uri: string
	name: string
	type: FileMimeType
	fileType?: 'image' | 'video' | 'music' | 'document'
	fieldName?: string
	fileObj?: any // File object for web platform
	onProgress?: (progress: number) => void
	headers?: Record<string, string>
}

export interface FileDownloadOptions {
	url: string
	fileName: string
	destination?: string
	onProgress?: (progress: number) => void
	headers?: Record<string, string>
}

export interface FileRemoveOptions {
	uri: string
}

export interface FileViewOptions {
	uri: string
	type: FileType
}

export interface FilePlayOptions {
	uri: string
	type: 'video' | 'audio'
	autoPlay?: boolean
	loop?: boolean
}

export interface FileRenameOptions {
	oldUri: string
	newName: string
}

export interface UploadResult {
	success: boolean
	fileUrl?: string
	fileId?: string
	file?: any
	error?: string
}

export interface DownloadResult {
	success: boolean
	localUri?: string
	error?: string
}

export interface RemoveResult {
	success: boolean
	error?: string
}

export interface ViewResult {
	success: boolean
	error?: string
}

export interface PlayResult {
	success: boolean
	error?: string
}

export interface RenameResult {
	success: boolean
	newUri?: string
	error?: string
}
