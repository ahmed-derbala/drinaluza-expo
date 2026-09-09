export interface UpdateCheckResult {
	name: string
	published_at: string
	latest_version: string
	size: number
	download_count: number
	download_url: string
	digest: string | null // e.g. "sha256:3abcfd..." from GitHub assets[].digest
}

export interface CachedApkMetadata {
	filename: string
	fileUri: string
	version: string
	size: number
	isInstallable: boolean
	digest?: string | null
}

export interface UpdatesContextProps {
	isChecking: boolean
	latestRelease: UpdateCheckResult | null
	error: string | null
	downloadProgress: number // 0 to 1
	isDownloading: boolean
	downloadedApks: CachedApkMetadata[]
	deviceFreeStorage: number // bytes
	checkForUpdates: (manual?: boolean) => Promise<UpdateCheckResult | null>
	downloadUpdate: () => Promise<string | null>
	isPaused: boolean
	pauseDownload: () => Promise<void>
	resumeDownload: () => Promise<string | null>
	cancelDownload: () => Promise<void>
	installApk: (fileUri: string) => Promise<void>
	deleteApk: (fileUri: string) => Promise<void>
	refreshApkList: () => Promise<CachedApkMetadata[]>
	cleanupApks: (maxKeep: number) => Promise<void>
}
