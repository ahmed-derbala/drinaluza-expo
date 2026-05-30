import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react'
import { Platform, Linking, Alert, BackHandler } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as IntentLauncher from 'expo-intent-launcher'
import { APP_VERSION, UPDATE_CHECK_URL, TIMEOUT_MS } from '@/config'
import { log } from '@/core/log'
import { fetchUpdateFromUrl, compareVersions, UpdateInfo } from './utils'
import { toast } from '@/features/common/Toast'

export type StartupState = 'initializing' | 'checkingUpdate' | 'updateAvailable' | 'updateRequired' | 'ready' | 'error'

interface AppUpdaterContextType {
	startupState: StartupState
	isDownloading: boolean
	downloadProgress: number
	updateInfo: UpdateInfo | null
	cachedApkPath: string | null
	cachedApkSize: number
	isChecking: boolean
	showModal: boolean
	setShowModal: (show: boolean) => void
	isAppFullyLoaded: boolean
	setAppFullyLoaded: (loaded: boolean) => void
	checkForUpdates: (manual?: boolean) => Promise<void>
	downloadUpdate: () => Promise<void>
	installApk: (apkPath: string) => Promise<void>
	dismissUpdate: () => void
	deleteCachedApk: () => Promise<void>
	shareCachedApk: () => Promise<void>
}

const AppUpdaterContext = createContext<AppUpdaterContextType | undefined>(undefined)

