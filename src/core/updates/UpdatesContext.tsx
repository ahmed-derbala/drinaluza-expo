import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { Platform } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
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

export interface DownloadedApk {
	uri: string
	name: string
	version: string
	size: number
}

export type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'completed' | 'failed'

interface UpdatesContextType {
	isCheckingStartup: boolean
	startupRedirect: string | null
	updateType: 'none' | 'optional' | 'required'
	status: UpdateStatus
	downloadProgress: number
	updateInfo: UpdateInfo | null
	downloadedApks: DownloadedApk[]
	cachedApk: DownloadedApk | null
	checkForUpdates: () => Promise<UpdateInfo | null>
	downloadUpdate: () => Promise<void>
	installApk: (uri: string) => Promise<void>
	deleteApk: (uri: string) => Promise<void>
	refreshDownloadedApks: () => Promise<void>
}

const UpdatesContext = createContext<UpdatesContextType | undefined>(undefined)

const updatesDir = FileSystem.documentDirectory ? `${FileSystem.documentDirectory}updates/` : ''

export const compareVersions = (v1: string, v2: string): number => {
	const cleanV1 = v1.replace(/^v/, '')
	const cleanV2 = v2.replace(/^v/, '')
	const parts1 = cleanV1.split('.').map(Number)
	const parts2 = cleanV2.split('.').map(Number)
	for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
		const p1 = parts1[i] || 0
		const p2 = parts2[i] || 0
		if (p1 > p2) return 1
		if (p1 < p2) return -1
	}
	return 0
}

export const parseUpdateResponse = (data: any): UpdateInfo => {
	const apkAsset = data.assets?.find((asset: any) => asset.name?.endsWith('.apk')) || data.assets?.[0]
	return {
		name: data.name || '',
		published_at: data.published_at || '',
		latest_version: data.tag_name || '',
		size: apkAsset?.size || 0,
		download_count: apkAsset?.download_count || 0,
		changelog: data.body || '',
		download_url: apkAsset?.browser_download_url || data.html_url || ''
	}
}

