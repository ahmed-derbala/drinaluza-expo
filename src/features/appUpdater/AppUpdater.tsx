import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, BackHandler, Linking, ActivityIndicator, AppState, AppStateStatus, ScrollView } from 'react-native'
import { useTheme } from '@/core/theme'
import { APP_VERSION, BACKEND_URL, NODE_ENV, UPDATE_CHECK_URL, UPDATE_DOWNLOAD_ROOT_URL } from '@/config'
import { toast } from '@/features/common/Toast'
import { log } from '@/core/log'
import { useUser } from '@/core/contexts/UserContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import * as SplashScreen from 'expo-splash-screen'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'

export interface AppVersionConfig {
	latest: string
	min: string
	destroyAppStorage?: boolean | string
}

export interface GitHubReleaseAsset {
	name: string
	browser_download_url: string
	size?: number
	download_count?: number
}

export interface GitHubReleaseResponse {
	tag_name: string
	assets: GitHubReleaseAsset[]
	body?: string
	name?: string
	published_at?: string
}

export interface BackendResponse {
	NODE_ENV: string
	app: {
		name: string
		version: string
		description?: string
		author?: string
	}
	frontend: {
		web: {
			version: AppVersionConfig
		}
		android: {
			version: AppVersionConfig
		}
	}
}

export interface UpdaterContextType {
	isChecking: boolean
	updateStatus: 'up_to_date' | 'update_available' | 'update_required'
	latestVersion: string | null
	minVersion: string | null
	serverVersion: string | null
	destroyAppStorage: boolean | string
	apkDownloadUrl: string | null
	releaseNotes: string | null
	isDownloading: boolean
	downloadProgress: number
	isReadyToInstall: boolean
	installDownloadedUpdate: () => Promise<void>
	cachedApks: Array<{ name: string; size: number; version: string; localUri: string }>
	deleteCachedApk: (filename: string) => Promise<void>
	loadCachedApks: () => Promise<void>
	checkForUpdates: (manual?: boolean) => Promise<void>
}

const UpdaterContext = createContext<UpdaterContextType>({
	isChecking: false,
	updateStatus: 'up_to_date',
	latestVersion: null,
	minVersion: null,
	serverVersion: null,
	destroyAppStorage: false,
	apkDownloadUrl: null,
	releaseNotes: null,
	isDownloading: false,
	downloadProgress: 0,
	isReadyToInstall: false,
	installDownloadedUpdate: async () => {},
	cachedApks: [],
	deleteCachedApk: async () => {},
	loadCachedApks: async () => {},
	checkForUpdates: async () => {}
})

export const useUpdater = () => useContext(UpdaterContext)

export const compareVersions = (a: string, b: string): number => {
	const pa = a.split('.').map(Number)
	const pb = b.split('.').map(Number)
	const len = Math.max(pa.length, pb.length)

	for (let i = 0; i < len; i++) {
		const na = pa[i] || 0
		const nb = pb[i] || 0
		if (na > nb) return 1
		if (na < nb) return -1
	}
	return 0
}

