import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { Platform, Share, Alert } from 'react-native'
import * as FileSystem from 'expo-file-system'
import * as IntentLauncher from 'expo-intent-launcher'
import * as Sharing from 'expo-sharing'
import * as Clipboard from 'expo-clipboard'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { APP_VERSION, UPDATE_CHECK_URL, TIMEOUT_MS } from '@/config'
import { log } from '@/core/log'

export interface UpdateCheckResult {
	name: string
	published_at: string
	latest_version: string
	size: number
	download_count: number
	changelog: string
	download_url: string
}

export interface CachedApkInfo {
	version: string
	localUri: string
	size: number
	published_at: string
	download_url: string
}

export type UpdateType = 'REQUIRED' | 'OPTIONAL' | 'NONE'

export interface StartupDecision {
	action: 'NONE' | 'INSTALL_CACHED' | 'SHOW_UPDATES_REQUIRED' | 'SHOW_UPDATES_OPTIONAL'
	cachedVersion?: string
	latestVersion?: string
}

interface UpdatesContextType {
	isChecking: boolean
	updateAvailable: boolean
	updateType: UpdateType
	latestUpdate: UpdateCheckResult | null
	downloadProgress: number
	downloading: boolean
	cachedApk: CachedApkInfo | null
	error: string | null
	freeStorage: number
	checkForUpdates: (manual?: boolean) => Promise<UpdateCheckResult | null>
	downloadUpdate: () => Promise<string | null>
	cancelDownload: () => Promise<void>
	installUpdate: (uri?: string) => Promise<void>
	deleteCachedApk: () => Promise<void>
	startupCheck: () => Promise<StartupDecision>
	shareUpdate: () => Promise<void>
	loadFreeStorage: () => Promise<number>
}

const UpdatesContext = createContext<UpdatesContextType | undefined>(undefined)

const CACHE_DIR = `${FileSystem.cacheDirectory}updates/`
const STORAGE_KEYS = {
	LAST_CHECK: 'updates_last_check_time',
	LATEST_INFO: 'updates_latest_info',
	CACHED_APK: 'updates_cached_apk_info'
}

// Helper to parse version string into semantic components
export const parseVersion = (v: string): [number, number, number] => {
	const cleaned = v.replace(/^v/, '')
	const parts = cleaned.split('.').map(Number)
	return [parts[0] || 0, parts[1] || 0, parts[2] || 0]
}

// Compare current and latest versions to determine update type
export const getUpdateType = (current: string, latest: string): UpdateType => {
	const [cMajor, cMinor, cPatch] = parseVersion(current)
	const [lMajor, lMinor, lPatch] = parseVersion(latest)

	if (lMajor > cMajor) return 'REQUIRED'
	if (lMajor === cMajor && lMinor > cMinor) return 'REQUIRED'
	if (lMajor === cMajor && lMinor === cMinor && lPatch > cPatch) return 'OPTIONAL'
	return 'NONE'
}

