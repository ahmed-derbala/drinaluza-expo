import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
import axios from 'axios'
import { UPDATE_CHECK_URL, TIMEOUT_MS, APP_VERSION } from '@/config'
import { log } from '@/core/log'

export interface UpdateInfo {
	name: string
	published_at: string
	latest_version: string
	size: number
	download_count: number
	changelog: string
	download_url: string
}

export interface CachedApkFile {
	name: string
	uri: string
	size: number
	version: string
}

export interface UpdatesContextProps {
	isCheckingStartup: boolean
	startupRedirect: string | null
	updateType: 'none' | 'optional' | 'required'
	status: 'idle' | 'checking' | 'downloading' | 'completed' | 'error'
	downloadProgress: number
	cachedApkList: CachedApkFile[]
	cachedApk: CachedApkFile | null
	freeDiskSpace: number | null
	updateInfo: UpdateInfo | null
	error: string | null
	checkForUpdates: (manual?: boolean) => Promise<void>
	downloadUpdate: () => Promise<void>
	cancelDownload: () => Promise<void>
	installApk: (uri: string) => Promise<void>
	deleteApk: (uri: string) => Promise<void>
}

const UpdatesContext = createContext<UpdatesContextProps | undefined>(undefined)

const UPDATES_DIR = FileSystem.cacheDirectory ? FileSystem.cacheDirectory + 'updates/' : ''

// Clean version string and compare semantically
export function isVersionNewer(current: string, latest: string): boolean {
	const cleanVersion = (v: string) => {
		const match = v.match(/(\d+\.\d+\.\d+)/)
		return match ? match[1] : v.replace(/^v/, '')
	}

	const cVer = cleanVersion(current)
	const lVer = cleanVersion(latest)

	const cParts = cVer.split('.').map(Number)
	const lParts = lVer.split('.').map(Number)

	for (let i = 0; i < Math.max(cParts.length, lParts.length); i++) {
		const cPart = cParts[i] || 0
		const lPart = lParts[i] || 0
		if (lPart > cPart) return true
		if (cPart > lPart) return false
	}

	return false
}

// Fetch update info utility
export async function fetchUpdateInfo(url: string, timeoutMs: number = TIMEOUT_MS): Promise<UpdateInfo> {
	const source = axios.CancelToken.source()
	const timeoutId = setTimeout(() => {
		source.cancel(`Timeout of ${timeoutMs}ms exceeded`)
	}, timeoutMs)

	try {
		log({ level: 'info', label: 'Updates', message: `Fetching updates from ${url} with timeout ${timeoutMs}ms` })
		const response = await axios.get(url, {
			cancelToken: source.token,
			headers: {
				Accept: 'application/vnd.github.v3+json'
			}
		})

		clearTimeout(timeoutId)

		const data = response.data
		const assets = data.assets || []

		// Locate APK asset first, fallback to first asset
		const apkAsset = assets.find((asset: any) => asset.name?.endsWith('.apk') || asset.content_type === 'application/vnd.android.package-archive') || assets[0]

		return {
			name: data.name || '',
			published_at: data.published_at || '',
			latest_version: data.tag_name || '',
			size: apkAsset ? apkAsset.size : 0,
			download_count: apkAsset ? apkAsset.download_count : 0,
			changelog: data.body || '',
			download_url: apkAsset ? apkAsset.browser_download_url : ''
		}
	} catch (error) {
		clearTimeout(timeoutId)
		throw error
	}
}