export const UpdatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [isCheckingStartup, setIsCheckingStartup] = useState(Platform.OS === 'android')
	const [startupRedirect, setStartupRedirect] = useState<string | null>(null)
	const [updateType, setUpdateType] = useState<'none' | 'optional' | 'required'>('none')
	const [status, setStatus] = useState<UpdateStatus>('idle')
	const [downloadProgress, setDownloadProgress] = useState(0)
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
	const [downloadedApks, setDownloadedApks] = useState<DownloadedApk[]>([])
	const [cachedApk, setCachedApk] = useState<DownloadedApk | null>(null)

	const activeDownloadRef = useRef<any>(null)

	const ensureUpdatesDir = async () => {
		if (Platform.OS !== 'android') return
		const dirInfo = await FileSystem.getInfoAsync(updatesDir)
		if (!dirInfo.exists) {
			await FileSystem.makeDirectoryAsync(updatesDir, { intermediates: true })
		}
	}

	const getDownloadedApksList = useCallback(async (): Promise<DownloadedApk[]> => {
		if (Platform.OS !== 'android') return []
		try {
			await ensureUpdatesDir()
			const files = await FileSystem.readDirectoryAsync(updatesDir)
			const list: DownloadedApk[] = []
			for (const file of files) {
				if (file.endsWith('.apk')) {
					const uri = updatesDir + file
					const info = await FileSystem.getInfoAsync(uri)
					if (info.exists) {
						const versionMatch = file.match(/drinaluza-(\d+\.\d+\.\d+)\.apk/)
						const version = versionMatch ? versionMatch[1] : 'unknown'
						list.push({
							uri,
							name: file,
							version,
							size: info.size || 0
						})
					}
				}
			}
			return list
		} catch (error) {
			log({ level: 'error', label: 'Updates', message: 'Failed to read downloaded APKs', error })
			return []
		}
	}, [])

	const refreshDownloadedApks = useCallback(async () => {
		if (Platform.OS !== 'android') return
		const apks = await getDownloadedApksList()
		setDownloadedApks(apks)

		if (updateInfo) {
			const matched = apks.find((apk) => apk.version === updateInfo.latest_version.replace(/^v/, ''))
			setCachedApk(matched || null)
		} else {
			setCachedApk(null)
		}
	}, [getDownloadedApksList, updateInfo])

	const cleanOldApks = useCallback(async (latestVersion: string) => {
		if (Platform.OS !== 'android') return
		try {
			await ensureUpdatesDir()
			const files = await FileSystem.readDirectoryAsync(updatesDir)
			const latestClean = latestVersion.replace(/^v/, '')
			const latestApkName = `drinaluza-${latestClean}.apk`
			for (const file of files) {
				if (file.endsWith('.apk') && file !== latestApkName) {
					await FileSystem.deleteAsync(updatesDir + file, { idempotent: true })
					log({ level: 'info', label: 'Updates', message: `Cleaned old APK: ${file}` })
				}
			}
		} catch (error) {
			log({ level: 'error', label: 'Updates', message: 'Failed to clean old APKs', error })
		}
	}, [])

	const checkForUpdates = useCallback(async (): Promise<UpdateInfo | null> => {
		setStatus('checking')
		const controller = new AbortController()
		const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

		try {
			const response = await fetch(UPDATE_CHECK_URL, { signal: controller.signal })
			clearTimeout(timeoutId)

			if (!response.ok) {
				throw new Error(`HTTP Error: ${response.status}`)
			}

			const data = await response.json()
			const parsed = parseUpdateResponse(data)
			setUpdateInfo(parsed)

			// Clean up old APKs on Android since we successfully retrieved the latest release details
			if (Platform.OS === 'android') {
				await cleanOldApks(parsed.latest_version)
			}

			const comparison = compareVersions(parsed.latest_version, APP_VERSION)
			if (comparison > 0) {
				setUpdateType('optional')
			} else {
				setUpdateType('none')
			}

			setStatus('idle')
			return parsed
		} catch (error: any) {
			clearTimeout(timeoutId)
			log({ level: 'warn', label: 'Updates', message: 'Update check failed or timed out', error })
			setStatus('failed')
			return null
		}
	}, [cleanOldApks])

	const installApk = useCallback(async (uri: string) => {
		if (Platform.OS !== 'android') return
		try {
			const contentUri = await FileSystem.getContentUriAsync(uri)
			await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
				data: contentUri,
				flags: 1, // FLAG_GRANT_READ_URI_PERMISSION
				type: 'application/vnd.android.package-archive'
			})
		} catch (error) {
			log({ level: 'error', label: 'Updates', message: `Failed to install APK at ${uri}`, error })
		}
	}, [])

	const deleteApk = useCallback(
		async (uri: string) => {
			if (Platform.OS !== 'android') return
			try {
				await FileSystem.deleteAsync(uri, { idempotent: true })
				await refreshDownloadedApks()
			} catch (error) {
				log({ level: 'error', label: 'Updates', message: `Failed to delete APK at ${uri}`, error })
			}
		},
		[refreshDownloadedApks]
	)

	const downloadUpdate = useCallback(async () => {
		if (!updateInfo || Platform.OS !== 'android') return

		try {
			setStatus('downloading')
			setDownloadProgress(0)

			await ensureUpdatesDir()
			const cleanLatest = updateInfo.latest_version.replace(/^v/, '')
			const apkName = `drinaluza-${cleanLatest}.apk`
			const localUri = updatesDir + apkName

			const fileInfo = await FileSystem.getInfoAsync(localUri)
			if (fileInfo.exists) {
				log({ level: 'info', label: 'Updates', message: 'APK already downloaded, proceeding to install...' })
				setStatus('completed')
				setDownloadProgress(1)
				await refreshDownloadedApks()
				await installApk(localUri)
				return
			}

			const downloadResumable = FileSystem.createDownloadResumable(updateInfo.download_url, localUri, {}, (downloadProgressData) => {
				const progress = downloadProgressData.totalBytesWritten / downloadProgressData.totalBytesExpectedToWrite
				setDownloadProgress(progress)
			})

			activeDownloadRef.current = downloadResumable
			const result = await downloadResumable.downloadAsync()
			activeDownloadRef.current = null

			if (result && result.uri) {
				log({ level: 'info', label: 'Updates', message: 'Download completed successfully' })
				setStatus('completed')
				setDownloadProgress(1)
				await cleanOldApks(updateInfo.latest_version)
				await refreshDownloadedApks()
				await installApk(result.uri)
			} else {
				setStatus('failed')
			}
		} catch (error) {
			activeDownloadRef.current = null
			log({ level: 'error', label: 'Updates', message: 'Download failed', error })
			setStatus('failed')
		}
	}, [updateInfo, cleanOldApks, refreshDownloadedApks, installApk])

	// Automatically run startup check on Android
	useEffect(() => {
		let isMounted = true

		if (Platform.OS === 'android') {
			const runStartupCheck = async () => {
				try {
					log({ level: 'info', label: 'Updates', message: 'Running startup update check...' })
					const info = await checkForUpdates()

					if (!isMounted) return

					if (!info) {
						setIsCheckingStartup(false)
						return
					}

					const comparison = compareVersions(info.latest_version, APP_VERSION)
					if (comparison <= 0) {
						// Equal or higher version
						const downloaded = await getDownloadedApksList()
						const installableApk = downloaded.find((apk) => compareVersions(apk.version, APP_VERSION) > 0)
						if (installableApk) {
							log({
								level: 'info',
								label: 'Updates',
								message: `Found download ready to install: ${installableApk.name}`
							})
							setTimeout(() => {
								if (isMounted) installApk(installableApk.uri)
							}, 500)
						} else {
							setIsCheckingStartup(false)
						}
					} else {
						// Lower version
						log({
							level: 'info',
							label: 'Updates',
							message: `New update available: ${info.latest_version}`
						})
						setStartupRedirect('/updates')
						setIsCheckingStartup(false)
					}
				} catch (error) {
					log({ level: 'error', label: 'Updates', message: 'Error during startup update check', error })
					if (isMounted) setIsCheckingStartup(false)
				}
			}
			runStartupCheck()
		} else {
			setIsCheckingStartup(false)
		}

		return () => {
			isMounted = false
		}
	}, [checkForUpdates, getDownloadedApksList, installApk])

	// Keep downloadedApks updated if updateInfo changes
	useEffect(() => {
		refreshDownloadedApks()
	}, [updateInfo, refreshDownloadedApks])

	return (
		<UpdatesContext.Provider
			value={{
				isCheckingStartup,
				startupRedirect,
				updateType,
				status,
				downloadProgress,
				updateInfo,
				downloadedApks,
				cachedApk,
				checkForUpdates,
				downloadUpdate,
				installApk,
				deleteApk,
				refreshDownloadedApks
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
