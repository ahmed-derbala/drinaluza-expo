import React, { createContext, useContext, useState, useEffect, useRef } from 'react'
import { Platform, AppState, AppStateStatus, Share } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
import * as Sharing from 'expo-sharing'
import * as Clipboard from 'expo-clipboard'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'

import { APP_VERSION, UPDATE_CHECK_URL, TIMEOUT_MS } from '@/config'
import { log } from '@/core/log'
import { toast } from '@/features/common/Toast'
import { UpdateStatus, UpdateType, ParsedRelease, CachedApkDetails } from './types'
import { compareVersions, determineUpdateType, parseReleaseResponse } from './utils'

const UPDATES_DIR = FileSystem.cacheDirectory + 'updates/'
const METADATA_PATH = UPDATES_DIR + 'metadata.json'

interface UpdatesContextType {
	status: UpdateStatus
	updateInfo: ParsedRelease | null
	updateType: UpdateType
	cachedApk: CachedApkDetails | null
	downloadProgress: number
	freeStorage: number | null // bytes
	isCheckingStartup: boolean
	startupRedirect: string | null
	error: string | null
	checkForUpdates: (isBackground?: boolean) => Promise<ParsedRelease | null>
	downloadUpdate: () => Promise<void>
	installUpdate: () => Promise<void>
	deleteCachedApk: () => Promise<void>
}

const UpdatesContext = createContext<UpdatesContextType | undefined>(undefined)

export const useUpdates = () => {
	const context = useContext(UpdatesContext)
	if (!context) {
		throw new Error('useUpdates must be used within an UpdatesProvider')
	}
	return context
}

