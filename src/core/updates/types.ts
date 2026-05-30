export type UpdateType = 'required' | 'optional' | 'none'

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'completed' | 'error'

export interface ParsedRelease {
	name: string
	published_at: string
	latest_version: string // tag_name
	size: number // size in bytes
	download_count: number
	changelog: string // body
	download_url: string // browser_download_url
}

export interface CachedApkDetails {
	version: string
	localUri: string
	size: number
	published_at: string
}