export const AppUpdaterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const [startupState, setStartupState] = useState<StartupState>('initializing')
	const [isDownloading, setIsDownloading] = useState(false)
	const [downloadProgress, setDownloadProgress] = useState(0)
	const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
	const [cachedApkPath, setCachedApkPath] = useState<string | null>(null)
	const [cachedApkSize, setCachedApkSize] = useState<number>(0)
	const [isChecking, setIsChecking] = useState(false)
	const [showModal, setShowModal] = useState(false)
	const [isAppFullyLoaded, setIsAppFullyLoaded] = useState(false)

	const dismissUpdate = () => {
		setShowModal(false)
		if (startupState === 'updateAvailable') {
			setStartupState('ready')
		}
	}

	const downloadResumableRef = useRef<FileSystem.DownloadResumable | null>(null)
	const isCheckingRef = useRef(false)

	const cacheDir = useMemo(() => FileSystem.cacheDirectory + 'apk_cache/', [])

	interface CachedApkInfo {
		path: string
		version: string
		size: number
	}

	const findAnyCachedApk = async (): Promise<CachedApkInfo | null> => {
		if (Platform.OS === 'web') return null
		try {
			const dirInfo = await FileSystem.getInfoAsync(cacheDir)
			if (!dirInfo.exists) return null

			const files = await FileSystem.readDirectoryAsync(cacheDir)
			const apkFiles = files.filter((f) => f.startsWith('drinaluza-') && f.endsWith('.apk'))
			if (apkFiles.length === 0) return null

			// Get the first APK file
			const fileName = apkFiles[0]
			const filePath = cacheDir + fileName
			const fileInfo = await FileSystem.getInfoAsync(filePath)

			const match = fileName.match(/drinaluza-(.+)\.apk/)
			const version = match ? match[1] : ''

			if (fileInfo.exists && version) {
				return {
					path: filePath,
					version,
					size: fileInfo.size || 0
				}
			}
			return null
		} catch (e) {
			log({ level: 'error', label: 'updater', message: 'Failed to find cached APK', error: e })
			return null
		}
	}

	const installApk = async (apkPath: string) => {
		if (Platform.OS !== 'android') {
			Linking.openURL(UPDATE_CHECK_URL)
			return
		}
		try {
			log({ level: 'info', label: 'updater', message: `Installing APK from ${apkPath}` })
			const contentUri = await FileSystem.getContentUriAsync(apkPath)
			await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
				data: contentUri,
				flags: 1 // Intent.FLAG_GRANT_READ_URI_PERMISSION
			})
		} catch (e) {
			log({ level: 'error', label: 'updater', message: 'Failed to run installer', error: e })
			toast.show({
				title: 'Installation Failed',
				message: 'Could not open the system package installer.',
				color: '#EF4444'
			})
		}
	}

	// Helper to check for a cached APK and update local state
	const updateCachedApkState = async (latestVersion: string) => {
		if (Platform.OS === 'web') return
		try {
			const apkPath = cacheDir + `drinaluza-${latestVersion}.apk`
			const fileInfo = await FileSystem.getInfoAsync(apkPath)
			if (fileInfo.exists) {
				setCachedApkPath(apkPath)
				setCachedApkSize(fileInfo.size || 0)
				log({
					level: 'info',
					label: 'updater',
					message: `Found cached APK for version ${latestVersion}: ${apkPath} (${(fileInfo.size || 0) / (1024 * 1024)} MB)`
				})
			} else {
				setCachedApkPath(null)
				setCachedApkSize(0)
			}
		} catch (e) {
			setCachedApkPath(null)
			setCachedApkSize(0)
		}
	}

	// Deletes all APK files except the specified latest version
	const cleanupApkCache = async (latestVersion: string) => {
		if (Platform.OS === 'web') return
		try {
			const dirInfo = await FileSystem.getInfoAsync(cacheDir)
			if (!dirInfo.exists) {
				await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true })
				return
			}
			const files = await FileSystem.readDirectoryAsync(cacheDir)
			for (const file of files) {
				if (file.endsWith('.apk') && file !== `drinaluza-${latestVersion}.apk`) {
					await FileSystem.deleteAsync(cacheDir + file, { idempotent: true })
					log({
						level: 'info',
						label: 'updater',
						message: `Cleaned up stale APK from cache: ${file}`
					})
				}
			}
		} catch (e) {
			log({ level: 'warn', label: 'updater', message: 'Failed to cleanup APK cache', error: e })
		}
	}

	const checkForUpdates = async (manual = false) => {
		if (isCheckingRef.current) return
		isCheckingRef.current = true
		setIsChecking(true)

		if (!manual) {
			setStartupState('checkingUpdate')
		}

		try {
			log({
				level: 'info',
				label: 'updater',
				message: `Checking for updates using ${UPDATE_CHECK_URL}...`
			})

			const latestInfo = await fetchUpdateFromUrl(UPDATE_CHECK_URL, TIMEOUT_MS)
			setUpdateInfo(latestInfo)

			const comparison = compareVersions(APP_VERSION, latestInfo.latest_version)
			log({
				level: 'info',
				label: 'updater',
				message: `Update comparison: Current=${APP_VERSION}, Latest=${latestInfo.latest_version}, Result=${comparison}`
			})

			// Check for any cached APK first
			const cachedApk = await findAnyCachedApk()

			// Manage cache and check if file exists
			await cleanupApkCache(latestInfo.latest_version)
			await updateCachedApkState(latestInfo.latest_version)

			// Startup cached APK flows
			if (!manual && cachedApk) {
				if (comparison === 'none') {
					const cachedComparison = compareVersions(APP_VERSION, cachedApk.version)
					if (cachedComparison !== 'none') {
						log({
							level: 'info',
							label: 'updater',
							message: `Startup cache trigger: No new remote version, but cached version ${cachedApk.version} > APP_VERSION. Launching installation.`
						})
						setStartupState('ready')
						setIsChecking(false)
						isCheckingRef.current = false
						await installApk(cachedApk.path)
						return
					}
				} else {
					if (comparison === 'optional') {
						// Optional remote update exists. Ask user to download new remote, install cached (if valid), or continue.
						setStartupState('ready')
						setIsChecking(false)
						isCheckingRef.current = false

						const cachedVsRemote = compareVersions(cachedApk.version, latestInfo.latest_version)
						const cachedVsCurrent = compareVersions(APP_VERSION, cachedApk.version)

						const buttons: any[] = []

						// 1. Download newer version
						if (cachedVsRemote !== 'none') {
							buttons.push({
								text: `Download v${latestInfo.latest_version}`,
								onPress: () => {
									setStartupState('updateAvailable')
									setShowModal(true)
									downloadUpdate()
								}
							})
						}

						// 2. Install cached version
						if (cachedVsCurrent !== 'none') {
							buttons.push({
								text: `Install Cached v${cachedApk.version}`,
								onPress: () => {
									installApk(cachedApk.path)
								}
							})
						}

						// 3. Continue to app without update
						buttons.push({
							text: 'Continue to App',
							style: 'cancel'
						})

						Alert.alert('Update Available', `A new version v${latestInfo.latest_version} is available. You also have a previously downloaded version v${cachedApk.version} ready.`, buttons, {
							cancelable: true
						})
						return
					} else if (comparison === 'required') {
						// Required remote update exists. Ask user to download remote or exit app.
						setStartupState('updateRequired')
						setShowModal(true)
						setIsChecking(false)
						isCheckingRef.current = false

						Alert.alert(
							'Required Update',
							`A mandatory update v${latestInfo.latest_version} is available. You must download this version to continue.`,
							[
								{
									text: 'Confirm Download',
									onPress: () => {
										downloadUpdate()
									}
								},
								{
									text: 'Exit App',
									style: 'destructive',
									onPress: () => {
										if (Platform.OS === 'android') {
											BackHandler.exitApp()
										} else {
											setShowModal(false)
										}
									}
								}
							],
							{ cancelable: false }
						)
						return
					}
				}
			}

			if (comparison === 'required') {
				if (Platform.OS === 'web') {
					log({
						level: 'info',
						label: 'updater',
						message: 'Required update found on Web. Reloading page.'
					})
					window.location.reload()
					return
				}
				setStartupState('updateRequired')
				setShowModal(true)
			} else if (comparison === 'optional') {
				setStartupState('updateAvailable')
				setShowModal(true)
			} else {
				setStartupState('ready')
				setShowModal(false)
				if (manual) {
					toast.show({
						title: 'Up to Date',
						message: 'You are running the latest version.',
						color: '#10B981'
					})
				}
			}
		} catch (err) {
			log({
				level: 'error',
				label: 'updater',
				message: 'Failed to check for updates',
				error: err
			})
			setStartupState('error')
			// Fallback to ready state so app continues normally on failure
			if (!manual) {
				setStartupState('ready')
			} else {
				toast.show({
					title: 'Error',
					message: 'Failed to check for updates. Check your internet connection.',
					color: '#EF4444'
				})
			}
		} finally {
			setIsChecking(false)
			isCheckingRef.current = false
		}
	}

	const downloadUpdate = async () => {
		if (!updateInfo) return

		if (Platform.OS === 'web') {
			if (updateInfo.download_url) {
				Linking.openURL(updateInfo.download_url)
			}
			return
		}

		const apkPath = cacheDir + `drinaluza-${updateInfo.latest_version}.apk`

		if (startupState === 'updateAvailable') {
			setShowModal(false)
			setStartupState('ready')
		}

		try {
			// Check if file is already fully downloaded
			const fileInfo = await FileSystem.getInfoAsync(apkPath)
			if (fileInfo.exists && fileInfo.size === updateInfo.size) {
				log({
					level: 'info',
					label: 'updater',
					message: 'APK already downloaded. Launching installation.'
				})
				await installApk(apkPath)
				return
			}

			// Ensure directory exists
			await FileSystem.makeDirectoryAsync(cacheDir, { intermediates: true })

			setIsDownloading(true)
			setDownloadProgress(0)

			const callback = (downloadProgress: any) => {
				const progress = downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite
				setDownloadProgress(isNaN(progress) ? 0 : progress)
			}

			const downloadResumable = FileSystem.createDownloadResumable(updateInfo.download_url, apkPath, {}, callback)
			downloadResumableRef.current = downloadResumable

			log({
				level: 'info',
				label: 'updater',
				message: `Downloading update from ${updateInfo.download_url} to ${apkPath}...`
			})

			const result = await downloadResumable.downloadAsync()
			setIsDownloading(false)

			if (result && result.uri) {
				log({
					level: 'info',
					label: 'updater',
					message: `Download complete: ${result.uri}`
				})
				await updateCachedApkState(updateInfo.latest_version)
				await installApk(result.uri)
			}
		} catch (e) {
			setIsDownloading(false)
			setDownloadProgress(0)
			log({
				level: 'error',
				label: 'updater',
				message: 'Download failed',
				error: e
			})
			toast.show({
				title: 'Download Failed',
				message: 'Failed to download update APK file.',
				color: '#EF4444'
			})
		}
	}

	const deleteCachedApk = async () => {
		if (!cachedApkPath) return
		try {
			await FileSystem.deleteAsync(cachedApkPath, { idempotent: true })
			setCachedApkPath(null)
			setCachedApkSize(0)
			toast.show({
				title: 'Cache Cleared',
				message: 'Cached update file deleted successfully.',
				color: '#10B981'
			})
		} catch (e) {
			log({
				level: 'error',
				label: 'updater',
				message: 'Failed to delete cached APK',
				error: e
			})
			toast.show({
				title: 'Error',
				message: 'Failed to delete cached APK file.',
				color: '#EF4444'
			})
		}
	}

	const shareCachedApk = async () => {
		if (!cachedApkPath) {
			toast.show({
				title: 'Not Cached',
				message: 'APK file is not downloaded yet.',
				color: '#3B82F6'
			})
			return
		}

		try {
			const isAvailable = await Sharing.isAvailableAsync()
			if (!isAvailable) {
				toast.show({
					title: 'Error',
					message: 'Sharing is not supported on this device.',
					color: '#EF4444'
				})
				return
			}

			// Show Quick Share advisory toast or alert
			Alert.alert('Quick Share Advisory', "Advice: Use 'Quick Share' (or Bluetooth) in the system sharing menu for extremely fast transfer to nearby Android devices.", [
				{
					text: 'Open Share',
					onPress: async () => {
						await Sharing.shareAsync(cachedApkPath, {
							mimeType: 'application/vnd.android.package-archive',
							dialogTitle: 'Share Drinaluza APK'
						})
					}
				}
			])
		} catch (e) {
			log({
				level: 'error',
				label: 'updater',
				message: 'Failed to share cached APK',
				error: e
			})
		}
	}

	// Clean up ongoing downloads on unmount
	useEffect(() => {
		// Run initial update check on app launch
		checkForUpdates()

		return () => {
			if (downloadResumableRef.current) {
				downloadResumableRef.current.cancelAsync().catch(() => {})
			}
		}
	}, [])

	return (
		<AppUpdaterContext.Provider
			value={{
				startupState,
				isDownloading,
				downloadProgress,
				updateInfo,
				cachedApkPath,
				cachedApkSize,
				isChecking,
				showModal,
				setShowModal,
				isAppFullyLoaded,
				setAppFullyLoaded: setIsAppFullyLoaded,
				checkForUpdates,
				downloadUpdate,
				installApk,
				dismissUpdate,
				deleteCachedApk,
				shareCachedApk
			}}
		>
			{children}
		</AppUpdaterContext.Provider>
	)
}

export const useAppUpdater = () => {
	const context = useContext(AppUpdaterContext)
	if (context === undefined) {
		throw new Error('useAppUpdater must be used within an AppUpdaterProvider')
	}
	return context
}
