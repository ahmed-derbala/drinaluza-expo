import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Platform, Alert, AppState, type AppStateStatus } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import { config } from '@/config'
import { log } from '@/core/log'
import { getItem, setItem, removeItem } from '@/core/storage'
import { UpdateCheckResult, CachedApkMetadata, UpdatesContextProps } from './types'

// Verify file against existence and expected size bounds
const verifyFileIntegrity = async (fileUri: string, expectedSize: number): Promise<{ ok: boolean; reason?: string }> => {
	try {
		const info: any = await FileSystem.getInfoAsync(fileUri)
		const size = info?.size ?? 0
		if (!info.exists) return { ok: false, reason: 'file not found' }
		if (size < 1024 * 1024) return { ok: false, reason: `size ${size} <1MB` }
		if (expectedSize > 0 && size < expectedSize * 0.95) return { ok: false, reason: `size ${size}/${expectedSize} <95%` }
		if (expectedSize > 0 && size > expectedSize * 1.05) return { ok: false, reason: `size ${size}/${expectedSize} >105%` }
		return { ok: true }
	} catch (err) {
		log({ level: 'warn', label: 'UpdatesContext', message: 'File integrity verification failed', error: err })
		return { ok: false, reason: 'verification error' }
	}
}

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
		log({ level: 'warn', label: 'UpdatesContext', message: 'Failed to create updates folder', error: err })
	}
}

