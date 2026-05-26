import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, Modal, BackHandler, Linking, ActivityIndicator } from 'react-native'
import { useTheme } from '@/core/theme'
import { APP_VERSION, BACKEND_URL, NODE_ENV } from '@/config'
import { toast } from '@/features/common/Toast'
import { log } from '@/core/log'
import { useUser } from '@/core/contexts/UserContext'
import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'
import * as SplashScreen from 'expo-splash-screen'
import * as FileSystem from 'expo-file-system/legacy'
import * as IntentLauncher from 'expo-intent-launcher'

export interface AppVersionConfig {
	latest: string
	min: string
	destroyAppStorage?: boolean
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
	destroyAppStorage: boolean
	checkForUpdates: (manual?: boolean) => Promise<void>
}

const UpdaterContext = createContext<UpdaterContextType>({
	isChecking: false,
	updateStatus: 'up_to_date',
	latestVersion: null,
	minVersion: null,
	serverVersion: null,
	destroyAppStorage: false,
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

const DISMISSED_VERSION_KEY = 'drinaluza_dismissed_update_version'

export const UpdaterProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
	const theme = useTheme()
	const isDark = theme.dark
	const activeColors = theme.colors || {}

	// Robust run-time color structure with fallback tokens for navigation context limits
	const colors = {
		primary: activeColors.primary || (isDark ? '#0EA5E9' : '#0284C7'),
		background: activeColors.background || (isDark ? '#0B132B' : '#F8FAFC'),
		card: activeColors.card || (isDark ? '#1C2541' : '#FFFFFF'),
		text: activeColors.text || (isDark ? '#F8FAFC' : '#0F172A'),
		border: activeColors.border || (isDark ? '#3A506B' : '#E2E8F0'),
		notification: activeColors.notification || (isDark ? '#F43F5E' : '#E11D48'),

		// Extended custom tokens with bullet-proof fallbacks
		primaryContainer: (activeColors as any).primaryContainer || (isDark ? '#0EA5E920' : '#E0F2FE'),
		surface: (activeColors as any).surface || activeColors.card || (isDark ? '#1C2541' : '#FFFFFF'),
		surfaceVariant: (activeColors as any).surfaceVariant || (isDark ? '#3A506B30' : '#F1F5F9'),
		modalOverlay: (activeColors as any).modalOverlay || (isDark ? 'rgba(3, 7, 18, 0.75)' : 'rgba(15, 23, 42, 0.5)'),
		error: (activeColors as any).error || (isDark ? '#EF4444' : '#DC2626'),
		success: (activeColors as any).success || (isDark ? '#10B981' : '#059669'),
		warning: (activeColors as any).warning || (isDark ? '#F59E0B' : '#D97706'),
		info: (activeColors as any).info || (isDark ? '#3B82F6' : '#2563EB'),
		textSecondary: (activeColors as any).textSecondary || (isDark ? '#94A3B8' : '#475569'),
		textTertiary: (activeColors as any).textTertiary || (isDark ? '#64748B' : '#94A3B8')
	}
	const { translate } = useUser()

	const [isChecking, setIsChecking] = useState(false)
	const [updateStatus, setUpdateStatus] = useState<'up_to_date' | 'update_available' | 'update_required'>('up_to_date')
	const [latestVersion, setLatestVersion] = useState<string | null>(null)
	const [minVersion, setMinVersion] = useState<string | null>(null)
	const [serverVersion, setServerVersion] = useState<string | null>(null)
	const [destroyAppStorage, setDestroyAppStorage] = useState(false)
	const [initialLoading, setInitialLoading] = useState(true)

	const [showOptionalModal, setShowOptionalModal] = useState(false)
	const [isDownloading, setIsDownloading] = useState(false)
	const [downloadProgress, setDownloadProgress] = useState(0)

	const downloadAndInstallApk = async (version: string) => {
		const localUri = `${FileSystem.cacheDirectory}drinaluza-${version}.apk`
		try {
			setIsDownloading(true)
			setDownloadProgress(0)

			const downloadUrl = `https://github.com/ahmed-derbala/drinaluza-expo/releases/download/v${version}/drinaluza-${version}.apk`

			// Delete existing file if it exists in cache
			const fileInfo = await FileSystem.getInfoAsync(localUri)
			if (fileInfo.exists) {
				await FileSystem.deleteAsync(localUri, { idempotent: true })
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

			log({ level: 'info', label: 'AppUpdater', message: `Download complete. Launching installer for ${result.uri}` })
			toast.show({ title: 'Download Complete', message: 'Opening installer...', color: '#10B981' })

			// Convert local file path to Content URI
			const contentUri = await FileSystem.getContentUriAsync(result.uri)

			// Launch the Android installation intent
			await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
				data: contentUri,
				flags: 1 // FLAG_GRANT_READ_URI_PERMISSION
			})
		} catch (error: any) {
			console.error('AppUpdater APK download/install error:', error)

			// Clean up cached file to prevent corrupt storage states
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

				// Fallback: Try opening URL in browser if intent launch fails (e.g. permission limits)
				try {
					const downloadUrl = `https://github.com/ahmed-derbala/drinaluza-expo/releases/download/v${version}/drinaluza-${version}.apk`
					await Linking.openURL(downloadUrl)
				} catch (linkError) {
					console.error('Fallback Link failed:', linkError)
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
		}
	}

	const checkForUpdates = useCallback(
		async (manual = false) => {
			if (!BACKEND_URL) {
				log({ level: 'warn', label: 'AppUpdater', message: 'BACKEND_URL is not configured.' })
				setUpdateStatus('up_to_date')
				setInitialLoading(false)
				if (manual) {
					toast.show({ title: translate('error', 'Error'), message: 'Update server unavailable.', color: '#EF4444' })
				}
				return
			}

			try {
				setIsChecking(true)
				const url = BACKEND_URL.replace(/\/$/, '')
				const response = await axios.get(url, { timeout: 10000 })
				const data = response.data?.data as BackendResponse | undefined

				if (!data) {
					setUpdateStatus('up_to_date')
					setInitialLoading(false)
					if (manual) {
						toast.show({ title: translate('error', 'Error'), message: 'Failed to retrieve version information.', color: '#EF4444' })
					}
					return
				}

				setServerVersion(data.app.version)

				const config = Platform.OS === 'web' ? data.frontend.web.version : data.frontend.android.version
				setLatestVersion(config.latest)
				setMinVersion(config.min)
				setDestroyAppStorage(!!config.destroyAppStorage)

				const currentVersion = APP_VERSION

				// 1. Check Mandatory Minimum Version
				if (config.min && compareVersions(currentVersion, config.min) < 0) {
					setUpdateStatus('update_required')
					setShowOptionalModal(false)
					log({ level: 'info', label: 'AppUpdater', message: `Mandatory update required! Min required: ${config.min}, Active version: ${currentVersion}` })
					return
				}

				// 2. Check Optional Latest Version
				if (config.latest && compareVersions(currentVersion, config.latest) < 0) {
					setUpdateStatus('update_available')

					let isDismissed = false
					try {
						const dismissed = Platform.OS === 'web' ? localStorage.getItem(DISMISSED_VERSION_KEY) : await AsyncStorage.getItem(DISMISSED_VERSION_KEY)
						if (dismissed === config.latest) {
							isDismissed = true
						}
					} catch (e) {
						console.warn('Failed to read dismissed version:', e)
					}

					if (manual || !isDismissed) {
						setShowOptionalModal(true)
					} else {
						setShowOptionalModal(false)
					}

					log({ level: 'info', label: 'AppUpdater', message: `Optional update available! Latest: ${config.latest}, Active version: ${currentVersion}, Auto-prompt: ${!isDismissed || manual}` })
					return
				}

				// 3. Up to date
				setUpdateStatus('up_to_date')
				setShowOptionalModal(false)

				if (manual) {
					toast.show({ title: translate('up_to_date', 'Up to Date'), message: translate('already_latest', 'You are already running the latest version.'), color: '#10B981' })
				}
			} catch (error) {
				console.error('AppUpdater check failed:', error)
				// Catch network/offline errors gracefully so the app does not crash
				setUpdateStatus('up_to_date')
				setShowOptionalModal(false)
				if (manual) {
					toast.show({ title: translate('error', 'Error'), message: 'Failed to check for updates.', color: '#EF4444' })
				}
			} finally {
				setIsChecking(false)
				setInitialLoading(false)
			}
		},
		[translate]
	)

	// Automatically run updater checks on start
	useEffect(() => {
		checkForUpdates(false)
	}, [checkForUpdates])

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
			if (destroyAppStorage) {
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
				// Android: Trigger programmatic APK download and installation
				if (latestVersion) {
					await downloadAndInstallApk(latestVersion)
				}
			}
		} catch (err) {
			console.error('Failed to trigger update action:', err)
		}
	}

	const handleExitApp = () => {
		if (Platform.OS === 'android') {
			BackHandler.exitApp()
		}
	}

	const handleDismissOptionalUpdate = async () => {
		setShowOptionalModal(false)
		if (latestVersion) {
			try {
				if (Platform.OS === 'web') {
					localStorage.setItem(DISMISSED_VERSION_KEY, latestVersion)
				} else {
					await AsyncStorage.setItem(DISMISSED_VERSION_KEY, latestVersion)
				}
				log({ level: 'info', label: 'AppUpdater', message: `Optional update version ${latestVersion} dismissed by user.` })
			} catch (e) {
				console.error('Failed to save dismissed version:', e)
			}
		}
	}

	if (initialLoading) {
		return (
			<UpdaterContext.Provider value={{ isChecking, updateStatus, latestVersion, minVersion, serverVersion, destroyAppStorage, checkForUpdates }}>
				<View style={{ flex: 1, backgroundColor: colors.background }} />
			</UpdaterContext.Provider>
		)
	}

	if (updateStatus === 'update_required') {
		return (
			<UpdaterContext.Provider value={{ isChecking, updateStatus, latestVersion, minVersion, serverVersion, destroyAppStorage, checkForUpdates }}>
				<View style={[styles.overlay, { backgroundColor: colors.background, flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
					<View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
						<View style={[styles.iconWrap, { backgroundColor: colors.error + '15' }]}>
							<Text style={[styles.iconText, { color: colors.error }]}>⚠️</Text>
						</View>
						<Text style={[styles.title, { color: colors.text }]}>{translate('update_required', 'Update Required')}</Text>
						<Text style={[styles.message, { color: colors.textSecondary }]}>
							{Platform.OS === 'web'
								? translate('mandatory_update_msg_web', 'Your active web session is outdated and no longer supported. Please refresh to load the latest changes.')
								: translate('mandatory_update_msg_android', 'This version of the application is outdated and no longer supported. Please download the latest version to continue.')}
						</Text>

						<View style={[styles.infoCard, { backgroundColor: colors.surfaceVariant }]}>
							<View style={styles.infoRow}>
								<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Your Version</Text>
								<Text style={[styles.infoValue, { color: colors.error, fontWeight: '700' }]}>{APP_VERSION}</Text>
							</View>
							<View style={[styles.infoRow, { marginTop: 8 }]}>
								<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Minimum Required</Text>
								<Text style={[styles.infoValue, { color: colors.success, fontWeight: '700' }]}>{minVersion}</Text>
							</View>
						</View>

						{isDownloading ? (
							<View style={styles.progressContainer}>
								<Text style={[styles.progressText, { color: colors.textSecondary }]}>
									{translate('downloading', 'Downloading')}... {Math.round(downloadProgress * 100)}%
								</Text>
								<View style={[styles.progressBarBg, { backgroundColor: colors.surfaceVariant }]}>
									<View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${downloadProgress * 100}%` }]} />
								</View>
							</View>
						) : (
							<View style={styles.buttonGroup}>
								{Platform.OS === 'android' && (
									<TouchableOpacity style={[styles.btn, styles.cancelBtn, { borderColor: colors.error + '50' }]} onPress={handleExitApp} activeOpacity={0.8}>
										<Text style={[styles.cancelBtnText, { color: colors.error }]}>{translate('exit', 'Exit')}</Text>
									</TouchableOpacity>
								)}
								<TouchableOpacity
									style={[styles.btn, styles.confirmBtn, { backgroundColor: colors.primary, flex: Platform.OS === 'web' ? undefined : 1, width: Platform.OS === 'web' ? '100%' : undefined }]}
									onPress={handleConfirmUpdate}
									activeOpacity={0.8}
								>
									<Text style={styles.confirmBtnText}>{Platform.OS === 'web' ? translate('refresh', 'Refresh') : translate('download', 'Download')}</Text>
								</TouchableOpacity>
							</View>
						)}
					</View>
				</View>
			</UpdaterContext.Provider>
		)
	}

	return (
		<UpdaterContext.Provider value={{ isChecking, updateStatus, latestVersion, minVersion, serverVersion, destroyAppStorage, checkForUpdates }}>
			<View style={{ flex: 1, backgroundColor: colors.background }}>
				{children}

				{/* 1. Optional Update Modal Overlay */}
				<Modal visible={showOptionalModal} transparent animationType="fade" statusBarTranslucent>
					<View style={[styles.overlay, { backgroundColor: colors.modalOverlay }]}>
						<View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
							<View style={[styles.iconWrap, { backgroundColor: colors.primary + '15' }]}>
								<Text style={[styles.iconText, { color: colors.primary }]}>🚀</Text>
							</View>
							<Text style={[styles.title, { color: colors.text }]}>
								{Platform.OS === 'web' ? translate('refresh_available', 'Refresh Available') : translate('update_available', 'Update Available')}
							</Text>
							<Text style={[styles.message, { color: colors.textSecondary }]}>
								{Platform.OS === 'web'
									? translate('optional_update_msg_web', 'A new web version is available. Would you like to refresh to load the latest optimizations?')
									: translate('optional_update_msg_android', 'A new version of the application is available. Would you like to download and install it now?')}
							</Text>

							<View style={[styles.infoCard, { backgroundColor: colors.surfaceVariant }]}>
								<View style={styles.infoRow}>
									<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Your Version</Text>
									<Text style={[styles.infoValue, { color: colors.textSecondary }]}>{APP_VERSION}</Text>
								</View>
								<View style={[styles.infoRow, { marginTop: 8 }]}>
									<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>Latest Version</Text>
									<Text style={[styles.infoValue, { color: colors.primary, fontWeight: '700' }]}>{latestVersion}</Text>
								</View>
							</View>

							{isDownloading ? (
								<View style={styles.progressContainer}>
									<Text style={[styles.progressText, { color: colors.textSecondary }]}>
										{translate('downloading', 'Downloading')}... {Math.round(downloadProgress * 100)}%
									</Text>
									<View style={[styles.progressBarBg, { backgroundColor: colors.surfaceVariant }]}>
										<View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${downloadProgress * 100}%` }]} />
									</View>
								</View>
							) : (
								<View style={styles.buttonGroup}>
									<TouchableOpacity style={[styles.btn, styles.cancelBtn, { borderColor: colors.border }]} onPress={handleDismissOptionalUpdate} activeOpacity={0.8}>
										<Text style={[styles.cancelBtnText, { color: colors.text }]}>{translate('later', 'Later')}</Text>
									</TouchableOpacity>
									<TouchableOpacity style={[styles.btn, styles.confirmBtn, { backgroundColor: colors.primary }]} onPress={handleConfirmUpdate} activeOpacity={0.8}>
										<Text style={styles.confirmBtnText}>{Platform.OS === 'web' ? translate('refresh', 'Refresh') : translate('update', 'Update')}</Text>
									</TouchableOpacity>
								</View>
							)}
						</View>
					</View>
				</Modal>
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
		maxWidth: 380,
		borderRadius: 24,
		borderWidth: 1.5,
		padding: 28,
		alignItems: 'center',
		...Platform.select({
			ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 16 },
			android: { elevation: 8 }
		})
	},
	iconWrap: {
		width: 60,
		height: 60,
		borderRadius: 30,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16
	},
	iconText: {
		fontSize: 30
	},
	title: {
		fontSize: 20,
		fontWeight: '800',
		letterSpacing: -0.5,
		textAlign: 'center',
		marginBottom: 8
	},
	message: {
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center',
		marginBottom: 20
	},
	infoCard: {
		width: '100%',
		borderRadius: 16,
		padding: 16,
		marginBottom: 24
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	infoLabel: {
		fontSize: 12,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	infoValue: {
		fontSize: 14,
		fontWeight: '600'
	},
	buttonGroup: {
		flexDirection: 'row',
		width: '100%',
		gap: 12
	},
	btn: {
		flex: 1,
		height: 48,
		borderRadius: 14,
		alignItems: 'center',
		justifyContent: 'center'
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
		...Platform.select({ web: { boxShadow: '0 2px 8px rgba(56,189,248,0.25)' } as any })
	},
	confirmBtnText: {
		color: '#fff',
		fontSize: 14,
		fontWeight: '700'
	},
	progressContainer: {
		width: '100%',
		alignItems: 'center',
		marginTop: 8,
		marginBottom: 8
	},
	progressText: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 8
	},
	progressBarBg: {
		width: '100%',
		height: 8,
		borderRadius: 4,
		overflow: 'hidden'
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 4
	}
})