export const UpdatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isCheckingStartup, setIsCheckingStartup] = useState(true)
	const [startupRedirect, setStartupRedirect] = useState<string | null>(null)
	const [updateType, setUpdateType] = useState<'none' | 'optional' | 'required'>('none')
	const [status, setStatus] = useState<'idle' | 'checking' | 'downloading' | 'completed' | 'error'>('idle')
	const [downloadProgress, setDownloadProgress] = useState(0)
	const [cachedApkList, setCachedApkList] = useState<CachedApkFile[]>([])
	const [freeDiskSpace, setFreeDiskSpace] = useState<number | null>(null)
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
	const [error, setError] = useState<string | null>(null)

	const downloadResumableRef = useRef<FileSystem.DownloadResumable | null>(null)

	// Ensure updater cache folder exists on Android
	const ensureDirectoryExists = useCallback(async () => {
		if (Platform.OS !== 'android' || !UPDATES_DIR) return false
		try {
			const dirInfo = await FileSystem.getInfoAsync(UPDATES_DIR)
			if (!dirInfo.exists) {
				await FileSystem.makeDirectoryAsync(UPDATES_DIR, { intermediates: true })
			}
			return true
		} catch (err) {
			log({ level: 'error', label: 'Updates', message: 'Failed to create updates directory', error: err })
			return false
		}
	}, [])

	// Refresh lists of cached APKs
	const refreshCachedApkList = useCallback(async () => {
		if (Platform.OS !== 'android' || !UPDATES_DIR) return
		try {
			const hasDir = await ensureDirectoryExists()
			if (!hasDir) return

			const files = await FileSystem.readDirectoryAsync(UPDATES_DIR)
			const list: CachedApkFile[] = []

			for (const file of files) {
				if (file.endsWith('.apk')) {
					const uri = UPDATES_DIR + file
					const fileInfo = await FileSystem.getInfoAsync(uri)
					if (fileInfo.exists) {
						const match = file.match(/drinaluza-(\d+\.\d+\.\d+(?:-\w+)?)\.apk/)
						const version = match ? match[1] : 'unknown'
						list.push({
							name: file,
							uri,
							size: fileInfo.size || 0,
							version
						})
					}
				}
			}
			setCachedApkList(list)
		} catch (err) {
			log({ level: 'error', label: 'Updates', message: 'Failed to refresh cached APK list', error: err })
		}
	}, [ensureDirectoryExists])

	// Keep only the latest version APK file
	const cleanupOldApks = useCallback(
		async (latestVersion?: string) => {
			if (Platform.OS !== 'android' || !UPDATES_DIR) return
			try {
				const hasDir = await ensureDirectoryExists()
				if (!hasDir) return

				const files = await FileSystem.readDirectoryAsync(UPDATES_DIR)
				for (const file of files) {
					if (file.endsWith('.apk')) {
						// Delete if it is an old version, or keep only the current latest download version
						if (latestVersion && file === `drinaluza-${latestVersion}.apk`) {
							continue
						}
						await FileSystem.deleteAsync(UPDATES_DIR + file, { idempotent: true })
						log({ level: 'info', label: 'Updates', message: `Deleted old APK from cache: ${file}` })
					}
				}
			} catch (err) {
				log({ level: 'error', label: 'Updates', message: 'Failed to clean up old APKs', error: err })
			}
		},
		[ensureDirectoryExists]
	)

	// Fetch free disk space
	const refreshFreeDiskSpace = useCallback(async () => {
		if (Platform.OS !== 'android') return
		try {
			const bytes = await FileSystem.getFreeDiskStorageAsync()
			setFreeDiskSpace(bytes)
		} catch (err) {
			log({ level: 'error', label: 'Updates', message: 'Failed to check free storage space', error: err })
		}
	}, [])

	// Install a local APK file
	const installApk = useCallback(async (uri: string) => {
		if (Platform.OS !== 'android') return
		try {
			log({ level: 'info', label: 'Updates', message: `Triggering installation for APK: ${uri}` })
			const contentUri = await FileSystem.getContentUriAsync(uri)
			await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
				data: contentUri,
				flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
				type: 'application/vnd.android.package-archive'
			})
		} catch (err) {
			log({ level: 'error', label: 'Updates', message: `Failed to launch intent installer for APK: ${uri}`, error: err })
			setError('Failed to launch APK installation. Please install the file manually from details list.')
		}
	}, [])

	// Delete a local APK file
	const deleteApk = useCallback(
		async (uri: string) => {
			if (Platform.OS !== 'android') return
			try {
				await FileSystem.deleteAsync(uri, { idempotent: true })
				log({ level: 'info', label: 'Updates', message: `Manually deleted cached APK: ${uri}` })
				await refreshCachedApkList()
				await refreshFreeDiskSpace()
			} catch (err) {
				log({ level: 'error', label: 'Updates', message: `Failed to delete APK file: ${uri}`, error: err })
			}
		},
		[refreshCachedApkList, refreshFreeDiskSpace]
	)

	// Check updates manual/automatic
	const checkForUpdates = useCallback(
		async (manual = false) => {
			setStatus('checking')
			setError(null)
			try {
				const info = await fetchUpdateInfo(UPDATE_CHECK_URL, TIMEOUT_MS)
				setUpdateInfo(info)

				const isNewer = isVersionNewer(APP_VERSION, info.latest_version)
				if (isNewer) {
					setUpdateType('optional')
				} else {
					setUpdateType('none')
				}

				setStatus('idle')

				if (Platform.OS === 'android') {
					await refreshCachedApkList()
					await refreshFreeDiskSpace()
				}
			} catch (err: any) {
				log({ level: 'error', label: 'Updates', message: 'Manual update check failed', error: err })
				setStatus('error')
				setError(err.message || 'Check failed. Please check network connection.')
			}
		},
		[refreshCachedApkList, refreshFreeDiskSpace]
	)

	// Download the latest APK
	const downloadUpdate = useCallback(async () => {
		if (Platform.OS !== 'android' || !updateInfo || !UPDATES_DIR) return
		if (status === 'downloading') return

		setStatus('downloading')
		setDownloadProgress(0)
		setError(null)

		try {
			await ensureDirectoryExists()
			await cleanupOldApks(updateInfo.latest_version)

			const filename = `drinaluza-${updateInfo.latest_version}.apk`
			const fileUri = UPDATES_DIR + filename

			const progressCallback = (progressData: FileSystem.DownloadProgressData) => {
				const progress = progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite
				setDownloadProgress(isNaN(progress) ? 0 : progress)
			}

			const downloadResumable = FileSystem.createDownloadResumable(updateInfo.download_url, fileUri, {}, progressCallback)
			downloadResumableRef.current = downloadResumable

			const result = await downloadResumable.downloadAsync()

			if (result && result.uri) {
				log({ level: 'info', label: 'Updates', message: `Download successful: ${result.uri}` })
				setStatus('completed')
				setDownloadProgress(1)
				downloadResumableRef.current = null

				await refreshCachedApkList()
				await refreshFreeDiskSpace()

				// Auto-install completed APK file immediately
				await installApk(result.uri)
			} else {
				throw new Error('Download finished but no local URI was returned.')
			}
		} catch (err: any) {
			if (err.message && err.message.includes('cancelled')) {
				log({ level: 'info', label: 'Updates', message: 'Download cancelled successfully.' })
				setStatus('idle')
			} else {
				log({ level: 'error', label: 'Updates', message: 'Download failed', error: err })
				setStatus('error')
				setError(err.message || 'Failed to download updates.')
			}
			downloadResumableRef.current = null
		}
	}, [updateInfo, status, ensureDirectoryExists, cleanupOldApks, refreshCachedApkList, refreshFreeDiskSpace, installApk])

	// Cancel in progress download
	const cancelDownload = useCallback(async () => {
		if (downloadResumableRef.current) {
			try {
				await downloadResumableRef.current.cancelAsync()
				log({ level: 'info', label: 'Updates', message: 'Download cancellation request sent.' })
			} catch (err) {
				log({ level: 'error', label: 'Updates', message: 'Failed to cancel active download', error: err })
			} finally {
				downloadResumableRef.current = null
				setStatus('idle')
				setDownloadProgress(0)
			}
		}
	}, [])

	// Startup Update Checks
	useEffect(() => {
		let isMounted = true

		const runStartupCheck = async () => {
			if (Platform.OS !== 'android') {
				if (isMounted) {
					setIsCheckingStartup(false)
				}
				return
			}

			try {
				await ensureDirectoryExists()
				await refreshFreeDiskSpace()

				const info = await fetchUpdateInfo(UPDATE_CHECK_URL, TIMEOUT_MS)
				if (!isMounted) return

				setUpdateInfo(info)

				const isNewer = isVersionNewer(APP_VERSION, info.latest_version)

				if (isNewer) {
					log({ level: 'info', label: 'Updates', message: `Startup found newer version: ${info.latest_version}. Current: ${APP_VERSION}` })
					setUpdateType('optional')
					setStartupRedirect('/updates')
				} else {
					log({ level: 'info', label: 'Updates', message: `Startup check: App up to date (Version: ${APP_VERSION}).` })
					setUpdateType('none')
					setStartupRedirect(null)

					// Check if there is a downloaded APK in cache that is newer than current APP_VERSION
					const files = await FileSystem.readDirectoryAsync(UPDATES_DIR)
					let readyApk: string | null = null

					for (const file of files) {
						if (file.endsWith('.apk')) {
							const match = file.match(/drinaluza-(\d+\.\d+\.\d+(?:-\w+)?)\.apk/)
							const version = match ? match[1] : ''
							if (version && isVersionNewer(APP_VERSION, version)) {
								readyApk = UPDATES_DIR + file
								break
							}
						}
					}

					if (readyApk) {
						log({ level: 'info', label: 'Updates', message: `Found ready cached APK to install: ${readyApk}` })
						await installApk(readyApk)
					}
				}
			} catch (err) {
				log({ level: 'warn', label: 'Updates', message: 'Startup check failed (offline or timeout). Bypassing to main feed.', error: err })
				if (isMounted) {
					setUpdateType('none')
					setStartupRedirect(null)
				}
			} finally {
				if (isMounted) {
					setIsCheckingStartup(false)
					// Load cached list just in case
					await refreshCachedApkList()
				}
			}
		}

		runStartupCheck()

		return () => {
			isMounted = false
			// Proper async cancellation during unmount to avoid memory leaks
			if (downloadResumableRef.current) {
				downloadResumableRef.current.cancelAsync().catch((err: any) => {
					log({ level: 'error', label: 'Updates', message: 'Unmount cancellation error', error: err })
				})
			}
		}
	}, [ensureDirectoryExists, refreshCachedApkList, refreshFreeDiskSpace, installApk])

	const cachedApk = cachedApkList.find((apk) => apk.version === updateInfo?.latest_version) || cachedApkList[0] || null

	return (
		<UpdatesContext.Provider
			value={{
				isCheckingStartup,
				startupRedirect,
				updateType,
				status,
				downloadProgress,
				cachedApkList,
				cachedApk,
				freeDiskSpace,
				updateInfo,
				error,
				checkForUpdates,
				downloadUpdate,
				cancelDownload,
				installApk,
				deleteApk
			}}
		>
			{children}
		</UpdatesContext.Provider>
	)
}

export const useUpdates = () => {
	const context = useContext(UpdatesContext)
	if (context === undefined) {
		throw new Error('useUpdates must be used within an UpdatesProvider')
	}
	return context
}