export const formatBytes = (bytes: number): string => {
	if (bytes === 0) return '0 B'
	const k = 1024
	const dm = 2
	const sizes = ['B', 'KB', 'MB', 'GB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

export const formatDate = (dateStr: string | null): string => {
	if (!dateStr) return ''
	try {
		const date = new Date(dateStr)
		return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
	} catch (e) {
		return dateStr
	}
}

export const getUpdateType = (current: string, latest: string): 'none' | 'optional' | 'required' => {
	const cParts = current.split('.').map(Number)
	const lParts = latest.split('.').map(Number)

	const currentMajor = cParts[0] || 0
	const currentMinor = cParts[1] || 0
	const currentPatch = cParts[2] || 0

	const latestMajor = lParts[0] || 0
	const latestMinor = lParts[1] || 0
	const latestPatch = lParts[2] || 0

	if (compareVersions(latest, current) <= 0) {
		return 'none'
	}

	// 1. If MAJOR version is different
	if (latestMajor !== currentMajor) {
		return 'required'
	}

	// 2. If same MAJOR, but higher MINOR
	if (latestMinor > currentMinor) {
		return 'required'
	}

	// 3. If only PATCH is higher
	if (latestPatch > currentPatch) {
		return 'optional'
	}

	return 'none'
}

const DISMISSED_VERSION_KEY = 'drinaluza_dismissed_update_version'

export const UpdaterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const { colors } = useTheme()
	const { translate } = useUser()

	const [isChecking, setIsChecking] = useState(false)
	const [updateStatus, setUpdateStatus] = useState<'up_to_date' | 'update_available' | 'update_required'>('up_to_date')
	const [latestVersion, setLatestVersion] = useState<string | null>(null)
	const [minVersion, setMinVersion] = useState<string | null>(null)
	const [serverVersion, setServerVersion] = useState<string | null>(null)
	const [destroyAppStorage, setDestroyAppStorage] = useState<boolean | string>(false)
	const [apkDownloadUrl, setApkDownloadUrl] = useState<string | null>(null)
	const [releaseNotes, setReleaseNotes] = useState<string | null>(null)
	const [initialLoading, setInitialLoading] = useState(true)

	const [showOptionalModal, setShowOptionalModal] = useState(false)
	const [isDownloading, setIsDownloading] = useState(false)
	const [downloadProgress, setDownloadProgress] = useState(0)
	const [isReadyToInstall, setIsReadyToInstall] = useState(false)
	const [showReadyModal, setShowReadyModal] = useState(false)
	const [pendingInstalledVersion, setPendingInstalledVersion] = useState<string | null>(null)

	const [cachedApks, setCachedApks] = useState<Array<{ name: string; size: number; version: string; localUri: string }>>([])
	const [freeDiskStorage, setFreeDiskStorage] = useState<number | null>(null)
	const progressRef = React.useRef(0)

	const [releaseName, setReleaseName] = useState<string | null>(null)
	const [publishedAt, setPublishedAt] = useState<string | null>(null)
	const [apkSize, setApkSize] = useState<number | null>(null)
	const [downloadCount, setDownloadCount] = useState<number | null>(null)

	const [showDualOptionalModal, setShowDualOptionalModal] = useState(false)
	const [showDualRequiredModal, setShowDualRequiredModal] = useState(false)

	const loadCachedApks = useCallback(async () => {
		if (Platform.OS !== 'android') return
		try {
			const cacheDir = FileSystem.cacheDirectory
			if (cacheDir) {
				const cacheFiles = await FileSystem.readDirectoryAsync(cacheDir)
				const apkFiles = cacheFiles.filter((file) => file.startsWith('drinaluza-') && file.endsWith('.apk'))

				const details = await Promise.all(
					apkFiles.map(async (file) => {
						const path = `${cacheDir}${file}`
						const info = await FileSystem.getInfoAsync(path)
						const version = file.replace(/^drinaluza-/, '').replace(/\.apk$/, '')
						return {
							name: file,
							size: info.exists ? (info as any).size : 0,
							version,
							localUri: path
						}
					})
				)
				setCachedApks(details.filter((apk) => apk.size > 0))
			}
		} catch (e) {
			log({ level: 'warn', label: 'AppUpdater', message: 'Failed to load cached APK list', error: e })
		}
	}, [])

	const deleteCachedApk = useCallback(
		async (filename: string) => {
			try {
				const cacheDir = FileSystem.cacheDirectory
				if (cacheDir) {
					const path = `${cacheDir}${filename}`
					await FileSystem.deleteAsync(path, { idempotent: true })

					// If the deleted APK matched the currently ready-to-install version, update context state!
					const pendingVersion = await AsyncStorage.getItem('drinaluza_downloaded_update_version')
					if (pendingVersion && `drinaluza-${pendingVersion}.apk` === filename) {
						await AsyncStorage.removeItem('drinaluza_downloaded_update_version')
						setIsReadyToInstall(false)
						setPendingInstalledVersion(null)
					}

					toast.show({ title: 'File Deleted', message: 'Cached update file removed.', color: colors.primary })
					await loadCachedApks()
				}
			} catch (e) {
				log({ level: 'error', label: 'AppUpdater', message: 'Failed to delete cached APK file', error: e })
				toast.show({ title: 'Error', message: 'Failed to delete file.', color: '#EF4444' })
			}
		},
		[loadCachedApks, colors.primary]
	)

	useEffect(() => {
		loadCachedApks()
	}, [loadCachedApks])

	const installDownloadedUpdate = useCallback(async () => {
		if (Platform.OS === 'web') {
			window.location.reload()
			return
		}
		const version = latestVersion
		if (!version) return
		const localUri = `${FileSystem.cacheDirectory}drinaluza-${version}.apk`
		try {
			const contentUri = await FileSystem.getContentUriAsync(localUri)
			await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
				data: contentUri,
				flags: 1 // FLAG_GRANT_READ_URI_PERMISSION
			})
		} catch (error) {
			log({ level: 'error', label: 'AppUpdater', message: 'Failed to launch downloaded installer intent', error })
			toast.show({
				title: translate('error', 'Error'),
				message: 'Failed to launch installer. Please check app permissions.',
				color: '#EF4444'
			})
		}
	}, [latestVersion, translate])

	const downloadAndInstallApk = useCallback(
		async (version: string) => {
			const localUri = `${FileSystem.cacheDirectory}drinaluza-${version}.apk`
			const tempUri = `${FileSystem.cacheDirectory}drinaluza-${version}.apk.tmp`
			try {
				setIsDownloading(true)
				setIsReadyToInstall(false)

				const downloadUrl = apkDownloadUrl || `${UPDATE_DOWNLOAD_ROOT_URL.replace(/\/$/, '')}/v${version}/drinaluza-${version}.apk`

				setDownloadProgress(0)
				progressRef.current = 0

				// Pre-flight check before downloading:
				// 1. Ensure file extension is .apk
				// 2. Ensure MIME type is application/vnd.android.package-archive
				// 3. Ensure file size is valid
				log({ level: 'info', label: 'AppUpdater', message: `Pre-flight checking URL: ${downloadUrl}` })
				let contentLength = 0
				try {
					const response = await axios.head(downloadUrl, { timeout: 8000 })
					const contentTypeHeader = response.headers['content-type']
					const contentType = typeof contentTypeHeader === 'string' ? contentTypeHeader : ''

					const contentLengthHeader = response.headers['content-length']
					const contentLengthStr = typeof contentLengthHeader === 'string' ? contentLengthHeader : typeof contentLengthHeader === 'number' ? String(contentLengthHeader) : '0'
					contentLength = parseInt(contentLengthStr, 10)

					const hasApkExtension = downloadUrl.toLowerCase().split('?')[0].endsWith('.apk')
					if (!hasApkExtension) {
						throw new Error('Invalid file extension. Must be .apk')
					}

					const isApkMime = contentType.includes('application/vnd.android.package-archive') || contentType.includes('application/octet-stream')
					if (!isApkMime) {
						throw new Error(`Invalid MIME type (${contentType}). Must be application/vnd.android.package-archive`)
					}

					if (isNaN(contentLength) || contentLength <= 0) {
						throw new Error(`Invalid file size (${contentLength})`)
					}

					log({ level: 'info', label: 'AppUpdater', message: `Pre-flight validation succeeded. Size: ${contentLength} bytes, Type: ${contentType}` })
				} catch (preflightErr: any) {
					log({ level: 'error', label: 'AppUpdater', message: 'Pre-flight validation failed', error: preflightErr })
					throw preflightErr
				}

				// Scrub any existing temporary file at tempUri to avoid corruption
				try {
					await FileSystem.deleteAsync(tempUri, { idempotent: true })
				} catch (e) {}

				log({ level: 'info', label: 'AppUpdater', message: `Starting fresh download for v${version} at ${tempUri}...` })

				// Simulating indeterminate progress since downloadAsync doesn't provide progress callbacks
				setDownloadProgress(0.5)

				const result = await FileSystem.downloadAsync(downloadUrl, tempUri)

				if (!result || !result.uri) {
					throw new Error('Download failed: empty download result.')
				}

				if (result.status && (result.status < 200 || result.status >= 300)) {
					throw new Error(`Download failed with HTTP status ${result.status}`)
				}

				// Pre-installation verification checks:
				// 1. Ensure file is not zero bytes
				// 2. Ensure download fully completed (actual size matches contentLength)
				const fileInfo = await FileSystem.getInfoAsync(tempUri)
				if (!fileInfo.exists) {
					throw new Error('Downloaded file does not exist.')
				}

				const fileSize = (fileInfo as any).size || 0
				if (fileSize <= 0) {
					throw new Error('Downloaded file is empty (zero bytes).')
				}

				if (fileSize !== contentLength) {
					throw new Error(`Downloaded file is truncated or incomplete. Expected: ${contentLength}, Actual: ${fileSize}`)
				}

				log({ level: 'info', label: 'AppUpdater', message: `Download successfully verified. Moving temporary file to final path.` })

				// Delete any old APK file at final destination before moving (never overwrite during active download)
				try {
					await FileSystem.deleteAsync(localUri, { idempotent: true })
				} catch (e) {}

				// Move the temporary file to the final localUri
				await FileSystem.moveAsync({
					from: tempUri,
					to: localUri
				})

				await AsyncStorage.setItem(`drinaluza_downloaded_update_size_${version}`, String(fileSize))
				await AsyncStorage.setItem('drinaluza_downloaded_update_version', version)
				setIsReadyToInstall(true)

				if (updateStatus === 'update_required') {
					toast.show({ title: 'Download Complete', message: 'Opening installer...', color: '#10B981' })
					const contentUri = await FileSystem.getContentUriAsync(localUri)
					await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
						data: contentUri,
						flags: 1 // FLAG_GRANT_READ_URI_PERMISSION
					})
				} else {
					toast.show({
						title: 'Download Complete',
						message: 'Update downloaded! Tap the restart icon in the header or Settings to install.',
						color: '#10B981'
					})
				}
			} catch (error: any) {
				log({ level: 'error', label: 'AppUpdater', message: 'APK download/install error. Cleaning cache...', error })

				// Interruption / Failure Cleanup:
				// Delete the partial APK file at tempUri and final APK file at localUri immediately
				try {
					await FileSystem.deleteAsync(tempUri, { idempotent: true })
				} catch (e) {}
				try {
					await FileSystem.deleteAsync(localUri, { idempotent: true })
				} catch (e) {}

				await AsyncStorage.removeItem('drinaluza_downloaded_update_version')
				await AsyncStorage.removeItem(`drinaluza_downloaded_update_size_${version}`)
				setIsReadyToInstall(false)
				setPendingInstalledVersion(null)

				toast.show({
					title: translate('error', 'Error'),
					message: error.message || 'Download was interrupted. Please try again.',
					color: '#EF4444'
				})
			} finally {
				setIsDownloading(false)
				setDownloadProgress(0)
				progressRef.current = 0
				await loadCachedApks()
			}
		},
		[apkDownloadUrl, updateStatus, translate, loadCachedApks]
	)

	const checkForUpdates = useCallback(
		async (manual = false) => {
			try {
				setIsChecking(true)
				if (manual) {
					toast.show({ title: translate('checking_for_updates', 'Checking for updates...'), message: '', color: colors.primary })
				}

				// Fetch free disk storage space
				if (Platform.OS !== 'web') {
					try {
						const freeSpace = await FileSystem.getFreeDiskStorageAsync()
						setFreeDiskStorage(freeSpace)
					} catch (storageErr) {
						log({ level: 'warn', label: 'AppUpdater', message: 'Failed to fetch free storage during update check', error: storageErr })
					}
				}

				// 1. Fetch latest version strictly from Releases API
				let githubData: GitHubReleaseResponse | null = null
				try {
					const githubRes = await axios.get<GitHubReleaseResponse>(UPDATE_CHECK_URL, { timeout: 8000 })
					if (githubRes.data && githubRes.data.tag_name) {
						githubData = githubRes.data
					} else {
						throw new Error('Releases API returned an invalid response.')
					}
				} catch (err) {
					log({ level: 'warn', label: 'AppUpdater', message: 'Update API check failed', error: err })
					throw err
				}

				const rawTag = githubData.tag_name
				const cleanTag = rawTag.replace(/^v/, '') // e.g. "v1.0.3" -> "1.0.3"
				const apkAsset = githubData.assets?.find((asset) => asset.name.endsWith('.apk'))
				const downloadUrl = apkAsset?.browser_download_url || `${UPDATE_DOWNLOAD_ROOT_URL.replace(/\/$/, '')}/${rawTag}/drinaluza-${cleanTag}.apk`

				// Clean cached update files if a newer version is available on the server
				if (Platform.OS === 'android') {
					try {
						const cacheDir = FileSystem.cacheDirectory
						if (cacheDir) {
							const cacheFiles = await FileSystem.readDirectoryAsync(cacheDir)
							const oldFiles = cacheFiles.filter((file) => file.startsWith('drinaluza-') && (file.endsWith('.apk') || file.endsWith('.apk.tmp')))
							for (const oldFile of oldFiles) {
								const fileVersion = oldFile.replace(/^drinaluza-/, '').replace(/\.apk(\.tmp)?$/, '')
								if (compareVersions(cleanTag, fileVersion) > 0) {
									log({ level: 'info', label: 'AppUpdater', message: `Scrubbing older cached file ${oldFile} as newer v${cleanTag} is available.` })
									await FileSystem.deleteAsync(`${cacheDir}${oldFile}`, { idempotent: true })
									await AsyncStorage.removeItem('drinaluza_downloaded_update_version')
									await AsyncStorage.removeItem(`drinaluza_downloaded_update_size_${fileVersion}`)
								}
							}
						}
					} catch (scrubErr) {
						log({ level: 'warn', label: 'AppUpdater', message: 'Failed to scrub older files', error: scrubErr })
					}
				}

				if (githubData.body) {
					setReleaseNotes(githubData.body)
				} else {
					setReleaseNotes(null)
				}

				// Parse and save the release info
				if (githubData.name) {
					setReleaseName(githubData.name)
				} else {
					setReleaseName(`Release v${cleanTag}`)
				}

				if (githubData.published_at) {
					setPublishedAt(githubData.published_at)
				} else {
					setPublishedAt(null)
				}

				if (apkAsset) {
					setApkSize(apkAsset.size || null)
					setDownloadCount(apkAsset.download_count !== undefined ? apkAsset.download_count : null)
				} else {
					setApkSize(null)
					setDownloadCount(null)
				}

				setLatestVersion(cleanTag)
				setApkDownloadUrl(downloadUrl)

				const currentVersion = APP_VERSION
				const updateType = getUpdateType(currentVersion, cleanTag)

				// Read pending version from AsyncStorage to avoid any state race conditions
				let pendingVersion: string | null = null
				let localUriExists = false
				if (Platform.OS === 'android') {
					try {
						pendingVersion = await AsyncStorage.getItem('drinaluza_downloaded_update_version')
						if (pendingVersion && compareVersions(pendingVersion, currentVersion) > 0) {
							const localUri = `${FileSystem.cacheDirectory}drinaluza-${pendingVersion}.apk`
							const fileInfo = await FileSystem.getInfoAsync(localUri)

							const savedSizeStr = await AsyncStorage.getItem(`drinaluza_downloaded_update_size_${pendingVersion}`)
							const expectedSize = savedSizeStr ? parseInt(savedSizeStr) : pendingVersion === cleanTag && apkAsset?.size ? apkAsset.size : 0

							if (fileInfo.exists && (fileInfo as any).size > 0 && expectedSize > 0 && (fileInfo as any).size === expectedSize) {
								localUriExists = true
							} else {
								log({ level: 'error', label: 'AppUpdater', message: `Local APK size mismatch or corrupted file. Expected: ${expectedSize}, Actual: ${(fileInfo as any).size}. Scrubbing...` })
								try {
									await FileSystem.deleteAsync(localUri, { idempotent: true })
								} catch (e) {}
								await AsyncStorage.removeItem('drinaluza_downloaded_update_version')
								await AsyncStorage.removeItem(`drinaluza_downloaded_update_size_${pendingVersion}`)
								pendingVersion = null
							}
						} else {
							if (pendingVersion) {
								await AsyncStorage.removeItem('drinaluza_downloaded_update_version')
								await AsyncStorage.removeItem(`drinaluza_downloaded_update_size_${pendingVersion}`)
							}
							pendingVersion = null
						}
					} catch (e) {
						log({ level: 'error', label: 'AppUpdater', message: 'Failed to read pending version from AsyncStorage', error: e })
					}
				}

				// If there is an update ready to install
				if (pendingVersion && localUriExists) {
					setIsReadyToInstall(true)
					setPendingInstalledVersion(pendingVersion)

					// Compare the ready version with the latest version from server
					if (compareVersions(cleanTag, pendingVersion) > 0) {
						// There is a newer version available to download on the server!
						if (updateType === 'required') {
							// Rule 2: ready to install AND another required update available for download
							// Ask user to download latest version or exit
							setUpdateStatus('update_required')
							setMinVersion(cleanTag)
							setShowOptionalModal(false)
							setShowReadyModal(false)
							setShowDualOptionalModal(false)
							setShowDualRequiredModal(true)
							log({ level: 'info', label: 'AppUpdater', message: `Dual Update Required - Ready: v${pendingVersion}, Latest: v${cleanTag}` })
						} else {
							// Rule 1: ready to install AND another optional update available for download
							// Ask user to download latest version or install ready one
							setUpdateStatus('update_available')
							setShowOptionalModal(false)
							setShowReadyModal(false)
							setShowDualRequiredModal(false)
							setShowDualOptionalModal(true)
							log({ level: 'info', label: 'AppUpdater', message: `Dual Update Optional - Ready: v${pendingVersion}, Latest: v${cleanTag}` })
						}
					} else {
						// Rule 3: ready to install and no other newer version available to download.
						// Instead of auto-installing immediately (which can cause infinite installer loops if corrupted),
						// we prompt the user appropriately depending on the update severity.
						const pendingUpdateType = getUpdateType(currentVersion, pendingVersion)
						if (pendingUpdateType === 'required') {
							setUpdateStatus('update_required')
							setMinVersion(pendingVersion)
							setShowOptionalModal(false)
							setShowReadyModal(false)
							setShowDualOptionalModal(false)
							setShowDualRequiredModal(false)
							log({ level: 'info', label: 'AppUpdater', message: `Required update v${pendingVersion} is ready to install. Showing required update blocked UI.` })
						} else if (pendingUpdateType === 'optional') {
							setUpdateStatus('update_available')
							setShowOptionalModal(false)
							setShowDualOptionalModal(false)
							setShowDualRequiredModal(false)

							let isDismissed = false
							try {
								const dismissed = Platform.OS === 'web' ? localStorage.getItem(DISMISSED_VERSION_KEY) : await AsyncStorage.getItem(DISMISSED_VERSION_KEY)
								if (dismissed === pendingVersion) {
									isDismissed = true
								}
							} catch (e) {
								log({ level: 'warn', label: 'AppUpdater', message: 'Failed to read dismissed version for ready update', error: e })
							}

							if (manual || !isDismissed) {
								setShowReadyModal(true)
							} else {
								setShowReadyModal(false)
							}
							log({ level: 'info', label: 'AppUpdater', message: `Optional update v${pendingVersion} is ready to install. Prompting user: ${!isDismissed || manual}` })
						} else {
							setUpdateStatus('up_to_date')
							setShowOptionalModal(false)
							setShowReadyModal(false)
							setShowDualOptionalModal(false)
							setShowDualRequiredModal(false)
						}
					}
					return
				}

				// Normal updates logic (no ready update exists)
				if (updateType === 'required') {
					setUpdateStatus('update_required')
					setMinVersion(cleanTag)
					setShowOptionalModal(false)
					setShowReadyModal(false)
					setShowDualOptionalModal(false)
					setShowDualRequiredModal(false)
					log({ level: 'info', label: 'AppUpdater', message: `Required update available! Latest: ${cleanTag}` })
					return
				}

				if (updateType === 'optional') {
					setUpdateStatus('update_available')
					setShowReadyModal(false)
					setShowDualOptionalModal(false)
					setShowDualRequiredModal(false)

					let isDismissed = false
					try {
						const dismissed = Platform.OS === 'web' ? localStorage.getItem(DISMISSED_VERSION_KEY) : await AsyncStorage.getItem(DISMISSED_VERSION_KEY)
						if (dismissed === cleanTag) {
							isDismissed = true
						}
					} catch (e) {
						log({ level: 'warn', label: 'AppUpdater', message: 'Failed to read dismissed version', error: e })
					}

					if (manual || !isDismissed) {
						setShowOptionalModal(true)
					} else {
						setShowOptionalModal(false)
					}

					log({ level: 'info', label: 'AppUpdater', message: `Optional update available! Latest: ${cleanTag}, Active version: ${currentVersion}, Auto-prompt: ${!isDismissed || manual}` })
					return
				}

				// 3. Up to date
				setUpdateStatus('up_to_date')
				setShowOptionalModal(false)
				setShowReadyModal(false)
				setShowDualOptionalModal(false)
				setShowDualRequiredModal(false)

				if (manual) {
					toast.show({ title: translate('up_to_date', 'Up to Date'), message: translate('already_latest', 'You are already running the latest version.'), color: '#10B981' })
				}

				// Automated Resume Guard completely removed
			} catch (error) {
				log({ level: 'error', label: 'AppUpdater', message: 'AppUpdater check failed', error: error })

				// Rule 3 Fallback: if check failed but ready update exists, show installation UI instead of auto-installing
				if (Platform.OS === 'android') {
					try {
						const pendingVersion = await AsyncStorage.getItem('drinaluza_downloaded_update_version')
						if (pendingVersion && compareVersions(pendingVersion, APP_VERSION) > 0) {
							const localUri = `${FileSystem.cacheDirectory}drinaluza-${pendingVersion}.apk`
							const fileInfo = await FileSystem.getInfoAsync(localUri)
							if (fileInfo.exists && (fileInfo as any).size > 0) {
								setIsReadyToInstall(true)
								setPendingInstalledVersion(pendingVersion)

								const pendingUpdateType = getUpdateType(APP_VERSION, pendingVersion)
								if (pendingUpdateType === 'required') {
									setUpdateStatus('update_required')
									setMinVersion(pendingVersion)
									setShowOptionalModal(false)
									setShowReadyModal(false)
									setShowDualOptionalModal(false)
									setShowDualRequiredModal(false)
									log({ level: 'info', label: 'AppUpdater', message: `Check failed. Required update v${pendingVersion} is ready. Showing required update blocked UI.` })
								} else {
									setUpdateStatus('update_available')
									setShowOptionalModal(false)
									setShowReadyModal(true)
									setShowDualOptionalModal(false)
									setShowDualRequiredModal(false)
									log({ level: 'info', label: 'AppUpdater', message: `Check failed. Optional update v${pendingVersion} is ready. Showing ready modal.` })
								}
								return
							}
						}
					} catch (storageErr) {}
				}

				setUpdateStatus('up_to_date')
				setShowOptionalModal(false)
				if (manual) {
					toast.show({ title: translate('error', 'Error'), message: translate('checking_failed', 'Failed to check for updates.'), color: '#EF4444' })
				}
			} finally {
				setIsChecking(false)
				setInitialLoading(false)
			}
		},
		[translate, colors.primary]
	)

	// Automatically run updater checks on start
	useEffect(() => {
		checkForUpdates(false)
	}, [checkForUpdates])

	// Automatically run updater checks when app returns from background
	useEffect(() => {
		const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
			if (nextAppState === 'active') {
				checkForUpdates(false)
			}
		})
		return () => {
			subscription.remove()
		}
	}, [checkForUpdates])

	// Startup Check: check if there is a downloaded update that needs to be installed
	useEffect(() => {
		const checkPendingUpdate = async () => {
			if (Platform.OS !== 'android') return
			try {
				try {
					const freeSpace = await FileSystem.getFreeDiskStorageAsync()
					setFreeDiskStorage(freeSpace)
				} catch (storageErr) {}

				const pendingVersion = await AsyncStorage.getItem('drinaluza_downloaded_update_version')
				if (pendingVersion) {
					if (compareVersions(pendingVersion, APP_VERSION) > 0) {
						const localUri = `${FileSystem.cacheDirectory}drinaluza-${pendingVersion}.apk`
						const fileInfo = await FileSystem.getInfoAsync(localUri)
						const savedSizeStr = await AsyncStorage.getItem(`drinaluza_downloaded_update_size_${pendingVersion}`)
						const expectedSize = savedSizeStr ? parseInt(savedSizeStr) : 0

						if (fileInfo.exists && (fileInfo as any).size > 0 && expectedSize > 0 && (fileInfo as any).size === expectedSize) {
							setIsReadyToInstall(true)
							setPendingInstalledVersion(pendingVersion)
							log({ level: 'info', label: 'AppUpdater', message: `Startup check: Pending update v${pendingVersion} is ready to install and size validated.` })
						} else {
							log({ level: 'error', label: 'AppUpdater', message: `Startup check: Local APK for v${pendingVersion} is corrupted or incomplete. Deleting...` })
							try {
								await FileSystem.deleteAsync(localUri, { idempotent: true })
							} catch (e) {}
							await AsyncStorage.removeItem('drinaluza_downloaded_update_version')
							await AsyncStorage.removeItem(`drinaluza_downloaded_update_size_${pendingVersion}`)
							setIsReadyToInstall(false)
						}
					} else {
						await AsyncStorage.removeItem('drinaluza_downloaded_update_version')
						await AsyncStorage.removeItem(`drinaluza_downloaded_update_size_${pendingVersion}`)
						setIsReadyToInstall(false)
						log({ level: 'info', label: 'AppUpdater', message: `Startup check: App updated to v${APP_VERSION}. Kept v${pendingVersion} APK for sharing.` })
					}
				}
			} catch (e) {
				log({ level: 'error', label: 'AppUpdater', message: 'Startup pending update check failed', error: e })
			}
		}
		checkPendingUpdate()
	}, [])

	// Storage cleanup of old downloaded APKs on app startup (preserving pending updates)
	useEffect(() => {
		if (Platform.OS === 'android') {
			const cleanOldCachedApks = async () => {
				try {
					const cacheDir = FileSystem.cacheDirectory
					if (cacheDir) {
						const cacheFiles = await FileSystem.readDirectoryAsync(cacheDir)
						const pendingVersion = await AsyncStorage.getItem('drinaluza_downloaded_update_version')
						const versionToKeep = pendingVersion || APP_VERSION
						const activeApkName = `drinaluza-${versionToKeep}.apk`

						const oldApks = cacheFiles.filter((file) => file.startsWith('drinaluza-') && file.endsWith('.apk') && file !== activeApkName)

						for (const oldApk of oldApks) {
							await FileSystem.deleteAsync(`${cacheDir}${oldApk}`, { idempotent: true })
						}
						if (oldApks.length > 0) {
							log({ level: 'info', label: 'AppUpdater', message: `Startup cache clean scrubbed ${oldApks.length} old APK files.` })
						}
					}
				} catch (err) {
					log({ level: 'warn', label: 'AppUpdater', message: 'Startup cache cleanup failed.', error: err })
				}
			}
			cleanOldCachedApks()
		}
	}, [])

	// Prevent auto-hiding of the native splash screen during startup
	useEffect(() => {
		SplashScreen.preventAutoHideAsync().catch(() => {})
	}, [])

	// Gracefully dismiss native splash screen once the initial update check completes (or fails)
	useEffect(() => {
		if (!initialLoading) {
			SplashScreen.hideAsync().catch(() => {})
		}
	}, [initialLoading])

	const handleConfirmUpdate = async () => {
		try {
			const shouldWipe = destroyAppStorage === true || String(destroyAppStorage).toLowerCase() === 'true'
			if (shouldWipe) {
				log({ level: 'info', label: 'AppUpdater', message: 'Wiping storage and cache as requested by backend.' })
				if (Platform.OS === 'web') {
					localStorage.clear()
					sessionStorage.clear()
				} else {
					await AsyncStorage.clear()
				}
			}

			if (Platform.OS === 'web') {
				setShowOptionalModal(false)
				window.location.reload()
			} else {
				// Dismiss the modal immediately for optional update so the user can continue using the app
				if (updateStatus !== 'update_required') {
					setShowOptionalModal(false)
					setShowReadyModal(false)
				}
				// Android: Trigger programmatic APK download in the background
				if (latestVersion) {
					await downloadAndInstallApk(latestVersion)
				}
			}
		} catch (err) {
			log({ level: 'error', label: 'AppUpdater', message: 'Failed to trigger update action', error: err })
		}
	}

	const handleExitApp = () => {
		if (Platform.OS === 'android') {
			BackHandler.exitApp()
		}
	}

	const handleDismissOptionalUpdate = async () => {
		setShowOptionalModal(false)
		setShowReadyModal(false)
		setShowDualOptionalModal(false)
		setShowDualRequiredModal(false)
		const versionToDismiss = latestVersion || pendingInstalledVersion
		if (versionToDismiss) {
			try {
				if (Platform.OS === 'web') {
					localStorage.setItem(DISMISSED_VERSION_KEY, versionToDismiss)
				} else {
					await AsyncStorage.setItem(DISMISSED_VERSION_KEY, versionToDismiss)
				}
				log({ level: 'info', label: 'AppUpdater', message: `Optional update version ${versionToDismiss} dismissed by user.` })
			} catch (e) {
				log({ level: 'error', label: 'AppUpdater', message: 'Failed to save dismissed version', error: e })
			}
		}
	}

	// Helper function to beautifully render the parsed GitHub release notes
	const renderReleaseNotes = () => {
		if (!releaseNotes) {
			return (
				<View style={[styles.notesContainer, { backgroundColor: colors.surfaceVariant }]}>
					<Text style={[styles.notesTitle, { color: colors.textSecondary }]}>{translate('release_notes', 'Release Notes')}</Text>
					<Text style={[styles.notesBodyText, { color: colors.textTertiary, fontStyle: 'italic', textAlign: 'center' }]}>
						{translate('no_release_notes', 'No release notes available for this version.')}
					</Text>
				</View>
			)
		}

		// Beautiful list parsing of release notes body text
		const lines = releaseNotes
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0)

		return (
			<View style={[styles.notesContainer, { backgroundColor: colors.surfaceVariant }]}>
				<Text style={[styles.notesTitle, { color: colors.textSecondary }]}>{translate('whats_new', "What's New")}</Text>
				<ScrollView style={styles.notesScroll} nestedScrollEnabled contentContainerStyle={styles.notesScrollContent}>
					{lines.map((line, index) => {
						// Header parsing e.g. "### Features"
						if (line.startsWith('#')) {
							const cleanHeader = line.replace(/^#+\s*/, '')
							return (
								<Text key={index} style={[styles.notesHeader, { color: colors.text }]}>
									{cleanHeader}
								</Text>
							)
						}

						const isBullet = line.startsWith('*') || line.startsWith('-') || line.startsWith('•')
						const cleanLine = isBullet ? line.substring(1).trim() : line

						return (
							<View key={index} style={styles.notesRow}>
								{isBullet && <Text style={[styles.notesBullet, { color: colors.primary }]}>•</Text>}
								<Text style={[styles.notesBodyText, { color: colors.textSecondary }]}>{cleanLine}</Text>
							</View>
						)
					})}
				</ScrollView>
			</View>
		)
	}

	if (initialLoading) {
		return (
			<UpdaterContext.Provider
				value={{
					isChecking,
					updateStatus,
					latestVersion,
					minVersion,
					serverVersion,
					destroyAppStorage,
					apkDownloadUrl,
					releaseNotes,
					isDownloading,
					downloadProgress,
					isReadyToInstall,
					installDownloadedUpdate,
					cachedApks,
					deleteCachedApk,
					loadCachedApks,
					checkForUpdates
				}}
			>
				<View style={{ flex: 1, backgroundColor: colors.background }} />
			</UpdaterContext.Provider>
		)
	}

	if (updateStatus === 'update_required') {
		return (
			<UpdaterContext.Provider
				value={{
					isChecking,
					updateStatus,
					latestVersion,
					minVersion,
					serverVersion,
					destroyAppStorage,
					apkDownloadUrl,
					releaseNotes,
					isDownloading,
					downloadProgress,
					isReadyToInstall,
					installDownloadedUpdate,
					cachedApks,
					deleteCachedApk,
					loadCachedApks,
					checkForUpdates
				}}
			>
				<View style={[styles.overlay, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
					<View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border + '50' }]}>
						{/* Glossmorphic Ambient Top Accent */}
						<LinearGradient colors={[colors.error + '18', 'transparent']} style={StyleSheet.absoluteFillObject} />

						<View style={[styles.iconWrap, { backgroundColor: colors.error + '15' }]}>
							<Ionicons name="warning" size={32} color={colors.error} />
						</View>

						<Text style={[styles.title, { color: colors.text }]}>{translate('update_required', 'Update Required')}</Text>

						<Text style={[styles.message, { color: colors.textSecondary }]}>
							{Platform.OS === 'web'
								? translate('mandatory_update_msg_web', 'Your active web session is outdated and no longer supported. Please refresh to load the latest changes.')
								: translate('mandatory_update_msg_android', 'This version of the application is outdated and no longer supported. Please download the latest version to continue.')}
						</Text>

						{/* Version chips */}
						<View style={[styles.infoCard, { backgroundColor: colors.surfaceVariant }]}>
							<View style={styles.infoRow}>
								<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Your Version</Text>
								<View style={[styles.versionChip, { backgroundColor: colors.error + '15' }]}>
									<Text style={[styles.infoValue, { color: colors.error, fontWeight: '700' }]}>{APP_VERSION}</Text>
								</View>
							</View>
							<View style={[styles.infoRow, { marginTop: 10 }]}>
								<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Required Minimum</Text>
								<View style={[styles.versionChip, { backgroundColor: colors.success + '15' }]}>
									<Text style={[styles.infoValue, { color: colors.success, fontWeight: '700' }]}>{minVersion || latestVersion || '1.0.0'}</Text>
								</View>
							</View>
							{freeDiskStorage !== null && Platform.OS !== 'web' && (
								<View style={[styles.infoRow, { marginTop: 10 }]}>
									<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('free_storage', 'Free Storage')}</Text>
									<View style={[styles.versionChip, { backgroundColor: colors.primary + '15' }]}>
										<Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>{formatBytes(freeDiskStorage)}</Text>
									</View>
								</View>
							)}
							{/* Release Details */}
							{releaseName && (
								<View style={[styles.infoRow, { marginTop: 10 }]}>
									<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('published_at', 'Published')}</Text>
									<Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }]}>{formatDate(publishedAt)}</Text>
								</View>
							)}
							{apkSize !== null && (
								<View style={[styles.infoRow, { marginTop: 10 }]}>
									<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('download_size', 'Download Size')}</Text>
									<Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }]}>{formatBytes(apkSize)}</Text>
								</View>
							)}
							{downloadCount !== null && (
								<View style={[styles.infoRow, { marginTop: 10 }]}>
									<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('downloads_count', 'Downloads')}</Text>
									<Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }]}>{downloadCount}</Text>
								</View>
							)}
						</View>

						{/* Release Notes */}
						{renderReleaseNotes()}

						{isDownloading ? (
							<View style={styles.progressContainer}>
								<View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 }}>
									<Text style={[styles.progressText, { color: colors.textSecondary }]}>{translate('downloading', 'Downloading')}...</Text>
									<Text style={[styles.progressText, { color: colors.primary }]}>{Math.round(downloadProgress * 100)}%</Text>
								</View>
								<View style={[styles.progressBarBg, { backgroundColor: colors.border + '40' }]}>
									<View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${downloadProgress * 100}%` }]} />
								</View>
							</View>
						) : (
							<View style={[styles.buttonGroup, { flexDirection: 'column', gap: 10 }]}>
								<View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
									{Platform.OS === 'android' && (
										<TouchableOpacity style={[styles.btn, styles.cancelBtn, { borderColor: colors.error + '40' }]} onPress={handleExitApp} activeOpacity={0.8}>
											<Text style={[styles.cancelBtnText, { color: colors.error }]}>{translate('exit', 'Exit')}</Text>
										</TouchableOpacity>
									)}
									<TouchableOpacity
										style={[styles.btn, styles.confirmBtn, { flex: Platform.OS === 'web' ? undefined : 1, width: Platform.OS === 'web' ? '100%' : undefined }]}
										onPress={isReadyToInstall && Platform.OS === 'android' ? installDownloadedUpdate : handleConfirmUpdate}
										activeOpacity={0.8}
									>
										<LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={StyleSheet.absoluteFillObject} />
										<Text style={styles.confirmBtnText}>
											{Platform.OS === 'web' ? translate('refresh', 'Refresh') : isReadyToInstall ? translate('install_now', 'Install Now') : translate('download', 'Download')}
										</Text>
									</TouchableOpacity>
								</View>

								{isReadyToInstall && Platform.OS === 'android' && (
									<TouchableOpacity
										style={[styles.btn, styles.cancelBtn, { borderColor: colors.border + '80', width: '100%' }]}
										onPress={async () => {
											const versionToDelete = pendingInstalledVersion || latestVersion
											if (versionToDelete) {
												try {
													const localUri = `${FileSystem.cacheDirectory}drinaluza-${versionToDelete}.apk`
													await FileSystem.deleteAsync(localUri, { idempotent: true })
													await AsyncStorage.removeItem('drinaluza_downloaded_update_version')
													await AsyncStorage.removeItem(`drinaluza_downloaded_update_size_${versionToDelete}`)
													setIsReadyToInstall(false)
													setPendingInstalledVersion(null)
													toast.show({ title: 'Cache Cleared', message: 'Ready to re-download update.', color: colors.primary })
													if (latestVersion) {
														await downloadAndInstallApk(latestVersion)
													} else {
														await checkForUpdates(false)
													}
												} catch (err) {
													log({ level: 'error', label: 'AppUpdater', message: 'Failed to delete ready update and redownload', error: err })
												}
											}
										}}
										activeOpacity={0.8}
									>
										<Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{translate('redownload_update', 'Delete & Re-download')}</Text>
									</TouchableOpacity>
								)}
							</View>
						)}
					</View>
				</View>
			</UpdaterContext.Provider>
		)
	}

	return (
		<UpdaterContext.Provider
			value={{
				isChecking,
				updateStatus,
				latestVersion,
				minVersion,
				serverVersion,
				destroyAppStorage,
				apkDownloadUrl,
				releaseNotes,
				isDownloading,
				downloadProgress,
				isReadyToInstall,
				installDownloadedUpdate,
				cachedApks,
				deleteCachedApk,
				loadCachedApks,
				checkForUpdates
			}}
		>
			<View style={{ flex: 1, backgroundColor: colors.background }}>
				{children}

				{/* 1a. Dual Optional Update Modal Overlay */}
				{showDualOptionalModal && (
					<Modal visible={true} transparent animationType="fade" statusBarTranslucent>
						<View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
							<View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border + '50' }]}>
								<LinearGradient colors={[colors.primary + '12', 'transparent']} style={StyleSheet.absoluteFillObject} />

								<View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
									<Ionicons name="git-merge-outline" size={32} color={colors.primary} />
								</View>

								<Text style={[styles.title, { color: colors.text, textAlign: 'center' }]}>{translate('dual_update_title', 'Multiple Updates Available')}</Text>

								<Text style={[styles.message, { color: colors.textSecondary, textAlign: 'center', marginVertical: 12 }]}>
									{translate('dual_update_msg', 'Version {pending} is ready to install, but a newer version {latest} is available to download. Choose an option:')
										.replace('{pending}', pendingInstalledVersion || '')
										.replace('{latest}', latestVersion || '')}
								</Text>

								{/* Version info chips for Dual Modal */}
								<View style={[styles.infoCard, { backgroundColor: colors.surfaceVariant, width: '100%', marginBottom: 12 }]}>
									<View style={styles.infoRow}>
										<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Ready to Install</Text>
										<View style={[styles.versionChip, { backgroundColor: colors.success + '15' }]}>
											<Text style={[styles.infoValue, { color: colors.success, fontWeight: '700' }]}>{pendingInstalledVersion}</Text>
										</View>
									</View>
									<View style={[styles.infoRow, { marginTop: 10 }]}>
										<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Latest Available</Text>
										<View style={[styles.versionChip, { backgroundColor: colors.primary + '15' }]}>
											<Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>{latestVersion}</Text>
										</View>
									</View>
									{freeDiskStorage !== null && Platform.OS !== 'web' && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('free_storage', 'Free Storage')}</Text>
											<View style={[styles.versionChip, { backgroundColor: colors.info + '15' }]}>
												<Text style={[styles.infoValue, { color: colors.info || '#3B82F6', fontWeight: '700' }]}>{formatBytes(freeDiskStorage)}</Text>
											</View>
										</View>
									)}
									{/* Release Details */}
									{releaseName && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('published_at', 'Published')}</Text>
											<Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }]}>{formatDate(publishedAt)}</Text>
										</View>
									)}
									{apkSize !== null && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('download_size', 'Download Size')}</Text>
											<Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }]}>{formatBytes(apkSize)}</Text>
										</View>
									)}
									{downloadCount !== null && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('downloads_count', 'Downloads')}</Text>
											<Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }]}>{downloadCount}</Text>
										</View>
									)}
								</View>

								{/* Release Notes */}
								{renderReleaseNotes()}

								{isDownloading ? (
									<View style={styles.progressContainer}>
										<View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 }}>
											<Text style={[styles.progressText, { color: colors.textSecondary }]}>{translate('downloading', 'Downloading')}...</Text>
											<Text style={[styles.progressText, { color: colors.primary }]}>{Math.round(downloadProgress * 100)}%</Text>
										</View>
										<View style={[styles.progressBarBg, { backgroundColor: colors.border + '40' }]}>
											<View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${downloadProgress * 100}%` }]} />
										</View>
									</View>
								) : (
									<View style={{ width: '100%', gap: 12, marginTop: 12 }}>
										<TouchableOpacity
											style={[styles.btn, styles.confirmBtn, { backgroundColor: colors.success, borderColor: colors.success, width: '100%' }]}
											onPress={async () => {
												setShowDualOptionalModal(false)
												await installDownloadedUpdate()
											}}
											activeOpacity={0.8}
										>
											<LinearGradient colors={[colors.success, colors.success + 'CC']} style={StyleSheet.absoluteFillObject} />
											<Text style={styles.confirmBtnText}>{translate('install_ready_btn', 'Install Ready (v{version})').replace('{version}', pendingInstalledVersion || '')}</Text>
										</TouchableOpacity>

										<TouchableOpacity style={[styles.btn, styles.confirmBtn, { width: '100%' }]} onPress={handleConfirmUpdate} activeOpacity={0.8}>
											<LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={StyleSheet.absoluteFillObject} />
											<Text style={styles.confirmBtnText}>{translate('download_new_btn', 'Download New (v{version})').replace('{version}', latestVersion || '')}</Text>
										</TouchableOpacity>

										<TouchableOpacity style={[styles.btn, styles.cancelBtn, { borderColor: colors.border + '80', width: '100%' }]} onPress={handleDismissOptionalUpdate} activeOpacity={0.8}>
											<Text style={[styles.cancelBtnText, { color: colors.text }]}>{translate('later', 'Later')}</Text>
										</TouchableOpacity>
									</View>
								)}
							</View>
						</View>
					</Modal>
				)}

				{/* 1b. Dual Required Update Modal Overlay */}
				{showDualRequiredModal && (
					<Modal visible={true} transparent animationType="fade" statusBarTranslucent>
						<View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
							<View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border + '50' }]}>
								<LinearGradient colors={[colors.error + '18', 'transparent']} style={StyleSheet.absoluteFillObject} />

								<View style={[styles.iconWrap, { backgroundColor: colors.error + '15' }]}>
									<Ionicons name="warning" size={32} color={colors.error} />
								</View>

								<Text style={[styles.title, { color: colors.text, textAlign: 'center' }]}>{translate('update_required', 'Update Required')}</Text>

								<Text style={[styles.message, { color: colors.textSecondary, textAlign: 'center', marginVertical: 12 }]}>
									{translate('dual_required_msg', 'A required update v{latest} is available. Please download it to continue.').replace('{latest}', latestVersion || '')}
								</Text>

								{/* Version info chips for Dual Required Modal */}
								<View style={[styles.infoCard, { backgroundColor: colors.surfaceVariant, width: '100%', marginBottom: 12 }]}>
									<View style={styles.infoRow}>
										<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Ready to Install</Text>
										<View style={[styles.versionChip, { backgroundColor: colors.success + '15' }]}>
											<Text style={[styles.infoValue, { color: colors.success, fontWeight: '700' }]}>{pendingInstalledVersion}</Text>
										</View>
									</View>
									<View style={[styles.infoRow, { marginTop: 10 }]}>
										<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Latest Available</Text>
										<View style={[styles.versionChip, { backgroundColor: colors.error + '15' }]}>
											<Text style={[styles.infoValue, { color: colors.error, fontWeight: '700' }]}>{latestVersion}</Text>
										</View>
									</View>
									{freeDiskStorage !== null && Platform.OS !== 'web' && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('free_storage', 'Free Storage')}</Text>
											<View style={[styles.versionChip, { backgroundColor: colors.info + '15' }]}>
												<Text style={[styles.infoValue, { color: colors.info || '#3B82F6', fontWeight: '700' }]}>{formatBytes(freeDiskStorage)}</Text>
											</View>
										</View>
									)}
									{/* Release Details */}
									{releaseName && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('published_at', 'Published')}</Text>
											<Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }]}>{formatDate(publishedAt)}</Text>
										</View>
									)}
									{apkSize !== null && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('download_size', 'Download Size')}</Text>
											<Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }]}>{formatBytes(apkSize)}</Text>
										</View>
									)}
									{downloadCount !== null && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('downloads_count', 'Downloads')}</Text>
											<Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }]}>{downloadCount}</Text>
										</View>
									)}
								</View>

								{/* Release Notes */}
								{renderReleaseNotes()}

								{isDownloading ? (
									<View style={styles.progressContainer}>
										<View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 }}>
											<Text style={[styles.progressText, { color: colors.textSecondary }]}>{translate('downloading', 'Downloading')}...</Text>
											<Text style={[styles.progressText, { color: colors.primary }]}>{Math.round(downloadProgress * 100)}%</Text>
										</View>
										<View style={[styles.progressBarBg, { backgroundColor: colors.border + '40' }]}>
											<View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${downloadProgress * 100}%` }]} />
										</View>
									</View>
								) : (
									<View style={{ width: '100%', gap: 12, marginTop: 12 }}>
										<TouchableOpacity style={[styles.btn, styles.confirmBtn, { width: '100%' }]} onPress={handleConfirmUpdate} activeOpacity={0.8}>
											<LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={StyleSheet.absoluteFillObject} />
											<Text style={styles.confirmBtnText}>{translate('download_new_btn', 'Download New (v{version})').replace('{version}', latestVersion || '')}</Text>
										</TouchableOpacity>

										<TouchableOpacity style={[styles.btn, styles.cancelBtn, { borderColor: colors.error + '40', width: '100%' }]} onPress={handleExitApp} activeOpacity={0.8}>
											<Text style={[styles.cancelBtnText, { color: colors.error }]}>{translate('exit', 'Exit')}</Text>
										</TouchableOpacity>
									</View>
								)}
							</View>
						</View>
					</Modal>
				)}

				{/* 2. Optional Update Modal Overlay */}
				{!(showDualOptionalModal || showDualRequiredModal) && (
					<Modal visible={showOptionalModal} transparent animationType="fade" statusBarTranslucent>
						<View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
							<View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border + '50' }]}>
								{/* Glossmorphic Ambient Top Accent */}
								<LinearGradient colors={[colors.primary + '12', 'transparent']} style={StyleSheet.absoluteFillObject} />

								<View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
									<Ionicons name="rocket-sharp" size={32} color={colors.primary} />
								</View>

								<Text style={[styles.title, { color: colors.text }]}>
									{Platform.OS === 'web' ? translate('refresh_available', 'Refresh Available') : translate('update_available', 'Update Available')}
								</Text>

								<Text style={[styles.message, { color: colors.textSecondary }]}>
									{Platform.OS === 'web'
										? translate('optional_update_msg_web', 'A new web version is available. Would you like to refresh to load the latest optimizations?')
										: translate('optional_update_msg_android', 'A new version of the application is available. Would you like to download and install it now?')}
								</Text>

								{/* Version comparison chips */}
								<View style={[styles.infoCard, { backgroundColor: colors.surfaceVariant }]}>
									<View style={styles.infoRow}>
										<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Your Version</Text>
										<View style={[styles.versionChip, { backgroundColor: colors.border + '40' }]}>
											<Text style={[styles.infoValue, { color: colors.textSecondary }]}>{APP_VERSION}</Text>
										</View>
									</View>
									<View style={[styles.infoRow, { marginTop: 10 }]}>
										<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Latest Version</Text>
										<View style={[styles.versionChip, { backgroundColor: colors.primary + '20' }]}>
											<Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>{latestVersion}</Text>
										</View>
									</View>
									{freeDiskStorage !== null && Platform.OS !== 'web' && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('free_storage', 'Free Storage')}</Text>
											<View style={[styles.versionChip, { backgroundColor: colors.primary + '15' }]}>
												<Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>{formatBytes(freeDiskStorage)}</Text>
											</View>
										</View>
									)}
									{/* Release Details */}
									{releaseName && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('published_at', 'Published')}</Text>
											<Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }]}>{formatDate(publishedAt)}</Text>
										</View>
									)}
									{apkSize !== null && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('download_size', 'Download Size')}</Text>
											<Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }]}>{formatBytes(apkSize)}</Text>
										</View>
									)}
									{downloadCount !== null && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('downloads_count', 'Downloads')}</Text>
											<Text style={[styles.infoValue, { color: colors.textSecondary, fontSize: 12, fontWeight: '600' }]}>{downloadCount}</Text>
										</View>
									)}
								</View>

								{/* Release Notes */}
								{renderReleaseNotes()}

								{isDownloading ? (
									<View style={styles.progressContainer}>
										<View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 6 }}>
											<Text style={[styles.progressText, { color: colors.textSecondary }]}>{translate('downloading', 'Downloading')}...</Text>
											<Text style={[styles.progressText, { color: colors.primary }]}>{Math.round(downloadProgress * 100)}%</Text>
										</View>
										<View style={[styles.progressBarBg, { backgroundColor: colors.border + '40' }]}>
											<View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${downloadProgress * 100}%` }]} />
										</View>
									</View>
								) : (
									<View style={styles.buttonGroup}>
										<TouchableOpacity style={[styles.btn, styles.cancelBtn, { borderColor: colors.border + '80' }]} onPress={handleDismissOptionalUpdate} activeOpacity={0.8}>
											<Text style={[styles.cancelBtnText, { color: colors.text }]}>{translate('later', 'Later')}</Text>
										</TouchableOpacity>
										<TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={handleConfirmUpdate} activeOpacity={0.8}>
											<LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={StyleSheet.absoluteFillObject} />
											<Text style={styles.confirmBtnText}>{Platform.OS === 'web' ? translate('refresh', 'Refresh') : translate('update', 'Update')}</Text>
										</TouchableOpacity>
									</View>
								)}
							</View>
						</View>
					</Modal>
				)}

				{/* 3. Startup Update Ready to Install Modal Overlay */}
				{!(showDualOptionalModal || showDualRequiredModal) && (
					<Modal visible={showReadyModal} transparent animationType="fade" statusBarTranslucent>
						<View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
							<View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border + '50' }]}>
								<LinearGradient colors={[colors.success + '12', 'transparent']} style={StyleSheet.absoluteFillObject} />

								<View style={[styles.iconWrap, { backgroundColor: colors.success + '15' }]}>
									<Ionicons name="refresh-circle-outline" size={36} color={colors.success} />
								</View>

								<Text style={[styles.title, { color: colors.text }]}>{translate('update_ready', 'Update Ready')}</Text>

								<Text style={[styles.message, { color: colors.textSecondary }]}>
									{translate('ready_update_msg_android', "A downloaded update is ready to be installed! Let's install and restart the app to enjoy the latest features.")}
								</Text>

								{/* Version chip */}
								<View style={[styles.infoCard, { backgroundColor: colors.surfaceVariant, marginBottom: 24 }]}>
									<View style={styles.infoRow}>
										<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Pending Version</Text>
										<View style={[styles.versionChip, { backgroundColor: colors.success + '20' }]}>
											<Text style={[styles.infoValue, { color: colors.success, fontWeight: '700' }]}>{pendingInstalledVersion}</Text>
										</View>
									</View>
									{freeDiskStorage !== null && Platform.OS !== 'web' && (
										<View style={[styles.infoRow, { marginTop: 10 }]}>
											<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{translate('free_storage', 'Free Storage')}</Text>
											<View style={[styles.versionChip, { backgroundColor: colors.primary + '15' }]}>
												<Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>{formatBytes(freeDiskStorage)}</Text>
											</View>
										</View>
									)}
								</View>

								<View style={styles.buttonGroup}>
									<TouchableOpacity style={[styles.btn, styles.cancelBtn, { borderColor: colors.border + '80' }]} onPress={handleDismissOptionalUpdate} activeOpacity={0.8}>
										<Text style={[styles.cancelBtnText, { color: colors.text }]}>{translate('later', 'Later')}</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.btn, styles.confirmBtn]}
										onPress={async () => {
											setShowReadyModal(false)
											await installDownloadedUpdate()
										}}
										activeOpacity={0.8}
									>
										<LinearGradient colors={[colors.success, colors.success + 'CC']} style={StyleSheet.absoluteFillObject} />
										<Text style={styles.confirmBtnText}>{translate('install_now', 'Install Now')}</Text>
									</TouchableOpacity>
								</View>
							</View>
						</View>
					</Modal>
				)}
			</View>
		</UpdaterContext.Provider>
	)
}