export const UpdatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isChecking, setIsChecking] = useState(false)
	const [updateAvailable, setUpdateAvailable] = useState(false)
	const [updateType, setUpdateType] = useState<UpdateType>('NONE')
	const [latestUpdate, setLatestUpdate] = useState<UpdateCheckResult | null>(null)
	const [downloadProgress, setDownloadProgress] = useState(-1)
	const [downloading, setDownloading] = useState(false)
	const [cachedApk, setCachedApk] = useState<CachedApkInfo | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [freeStorage, setFreeStorage] = useState(0)

	const downloadResumableRef = useRef<FileSystem.DownloadResumable | null>(null)

	// Clean up previous APK files to keep ONLY the latest cached version
	const cleanupCachedApks = useCallback(async (keepVersion?: string) => {
		if (Platform.OS === 'web') return
		try {
			const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR)
			if (!dirInfo.exists) return

			const files = await FileSystem.readDirectoryAsync(CACHE_DIR)
			for (const file of files) {
				if (file.endsWith('.apk')) {
					// If a specific version is specified to keep, preserve it. Otherwise delete all.
					if (keepVersion && file.includes(keepVersion)) {
						continue
					}
					await FileSystem.deleteAsync(`${CACHE_DIR}${file}`, { idempotent: true })
					log({ level: 'info', label: 'UpdatesEngine', message: `Cleaned up old cached APK file: ${file}` })
				}
			}
		} catch (err) {
			log({ level: 'error', label: 'UpdatesEngine', message: 'Failed during cached APK cleanup', error: err })
		}
	}, [])

	// Load storage and physical file details on mount
	const loadCachedApkInfo = useCallback(async () => {
		if (Platform.OS === 'web') return null

		try {
			const infoStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_APK)
			if (infoStr) {
				const info: CachedApkInfo = JSON.parse(infoStr)
				const fileInfo = await FileSystem.getInfoAsync(info.localUri)

				if (fileInfo.exists) {
					setCachedApk(info)
					return info
				} else {
					// File was removed outside app context
					await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_APK)
					setCachedApk(null)
				}
			}
		} catch (err) {
			log({ level: 'error', label: 'UpdatesEngine', message: 'Failed reading cached APK info', error: err })
		}
		setCachedApk(null)
		return null
	}, [])

	// Read free disk space in MB
	const loadFreeStorage = useCallback(async (): Promise<number> => {
		if (Platform.OS === 'web') return 0
		try {
			const bytes = await FileSystem.getFreeDiskStorageAsync()
			const mb = Math.round(bytes / (1024 * 1024))
			setFreeStorage(mb)
			return mb
		} catch (err) {
			log({ level: 'warn', label: 'UpdatesEngine', message: 'Failed fetching free disk space', error: err })
			return 0
		}
	}, [])

	useEffect(() => {
		loadCachedApkInfo()
		loadFreeStorage()
	}, [loadCachedApkInfo, loadFreeStorage])

	// Check latest release from GitHub API
	const checkForUpdates = useCallback(
		async (manual = false): Promise<UpdateCheckResult | null> => {
			setIsChecking(true)
			setError(null)

			const controller = new AbortController()
			const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

			try {
				log({ level: 'info', label: 'UpdatesEngine', message: `Checking updates via ${UPDATE_CHECK_URL}...` })
				const res = await fetch(UPDATE_CHECK_URL, { signal: controller.signal })
				clearTimeout(timeoutId)

				if (!res.ok) {
					throw new Error(`Server returned HTTP ${res.status}`)
				}

				const data = await res.json()
				const tag = data.tag_name || ''
				const cleanTag = tag.replace(/^v/, '')

				const apkAsset = data.assets?.find((asset: any) => asset.name?.endsWith('.apk') || asset.content_type === 'application/vnd.android.package-archive')

				const result: UpdateCheckResult = {
					name: data.name || `Release ${tag}`,
					published_at: data.published_at || '',
					latest_version: cleanTag,
					size: apkAsset ? apkAsset.size : 0,
					download_count: apkAsset ? apkAsset.download_count : 0,
					changelog: data.body || '',
					download_url: apkAsset ? apkAsset.browser_download_url : ''
				}

				const type = getUpdateType(APP_VERSION, cleanTag)

				setLatestUpdate(result)
				setUpdateType(type)
				setUpdateAvailable(type !== 'NONE')

				// Save check results in storage
				const now = new Date().toISOString()
				await AsyncStorage.setItem(STORAGE_KEYS.LAST_CHECK, now)
				await AsyncStorage.setItem(STORAGE_KEYS.LATEST_INFO, JSON.stringify({ result, type }))

				// If no update is available, delete cached APK if its version is not higher than current
				if (type === 'NONE') {
					await cleanupCachedApks()
					await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_APK)
					setCachedApk(null)
				}

				log({ level: 'info', label: 'UpdatesEngine', message: `Check finished. Latest: ${cleanTag}, Type: ${type}` })
				return result
			} catch (err: any) {
				clearTimeout(timeoutId)
				const errMsg = err.name === 'AbortError' ? 'Update check timed out' : 'Failed to fetch update information'
				log({ level: 'error', label: 'UpdatesEngine', message: `Update check failed: ${err.message}` })

				if (manual) {
					setError(errMsg)
					throw new Error(errMsg)
				} else {
					// Silent fail: read last known updates info if available
					const saved = await AsyncStorage.getItem(STORAGE_KEYS.LATEST_INFO)
					if (saved) {
						try {
							const { result, type } = JSON.parse(saved)
							setLatestUpdate(result)
							setUpdateType(type)
							setUpdateAvailable(type !== 'NONE')
						} catch (e) {}
					}
				}
				return null
			} finally {
				setIsChecking(false)
			}
		},
		[cleanupCachedApks]
	)

	// Download APK update on Android
	const downloadUpdate = useCallback(async (): Promise<string | null> => {
		if (Platform.OS === 'web') {
			if (latestUpdate?.download_url) {
				// Simply return download URL on web
				return latestUpdate.download_url
			}
			return null
		}

		if (!latestUpdate || !latestUpdate.download_url) {
			setError('No download URL available')
			return null
		}

		try {
			setError(null)
			setDownloading(true)
			setDownloadProgress(0)

			// Ensure directory exists
			const dirInfo = await FileSystem.getInfoAsync(CACHE_DIR)
			if (!dirInfo.exists) {
				await FileSystem.makeDirectoryAsync(CACHE_DIR, { intermediates: true })
			}

			const filename = `drinaluza-${latestUpdate.latest_version}.apk`
			const localUri = `${CACHE_DIR}${filename}`

			// Check if we already have it downloaded completely
			const fileInfo = await FileSystem.getInfoAsync(localUri)
			if (fileInfo.exists && fileInfo.size === latestUpdate.size) {
				setDownloadProgress(1)
				setDownloading(false)

				const cachedInfo: CachedApkInfo = {
					version: latestUpdate.latest_version,
					localUri,
					size: latestUpdate.size,
					published_at: latestUpdate.published_at,
					download_url: latestUpdate.download_url
				}
				await AsyncStorage.setItem(STORAGE_KEYS.CACHED_APK, JSON.stringify(cachedInfo))
				setCachedApk(cachedInfo)
				return localUri
			}

			// Perform new download
			const downloadResumable = FileSystem.createDownloadResumable(latestUpdate.download_url, localUri, {}, (progress) => {
				if (progress.totalBytesExpectedToWrite > 0) {
					const fraction = progress.totalBytesWritten / progress.totalBytesExpectedToWrite
					setDownloadProgress(fraction)
				}
			})

			downloadResumableRef.current = downloadResumable
			const downloadResult = await downloadResumable.downloadAsync()

			if (downloadResult && downloadResult.uri) {
				setDownloadProgress(1)

				// Keep ONLY this version in cache
				await cleanupCachedApks(latestUpdate.latest_version)

				const cachedInfo: CachedApkInfo = {
					version: latestUpdate.latest_version,
					localUri: downloadResult.uri,
					size: downloadResult.size || latestUpdate.size,
					published_at: latestUpdate.published_at,
					download_url: latestUpdate.download_url
				}
				await AsyncStorage.setItem(STORAGE_KEYS.CACHED_APK, JSON.stringify(cachedInfo))
				setCachedApk(cachedInfo)
				log({ level: 'info', label: 'UpdatesEngine', message: `Downloaded APK saved to: ${downloadResult.uri}` })
				return downloadResult.uri
			}

			return null
		} catch (err: any) {
			log({ level: 'error', label: 'UpdatesEngine', message: 'Download failed', error: err })
			setError(err.message || 'Download failed')
			return null
		} finally {
			setDownloading(false)
			downloadResumableRef.current = null
		}
	}, [latestUpdate, cleanupCachedApks])

	// Cancel active download
	const cancelDownload = useCallback(async () => {
		if (downloadResumableRef.current) {
			try {
				await downloadResumableRef.current.cancelAsync()
				log({ level: 'info', label: 'UpdatesEngine', message: 'Download cancelled by user' })
			} catch (err) {
				log({ level: 'warn', label: 'UpdatesEngine', message: 'Failed to cancel download', error: err })
			}
		}
		setDownloading(false)
		setDownloadProgress(-1)
	}, [])

	// Install cached APK on Android
	const installUpdate = useCallback(
		async (uri?: string) => {
			if (Platform.OS === 'web') return

			const finalUri = uri || cachedApk?.localUri
			if (!finalUri) {
				Alert.alert('Error', 'No downloaded update found. Please download the update first.')
				return
			}

			try {
				log({ level: 'info', label: 'UpdatesEngine', message: `Installing APK: ${finalUri}` })
				const contentUri = await FileSystem.getContentUriAsync(finalUri)

				await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
					data: contentUri,
					flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
					type: 'application/vnd.android.package-archive'
				})
			} catch (err) {
				log({ level: 'error', label: 'UpdatesEngine', message: 'Installation launcher failed', error: err })
				Alert.alert('Installation Failed', 'Could not automatically launch installation. You can manually share/install the APK file.')
			}
		},
		[cachedApk]
	)

	// Clear downloaded APK cache
	const deleteCachedApk = useCallback(async () => {
		if (Platform.OS === 'web') return
		try {
			await cleanupCachedApks()
			await AsyncStorage.removeItem(STORAGE_KEYS.CACHED_APK)
			setCachedApk(null)
			log({ level: 'info', label: 'UpdatesEngine', message: 'Cleared APK cache directory' })
		} catch (err) {
			log({ level: 'error', label: 'UpdatesEngine', message: 'Failed deleting cached APK', error: err })
		}
	}, [cleanupCachedApks])

	// Handle sharing details
	const shareUpdate = useCallback(async () => {
		const downloadUrl = latestUpdate?.download_url || 'https://github.com/ahmed-derbala/drinaluza-expo-releases/releases/latest'

		if (Platform.OS === 'web') {
			Alert.alert('Share Update', 'What would you like to do?', [
				{
					text: 'Copy Download Link',
					onPress: async () => {
						await Clipboard.setStringAsync(downloadUrl)
						Alert.alert('Success', 'Copied to clipboard!')
					}
				},
				{
					text: 'Download APK file',
					onPress: () => {
						window.open(downloadUrl, '_blank')
					}
				},
				{ text: 'Cancel', style: 'cancel' }
			])
		} else {
			// Android
			const hasApk = !!cachedApk?.localUri
			const options = [
				{
					text: 'Share Download Link',
					onPress: async () => {
						try {
							await Share.share({
								message: `Download the latest Drinaluza Update v${latestUpdate?.latest_version || ''}: ${downloadUrl}`
							})
						} catch (e) {}
					}
				}
			]

			if (hasApk) {
				options.push({
					text: 'Share APK File (Local)',
					onPress: async () => {
						Alert.alert('Recommended', 'Using "Quick Share" is recommended for fast sharing of the APK file with nearby devices.', [
							{
								text: 'Share Now',
								onPress: async () => {
									try {
										if (cachedApk?.localUri) {
											await Sharing.shareAsync(cachedApk.localUri, {
												mimeType: 'application/vnd.android.package-archive',
												dialogTitle: 'Share APK File'
											})
										}
									} catch (err) {
										log({ level: 'error', label: 'UpdatesEngine', message: 'File sharing failed', error: err })
									}
								}
							}
						])
					}
				})
			}

			options.push({ text: 'Cancel', style: 'cancel' })

			Alert.alert('Share Update', 'Choose how you want to share the update:', options)
		}
	}, [latestUpdate, cachedApk])

	// Execute Startup checking sequence
	const startupCheck = useCallback(async (): Promise<StartupDecision> => {
		if (Platform.OS === 'web') {
			return { action: 'NONE' }
		}

		// 1. Load active local APK cache info
		const activeCache = await loadCachedApkInfo()
		let serverInfo: UpdateCheckResult | null = null

		// 2. Read last check time
		const lastCheckStr = await AsyncStorage.getItem(STORAGE_KEYS.LAST_CHECK)
		const now = new Date()
		let needsNetworkCheck = true

		if (lastCheckStr) {
			const lastCheck = new Date(lastCheckStr)
			const elapsedDays = (now.getTime() - lastCheck.getTime()) / (1000 * 60 * 60 * 24)
			// Skip network fetch if last check was less than 7 days ago
			if (elapsedDays < 7) {
				needsNetworkCheck = false
			}
		}

		if (needsNetworkCheck) {
			try {
				serverInfo = await checkForUpdates(false)
			} catch (e) {
				log({ level: 'warn', label: 'UpdatesEngine', message: 'Startup background updates check failed', error: e })
			}
		} else {
			// Read from stored details
			const saved = await AsyncStorage.getItem(STORAGE_KEYS.LATEST_INFO)
			if (saved) {
				try {
					const { result, type } = JSON.parse(saved)
					serverInfo = result
					setLatestUpdate(result)
					setUpdateType(type)
					setUpdateAvailable(type !== 'NONE')
				} catch (e) {}
			}
		}

		const currentServerVersion = serverInfo?.latest_version || latestUpdate?.latest_version || ''
		const currentServerType = serverInfo ? getUpdateType(APP_VERSION, serverInfo.latest_version) : updateType

		// 3. Evaluate decisions based on cached and server versions
		if (activeCache) {
			const cacheComparedToCurrent = getUpdateType(APP_VERSION, activeCache.version)

			if (!currentServerVersion || currentServerType === 'NONE') {
				// No new updates on server
				if (cacheComparedToCurrent === 'REQUIRED' || cacheComparedToCurrent === 'OPTIONAL') {
					// We have a downloaded APK version higher than currently running
					return {
						action: 'INSTALL_CACHED',
						cachedVersion: activeCache.version
					}
				}
				// Cached APK version is old, clean it up
				await deleteCachedApk()
				return { action: 'NONE' }
			} else {
				// New version is available on server
				if (currentServerType === 'REQUIRED') {
					return {
						action: 'SHOW_UPDATES_REQUIRED',
						latestVersion: currentServerVersion
					}
				} else if (currentServerType === 'OPTIONAL') {
					return {
						action: 'SHOW_UPDATES_OPTIONAL',
						latestVersion: currentServerVersion
					}
				}
			}
		} else {
			// No cached APK on disk
			if (currentServerVersion && currentServerType !== 'NONE') {
				if (currentServerType === 'REQUIRED') {
					return {
						action: 'SHOW_UPDATES_REQUIRED',
						latestVersion: currentServerVersion
					}
				} else if (currentServerType === 'OPTIONAL') {
					return {
						action: 'SHOW_UPDATES_OPTIONAL',
						latestVersion: currentServerVersion
					}
				}
			}
		}

		return { action: 'NONE' }
	}, [checkForUpdates, loadCachedApkInfo, latestUpdate, updateType, deleteCachedApk])

	return (
		<UpdatesContext.Provider
			value={{
				isChecking,
				updateAvailable,
				updateType,
				latestUpdate,
				downloadProgress,
				downloading,
				cachedApk,
				error,
				freeStorage,
				checkForUpdates,
				downloadUpdate,
				cancelDownload,
				installUpdate,
				deleteCachedApk,
				startupCheck,
				shareUpdate,
				loadFreeStorage
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
