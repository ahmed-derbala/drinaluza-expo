import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Platform, Alert } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import { config } from '@/config'
import { log } from '@/core/log'
import { getItem, setItem, removeItem } from '@/core/storage'
import { UpdateCheckResult, CachedApkMetadata, UpdatesContextProps } from './types'

export const UpdatesContext = createContext<UpdatesContextProps | undefined>(undefined)

const UPDATES_FOLDER = FileSystem.documentDirectory + 'updates/'

// Helper: Ensure the updates directory exists
const ensureUpdatesFolder = async () => {
	if (Platform.OS === 'web') return
	try {
		const dirInfo = await FileSystem.getInfoAsync(UPDATES_FOLDER)
		if (!dirInfo.exists) {
			await FileSystem.makeDirectoryAsync(UPDATES_FOLDER, { intermediates: true })
		}
	} catch (err) {
		console.warn('[UpdatesContext] Failed to create updates folder:', err)
	}
}

// Function that parses Github release response
export const checkUpdatesApi = async (url: string): Promise<UpdateCheckResult> => {
	const controller = new AbortController()
	const id = setTimeout(() => controller.abort(), config.app.timeout)

	try {
		const res = await fetch(url, { signal: controller.signal })
		clearTimeout(id)
		if (!res.ok) {
			throw new Error(`Update check request failed with status: ${res.status}`)
		}
		const data = await res.json()
		// Find standard APK asset
		const apkAsset = data.assets?.find((asset: any) => asset.content_type === 'application/vnd.android.package-archive' || asset.name.endsWith('.apk'))

		const latestVersion = data.tag_name ? data.tag_name.replace(/^v/, '') : ''

		return {
			name: data.name || '',
			published_at: data.published_at || '',
			latest_version: latestVersion,
			size: apkAsset ? apkAsset.size : 0,
			download_count: apkAsset ? apkAsset.download_count : 0,
			changelog: data.body || '',
			download_url: apkAsset ? apkAsset.browser_download_url : ''
		}
	} catch (err) {
		clearTimeout(id)
		throw err
	}
}

// Version comparator helper: returns true if v1 > v2
export const isVersionGreater = (v1: string, v2: string): boolean => {
	const p1 = v1.split('.').map(Number)
	const p2 = v2.split('.').map(Number)
	for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
		const num1 = p1[i] || 0
		const num2 = p2[i] || 0
		if (num1 > num2) return true
		if (num1 < num2) return false
	}
	return false
}

