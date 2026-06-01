import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
import * as Sharing from 'expo-sharing'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { UPDATE_CHECK_URL, TIMEOUT_MS, APP_VERSION } from '@/config'
import { toast } from '@/features/common/Toast'
import { log } from '@/core/log'

export interface UpdateInfo {
	name: string
	published_at: string
	latest_version: string
	size: number // bytes
	download_count: number
	changelog: string
	download_url: string
}

export interface CachedApkDetails {
	uri: string
	filename: string
	version: string
	size: number
	mtime: number
}

interface UpdatesContextType {
	isCheckingStartup: boolean
	startupRedirect: string | null
	updateType: 'none' | 'optional' | 'required'
	status: 'idle' | 'checking' | 'downloading' | 'completed' | 'error'
	error: string | null
	updateInfo: UpdateInfo | null
	cachedApk: CachedApkDetails | null
	downloadProgress: number
	freeStorageSize: number | null // MB
	checkForUpdates: (manual?: boolean) => Promise<UpdateInfo | null>
	downloadUpdate: () => Promise<void>
	cancelDownload: () => Promise<void>
	installUpdate: () => Promise<void>
	deleteCache: () => Promise<void>
	shareUpdate: (type: 'link' | 'file') => Promise<void>
	skipStartupRedirect: () => void
}

const UpdatesContext = createContext<UpdatesContextType | undefined>(undefined)

const CACHE_DIR = FileSystem.documentDirectory + 'drinaluza-cache/'
const LAST_CHECK_KEY = '@drinaluza_last_update_check'
const LAST_ALERTED_KEY = '@drinaluza_last_alerted_version'

// Simple robust semver parser
export function isVersionHigher(vLatest: string, vCurrent: string): boolean {
	const cleanLatest = vLatest.replace(/^v/, '').trim()
	const cleanCurrent = vCurrent.replace(/^v/, '').trim()

	const partsLatest = cleanLatest.split('.').map(Number)
	const partsCurrent = cleanCurrent.split('.').map(Number)

	const maxLength = Math.max(partsLatest.length, partsCurrent.length)
	for (let i = 0; i < maxLength; i++) {
		const numLatest = partsLatest[i] || 0
		const numCurrent = partsCurrent[i] || 0
		if (numLatest > numCurrent) return true
		if (numLatest < numCurrent) return false
	}
	return false
}

