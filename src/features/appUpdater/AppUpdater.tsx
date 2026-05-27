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
}

export interface GitHubReleaseResponse {
	tag_name: string
	assets: GitHubReleaseAsset[]
	body?: string
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

	const downloadAndInstallApk = async (version: string) => {
		const localUri = `${FileSystem.cacheDirectory}drinaluza-${version}.apk`
		try {
			setIsDownloading(true)
			setDownloadProgress(0)
			setIsReadyToInstall(false)

			const downloadUrl = apkDownloadUrl || `${UPDATE_DOWNLOAD_ROOT_URL.replace(/\/$/, '')}/v${version}/drinaluza-${version}.apk`

			// Delete ANY existing drinaluza APK files in the cache directory
			try {
				const cacheDir = FileSystem.cacheDirectory
				if (cacheDir) {
					const cacheFiles = await FileSystem.readDirectoryAsync(cacheDir)
					const oldApks = cacheFiles.filter((file) => file.startsWith('drinaluza-') && file.endsWith('.apk'))

					for (const oldApk of oldApks) {
						await FileSystem.deleteAsync(`${cacheDir}${oldApk}`, { idempotent: true })
					}
				}
			} catch (cleanError) {
				log({ level: 'warn', label: 'AppUpdater', message: 'Failed to scrub old APKs from cache', error: cleanError })
			}

			log({ level: 'info', label: 'AppUpdater', message: `Starting download: ${downloadUrl} -> ${localUri}` })

			const downloadResumable = FileSystem.createDownloadResumable(downloadUrl, localUri, {}, (progressData) => {
				if (progressData.totalBytesExpectedToWrite > 0) {
					const progress = progressData.totalBytesWritten / progressData.totalBytesExpectedToWrite
					setDownloadProgress(progress)
				}
			})

			const result = await downloadResumable.downloadAsync()

			if (!result || !result.uri) {
				const err = new Error('Download failed: empty download result.')
				;(err as any).isDownloadError = true
				throw err
			}

			// Validate HTTP Status Code (e.g. reject 404, 500, etc.)
			if (result.status && (result.status < 200 || result.status >= 300)) {
				const err = new Error(`Download failed with HTTP status ${result.status}`)
				;(err as any).isDownloadError = true
				throw err
			}

			log({ level: 'info', label: 'AppUpdater', message: `Download complete. Saving downloaded version state for v${version}` })

			await AsyncStorage.setItem('drinaluza_downloaded_update_version', version)
			setIsReadyToInstall(true)

			if (updateStatus === 'update_required') {
				toast.show({ title: 'Download Complete', message: 'Opening installer...', color: '#10B981' })
				const contentUri = await FileSystem.getContentUriAsync(result.uri)
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
			log({ level: 'error', label: 'AppUpdater', message: 'APK download/install error', error })

			try {
				await FileSystem.deleteAsync(localUri, { idempotent: true })
			} catch (deleteError) {
				// Silently catch
			}

			if (error.isDownloadError || error.message?.includes('Download failed') || error.message?.includes('HTTP')) {
				log({ level: 'error', label: 'AppUpdater', message: 'APK download failed or returned non-2xx status code.', error })
				toast.show({
					title: translate('error', 'Error'),
					message: 'Update server error or link broken. Please try again later.',
					color: '#EF4444'
				})
			} else {
				log({ level: 'error', label: 'AppUpdater', message: 'Programmatic installation failed, trying browser fallback.', error })

				try {
					const downloadUrl = apkDownloadUrl || `${UPDATE_DOWNLOAD_ROOT_URL.replace(/\/$/, '')}/v${version}/drinaluza-${version}.apk`
					await Linking.openURL(downloadUrl)
				} catch (linkError) {
					log({ level: 'error', label: 'AppUpdater', message: 'Fallback link open failed', error: linkError })
				}

				toast.show({
					title: translate('error', 'Error'),
					message: 'Failed to launch installer. Downloading via browser instead.',
					color: '#EF4444'
				})
			}
		} finally {
			setIsDownloading(false)
			setDownloadProgress(0)
			await loadCachedApks()
		}
	}

	const checkForUpdates = useCallback(
		async (manual = false) => {
			try {
				setIsChecking(true)
				if (manual) {
					toast.show({ title: translate('checking_for_updates', 'Checking for updates...'), message: '', color: colors.primary })
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

				if (githubData.body) {
					setReleaseNotes(githubData.body)
				} else {
					setReleaseNotes(null)
				}

				setLatestVersion(cleanTag)
				setApkDownloadUrl(downloadUrl)

				const currentVersion = APP_VERSION
				const updateType = getUpdateType(currentVersion, cleanTag)

				// 1. Check Required Update (different MAJOR or same MAJOR with higher MINOR)
				if (updateType === 'required') {
					setUpdateStatus('update_required')
					setMinVersion(cleanTag)
					setShowOptionalModal(false)

					if (Platform.OS === 'android') {
						const localUri = `${FileSystem.cacheDirectory}drinaluza-${cleanTag}.apk`
						const fileInfo = await FileSystem.getInfoAsync(localUri)
						if (fileInfo.exists) {
							setIsReadyToInstall(true)
							setPendingInstalledVersion(cleanTag)
							setLatestVersion(cleanTag)
							log({ level: 'info', label: 'AppUpdater', message: `Check updates: Required update v${cleanTag} is already downloaded. Installing immediately without confirmation.` })
							try {
								const contentUri = await FileSystem.getContentUriAsync(localUri)
								await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
									data: contentUri,
									flags: 1 // FLAG_GRANT_READ_URI_PERMISSION
								})
							} catch (installErr) {
								log({ level: 'error', label: 'AppUpdater', message: 'Failed immediate required update installation from check updates', error: installErr })
							}
							return
						}
					}

					log({ level: 'info', label: 'AppUpdater', message: `Required update available! Latest: ${cleanTag}, Active version: ${currentVersion}` })
					return
				}

				// 2. Check Optional Update (higher PATCH version only)
				if (updateType === 'optional') {
					setUpdateStatus('update_available')

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

				if (manual) {
					toast.show({ title: translate('up_to_date', 'Up to Date'), message: translate('already_latest', 'You are already running the latest version.'), color: '#10B981' })
				}
			} catch (error) {
				log({ level: 'error', label: 'AppUpdater', message: 'AppUpdater check failed', error: error })
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
		const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
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
				const pendingVersion = await AsyncStorage.getItem('drinaluza_downloaded_update_version')
				if (pendingVersion) {
					if (compareVersions(pendingVersion, APP_VERSION) > 0) {
						const localUri = `${FileSystem.cacheDirectory}drinaluza-${pendingVersion}.apk`
						const fileInfo = await FileSystem.getInfoAsync(localUri)
						if (fileInfo.exists) {
							setIsReadyToInstall(true)
							setPendingInstalledVersion(pendingVersion)
							setLatestVersion(pendingVersion)

							const updateType = getUpdateType(APP_VERSION, pendingVersion)
							if (updateType === 'required') {
								setUpdateStatus('update_required')
								setMinVersion(pendingVersion)
								log({ level: 'info', label: 'AppUpdater', message: `Startup check: Required update v${pendingVersion} is already downloaded. Installing immediately without confirmation.` })
								try {
									const contentUri = await FileSystem.getContentUriAsync(localUri)
									await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
										data: contentUri,
										flags: 1 // FLAG_GRANT_READ_URI_PERMISSION
									})
								} catch (installErr) {
									log({ level: 'error', label: 'AppUpdater', message: 'Failed immediate required update installation from startup', error: installErr })
								}
							} else {
								setUpdateStatus('update_available')
								setShowReadyModal(true)
							}
							log({ level: 'info', label: 'AppUpdater', message: `Startup check: Pending update v${pendingVersion} is ready to install (type: ${updateType}).` })
						} else {
							await AsyncStorage.removeItem('drinaluza_downloaded_update_version')
						}
					} else {
						await AsyncStorage.removeItem('drinaluza_downloaded_update_version')
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
		if (latestVersion) {
			try {
				if (Platform.OS === 'web') {
					localStorage.setItem(DISMISSED_VERSION_KEY, latestVersion)
				} else {
					await AsyncStorage.setItem(DISMISSED_VERSION_KEY, latestVersion)
				}
				log({ level: 'info', label: 'AppUpdater', message: `Optional update version ${latestVersion} dismissed by user.` })
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
								{Platform.OS === 'android' && (
									<TouchableOpacity style={[styles.btn, styles.cancelBtn, { borderColor: colors.error + '40' }]} onPress={handleExitApp} activeOpacity={0.8}>
										<Text style={[styles.cancelBtnText, { color: colors.error }]}>{translate('exit', 'Exit')}</Text>
									</TouchableOpacity>
								)}
								<TouchableOpacity
									style={[styles.btn, styles.confirmBtn, { flex: Platform.OS === 'web' ? undefined : 1, width: Platform.OS === 'web' ? '100%' : undefined }]}
									onPress={handleConfirmUpdate}
									activeOpacity={0.8}
								>
									<LinearGradient colors={[colors.primary, colors.primary + 'CC']} style={StyleSheet.absoluteFillObject} />
									<Text style={styles.confirmBtnText}>{Platform.OS === 'web' ? translate('refresh', 'Refresh') : translate('download', 'Download')}</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				</View>
			</UpdaterContext.Provider>
		)
	}

	const isDualUpdateAvailable = isReadyToInstall && pendingInstalledVersion !== null && latestVersion !== null && compareVersions(latestVersion, pendingInstalledVersion) > 0

	const showDualModal = showReadyModal && showOptionalModal && isDualUpdateAvailable

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

				{/* 1. Dual Update Modal Overlay (One modal only when both conditions are met) */}
				{showDualModal && (
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

								<View style={{ width: '100%', gap: 12, marginTop: 12 }}>
									<TouchableOpacity
										style={[styles.btn, styles.confirmBtn, { backgroundColor: colors.success, borderColor: colors.success, width: '100%' }]}
										onPress={async () => {
											setShowReadyModal(false)
											setShowOptionalModal(false)
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
							</View>
						</View>
					</Modal>
				)}

				{/* 2. Optional Update Modal Overlay */}
				{!showDualModal && (
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
				{!showDualModal && (
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
								</View>

								<View style={styles.buttonGroup}>
									<TouchableOpacity style={[styles.btn, styles.cancelBtn, { borderColor: colors.border + '80' }]} onPress={() => setShowReadyModal(false)} activeOpacity={0.8}>
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
