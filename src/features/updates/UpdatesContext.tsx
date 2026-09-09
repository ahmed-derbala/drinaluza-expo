/**
 * features/updates/UpdatesContext — check, download (pausable/resumable) and install APK updates.
 *
 * Download durability design (expo-file-system `DownloadTask`):
 * - in-app navigation: the task lives in this provider, screens can change freely.
 * - background / other apps: the native transfer keeps running (no auto-pause);
 *   progress snapshots are persisted so a kill never loses the partial file.
 * - app killed: the partial `.tmp` file plus persisted state are picked up on
 *   next launch and offered as a paused download; resume re-sends
 *   `Range: bytes=<on-disk-length>-` (server answers 206) or restarts cleanly.
 * - on completion the temp file is renamed to `.apk` and the installer opens.
 */

import React, { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Alert, AppState } from 'react-native'
import { isWeb, isAndroid } from '@platform'
import { config } from '@/config'
import { File, ensureDirectory, getUpdatesDirectory, getFileInfo, deletePath, moveFile, getFreeDiskStorage, listDirectory, getContentUri } from '@disk'
import { log } from '@log'
import { getItem, setItem, removeItem } from '@storage'
import { deferStartup } from '@helpers/defer'
import { UpdateCheckResult, CachedApkMetadata, UpdatesContextProps } from './types'
import type { DownloadTask, DownloadPauseState, DownloadProgress } from 'expo-file-system'

interface DownloadMeta {
	version: string
	url: string
	size: number
	digest: string | null
}

interface PersistedDownloadState extends DownloadMeta {
	status: 'downloading' | 'paused'
	bytesWritten: number
	totalBytes: number
	savable: DownloadPauseState | null
}

export const UpdatesContext = createContext<UpdatesContextProps | undefined>(undefined)

const DOWNLOAD_STATE_KEY = 'apk_download_state'
const LEGACY_DOWNLOAD_KEYS = ['download_resume_data', 'download_progress', 'download_status']
const PROGRESS_PERSIST_MIN_MS = 2000

const getUpdatesFolder = (): any | null => getUpdatesDirectory()
const UPDATES_FOLDER = (() => {
	if (isWeb) return ''
	try {
		const dir = getUpdatesDirectory()
		return (dir as any)?.uri ? (dir as any).uri + '/' : ''
	} catch {
		return ''
	}
})()
// Helper: Ensure the updates directory exists
const ensureUpdatesFolder = async () => {
	if (isWeb) return
	await ensureDirectory(getUpdatesFolder())
}

const tmpUriFor = (version: string): string => `${UPDATES_FOLDER}drinaluza-${version}.apk.tmp`
const finalUriFor = (version: string): string => `${UPDATES_FOLDER}drinaluza-${version}.apk`