export const UpdatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isChecking, setIsChecking] = useState(false)
	const [latestRelease, setLatestRelease] = useState<UpdateCheckResult | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [downloadProgress, setDownloadProgress] = useState(0)
	const [isDownloading, setIsDownloading] = useState(false)
	const [downloadedApks, setDownloadedApks] = useState<CachedApkMetadata[]>([])
	const [deviceFreeStorage, setDeviceFreeStorage] = useState(0)

	const activeDownloadRef = useRef<FileSystem.DownloadResumable | null>(null)
	const [isPaused, setIsPaused] = useState(false)
	const resumeDataRef = useRef<string | null>(null)
	const isPausingRef = useRef(false)
	const isCancellingRef = useRef(false)

	// Fetch dynamic APK files from local storage on native platforms
	const refreshApkList = useCallback(async (): Promise<CachedApkMetadata[]> => {
		if (Platform.OS === 'web') return []
		try {
			await ensureUpdatesFolder()
			const files = await FileSystem.readDirectoryAsync(UPDATES_FOLDER)
			const apks: CachedApkMetadata[] = []

			for (const file of files) {
				if (file.endsWith('.apk')) {
					const fileUri = UPDATES_FOLDER + file
					const fileInfo = await FileSystem.getInfoAsync(fileUri)

					if (fileInfo.exists) {
						// Extract version from file name like drinaluza-1.16.2.apk
						const match = file.match(/drinaluza-(.+)\.apk/)
						const version = match ? match[1] : 'unknown'
						const size = fileInfo.size || 0

						// If file version is higher than active version, it is installable
						const isInstallable = version !== 'unknown' && isVersionGreater(version, config.app.version)

						apks.push({
							filename: file,
							fileUri,
							version,
							size,
							isInstallable
						})
					}
				}
			}

			setDownloadedApks(apks)

			// Get free space
			const freeSpace = await FileSystem.getFreeDiskStorageAsync()
			setDeviceFreeStorage(freeSpace)
			return apks
		} catch (err) {
			console.warn('[UpdatesContext] Failed to scan cached APKs:', err)
			return []
		}
	}, [])

	// Self-healing cleaner: deletes older APK versions, keeping only the latest
	const pruneOldApks = useCallback(async (latestVer: string) => {
		if (Platform.OS === 'web') return
		try {
			const files = await FileSystem.readDirectoryAsync(UPDATES_FOLDER)
			for (const file of files) {
				if (file.endsWith('.apk') && !file.includes(latestVer)) {
					await FileSystem.deleteAsync(UPDATES_FOLDER + file, { idempotent: true })
				}
			}
		} catch (err) {
			console.warn('[UpdatesContext] Pruning older cached releases failed:', err)
		}
	}, [])

	// Trigger Check for Updates
	const checkForUpdates = useCallback(
		async (manual = false): Promise<UpdateCheckResult | null> => {
			setIsChecking(true)
			setError(null)
			try {
				const result = await checkUpdatesApi(config.updateCheckUrl)
				setLatestRelease(result)
				setIsChecking(false)

				if (Platform.OS !== 'web') {
					await refreshApkList()
					// Run a proactive cleanup of stale APK cache files (disabled to show all downloaded APKs)
					// await pruneOldApks(result.latest_version)
				}
				return result
			} catch (err: any) {
				console.warn('[UpdatesContext] Update check encountered network/timeout error:', err)
				setError(err?.message || 'Failed to check for updates.')
				setIsChecking(false)
				return null
			}
		},
		[refreshApkList, pruneOldApks]
	)

	// Install Android APK
	const installApk = useCallback(async (fileUri: string) => {
		if (Platform.OS !== 'android') return
		log({ level: 'info', label: 'UpdatesContext', message: `Attempting to install APK from: ${fileUri}` })
		try {
			const contentUri = await FileSystem.getContentUriAsync(fileUri)
			const { startActivityAsync } = require('expo-intent-launcher')

			try {
				// 1. Try modern ACTION_VIEW with MIME type (universal file opener)
				await startActivityAsync('android.intent.action.VIEW', {
					data: contentUri,
					flags: 1, // Intent.FLAG_GRANT_READ_URI_PERMISSION
					type: 'application/vnd.android.package-archive'
				})
			} catch (viewErr) {
				log({ level: 'warn', label: 'UpdatesContext', message: 'ACTION_VIEW failed, trying legacy ACTION_INSTALL_PACKAGE fallback', error: viewErr })

				// 2. Fall back to legacy ACTION_INSTALL_PACKAGE
				await startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
					data: contentUri,
					flags: 1 // Intent.FLAG_GRANT_READ_URI_PERMISSION
				})
			}
		} catch (err: any) {
			log({ level: 'error', label: 'UpdatesContext', message: 'Android package installation failed', error: err })

			Alert.alert(
				'Installation Failed',
				'Could not launch the Android package installer. Please ensure you have allowed this app to install unknown apps in your device settings.\n\nError: ' + (err?.message || err),
				[{ text: 'OK' }]
			)
			throw new Error('Failed to launch the Android package installer. Please verify permissions.')
		}
	}, [])

	// Delete downloaded APK
	const deleteApk = useCallback(
		async (fileUri: string) => {
			if (Platform.OS === 'web') return
			try {
				await FileSystem.deleteAsync(fileUri, { idempotent: true })
				await refreshApkList()
			} catch (err) {
				console.warn('[UpdatesContext] Deleting local APK cache failed:', err)
			}
		},
		[refreshApkList]
	)

	// Download APK
	const downloadUpdate = useCallback(async (): Promise<string | null> => {
		if (Platform.OS !== 'android' || !latestRelease || !latestRelease.download_url) {
			return null
		}

		setIsDownloading(true)
		setIsPaused(false)
		resumeDataRef.current = null
		await removeItem('download_resume_data')
		await removeItem('download_progress')
		await setItem('download_status', 'downloading')
		setDownloadProgress(0)
		await ensureUpdatesFolder()

		const filename = `drinaluza-${latestRelease.latest_version}.apk`
		const fileUri = UPDATES_FOLDER + filename
		const tempFileUri = fileUri + '.tmp'

		try {
			// Clean any partial downloads of this exact version
			await FileSystem.deleteAsync(tempFileUri, { idempotent: true })
			await FileSystem.deleteAsync(fileUri, { idempotent: true })

			const downloadResumable = FileSystem.createDownloadResumable(latestRelease.download_url, tempFileUri, {}, (downloadProgressData) => {
				const progress = downloadProgressData.totalBytesWritten / downloadProgressData.totalBytesExpectedToWrite
				setDownloadProgress(isNaN(progress) ? 0 : progress)
			})

			activeDownloadRef.current = downloadResumable
			const downloadResult = await downloadResumable.downloadAsync()
			activeDownloadRef.current = null

			// Check if we are pausing or cancelling
			if (isPausingRef.current) {
				log({ level: 'info', label: 'UpdatesContext', message: 'downloadUpdate: download was paused, exiting early' })
				return null
			}
			if (isCancellingRef.current) {
				log({ level: 'info', label: 'UpdatesContext', message: 'downloadUpdate: download was cancelled, exiting early' })
				return null
			}

			if (downloadResult && downloadResult.uri) {
				setIsDownloading(false)
				setDownloadProgress(1)
				await removeItem('download_resume_data')
				await removeItem('download_progress')

				// Rename temp file to final .apk file on successful completion
				await FileSystem.moveAsync({
					from: downloadResult.uri,
					to: fileUri
				})

				await refreshApkList()
				// Automatically launch package installer when download is complete
				await installApk(fileUri)
				return fileUri
			} else {
				throw new Error('Download completed with empty or invalid result.')
			}
		} catch (err) {
			if (isPausingRef.current) {
				setIsDownloading(false)
				return null
			}
			if (isCancellingRef.current) {
				return null
			}
			setIsDownloading(false)
			setIsPaused(false)
			setDownloadProgress(0)
			activeDownloadRef.current = null
			await removeItem('download_resume_data')
			await removeItem('download_progress')
			await removeItem('download_status')
			// Clean up temp file on failure
			await FileSystem.deleteAsync(tempFileUri, { idempotent: true }).catch(() => {})
			console.error('[UpdatesContext] File download error:', err)
			throw err
		}
	}, [latestRelease, refreshApkList, pruneOldApks, installApk])

	// Pause Download
	const pauseDownload = useCallback(async () => {
		if (activeDownloadRef.current && isDownloading && !isPaused) {
			isPausingRef.current = true
			try {
				const result = await activeDownloadRef.current.pauseAsync()
				const resumeData = result.resumeData || null
				resumeDataRef.current = resumeData
				setIsPaused(true)
				setIsDownloading(false)
				if (resumeData) {
					await setItem('download_status', 'paused')
					await setItem('download_resume_data', resumeData)
					await setItem('download_progress', downloadProgress)
				}
				log({ level: 'info', label: 'UpdatesContext', message: 'Download paused' })
			} catch (err) {
				console.error('[UpdatesContext] Failed to pause download:', err)
			} finally {
				isPausingRef.current = false
			}
		}
	}, [isDownloading, isPaused, downloadProgress])

	// Resume Download
	const resumeDownload = useCallback(async (): Promise<string | null> => {
		if (Platform.OS !== 'android' || !latestRelease || !latestRelease.download_url) {
			return null
		}

		setIsDownloading(true)
		setIsPaused(false)
		await setItem('download_status', 'downloading')
		await ensureUpdatesFolder()

		const filename = `drinaluza-${latestRelease.latest_version}.apk`
		const fileUri = UPDATES_FOLDER + filename
		const tempFileUri = fileUri + '.tmp'

		try {
			let downloadResumable: FileSystem.DownloadResumable

			if (resumeDataRef.current) {
				downloadResumable = FileSystem.createDownloadResumable(
					latestRelease.download_url,
					tempFileUri,
					{},
					(downloadProgressData) => {
						const progress = downloadProgressData.totalBytesWritten / downloadProgressData.totalBytesExpectedToWrite
						setDownloadProgress(isNaN(progress) ? 0 : progress)
					},
					resumeDataRef.current
				)
			} else {
				downloadResumable = FileSystem.createDownloadResumable(latestRelease.download_url, tempFileUri, {}, (downloadProgressData) => {
					const progress = downloadProgressData.totalBytesWritten / downloadProgressData.totalBytesExpectedToWrite
					setDownloadProgress(isNaN(progress) ? 0 : progress)
				})
			}

			activeDownloadRef.current = downloadResumable
			const downloadResult = await downloadResumable.resumeAsync()
			activeDownloadRef.current = null

			// Check if we are pausing or cancelling
			if (isPausingRef.current) {
				log({ level: 'info', label: 'UpdatesContext', message: 'resumeDownload: download was paused, exiting early' })
				return null
			}
			if (isCancellingRef.current) {
				log({ level: 'info', label: 'UpdatesContext', message: 'resumeDownload: download was cancelled, exiting early' })
				return null
			}

			if (downloadResult && downloadResult.uri) {
				setIsDownloading(false)
				setDownloadProgress(1)
				resumeDataRef.current = null
				await removeItem('download_resume_data')
				await removeItem('download_progress')
				await removeItem('download_status')

				await FileSystem.moveAsync({
					from: downloadResult.uri,
					to: fileUri
				})

				await refreshApkList()
				await installApk(fileUri)
				return fileUri
			} else {
				throw new Error('Resume download completed with empty or invalid result.')
			}
		} catch (err) {
			if (isPausingRef.current) {
				setIsDownloading(false)
				return null
			}
			if (isCancellingRef.current) {
				return null
			}
			setIsDownloading(false)
			setIsPaused(false)
			setDownloadProgress(0)
			activeDownloadRef.current = null
			await removeItem('download_resume_data')
			await removeItem('download_progress')
			await removeItem('download_status')
			console.error('[UpdatesContext] File resume download error:', err)
			throw err
		}
	}, [latestRelease, refreshApkList, installApk])

	// Cancel Download completely
	const cancelDownload = useCallback(async () => {
		isCancellingRef.current = true
		try {
			setIsDownloading(false)
			setIsPaused(false)
			setDownloadProgress(0)
			if (activeDownloadRef.current) {
				try {
					await activeDownloadRef.current.cancelAsync()
				} catch (e) {
					// Ignore
				}
				activeDownloadRef.current = null
			}
			resumeDataRef.current = null
			await removeItem('download_resume_data')
			await removeItem('download_progress')
			await removeItem('download_status')
			if (latestRelease) {
				const filename = `drinaluza-${latestRelease.latest_version}.apk.tmp`
				await FileSystem.deleteAsync(UPDATES_FOLDER + filename, { idempotent: true }).catch(() => {})
			}
		} finally {
			isCancellingRef.current = false
		}
	}, [latestRelease])

	// Cancel download on unmount to prevent resource memory leak
	useEffect(() => {
		return () => {
			if (activeDownloadRef.current) {
				try {
					activeDownloadRef.current.cancelAsync()
				} catch (e) {
					console.warn('[UpdatesContext] Failed to cancel active download on unmount:', e)
				}
			}
		}
	}, [])

	// Startup cleanup: delete incomplete downloads, corrupted files, and keep only the highest version APK
	const performStartupCleanup = useCallback(async () => {
		if (Platform.OS === 'web') return
		try {
			await ensureUpdatesFolder()
			const files = await FileSystem.readDirectoryAsync(UPDATES_FOLDER)

			const validApks: { filename: string; version: string }[] = []

			const downloadStatus = await getItem<string>('download_status')
			const isPausedStatus = downloadStatus === 'paused'

			if (!isPausedStatus) {
				await removeItem('download_resume_data')
				await removeItem('download_progress')
				await removeItem('download_status')
			}

			for (const file of files) {
				const filePath = UPDATES_FOLDER + file

				// 1. Handle .tmp files (incomplete downloads)
				if (file.endsWith('.tmp')) {
					if (isPausedStatus) {
						continue
					} else {
						log({ level: 'info', label: 'UpdatesContext', message: `Startup cleanup: deleting incomplete/interrupted download file ${file}` })
						await FileSystem.deleteAsync(filePath, { idempotent: true })
						continue
					}
				}

				// 2. Only process .apk files, delete anything else unexpected
				if (!file.endsWith('.apk')) {
					log({ level: 'info', label: 'UpdatesContext', message: `Startup cleanup: deleting unexpected file ${file}` })
					await FileSystem.deleteAsync(filePath, { idempotent: true })
					continue
				}

				// 3. Parse version from filename (e.g. drinaluza-1.16.2.apk)
				const match = file.match(/drinaluza-(.+)\.apk/)
				if (!match || match[1] === 'unknown') {
					// Corrupted or unrecognized APK file
					log({ level: 'info', label: 'UpdatesContext', message: `Startup cleanup: deleting unrecognized APK ${file}` })
					await FileSystem.deleteAsync(filePath, { idempotent: true })
					continue
				}

				// 4. Check file integrity (non-zero size)
				const fileInfo = await FileSystem.getInfoAsync(filePath)
				if (!fileInfo.exists || (fileInfo.size || 0) === 0) {
					log({ level: 'info', label: 'UpdatesContext', message: `Startup cleanup: deleting empty/corrupted APK ${file}` })
					await FileSystem.deleteAsync(filePath, { idempotent: true })
					continue
				}

				validApks.push({ filename: file, version: match[1] })
			}

			// 5. Among valid APKs, keep only the highest version
			if (validApks.length > 1) {
				// Sort descending by version (highest first)
				validApks.sort((a, b) => (isVersionGreater(a.version, b.version) ? -1 : isVersionGreater(b.version, a.version) ? 1 : 0))

				const highest = validApks[0]
				for (let i = 1; i < validApks.length; i++) {
					const apk = validApks[i]
					log({ level: 'info', label: 'UpdatesContext', message: `Startup cleanup: deleting older APK ${apk.filename} (keeping ${highest.filename})` })
					await FileSystem.deleteAsync(UPDATES_FOLDER + apk.filename, { idempotent: true })
				}
			}

			log({ level: 'info', label: 'UpdatesContext', message: `Startup cleanup complete. Kept ${validApks.length > 0 ? validApks[0].filename : 'no APKs'}.` })
		} catch (err) {
			log({ level: 'warn', label: 'UpdatesContext', message: 'Startup cleanup failed', error: err })
		}
	}, [])

	// Run startup cleanup then refresh APK list
	useEffect(() => {
		const init = async () => {
			await performStartupCleanup()
			await refreshApkList()
			try {
				const savedResumeData = await getItem<any>('download_resume_data')
				if (savedResumeData) {
					resumeDataRef.current = typeof savedResumeData === 'string' ? savedResumeData : JSON.stringify(savedResumeData)
					setIsPaused(true)
					const savedProgress = await getItem<number>('download_progress')
					if (savedProgress !== null && !isNaN(savedProgress)) {
						setDownloadProgress(savedProgress)
					}
				}
			} catch (e) {
				console.warn('[UpdatesContext] Failed to load saved download resume data:', e)
			}
		}
		init()
	}, [performStartupCleanup, refreshApkList])

	const contextValue = useMemo(
		() => ({
			isChecking,
			latestRelease,
			error,
			downloadProgress,
			isDownloading,
			downloadedApks,
			deviceFreeStorage,
			checkForUpdates,
			downloadUpdate,
			isPaused,
			pauseDownload,
			resumeDownload,
			cancelDownload,
			installApk,
			deleteApk,
			refreshApkList
		}),
		[
			isChecking,
			latestRelease,
			error,
			downloadProgress,
			isDownloading,
			downloadedApks,
			deviceFreeStorage,
			checkForUpdates,
			downloadUpdate,
			isPaused,
			pauseDownload,
			resumeDownload,
			cancelDownload,
			installApk,
			deleteApk,
			refreshApkList
		]
	)

	return <UpdatesContext.Provider value={contextValue}>{children}</UpdatesContext.Provider>
}