// Timeout fetch utility
async function fetchWithTimeout(url: string, timeoutMs: number): Promise<any> {
	const controller = new AbortController()
	const id = setTimeout(() => controller.abort(), timeoutMs)

	try {
		const response = await fetch(url, { signal: controller.signal })
		clearTimeout(id)
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`)
		}
		return await response.json()
	} catch (error) {
		clearTimeout(id)
		throw error
	}
}

export const UpdatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const router = useRouter()
	const [isCheckingStartup, setIsCheckingStartup] = useState(Platform.OS === 'android')
	const [startupRedirect, setStartupRedirect] = useState<string | null>(null)
	const [updateType, setUpdateType] = useState<'none' | 'optional' | 'required'>('none')
	const [status, setStatus] = useState<'idle' | 'checking' | 'downloading' | 'completed' | 'error'>('idle')
	const [error, setError] = useState<string | null>(null)
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
	const [cachedApk, setCachedApk] = useState<CachedApkDetails | null>(null)
	const [downloadProgress, setDownloadProgress] = useState(0)
	const [freeStorageSize, setFreeStorageSize] = useState<number | null>(null)

	const activeDownloadRef = useRef<any>(null)
	const isMountedRef = useRef(true)

	// Ensure cache directory exists
	const ensureCacheDirExists = async () => {
		if (Platform.OS === 'web') return
		const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR)
		if (!dirInfo.exists) {
			await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true })
		}
	}

	// Update storage details
	const refreshStorageDetails = async () => {
		if (Platform.OS === 'android') {
			try {
				const bytes = await FileSystem.getFreeDiskStorageAsync()
				setFreeStorageSize(Math.round(bytes / (1024 * 1024)))
			} catch (e) {
				log({ level: 'warn', label: 'Updates', message: 'Failed to query disk storage', error: e })
			}
		}
	}

	// Clean out outdated cached APKs and check if current matches latestVersion
	const manageApkCache = async (latestVersion: string): Promise<CachedApkDetails | null> => {
		if (Platform.OS === 'web') return null
		try {
			await ensureCacheDirExists()
			const files = await FileSystem.readDirectoryAsync(CACHE_DIR)
			let matchedDetails: CachedApkDetails | null = null

			for (const filename of files) {
				const fileUri = CACHE_DIR + filename
				const match = filename.match(/drinaluza-(.+)\.apk/)
				const version = match ? match[1] : ''

				// If it matches the latest update tag exactly, we keep it as cached
				if (version === latestVersion) {
					const info = await FileSystem.getInfoAsync(fileUri)
					if (info.exists) {
						matchedDetails = {
							uri: fileUri,
							filename,
							version,
							size: info.size || 0,
							mtime: (info as any).modificationTime || Date.now()
						}
					}
				} else {
					// Delete older or mismatching APK files in cache to keep only the latest
					log({ level: 'info', label: 'Updates', message: `Purging mismatching cached APK: ${filename}` })
					await FileSystem.deleteAsync(fileUri, { idempotent: true })
				}
			}
			return matchedDetails
		} catch (e) {
			log({ level: 'error', label: 'Updates', message: 'Error cleaning/scanning APK cache', error: e })
			return null
		}
	}

	// Native installation call
	const triggerInstallation = async (uri: string) => {
		if (Platform.OS !== 'android') return
		try {
			log({ level: 'info', label: 'Updates', message: `Launching package installer for ${uri}` })
			const contentUri = await FileSystem.getContentUriAsync(uri)
			await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
				data: contentUri,
				flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
				type: 'application/vnd.android.package-archive'
			})
		} catch (e) {
			log({ level: 'error', label: 'Updates', message: 'Failed to launch standard intent installer, trying fallback share', error: e })
			// Fallback to sharing the file as a package archive
			try {
				const contentUri = await FileSystem.getContentUriAsync(uri)
				await Sharing.shareAsync(contentUri, {
					mimeType: 'application/vnd.android.package-archive',
					dialogTitle: 'Install Drinaluza Update'
				})
			} catch (shareErr) {
				log({ level: 'error', label: 'Updates', message: 'Intent and Sharing fallback both failed', error: shareErr })
				toast.show({ title: 'Error', message: 'Failed to trigger package installer.', color: '#EF4444' })
			}
		}
	}

	// Share download URL or APK
	const shareUpdate = async (type: 'link' | 'file') => {
		if (type === 'file') {
			if (!cachedApk) {
				toast.show({ title: 'Error', message: 'No cached APK found to share.', color: '#EF4444' })
				return
			}
			try {
				const contentUri = await FileSystem.getContentUriAsync(cachedApk.uri)
				await Sharing.shareAsync(contentUri, {
					mimeType: 'application/vnd.android.package-archive',
					dialogTitle: 'Share drinaluza APK'
				})
			} catch (e) {
				log({ level: 'error', label: 'Updates', message: 'Failed to share cached APK', error: e })
			}
		} else {
			const link = updateInfo?.download_url || 'https://github.com/ahmed-derbala/drinaluza-expo-releases'
			try {
				if (Platform.OS === 'web') {
					toast.show({ title: 'Info', message: 'Share link available. Copy to clipboard instead.', color: '#3B82F6' })
				} else {
					await Sharing.shareAsync(link, {
						dialogTitle: 'Share Download Link'
					})
				}
			} catch (e) {
				log({ level: 'error', label: 'Updates', message: 'Sharing link failed', error: e })
			}
		}
	}

	// Fetch update details
	const checkForUpdates = async (manual = false): Promise<UpdateInfo | null> => {
		if (!manual) {
			setStatus('checking')
		}
		setError(null)

		try {
			log({ level: 'info', label: 'Updates', message: `Checking updates at URL: ${UPDATE_CHECK_URL}` })
			const rawData = await fetchWithTimeout(UPDATE_CHECK_URL, TIMEOUT_MS)

			const latest_version = rawData.tag_name || ''
			const name = rawData.name || `Release ${latest_version}`
			const published_at = rawData.published_at || ''
			const changelog = rawData.body || ''

			const assets = rawData.assets || []
			const apkAsset = assets.find((a: any) => a.name?.endsWith('.apk')) || assets[0]

			const info: UpdateInfo = {
				name,
				published_at,
				latest_version,
				size: apkAsset ? apkAsset.size : 0,
				download_count: apkAsset ? apkAsset.download_count : 0,
				changelog,
				download_url: apkAsset ? apkAsset.browser_download_url : ''
			}

			if (isMountedRef.current) {
				setUpdateInfo(info)
				const hasCache = await manageApkCache(info.latest_version)
				setCachedApk(hasCache)
				if (hasCache) {
					setStatus('completed')
					setDownloadProgress(1)
				} else {
					setStatus('idle')
				}
			}

			await AsyncStorage.setItem(LAST_CHECK_KEY, Date.now().toString())
			return info
		} catch (e) {
			log({ level: 'error', label: 'Updates', message: 'Failed update retrieval check', error: e })
			if (isMountedRef.current) {
				setError('Connection error or update check timed out.')
				setStatus('idle')
			}
			return null
		}
	}

	// Start APK Download Resumable
	const downloadUpdate = async () => {
		if (!updateInfo || Platform.OS !== 'android') return

		await refreshStorageDetails()
		await ensureCacheDirExists()

		const localApkUri = CACHE_DIR + `drinaluza-${updateInfo.latest_version}.apk`

		// Cancel any existing download
		if (activeDownloadRef.current) {
			await cancelDownload()
		}

		setStatus('downloading')
		setError(null)
		setDownloadProgress(0)

		const downloadResumable = FileSystem.createDownloadResumable(updateInfo.download_url, localApkUri, {}, (data) => {
			const progress = data.totalBytesWritten / data.totalBytesExpectedToWrite
			if (isMountedRef.current) {
				setDownloadProgress(isNaN(progress) ? 0 : progress)
			}
		})

		activeDownloadRef.current = downloadResumable

		try {
			const result = await downloadResumable.downloadAsync()
			if (result && result.uri && isMountedRef.current) {
				const info = await FileSystem.getInfoAsync(result.uri)
				const cacheDetails: CachedApkDetails = {
					uri: result.uri,
					filename: `drinaluza-${updateInfo.latest_version}.apk`,
					version: updateInfo.latest_version,
					size: (info as any).size || 0,
					mtime: (info as any).modificationTime || Date.now()
				}
				setCachedApk(cacheDetails)
				setStatus('completed')
				setDownloadProgress(1)
				log({ level: 'info', label: 'Updates', message: `APK Downloaded successfully to ${result.uri}` })
			}
		} catch (e) {
			if (isMountedRef.current && activeDownloadRef.current !== null) {
				setError('Download failed or interrupted.')
				setStatus('error')
				log({ level: 'error', label: 'Updates', message: 'Download error', error: e })
			}
		} finally {
			activeDownloadRef.current = null
		}
	}

	// Cancel active download
	const cancelDownload = async () => {
		if (activeDownloadRef.current) {
			try {
				await activeDownloadRef.current.cancelAsync()
				log({ level: 'info', label: 'Updates', message: 'Download cancelled successfully' })
			} catch (e) {
				log({ level: 'error', label: 'Updates', message: 'Error while cancelling download', error: e })
			} finally {
				activeDownloadRef.current = null
				if (isMountedRef.current) {
					setStatus('idle')
					setDownloadProgress(0)
				}
			}
		}
	}

	// Install downloaded APK
	const installUpdate = async () => {
		if (!cachedApk) {
			toast.show({ title: 'Error', message: 'No cached update file ready to install.', color: '#EF4444' })
			return
		}
		await triggerInstallation(cachedApk.uri)
	}

	// Delete Cache
	const deleteCache = async () => {
		if (Platform.OS === 'web') return
		try {
			await ensureCacheDirExists()
			const files = await FileSystem.readDirectoryAsync(CACHE_DIR)
			for (const filename of files) {
				await FileSystem.deleteAsync(CACHE_DIR + filename, { idempotent: true })
			}
			setCachedApk(null)
			setStatus('idle')
			setDownloadProgress(0)
			await refreshStorageDetails()
			toast.show({ title: 'Success', message: 'Cached update files deleted.', color: '#10B981' })
		} catch (e) {
			log({ level: 'error', label: 'Updates', message: 'Failed to purge cache', error: e })
			toast.show({ title: 'Error', message: 'Failed to clear cache.', color: '#EF4444' })
		}
	}

	const skipStartupRedirect = () => {
		setStartupRedirect(null)
		setIsCheckingStartup(false)
	}

	// Startup checks (Android only)
	useEffect(() => {
		isMountedRef.current = true

		const runStartupCheck = async () => {
			if (Platform.OS !== 'android') {
				setIsCheckingStartup(false)
				return
			}

			await ensureCacheDirExists()
			await refreshStorageDetails()

			try {
				log({ level: 'info', label: 'Updates', message: 'Running startup update scan' })
				const info = await checkForUpdates()

				if (!info) {
					// Timeout or Offline - fallback gracefully
					setIsCheckingStartup(false)
					return
				}

				const isNewerAvailable = isVersionHigher(info.latest_version, APP_VERSION)

				// 1. Scan if there's any file in the local cache
				const files = await FileSystem.readDirectoryAsync(CACHE_DIR)
				let localApkFile: { filename: string; version: string; uri: string } | null = null

				for (const filename of files) {
					const match = filename.match(/drinaluza-(.+)\.apk/)
					if (match) {
						localApkFile = {
							filename,
							version: match[1],
							uri: CACHE_DIR + filename
						}
						break
					}
				}

				if (localApkFile) {
					const isCachedNewerThanCurrent = isVersionHigher(localApkFile.version, APP_VERSION)

					if (!isNewerAvailable) {
						// Case: No newer version available on server than the cached version
						if (isCachedNewerThanCurrent) {
							// Cached version is higher than installed - install it!
							log({ level: 'info', label: 'Updates', message: 'No new update on server, but local cache is higher. Installing cached APK...' })
							await triggerInstallation(localApkFile.uri)
						} else {
							// Cached version is lower/equal to installed - clean cache
							log({ level: 'info', label: 'Updates', message: 'No updates. Purging outdated cached file.' })
							await FileSystem.deleteAsync(localApkFile.uri, { idempotent: true })
						}
						setIsCheckingStartup(false)
					} else {
						// Case: Newer version is available on server AND a cached APK exists
						log({ level: 'info', label: 'Updates', message: 'New update available on server and cached APK exists. Redirecting to updates screen...' })
						setStartupRedirect('/updates')
						setIsCheckingStartup(false)
					}
				} else {
					// 2. Case: No cached APK exists at all
					if (isNewerAvailable) {
						log({ level: 'info', label: 'Updates', message: 'New update available. Redirecting to updates screen...' })
						setStartupRedirect('/updates')
					}
					setIsCheckingStartup(false)
				}
			} catch (e) {
				log({ level: 'error', label: 'Updates', message: 'Fatal error in startup updates logic', error: e })
				setIsCheckingStartup(false)
			}
		}

		runStartupCheck()

		return () => {
			isMountedRef.current = false
		}
	}, [])

	// Background Check (Once per day when app is active)
	useEffect(() => {
		const checkBackgroundUpdate = async () => {
			try {
				const lastCheck = await AsyncStorage.getItem(LAST_CHECK_KEY)
				const now = Date.now()

				// If checked in last 24h, skip
				if (lastCheck && now - Number(lastCheck) < 86400000) {
					return
				}

				log({ level: 'info', label: 'Updates', message: 'Performing background update check' })
				const info = await checkForUpdates()

				if (info) {
					const isNewerAvailable = isVersionHigher(info.latest_version, APP_VERSION)
					if (isNewerAvailable) {
						const lastAlerted = await AsyncStorage.getItem(LAST_ALERTED_KEY)

						// Alert only once per version
						if (lastAlerted !== info.latest_version) {
							await AsyncStorage.setItem(LAST_ALERTED_KEY, info.latest_version)

							toast.show({
								title: 'App Update Available',
								message: `Version ${info.latest_version} is available. Tap here to review what's new.`,
								color: '#0EA5E9',
								screen: '/updates'
							})
						}
					}
				}
			} catch (e) {
				log({ level: 'warn', label: 'Updates', message: 'Background update checking failed silently', error: e })
			}
		}

		// Let the app bootstrap first, then do the background check after 5 seconds
		const timer = setTimeout(() => {
			checkBackgroundUpdate()
		}, 5000)

		return () => clearTimeout(timer)
	}, [])

	return (
		<UpdatesContext.Provider
			value={{
				isCheckingStartup,
				startupRedirect,
				updateType,
				status,
				error,
				updateInfo,
				cachedApk,
				downloadProgress,
				freeStorageSize,
				checkForUpdates,
				downloadUpdate,
				cancelDownload,
				installUpdate,
				deleteCache,
				shareUpdate,
				skipStartupRedirect
			}}
		>
			{children}
		</UpdatesContext.Provider>
	)
}

export const useUpdates = () => {
	const context = useContext(UpdatesContext)
	if (!context) {
		throw new Error('useUpdates must be used within an UpdatesProvider')
	}
	return context
}