const getDownloadTaskClass = (): any | null => {
	if (isWeb) return null
	try {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		return require('expo-file-system').DownloadTask
	} catch {
		return null
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
	const [isPaused, setIsPaused] = useState(false)
	const taskRef = useRef<DownloadTask | null>(null)
	const metaRef = useRef<DownloadMeta | null>(null)
	const savableRef = useRef<DownloadPauseState | null>(null)
	const progressBytesRef = useRef({ bytesWritten: 0, totalBytes: 0 })
	const lastPersistAtRef = useRef(0)
	const cancellingRef = useRef(false)
	// Invalidates late-arriving task results/errors after cancel or a newer run.
	const sessionRef = useRef(0)
	const isDownloadingRef = useRef(false)
	const isPausedRef = useRef(false)
	const latestReleaseRef = useRef(latestRelease)
	// Fetch dynamic APK files from local storage on native platforms
	const refreshApkList = useCallback(async (): Promise<CachedApkMetadata[]> => {
		if (isWeb) return []
		try {
			await ensureUpdatesFolder()
			const files = listDirectory(getUpdatesFolder()).map((e) => (e instanceof File ? (e as any).name : (e as any).name))
			const apks: CachedApkMetadata[] = []
			for (const file of files) {
				if (file.endsWith('.apk')) {
					const fileUri = UPDATES_FOLDER + file
					const fileInfo = await getFileInfo(fileUri)
					if (fileInfo?.exists) {
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
			const freeSpace = await getFreeDiskStorage()
			setDeviceFreeStorage(freeSpace)
			return apks
		} catch (err) {
			log({ level: 'warn', label: 'UpdatesContext', message: 'Failed to scan cached APKs', error: err })
			return []
		}
	}, [])
	const checkForUpdates = useCallback(async (): Promise<UpdateCheckResult | null> => {
		setIsChecking(true)
		setError(null)
		try {
			const result = await checkUpdatesApi(config.updates.checkUrl)
			setLatestRelease(result)
			setIsChecking(false)
			if (!isWeb) {
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
	// Persist the download snapshot so an app kill never loses resume info.
	// The partial `.tmp` file on disk is the source of truth for the offset.
	const persistDownloadState = useCallback(async (state: PersistedDownloadState | null) => {
		try {
			if (state) await setItem(DOWNLOAD_STATE_KEY, state)
			else await removeItem(DOWNLOAD_STATE_KEY)
		} catch (err) {
			log({ level: 'warn', label: 'UpdatesContext', message: 'Failed to persist download state', error: err })
		}
	}, [])
	const persistProgressThrottled = useCallback(
		async (meta: DownloadMeta, bytesWritten: number, totalBytes: number) => {
			const now = Date.now()
			if (now - lastPersistAtRef.current < PROGRESS_PERSIST_MIN_MS) return
			lastPersistAtRef.current = now
			await persistDownloadState({ ...meta, status: 'downloading', bytesWritten, totalBytes, savable: savableRef.current })
		},
		[persistDownloadState]
	)
	// Progress callback shared by fresh downloads and resumes.
	const makeOnProgress = useCallback(
		(meta: DownloadMeta) => (data: DownloadProgress) => {
			const total = data.totalBytes > 0 ? data.totalBytes : meta.size > 0 ? meta.size : 0
			const progress = total > 0 ? data.bytesWritten / total : 0
			progressBytesRef.current = { bytesWritten: data.bytesWritten, totalBytes: total }
			setDownloadProgress(isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress)))
			void persistProgressThrottled(meta, data.bytesWritten, total)
		},
		[persistProgressThrottled]
	)
	// Shared completion tail for downloadAsync()/resumeAsync(): null = paused,
	// File = fully written → rename to final .apk → install.
	const completeTask = useCallback(
		async (file: any | null, meta: DownloadMeta): Promise<string | null> => {
			const tmpUri = tmpUriFor(meta.version)
			const fileUri = finalUriFor(meta.version)
			if (!file) {
				log({ level: 'info', label: 'UpdatesContext', message: 'Download task paused, partial kept for resume' })
				return null
			}
			const completedUri = file?.uri ?? tmpUri
			setIsDownloading(false)
			setDownloadProgress(1)
			await persistDownloadState(null)
			savableRef.current = null
			// Rename temp file to final .apk file on successful completion
			await moveFile(completedUri, fileUri)
			metaRef.current = null
			await refreshApkList()
			// Automatically launch package installer when download is complete
			await installApkRef.current(fileUri)
			return fileUri
		},
		[persistDownloadState, refreshApkList]
	)
	const installApkRef = useRef<(fileUri: string) => Promise<void>>(async () => {})
	// Install Android APK via the system package installer
	const installApk = useCallback(
		async (fileUri: string) => {
			if (!isAndroid) return
			log({ level: 'info', label: 'UpdatesContext', message: `Attempting to install APK from: ${fileUri}` })
			try {
				const contentUri = getContentUri(fileUri)
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
				throw new Error(err?.message || 'Failed to launch the Android package installer. Please verify permissions.')
			}
		},
		[refreshApkList]
	)
	// Delete downloaded APK
	const deleteApk = useCallback(
		async (fileUri: string) => {
			if (isWeb) return
			try {
				await deletePath(fileUri)
				await refreshApkList()
			} catch (err) {
				log({ level: 'warn', label: 'UpdatesContext', message: 'Deleting local APK cache failed', error: err })
			}
		},
		[refreshApkList]
	)
	const hasEnoughStorage = useCallback(async (size: number): Promise<boolean> => {
		const freeSpace = await getFreeDiskStorage()
		setDeviceFreeStorage(freeSpace)
		const minRequiredBytes = Math.max(size, (config.updates.minFreeStorageGB || 0.1) * 1024 * 1024 * 1024)
		if (freeSpace < minRequiredBytes) {
			Alert.alert('Insufficient Storage', 'Your device does not have enough free disk space to download and install this update.')
			return false
		}
		return true
	}, [])
	// Start a brand-new download (no usable partial file). Shared by
	// downloadUpdate() and the resume-fallback path.
	const startFreshDownload = useCallback(
		async (meta: DownloadMeta): Promise<string | null> => {
			const tmpUri = tmpUriFor(meta.version)
			await ensureUpdatesFolder()
			await deletePath(tmpUri).catch(() => {})
			const tmpFile = new File(tmpUri)
			const task = File.createDownloadTask(meta.url, tmpFile, { onProgress: makeOnProgress(meta) })
			taskRef.current = task
			metaRef.current = meta
			savableRef.current = null
			progressBytesRef.current = { bytesWritten: 0, totalBytes: meta.size }
			setIsDownloading(true)
			setIsPaused(false)
			setError(null)
			setDownloadProgress(0)
			await persistDownloadState({ ...meta, status: 'downloading', bytesWritten: 0, totalBytes: meta.size, savable: null })
			const session = ++sessionRef.current
			try {
				const result = await task.downloadAsync()
				if (session !== sessionRef.current) return null
				if (taskRef.current === task) taskRef.current = null
				return await completeTask(result, meta)
			} catch (err: any) {
				if (session !== sessionRef.current) return null
				if (taskRef.current === task) taskRef.current = null
				if (cancellingRef.current) return null
				// Network drop (e.g. background stall): keep the partial file and
				// park as paused so the user can resume instead of restarting.
				log({ level: 'warn', label: 'UpdatesContext', message: 'Download interrupted, kept partial for resume', error: err })
				const info = await getFileInfo(tmpUri).catch(() => null)
				const onDisk = info?.exists ? info.size || 0 : 0
				if (onDisk > 0) {
					progressBytesRef.current = { bytesWritten: onDisk, totalBytes: meta.size }
					setDownloadProgress(meta.size > 0 ? Math.min(1, onDisk / meta.size) : 0)
					await persistDownloadState({ ...meta, status: 'paused', bytesWritten: onDisk, totalBytes: meta.size, savable: savableRef.current })
					setIsDownloading(false)
					setIsPaused(true)
					setError(err?.message || 'Download interrupted. Tap resume to continue.')
					return null
				}
				setIsDownloading(false)
				setIsPaused(false)
				setDownloadProgress(0)
				await persistDownloadState(null)
				await deletePath(tmpUri).catch(() => {})
				setError(err?.message || 'Download failed.')
				return null
			}
		},
		[makeOnProgress, persistDownloadState, completeTask]
	)
	// Download APK (fresh, or resume when a partial file for this version exists)
	const downloadUpdate = useCallback(async (): Promise<string | null> => {
		if (!isAndroid || !latestRelease || !latestRelease.download_url) {
			return null
		}
		if (isDownloadingRef.current) return null
		// Already paused for this version → resume instead of restarting
		if (isPausedRef.current && metaRef.current?.version === latestRelease.latest_version) {
			return await resumeDownloadRef.current()
		}
		const meta: DownloadMeta = {
			version: latestRelease.latest_version,
			url: latestRelease.download_url,
			size: latestRelease.size,
			digest: latestRelease.digest
		}
		if (!(await hasEnoughStorage(meta.size))) return null
		await ensureUpdatesFolder()
		const fileUri = finalUriFor(meta.version)
		const tmpUri = tmpUriFor(meta.version)
		// An existing final file needs no re-download — install it directly
		const finalInfo = await getFileInfo(fileUri).catch(() => null)
		if (finalInfo?.exists && (finalInfo.size || 0) > 0) {
			await refreshApkList()
			await installApk(fileUri)
			return fileUri
		}
		// A partial file from a killed session is resumed, not discarded
		const partialInfo = await getFileInfo(tmpUri).catch(() => null)
		if (partialInfo?.exists && (partialInfo.size || 0) > 1024) {
			metaRef.current = meta
			return await resumeDownloadRef.current()
		}
		return await startFreshDownload(meta)
	}, [latestRelease, hasEnoughStorage, refreshApkList, installApk, startFreshDownload])
	// Pause Download — native task produces resume data, partial file stays
	const pauseDownload = useCallback(async () => {
		const task = taskRef.current
		if (!task || !isDownloadingRef.current || isPausedRef.current) return
		try {
			await task.pauseAsync()
			const savable = task.savable() as DownloadPauseState
			savableRef.current = savable
			const meta = metaRef.current
			const { bytesWritten, totalBytes } = progressBytesRef.current
			if (meta) {
				await persistDownloadState({ ...meta, status: 'paused', bytesWritten, totalBytes, savable })
			}
			log({ level: 'info', label: 'UpdatesContext', message: 'Download paused' })
		} catch (err) {
			log({ level: 'error', label: 'UpdatesContext', message: 'Failed to pause download', error: err })
		} finally {
			setIsDownloading(false)
			setIsPaused(true)
		}
	}, [persistDownloadState])
	// Resume Download — live paused task, saved pause state, or on-disk offset
	const resumeDownload = useCallback(async (): Promise<string | null> => {
		if (!isAndroid) return null
		if (isDownloadingRef.current) return null
		// Resolve metadata: live session, latest check, or persisted state
		let meta = metaRef.current
		if (!meta && latestReleaseRef.current?.download_url) {
			const rel = latestReleaseRef.current
			meta = { version: rel.latest_version, url: rel.download_url, size: rel.size, digest: rel.digest }
		}
		if (!meta) {
			const persisted = await getItem<PersistedDownloadState>(DOWNLOAD_STATE_KEY).catch(() => null)
			if (!persisted?.url) return null
			meta = { version: persisted.version, url: persisted.url, size: persisted.size, digest: persisted.digest }
		}
		const resolvedMeta = meta
		if (!(await hasEnoughStorage(resolvedMeta.size))) return null
		await ensureUpdatesFolder()
		const tmpUri = tmpUriFor(resolvedMeta.version)
		setError(null)
		const session = ++sessionRef.current
		// 1. Live paused task from this session
		const liveTask = taskRef.current
		if (liveTask && isPausedRef.current) {
			metaRef.current = resolvedMeta
			setIsDownloading(true)
			setIsPaused(false)
			await persistDownloadState({
				...resolvedMeta,
				status: 'downloading',
				bytesWritten: progressBytesRef.current.bytesWritten,
				totalBytes: progressBytesRef.current.totalBytes,
				savable: savableRef.current
			})
			try {
				const result = await liveTask.resumeAsync()
				if (session !== sessionRef.current) return null
				if (taskRef.current === liveTask) taskRef.current = null
				return await completeTask(result, resolvedMeta)
			} catch (err) {
				if (session !== sessionRef.current) return null
				if (taskRef.current === liveTask) taskRef.current = null
				log({ level: 'warn', label: 'UpdatesContext', message: 'Live resume failed, falling back to savable/fresh', error: err })
			}
		}
		// 2. Rebuild from saved pause state, else from the on-disk partial length
		// (covers app kill: no clean pause ever ran, but bytes survived).
		const info = await getFileInfo(tmpUri).catch(() => null)
		const onDisk = info?.exists ? info.size || 0 : 0
		const persisted = await getItem<PersistedDownloadState>(DOWNLOAD_STATE_KEY).catch(() => null)
		const savable: DownloadPauseState | null =
			savableRef.current ?? persisted?.savable ?? (onDisk > 0 ? { url: resolvedMeta.url, fileUri: tmpUri, isDirectory: false, resumeData: String(onDisk) } : null)
		const TaskClass = getDownloadTaskClass()
		if (savable && onDisk > 0 && TaskClass) {
			try {
				const task = TaskClass.fromSavable(savable, { onProgress: makeOnProgress(resolvedMeta) })
				taskRef.current = task
				metaRef.current = resolvedMeta
				savableRef.current = savable
				setIsDownloading(true)
				setIsPaused(false)
				await persistDownloadState({ ...resolvedMeta, status: 'downloading', bytesWritten: onDisk, totalBytes: resolvedMeta.size, savable })
				const result = await task.resumeAsync()
				if (session !== sessionRef.current) return null
				if (taskRef.current === task) taskRef.current = null
				return await completeTask(result, resolvedMeta)
			} catch (err) {
				if (session !== sessionRef.current) return null
				if (taskRef.current) {
					try {
						taskRef.current.cancel()
					} catch {}
					taskRef.current = null
				}
				log({ level: 'warn', label: 'UpdatesContext', message: 'Savable resume failed, restarting download', error: err })
			}
		}
		// 3. Nothing resumable (or resume refused) → fresh download
		await deletePath(tmpUri).catch(() => {})
		return await startFreshDownload(resolvedMeta)
	}, [hasEnoughStorage, makeOnProgress, persistDownloadState, completeTask, startFreshDownload])
	const pauseDownloadRef = useRef(pauseDownload)
	const resumeDownloadRef = useRef(resumeDownload)
	// Sync refs for AppState handler and cross-callback resume
	useEffect(() => {
		isDownloadingRef.current = isDownloading
		isPausedRef.current = isPaused
		latestReleaseRef.current = latestRelease
		pauseDownloadRef.current = pauseDownload
		resumeDownloadRef.current = resumeDownload
		installApkRef.current = installApk
	}, [isDownloading, isPaused, latestRelease, pauseDownload, resumeDownload, installApk])
	// The native transfer keeps running while the app is backgrounded — never
	// auto-pause. Only snapshot progress so a kill loses nothing.
	useEffect(() => {
		const subscription = AppState.addEventListener('change', (nextState) => {
			if (nextState !== 'active' && isDownloadingRef.current && metaRef.current) {
				const { bytesWritten, totalBytes } = progressBytesRef.current
				void persistDownloadState({ ...metaRef.current, status: 'downloading', bytesWritten, totalBytes, savable: savableRef.current })
			}
		})
		return () => subscription.remove()
	}, [persistDownloadState])
	// Cancel Download completely
	const cancelDownload = useCallback(async () => {
		sessionRef.current++
		cancellingRef.current = true
		try {
			if (taskRef.current) {
				try {
					taskRef.current.cancel()
				} catch {}
				taskRef.current = null
			}
			const meta = metaRef.current
			if (meta) {
				await deletePath(tmpUriFor(meta.version)).catch(() => {})
			}
			metaRef.current = null
			savableRef.current = null
			progressBytesRef.current = { bytesWritten: 0, totalBytes: 0 }
			await persistDownloadState(null)
			setIsDownloading(false)
			setIsPaused(false)
			setDownloadProgress(0)
			setError(null)
		} finally {
			cancellingRef.current = false
		}
	}, [persistDownloadState])
	// Cleanup APK files: keeps up to maxKeep newest valid versions, removes .tmp,
	// corrupted, and older files. Never deletes the partial of an active/paused download.
	const cleanupApks = useCallback(
		async (maxKeep: number = config.updates.maxApkInstallersCount) => {
			if (isWeb) return
			try {
				await ensureUpdatesFolder()
				await Promise.all(LEGACY_DOWNLOAD_KEYS.map((k) => removeItem(k).catch(() => {})))
				const files = listDirectory(getUpdatesFolder()).map((e) => (e instanceof File ? (e as any).name : (e as any).name))
				const persisted = await getItem<PersistedDownloadState>(DOWNLOAD_STATE_KEY).catch(() => null)
				const activeTmp = persisted ? `drinaluza-${persisted.version}.apk.tmp` : null
				const validApks: { filename: string; version: string }[] = []
				for (const file of files) {
					const filePath = UPDATES_FOLDER + file
					if (file.endsWith('.tmp')) {
						if (activeTmp && file === activeTmp) {
							try {
								const info = await getFileInfo(filePath)
								if (info?.exists && (info.size || 0) > 1024) continue
								await deletePath(filePath)
								await persistDownloadState(null)
								continue
							} catch {}
						}
						log({ level: 'info', label: 'UpdatesContext', message: `Cleanup: deleting incomplete/interrupted download file ${file}` })
						await deletePath(filePath)
						continue
					}
					if (!file.endsWith('.apk')) {
						log({ level: 'info', label: 'UpdatesContext', message: `Cleanup: deleting unexpected file ${file}` })
						await deletePath(filePath)
						continue
					}
					const match = file.match(/drinaluza-(.+)\.apk/)
					if (!match || match[1] === 'unknown') {
						log({ level: 'info', label: 'UpdatesContext', message: `Cleanup: deleting unrecognized APK ${file}` })
						await deletePath(filePath)
						continue
					}
					const info = await getFileInfo(filePath)
					const apkSize = info?.size || 0
					if (!info?.exists || apkSize === 0 || apkSize < 1024 * 1024) {
						log({ level: 'info', label: 'UpdatesContext', message: `Cleanup: deleting empty/corrupted APK ${file} size=${apkSize}` })
						await deletePath(filePath)
						continue
					}
					validApks.push({ filename: file, version: match[1] })
				}
				if (validApks.length > 0) {
					validApks.sort((a, b) => (isVersionGreater(a.version, b.version) ? -1 : isVersionGreater(b.version, a.version) ? 1 : 0))
				}
				if (validApks.length > maxKeep) {
					for (let i = maxKeep; i < validApks.length; i++) {
						const apk = validApks[i]
						log({ level: 'info', label: 'UpdatesContext', message: `Cleanup: deleting older APK ${apk.filename} (keeping ${maxKeep} newest)` })
						await deletePath(UPDATES_FOLDER + apk.filename)
					}
				}
				log({ level: 'info', label: 'UpdatesContext', message: `Cleanup complete. Kept ${validApks.length > 0 ? validApks[0].filename : 'no APKs'}.` })
			} catch (err) {
				log({ level: 'warn', label: 'UpdatesContext', message: 'Cleanup failed', error: err })
			}
		},
		[persistDownloadState]
	)
	// Startup cleanup: respects user updateSettings from storage.
	const performStartupCleanup = useCallback(async () => {
		if (isWeb) return
		try {
			await ensureUpdatesFolder()
			const stored = await getItem<any>('updateSettings')
			const userMaxKeep = stored && typeof stored === 'object' && typeof stored.maxApkKeepCount === 'number' ? Math.min(5, Math.max(1, stored.maxApkKeepCount)) : config.updates.maxApkInstallersCount
			await cleanupApks(userMaxKeep)
		} catch (err) {
			log({ level: 'warn', label: 'UpdatesContext', message: 'Startup cleanup failed', error: err })
		}
	}, [cleanupApks])
	// Restore an interrupted download (paused or killed) so it can be resumed.
	const restoreInterruptedDownload = useCallback(async () => {
		if (isWeb) return
		try {
			const persisted = await getItem<PersistedDownloadState>(DOWNLOAD_STATE_KEY)
			if (!persisted?.version || !persisted?.url) return
			// A finalized installer means the download already finished
			const finalInfo = await getFileInfo(finalUriFor(persisted.version)).catch(() => null)
			if (finalInfo?.exists && (finalInfo.size || 0) > 1024 * 1024) {
				await persistDownloadState(null)
				return
			}
			const partialInfo = await getFileInfo(tmpUriFor(persisted.version)).catch(() => null)
			const onDisk = partialInfo?.exists ? partialInfo.size || 0 : 0
			if (onDisk <= 1024) {
				await persistDownloadState(null)
				return
			}
			metaRef.current = { version: persisted.version, url: persisted.url, size: persisted.size, digest: persisted.digest }
			savableRef.current = persisted.savable ?? { url: persisted.url, fileUri: tmpUriFor(persisted.version), isDirectory: false, resumeData: String(onDisk) }
			const total = persisted.totalBytes > 0 ? persisted.totalBytes : persisted.size > 0 ? persisted.size : onDisk
			const written = Math.min(persisted.bytesWritten > 0 ? persisted.bytesWritten : onDisk, total)
			progressBytesRef.current = { bytesWritten: written, totalBytes: total }
			setDownloadProgress(total > 0 ? Math.min(1, written / total) : 0)
			setIsPaused(true)
			setIsDownloading(false)
			// A kill always lands here as resumable-paused, never auto-download
			await persistDownloadState({ ...persisted, status: 'paused', bytesWritten: written, totalBytes: total, savable: savableRef.current })
			log({ level: 'info', label: 'UpdatesContext', message: `Restored interrupted download v${persisted.version} at ${written}/${total} bytes` })
		} catch (e) {
			log({ level: 'warn', label: 'UpdatesContext', message: 'Failed to restore interrupted download', error: e })
		}
	}, [persistDownloadState])
	// Run startup cleanup then refresh APK list — deferred to prioritize feed rendering
	useEffect(() => {
		const init = async () => {
			await performStartupCleanup()
			await refreshApkList()
			await restoreInterruptedDownload()
		}
		// Defer heavy FileSystem scans until after feed paints (low priority)
		const cancel = deferStartup.low(() => {
			init()
		})
		return cancel
	}, [performStartupCleanup, refreshApkList, restoreInterruptedDownload])
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
			refreshApkList,
			cleanupApks
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
			refreshApkList,
			cleanupApks
		]
	)
	return <UpdatesContext.Provider value={contextValue}>{children}</UpdatesContext.Provider>
}