export const UpdatesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const router = useRouter()
	const [status, setStatus] = useState<UpdateStatus>('idle')
	const [updateInfo, setUpdateInfo] = useState<ParsedRelease | null>(null)
	const [updateType, setUpdateType] = useState<UpdateType>('none')
	const [cachedApk, setCachedApk] = useState<CachedApkDetails | null>(null)
	const [downloadProgress, setDownloadProgress] = useState(0)
	const [freeStorage, setFreeStorage] = useState<number | null>(null)
	const [isCheckingStartup, setIsCheckingStartup] = useState(true)
	const [startupRedirect, setStartupRedirect] = useState<string | null>(null)
	const [error, setError] = useState<string | null>(null)

	const activeDownloadRef = useRef<any>(null)

	// Get free storage space on Android
	const updateFreeStorage = async () => {
		if (Platform.OS === 'android') {
			try {
				const free = await FileSystem.getFreeDiskStorageAsync()
				setFreeStorage(free)
			} catch (e) {
				log({ level: 'warn', label: 'UpdatesContext', message: 'Failed to get free storage size', error: e })
			}
		}
	}

	// Cleans all updates cache files except the specified latest version
	const cleanCacheDirExcept = async (latestVersion: string) => {
		try {
			const dirInfo = await FileSystem.getInfoAsync(UPDATES_DIR)
			if (!dirInfo.exists) return

			const files = await FileSystem.readDirectoryAsync(UPDATES_DIR)
			for (const file of files) {
				if (file === 'metadata.json') {
					try {
						const metaStr = await FileSystem.readAsStringAsync(METADATA_PATH)
						const meta = JSON.parse(metaStr) as CachedApkDetails
						if (meta.version === latestVersion) {
							continue // keep latest metadata
						}
					} catch {
						// Invalid JSON, let's delete it
					}
				}
				if (file === `drinaluza-${latestVersion}.apk`) {
					continue // keep latest APK
				}

				// Otherwise delete older/stale cache
				await FileSystem.deleteAsync(UPDATES_DIR + file, { idempotent: true })
			}
		} catch (err) {
			log({ level: 'warn', label: 'UpdatesContext', message: 'Failed to clean old updates cache', error: err })
		}
	}

	// Promise helper to check update URL with timeout abort controller
	const checkForUpdatesPromise = (isBackground: boolean): Promise<ParsedRelease | null> => {
		return new Promise(async (resolve, reject) => {
			const controller = new AbortController()
			const timeoutId = setTimeout(() => {
				controller.abort()
				reject(new Error('Update check timed out'))
			}, TIMEOUT_MS)

			try {
				const response = await axios.get(UPDATE_CHECK_URL, {
					signal: controller.signal,
					headers: { 'Cache-Control': 'no-cache' }
				})
				clearTimeout(timeoutId)

				const parsed = parseReleaseResponse(response.data)
				resolve(parsed)
			} catch (err) {
				clearTimeout(timeoutId)
				reject(err)
			}
		})
	}

	// Main function to check updates manually or in background
	const checkForUpdates = async (isBackground = false): Promise<ParsedRelease | null> => {
		setStatus('checking')
		setError(null)

		try {
			const parsed = await checkForUpdatesPromise(isBackground)
			setStatus('idle')

			if (parsed) {
				setUpdateInfo(parsed)
				const type = determineUpdateType(APP_VERSION, parsed.latest_version)
				setUpdateType(type)

				if (Platform.OS === 'android') {
					await cleanCacheDirExcept(parsed.latest_version)
					await updateFreeStorage()
				}

				if (type !== 'none') {
					if (type === 'required') {
						log({ level: 'info', label: 'UpdatesContext', message: 'Required update found. Redirecting to /updates' })
						// Force redirect to updates screen
						router.replace('/updates')
					} else if (type === 'optional') {
						// Optional update: Toast user exactly once
						const notifiedVersion = await AsyncStorage.getItem('notified_update_version')
						if (notifiedVersion !== parsed.latest_version) {
							toast.show({
								title: 'New Update Available',
								message: `Version ${parsed.latest_version} is available. Tap to view.`,
								color: '#0EA5E9',
								screen: '/updates'
							})
							await AsyncStorage.setItem('notified_update_version', parsed.latest_version)
						}
					}
				}
				return parsed
			}
			return null
		} catch (err: any) {
			setStatus('error')
			setError(err.message || 'Failed to check for updates')
			log({ level: 'warn', label: 'UpdatesContext', message: 'Update check failed', error: err })
			return null
		}
	}

	// Downloads update APK file on Android
	const downloadUpdate = async () => {
		if (Platform.OS !== 'android' || !updateInfo || !updateInfo.download_url) return

		try {
			setStatus('downloading')
			setDownloadProgress(0)
			setError(null)

			await FileSystem.makeDirectoryAsync(UPDATES_DIR, { intermediates: true })
			await cleanCacheDirExcept('') // clean all previous before downloading

			const filename = `drinaluza-${updateInfo.latest_version}.apk`
			const localUri = UPDATES_DIR + filename

			const downloadResumable = FileSystem.createDownloadResumable(updateInfo.download_url, localUri, {}, (progressData) => {
				const progress = progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite
				setDownloadProgress(progress)
			})

			activeDownloadRef.current = downloadResumable
			const result = await downloadResumable.downloadAsync()
			activeDownloadRef.current = null

			if (result && result.uri) {
				const meta: CachedApkDetails = {
					version: updateInfo.latest_version,
					localUri: result.uri,
					size: updateInfo.size,
					published_at: updateInfo.published_at
				}

				await FileSystem.writeAsStringAsync(METADATA_PATH, JSON.stringify(meta))
				setCachedApk(meta)
				setStatus('completed')
				await updateFreeStorage()
				log({ level: 'info', label: 'UpdatesContext', message: 'APK download complete', data: meta })
			} else {
				throw new Error('Download completed with empty URI')
			}
		} catch (err: any) {
			activeDownloadRef.current = null
			setStatus('error')
			setError(err.message || 'Failed to download update')
			log({ level: 'error', label: 'UpdatesContext', message: 'APK download failed', error: err })
		}
	}

	// Installs APK file using IntentLauncher on Android
	const installUpdate = async () => {
		if (Platform.OS !== 'android') return

		let apkUri = ''
		if (cachedApk) {
			apkUri = cachedApk.localUri
		} else if (status === 'completed' && updateInfo) {
			apkUri = UPDATES_DIR + `drinaluza-${updateInfo.latest_version}.apk`
		}

		if (!apkUri) {
			log({ level: 'warn', label: 'UpdatesContext', message: 'No APK file available to install' })
			return
		}

		try {
			const contentUri = await FileSystem.getContentUriAsync(apkUri)
			log({ level: 'info', label: 'UpdatesContext', message: 'Launching APK installer', data: { apkUri, contentUri } })

			await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
				data: contentUri,
				type: 'application/vnd.android.package-archive',
				flags: 1 // FLAG_GRANT_READ_URI_PERMISSION
			})
		} catch (err: any) {
			log({ level: 'error', label: 'UpdatesContext', message: 'Failed to launch APK installation', error: err })
			setError(err.message || 'Failed to trigger app installation')
		}
	}

	// Deletes cached APK file
	const deleteCachedApk = async () => {
		try {
			await FileSystem.deleteAsync(UPDATES_DIR, { idempotent: true })
			setCachedApk(null)
			if (status === 'completed') {
				setStatus('idle')
			}
			await updateFreeStorage()
			log({ level: 'info', label: 'UpdatesContext', message: 'Cached APK deleted successfully' })
		} catch (err) {
			log({ level: 'error', label: 'UpdatesContext', message: 'Failed to delete cached APK', error: err })
		}
	}

	// Startup update checking routine (Android only)
	const runStartupCheck = async () => {
		try {
			setIsCheckingStartup(true)

			// 1. Read cached APK metadata if exists
			let localMeta: CachedApkDetails | null = null
			try {
				await FileSystem.makeDirectoryAsync(UPDATES_DIR, { intermediates: true })
				const metaInfo = await FileSystem.getInfoAsync(METADATA_PATH)
				if (metaInfo.exists) {
					const metaStr = await FileSystem.readAsStringAsync(METADATA_PATH)
					const meta = JSON.parse(metaStr) as CachedApkDetails
					const apkInfo = await FileSystem.getInfoAsync(meta.localUri)
					if (apkInfo.exists) {
						localMeta = meta
						setCachedApk(meta)
						setStatus('completed')
					} else {
						// Stale metadata file
						await FileSystem.deleteAsync(METADATA_PATH, { idempotent: true })
					}
				}
			} catch (e) {
				log({ level: 'warn', label: 'UpdatesContext', message: 'Failed to read cache metadata', error: e })
			}

			await updateFreeStorage()

			// 2. Query GitHub release check (with config.TIMEOUT_MS)
			let onlineRelease: ParsedRelease | null = null
			let type: UpdateType = 'none'

			try {
				onlineRelease = await checkForUpdatesPromise(false)
				if (onlineRelease) {
					type = determineUpdateType(APP_VERSION, onlineRelease.latest_version)
					setUpdateInfo(onlineRelease)
					setUpdateType(type)
				}
			} catch (e) {
				log({ level: 'error', label: 'UpdatesContext', message: 'Online check failed during startup', error: e })
			}

			// 3. Make navigation decisions
			if (onlineRelease && type !== 'none') {
				// New version is available online -> open updates screen
				setStartupRedirect('/updates')
			} else {
				// No new version available online
				if (localMeta) {
					const isHigher = compareVersions(localMeta.version, APP_VERSION) > 0
					if (isHigher) {
						// Cached apk version is higher than current version -> install
						// We do a non-blocking trigger so startup can finish or trigger the view
						installApkUriDirect(localMeta.localUri)
					}
				}
				setStartupRedirect(null)
			}
		} catch (err) {
			log({ level: 'error', label: 'UpdatesContext', message: 'Startup check failed', error: err })
		} finally {
			setIsCheckingStartup(false)
		}
	}

	const installApkUriDirect = async (apkUri: string) => {
		try {
			const contentUri = await FileSystem.getContentUriAsync(apkUri)
			await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
				data: contentUri,
				type: 'application/vnd.android.package-archive',
				flags: 1
			})
		} catch (e) {
			log({ level: 'error', label: 'UpdatesContext', message: 'Direct APK installation trigger failed', error: e })
		}
	}

	// Background updater timer (Checks updates every 15 minutes when app is active)
	useEffect(() => {
		if (Platform.OS === 'android') {
			runStartupCheck()
		} else {
			setIsCheckingStartup(false)
		}

		let intervalId: NodeJS.Timeout | null = null

		const startInterval = () => {
			if (intervalId) clearInterval(intervalId)
			intervalId = setInterval(
				() => {
					checkForUpdates(true)
				},
				15 * 60 * 1000
			) // 15 minutes
		}

		const stopInterval = () => {
			if (intervalId) {
				clearInterval(intervalId)
				intervalId = null
			}
		}

		const handleAppStateChange = (nextAppState: AppStateStatus) => {
			if (nextAppState === 'active') {
				checkForUpdates(true)
				startInterval()
			} else {
				stopInterval()
			}
		}

		const subscription = AppState.addEventListener('change', handleAppStateChange)

		if (AppState.currentState === 'active') {
			startInterval()
		}

		return () => {
			subscription.remove()
			stopInterval()
			if (activeDownloadRef.current) {
				activeDownloadRef.current.cancelAsync().catch((err: any) => {
					log({ level: 'warn', label: 'UpdatesContext', message: 'Failed to cancel active download on unmount', error: err })
				})
			}
		}
	}, [])

	return (
		<UpdatesContext.Provider
			value={{
				status,
				updateInfo,
				updateType,
				cachedApk,
				downloadProgress,
				freeStorage,
				isCheckingStartup,
				startupRedirect,
				error,
				checkForUpdates,
				downloadUpdate,
				installUpdate,
				deleteCachedApk
			}}
		>
			{children}
		</UpdatesContext.Provider>
	)
}