// Function that parses Github release response
export const checkUpdatesApi = async (url: string): Promise<UpdateCheckResult> => {
	const controller = new AbortController()
	const id = setTimeout(() => controller.abort(), config.api.timeout)

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
			download_url: apkAsset ? apkAsset.browser_download_url : '',
			digest: apkAsset?.digest || null
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
	const isAutoPausedRef = useRef(false)
	const isDownloadingRef = useRef(isDownloading)
	const isPausedRef = useRef(isPaused)
	const latestReleaseRef = useRef(latestRelease)
	const pauseDownloadRef = useRef<() => Promise<void>>(async () => {})
	const resumeDownloadRef = useRef<() => Promise<string | null>>(async () => null)

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
			log({ level: 'warn', label: 'UpdatesContext', message: 'Failed to scan cached APKs', error: err })
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
			log({ level: 'warn', label: 'UpdatesContext', message: 'Pruning older cached releases failed', error: err })
		}
	}, [])

	const checkForUpdates = useCallback(async (): Promise<UpdateCheckResult | null> => {
		setIsChecking(true)
		setError(null)
		try {
			const result = await checkUpdatesApi(config.updates.checkUrl)
			setLatestRelease(result)
			setIsChecking(false)

			if (Platform.OS !== 'web') {
				await refreshApkList()
			}
			return result
		} catch (err: any) {
			log({ level: 'warn', label: 'UpdatesContext', message: 'Update check encountered network/timeout error', error: err })
			setError(err?.message || 'Failed to check for updates.')
			setIsChecking(false)
			return null
		}
	}, [refreshApkList])

	// Install Android APK — validates file integrity first to avoid "parsing the package" error
	const installApk = useCallback(
		async (fileUri: string) => {
			if (Platform.OS !== 'android') return
			log({ level: 'info', label: 'UpdatesContext', message: `Attempting to install APK from: ${fileUri}` })
			try {
				const match = fileUri.match(/drinaluza-(.+)\.apk/)
				const version = match ? match[1] : null
				const isLatest = version && latestReleaseRef.current && version === latestReleaseRef.current.latest_version
				const expectedSize = isLatest ? latestReleaseRef.current!.size : 0
				const verify = await verifyFileIntegrity(fileUri, expectedSize)
				if (!verify.ok) {
					await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {})
					await refreshApkList()
					throw new Error(`APK corrupted (${verify.reason}). Deleted — please download again.`)
				}

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
					err?.message?.includes('corrupted') || err?.message?.includes('incomplete') || err?.message?.includes('not found')
						? err.message
						: 'Could not launch the Android package installer. Please ensure you have allowed this app to install unknown apps in your device settings.\n\nError: ' + (err?.message || err),
					[{ text: 'OK' }]
				)
				throw new Error(err?.message || 'Failed to launch the Android package installer. Please verify permissions.')
			}
		},
		[refreshApkList]
	)

	// Delete downloaded APK
	const deleteApk = useCallback(
		async (fileUri: string) => {
			if (Platform.OS === 'web') return
			try {
				await FileSystem.deleteAsync(fileUri, { idempotent: true })
				await refreshApkList()
			} catch (err) {
				log({ level: 'warn', label: 'UpdatesContext', message: 'Deleting local APK cache failed', error: err })
			}
		},
		[refreshApkList]
	)

	// Download APK
	const downloadUpdate = useCallback(async (): Promise<string | null> => {
		if (Platform.OS !== 'android' || !latestRelease || !latestRelease.download_url) {
			return null
		}

		// Check free storage space before downloading
		const freeSpace = await FileSystem.getFreeDiskStorageAsync()
		setDeviceFreeStorage(freeSpace)
		const minRequiredBytes = Math.max(latestRelease.size, (config.updates.minFreeStorageGB || 0.1) * 1024 * 1024 * 1024)
		if (freeSpace < minRequiredBytes) {
			Alert.alert('Insufficient Storage', 'Your device does not have enough free disk space to download and install this update.')
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
				if ((downloadResult as any).status && (downloadResult as any).status !== 200) {
					await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {})
					throw new Error(`Download failed with HTTP ${(downloadResult as any).status}. Please retry.`)
				}
				const verify = await verifyFileIntegrity(downloadResult.uri, latestRelease.size)
				if (!verify.ok) {
					await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {})
					throw new Error(`Download corrupted (${verify.reason}). Please retry.`)
				}

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
			log({ level: 'error', label: 'UpdatesContext', message: 'File download error', error: err })
			throw err
		}
	}, [latestRelease, refreshApkList, installApk])

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
				log({ level: 'error', label: 'UpdatesContext', message: 'Failed to pause download', error: err })
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

		// Check free storage space before resuming
		const freeSpace = await FileSystem.getFreeDiskStorageAsync()
		setDeviceFreeStorage(freeSpace)
		const minRequiredBytes = Math.max(latestRelease.size, (config.updates.minFreeStorageGB || 0.1) * 1024 * 1024 * 1024)
		if (freeSpace < minRequiredBytes) {
			Alert.alert('Insufficient Storage', 'Your device does not have enough free disk space to resume this update.')
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
				if ((downloadResult as any).status && (downloadResult as any).status !== 200) {
					await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {})
					throw new Error(`Resume failed with HTTP ${(downloadResult as any).status}. Please retry.`)
				}
				const verify = await verifyFileIntegrity(downloadResult.uri, latestRelease.size)
				if (!verify.ok) {
					await FileSystem.deleteAsync(downloadResult.uri, { idempotent: true }).catch(() => {})
					throw new Error(`Resume corrupted (${verify.reason}). Please retry.`)
				}

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
		} catch (err: any) {
			if (isPausingRef.current) {
				setIsDownloading(false)
				return null
			}
			if (isCancellingRef.current) {
				return null
			}
			// If resume data is corrupted (common after kill), discard temp and allow fresh download
			const msg = String(err?.message || '')
			if (msg.includes('resume') || msg.includes('Resume')) {
				resumeDataRef.current = null
				await removeItem('download_resume_data').catch(() => {})
				await FileSystem.deleteAsync(tempFileUri, { idempotent: true }).catch(() => {})
			}
			setIsDownloading(false)
			setIsPaused(false)
			setDownloadProgress(0)
			activeDownloadRef.current = null
			await removeItem('download_resume_data')
			await removeItem('download_progress')
			await removeItem('download_status')
			log({ level: 'error', label: 'UpdatesContext', message: 'File resume download error', error: err })
			throw err
		}
	}, [latestRelease, refreshApkList, installApk])

	// Sync refs for AppState handler
	useEffect(() => {
		isDownloadingRef.current = isDownloading
		isPausedRef.current = isPaused
		latestReleaseRef.current = latestRelease
		pauseDownloadRef.current = pauseDownload
		resumeDownloadRef.current = resumeDownload
	}, [isDownloading, isPaused, latestRelease, pauseDownload, resumeDownload])

	// Pause download when the app goes to background, resume when it comes back to foreground
	useEffect(() => {
		const handleAppStateChange = (nextAppState: AppStateStatus) => {
			if (nextAppState === 'active') {
				if (isAutoPausedRef.current && !isDownloadingRef.current && isPausedRef.current && resumeDataRef.current && latestReleaseRef.current) {
					resumeDownloadRef.current()
				}
				isAutoPausedRef.current = false
			} else {
				if (!isAutoPausedRef.current && isDownloadingRef.current && !isPausedRef.current) {
					isAutoPausedRef.current = true
					pauseDownloadRef.current()
				}
			}
		}

		const subscription = AppState.addEventListener('change', handleAppStateChange)
		return () => subscription.remove()
	}, [])

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
					log({ level: 'warn', label: 'UpdatesContext', message: 'Failed to cancel active download on unmount', error: e })
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
			const savedResumeData = await getItem<any>('download_resume_data')
			const isPausedStatus = downloadStatus === 'paused' || savedResumeData !== null

			if (!isPausedStatus) {
				await removeItem('download_resume_data')
				await removeItem('download_progress')
				await removeItem('download_status')
			}

			for (const file of files) {
				const filePath = UPDATES_FOLDER + file

				// 1. Handle .tmp files (incomplete downloads) — also validate even when paused, to avoid resuming corrupted truncated file after kill
				if (file.endsWith('.tmp')) {
					if (isPausedStatus) {
						try {
							const info: any = await FileSystem.getInfoAsync(filePath)
							if (!info.exists || (info.size || 0) < 1024) {
								log({ level: 'info', label: 'UpdatesContext', message: `Startup cleanup: deleting empty .tmp ${file} despite paused status` })
								await FileSystem.deleteAsync(filePath, { idempotent: true })
								// Clear stale resume data if tmp was deleted
								await removeItem('download_resume_data')
								await removeItem('download_progress')
								await removeItem('download_status')
							}
						} catch {}
						// Keep valid paused tmp for resume
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

				// 4. Check file integrity (APKs must be >1MB; smaller means truncated/killed download that was incorrectly promoted)
				const fileInfo: any = await FileSystem.getInfoAsync(filePath)
				const apkSize = fileInfo.size || 0
				if (!fileInfo.exists || apkSize === 0 || apkSize < 1024 * 1024) {
					log({ level: 'info', label: 'UpdatesContext', message: `Startup cleanup: deleting empty/corrupted APK ${file} size=${apkSize}` })
					await FileSystem.deleteAsync(filePath, { idempotent: true })
					continue
				}

				validApks.push({ filename: file, version: match[1] })
			}

			// 5. Among valid APKs, keep only up to maxApkInstallersCount newest versions
			const maxApkInstallersCount = config.updates.maxApkInstallersCount
			if (validApks.length > 0) {
				validApks.sort((a, b) => (isVersionGreater(a.version, b.version) ? -1 : isVersionGreater(b.version, a.version) ? 1 : 0))
			}
			if (validApks.length > maxApkInstallersCount) {
				for (let i = maxApkInstallersCount; i < validApks.length; i++) {
					const apk = validApks[i]
					log({ level: 'info', label: 'UpdatesContext', message: `Startup cleanup: deleting older APK ${apk.filename} (keeping ${maxApkInstallersCount} newest)` })
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
				log({ level: 'warn', label: 'UpdatesContext', message: 'Failed to load saved download resume data', error: e })
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