const styles = StyleSheet.create({
	overlay: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24
	},
	container: {
		width: '100%',
		maxWidth: 390,
		borderRadius: 28,
		borderWidth: 1.5,
		padding: 26,
		alignItems: 'center',
		overflow: 'hidden',
		...Platform.select({
			ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.2, shadowRadius: 20 },
			android: { elevation: 12 }
		})
	},
	iconWrap: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16
	},
	title: {
		fontSize: 22,
		fontWeight: '800',
		letterSpacing: -0.5,
		textAlign: 'center',
		marginBottom: 8
	},
	message: {
		fontSize: 14,
		lineHeight: 21,
		textAlign: 'center',
		marginBottom: 20,
		paddingHorizontal: 4
	},
	infoCard: {
		width: '100%',
		borderRadius: 18,
		padding: 16,
		marginBottom: 16
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	infoLabel: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	versionChip: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8
	},
	infoValue: {
		fontSize: 13,
		fontWeight: '600'
	},
	notesContainer: {
		width: '100%',
		borderRadius: 18,
		padding: 16,
		marginBottom: 24
	},
	notesTitle: {
		fontSize: 12,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 10
	},
	notesScroll: {
		maxHeight: 120,
		width: '100%'
	},
	notesScrollContent: {
		paddingRight: 4
	},
	notesHeader: {
		fontSize: 13,
		fontWeight: '700',
		marginTop: 8,
		marginBottom: 4
	},
	notesRow: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		marginTop: 6,
		paddingRight: 8
	},
	notesBullet: {
		fontSize: 14,
		fontWeight: 'bold',
		marginRight: 6,
		lineHeight: 18
	},
	notesBodyText: {
		fontSize: 13,
		lineHeight: 18,
		flex: 1
	},
	buttonGroup: {
		flexDirection: 'row',
		width: '100%',
		gap: 12
	},
	btn: {
		flex: 1,
		height: 50,
		borderRadius: 16,
		alignItems: 'center',
		justifyContent: 'center',
		overflow: 'hidden'
	},
	cancelBtn: {
		borderWidth: 1.5,
		backgroundColor: 'transparent'
	},
	cancelBtnText: {
		fontSize: 14,
		fontWeight: '700'
	},
	confirmBtn: {
		position: 'relative',
		...Platform.select({ web: { boxShadow: '0 4px 12px rgba(56,189,248,0.3)' } as any })
	},
	confirmBtnText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '700',
		zIndex: 2
	},
	progressContainer: {
		width: '100%',
		alignItems: 'center',
		marginTop: 8,
		marginBottom: 8
	},
	progressText: {
		fontSize: 13,
		fontWeight: '700'
	},
	progressBarBg: {
		width: '100%',
		height: 10,
		borderRadius: 5,
		overflow: 'hidden'
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 5
	}
})
