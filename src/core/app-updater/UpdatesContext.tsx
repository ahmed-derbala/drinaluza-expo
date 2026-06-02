import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
import { UPDATE_CHECK_URL, TIMEOUT_MS, APP_VERSION } from '@/config'
import { log } from '@/core/log'

export interface UpdateInfo {
	name: string
	published_at: string
	latest_version: string // tag_name
	size: number // size in bytes of the apk asset
	download_count: number
	changelog: string // body
	download_url: string // browser_download_url
}

export interface DownloadedApk {
	name: string
	uri: string
	size: number
	modificationTime: number
	version: string
}

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'completed' | 'failed'
export type UpdateType = 'none' | 'flexible' | 'required'

export interface UpdatesContextProps {
	isCheckingStartup: boolean
	startupRedirect: string | null
	updateInfo: UpdateInfo | null
	status: UpdateStatus
	downloadProgress: number
	cachedApk: string | null
	downloadedApks: DownloadedApk[]
	freeDiskStorage: number
	updateType: UpdateType
	checkForUpdates: () => Promise<UpdateInfo | null>
	downloadUpdate: (downloadUrl: string, latestVersion: string) => Promise<void>
	cancelDownload: () => Promise<void>
	deleteApk: (uri: string) => Promise<void>
	installApk: (uri: string) => Promise<void>
	refreshDownloadedList: () => Promise<void>
}

const UpdatesContext = createContext<UpdatesContextProps | undefined>(undefined)

export function useUpdates() {
	const context = useContext(UpdatesContext)
	if (!context) {
		throw new Error('useUpdates must be used within an UpdatesProvider')
	}
	return context
}

// Helper: Clean and compare version numbers (e.g., "1.19.2" vs "1.16.2")
export function compareVersions(v1: string, v2: string): number {
	const parse = (v: string) => v.replace(/^v/i, '').split('.').map(Number)
	const a = parse(v1)
	const b = parse(v2)
	for (let i = 0; i < Math.max(a.length, b.length); i++) {
		const numA = a[i] || 0
		const numB = b[i] || 0
		if (numA > numB) return 1
		if (numA < numB) return -1
	}
	return 0
}

// Function that takes config.UPDATE_CHECK_URL as input and parses/returns the update details
export async function fetchUpdateFromUrl(checkUrl: string): Promise<UpdateInfo> {
	const controller = new AbortController()
	const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

	try {
		const res = await fetch(checkUrl, {
			signal: controller.signal,
			headers: {
				Accept: 'application/vnd.github.v3+json',
				'User-Agent': 'DrinaluzaApp'
			}
		})

		if (!res.ok) {
			throw new Error(`HTTP error! status: ${res.status}`)
		}

		const data = await res.json()
		const assets = data.assets || []
		const apkAsset = assets.find((asset: any) => asset.content_type === 'application/vnd.android.package-archive' || asset.name.endsWith('.apk'))

		return {
			name: data.name || data.tag_name,
			published_at: data.published_at,
			latest_version: data.tag_name,
			size: apkAsset ? apkAsset.size : 0,
			download_count: apkAsset ? apkAsset.download_count : 0,
			changelog: data.body || '',
			download_url: apkAsset ? apkAsset.browser_download_url : ''
		}
	} catch (err: any) {
		if (err.name === 'AbortError') {
			log({ level: 'warn', label: 'AppUpdater', message: `Update check timed out after ${TIMEOUT_MS}ms` })
		} else {
			log({ level: 'error', label: 'AppUpdater', message: 'Failed to fetch update from URL', error: err })
		}
		throw err
	} finally {
		clearTimeout(timeoutId)
	}
}

interface UpdatesProviderProps {
	children: React.ReactNode
}

export const UpdatesProvider: React.FC<UpdatesProviderProps> = ({ children }) => {
	const [isCheckingStartup, setIsCheckingStartup] = useState<boolean>(Platform.OS === 'android')
	const [startupRedirect, setStartupRedirect] = useState<string | null>(null)
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
	const [status, setStatus] = useState<UpdateStatus>('idle')
	const [downloadProgress, setDownloadProgress] = useState<number>(0)
	const [cachedApk, setCachedApk] = useState<string | null>(null)
	const [downloadedApks, setDownloadedApks] = useState<DownloadedApk[]>([])
	const [freeDiskStorage, setFreeDiskStorage] = useState<number>(0)
	const [updateType, setUpdateType] = useState<UpdateType>('none')

	const downloadResumableRef = useRef<any>(null)

	const dirUri = FileSystem.documentDirectory ? FileSystem.documentDirectory + 'updates/' : ''

	// Check if a directory exists and create it if not
	const ensureDirExists = async (): Promise<boolean> => {
		if (Platform.OS !== 'android' || !dirUri) return false
		try {
			const info = await FileSystem.getInfoAsync(dirUri)
			if (!info.exists) {
				await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true })
			}
			return true
		} catch (err) {
			log({ level: 'error', label: 'AppUpdater', message: 'Failed to ensure updates dir exists', error: err })
			return false
		}
	}

	// Clean up old APK files keeping only the latest version
	const cleanupOldApks = useCallback(
		async (latestVersion?: string) => {
			if (Platform.OS !== 'android' || !dirUri) return
			try {
				const hasDir = await ensureDirExists()
				if (!hasDir) return

				const files = await FileSystem.readDirectoryAsync(dirUri)
				for (const file of files) {
					if (!file.endsWith('.apk')) continue
					const fileUri = dirUri + file
					const match = file.match(/drinaluza-(.+)\.apk/)
					if (match) {
						const fileVer = match[1]
						const isOlderOrEqual = compareVersions(fileVer, APP_VERSION) <= 0
						const isNotLatest = latestVersion ? compareVersions(fileVer, latestVersion) !== 0 : false

						if (isOlderOrEqual || isNotLatest) {
							await FileSystem.deleteAsync(fileUri, { idempotent: true })
							log({ level: 'info', label: 'AppUpdater', message: `Deleted unneeded/old APK: ${file}` })
						}
					} else {
						// Non-standard APK file, delete it
						await FileSystem.deleteAsync(fileUri, { idempotent: true })
					}
				}
			} catch (err) {
				log({ level: 'error', label: 'AppUpdater', message: 'Failed to cleanup old APKs', error: err })
			}
		},
		[dirUri]
	)

	// Refresh downloaded list and disk storage status
	const refreshDownloadedList = useCallback(async () => {
		if (Platform.OS !== 'android' || !dirUri) return
		try {
			const hasDir = await ensureDirExists()
			if (!hasDir) return

			const files = await FileSystem.readDirectoryAsync(dirUri)
			const apks: DownloadedApk[] = []
			let newestReadyApk: string | null = null
			let newestReadyVer = APP_VERSION

			for (const file of files) {
				if (file.endsWith('.apk')) {
					const fileUri = dirUri + file
					const info = await FileSystem.getInfoAsync(fileUri)
					if (info.exists) {
						const match = file.match(/drinaluza-(.+)\.apk/)
						const version = match ? match[1] : 'unknown'
						const apkItem: DownloadedApk = {
							name: file,
							uri: fileUri,
							size: info.size || 0,
							modificationTime: (info as any).modificationTime || Date.now(),
							version
						}
						apks.push(apkItem)

						// Check if this is ready to install (version higher than current)
						if (version !== 'unknown' && compareVersions(version, newestReadyVer) > 0) {
							newestReadyVer = version
							newestReadyApk = fileUri
						}
					}
				}
			}

			// Sort by version descending (newest first)
			apks.sort((a, b) => compareVersions(b.version, a.version))
			setDownloadedApks(apks)

			if (newestReadyApk) {
				setCachedApk(newestReadyApk)
			} else {
				setCachedApk(null)
			}

			const freeStorage = await FileSystem.getFreeDiskStorageAsync()
			setFreeDiskStorage(freeStorage)
		} catch (err) {
			log({ level: 'error', label: 'AppUpdater', message: 'Failed to refresh downloaded list', error: err })
		}
	}, [dirUri])

	// Search for downloaded APKs ready to install (apk file version is higher than current version)
	const getDownloadedReadyApk = useCallback(async (): Promise<{ uri: string; version: string } | null> => {
		if (Platform.OS !== 'android' || !dirUri) return null
		try {
			const hasDir = await ensureDirExists()
			if (!hasDir) return null

			const files = await FileSystem.readDirectoryAsync(dirUri)
			let readyApk: { uri: string; version: string } | null = null

			for (const file of files) {
				if (file.endsWith('.apk')) {
					const fileUri = dirUri + file
					const match = file.match(/drinaluza-(.+)\.apk/)
					if (match) {
						const fileVer = match[1]
						if (compareVersions(fileVer, APP_VERSION) > 0) {
							if (!readyApk || compareVersions(fileVer, readyApk.version) > 0) {
								readyApk = { uri: fileUri, version: fileVer }
							}
						}
					}
				}
			}
			return readyApk
		} catch (err) {
			log({ level: 'error', label: 'AppUpdater', message: 'Failed to search ready APK', error: err })
			return null
		}
	}, [dirUri])

	// Launch APK install using Android intent launcher
	const installApk = useCallback(async (uri: string) => {
		if (Platform.OS !== 'android') return
		try {
			log({ level: 'info', label: 'AppUpdater', message: `Triggering installation for APK: ${uri}` })
			const contentUri = await FileSystem.getContentUriAsync(uri)
			await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
				data: contentUri,
				flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
				type: 'application/vnd.android.package-archive'
			})
		} catch (err) {
			log({ level: 'error', label: 'AppUpdater', message: `Failed to install APK at ${uri}`, error: err })
			throw err
		}
	}, [])

	// Delete a downloaded APK
	const deleteApk = useCallback(
		async (uri: string) => {
			if (Platform.OS !== 'android') return
			try {
				await FileSystem.deleteAsync(uri, { idempotent: true })
				log({ level: 'info', label: 'AppUpdater', message: `Deleted downloaded APK: ${uri}` })
				await refreshDownloadedList()
			} catch (err) {
				log({ level: 'error', label: 'AppUpdater', message: `Failed to delete APK at ${uri}`, error: err })
			}
		},
		[refreshDownloadedList]
	)

	// Main update check promise with AbortController and TIMEOUT_MS protection
	const checkForUpdates = useCallback(async (): Promise<UpdateInfo | null> => {
		setStatus('checking')
		try {
			const info = await fetchUpdateFromUrl(UPDATE_CHECK_URL)
			setUpdateInfo(info)
			setStatus('idle')

			const isLower = compareVersions(APP_VERSION, info.latest_version) < 0
			setUpdateType(isLower ? 'flexible' : 'none')

			if (Platform.OS === 'android') {
				// Proactively clean up any old APKs that are NOT the latest version
				await cleanupOldApks(info.latest_version)
				await refreshDownloadedList()
			}

			return info
		} catch (err: any) {
			setStatus('failed')
			return null
		}
	}, [cleanupOldApks, refreshDownloadedList])

	// Download the APK
	const downloadUpdate = useCallback(
		async (downloadUrl: string, latestVersion: string) => {
			if (Platform.OS !== 'android' || !dirUri) return
			try {
				setStatus('downloading')
				setDownloadProgress(0)

				const hasDir = await ensureDirExists()
				if (!hasDir) {
					setStatus('failed')
					return
				}

				const destinationUri = dirUri + `drinaluza-${latestVersion}.apk`

				const resumable = FileSystem.createDownloadResumable(downloadUrl, destinationUri, {}, (progressData) => {
					const progress = progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite
					setDownloadProgress(progress)
				})

				downloadResumableRef.current = resumable
				const result = await resumable.downloadAsync()
				downloadResumableRef.current = null

				if (result && result.uri) {
					setStatus('completed')
					setDownloadProgress(1)

					// Keep only the latest version apk file
					await cleanupOldApks(latestVersion)
					await refreshDownloadedList()

					// Immediately trigger the APK file install
					await installApk(result.uri)
				} else {
					setStatus('failed')
				}
			} catch (err) {
				log({ level: 'error', label: 'AppUpdater', message: 'Failed to download update', error: err })
				setStatus('failed')
			}
		},
		[dirUri, cleanupOldApks, refreshDownloadedList, installApk]
	)

	// Cancel current download
	const cancelDownload = useCallback(async () => {
		if (downloadResumableRef.current) {
			try {
				await downloadResumableRef.current.cancelAsync()
				downloadResumableRef.current = null
				setStatus('idle')
				setDownloadProgress(0)
				log({ level: 'info', label: 'AppUpdater', message: 'Resumable download cancelled successfully' })
			} catch (err) {
				log({ level: 'error', label: 'AppUpdater', message: 'Failed to cancel resumable download', error: err })
			}
		}
	}, [])

	// Startup Update Check Effect (Android only)
	useEffect(() => {
		let isMounted = true

		const runStartupCheck = async () => {
			if (Platform.OS !== 'android') {
				if (isMounted) {
					setIsCheckingStartup(false)
					setStartupRedirect(null)
				}
				return
			}

			try {
				setIsCheckingStartup(true)
				// 1. Fetch latest version from GitHub with timeout protection
				const info = await checkForUpdates()
				if (!isMounted) return

				if (info) {
					const isLower = compareVersions(APP_VERSION, info.latest_version) < 0
					if (isLower) {
						// 2. If current version is lower, redirect to updates screen
						setStartupRedirect('/updates')
					} else {
						// 3. If current version is equal or higher:
						// check if there is a downloaded apk file ready to install (apk file version is higher than current version)
						const readyApk = await getDownloadedReadyApk()
						if (readyApk) {
							// install it immediately
							await installApk(readyApk.uri)
						}
						setStartupRedirect(null)
					}
				} else {
					// 4. Update check failed -> continue to the app normally
					setStartupRedirect(null)
				}
			} catch (err) {
				log({ level: 'error', label: 'AppUpdater', message: 'Startup check failed', error: err })
				if (isMounted) {
					setStartupRedirect(null)
				}
			} finally {
				if (isMounted) {
					setIsCheckingStartup(false)
				}
			}
		}

		runStartupCheck()

		return () => {
			isMounted = false
		}
	}, [])

	// Standard lists refresh on Android initial render
	useEffect(() => {
		if (Platform.OS === 'android') {
			refreshDownloadedList()
		}
	}, [refreshDownloadedList])

	return (
		<UpdatesContext.Provider
			value={{
				isCheckingStartup,
				startupRedirect,
				updateInfo,
				status,
				downloadProgress,
				cachedApk,
				downloadedApks,
				freeDiskStorage,
				updateType,
				checkForUpdates,
				downloadUpdate,
				cancelDownload,
				deleteApk,
				installApk,
				refreshDownloadedList
			}}
		>
			{children}
		</UpdatesContext.Provider>
	)
}
