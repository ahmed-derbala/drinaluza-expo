import React, { useEffect, useState, useMemo } from 'react'
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert, useWindowDimensions, Linking, Share } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'
import { useRouter } from 'expo-router'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { useUpdates } from '@/features/updates'
import { SmartScreenHeader } from '@/core/smart-screen-header'
import { config } from '@/config'
import { LinearGradient } from 'expo-linear-gradient'

export default function UpdatesScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const { width } = useWindowDimensions()

	const { isChecking, latestRelease, error, downloadProgress, isDownloading, downloadedApks, deviceFreeStorage, checkForUpdates, downloadUpdate, installApk, deleteApk, refreshApkList } = useUpdates()

	const [copied, setCopied] = useState(false)

	// Refresh cache list on mount, and trigger fetch automatically on Web
	useEffect(() => {
		if (Platform.OS !== 'web') {
			refreshApkList()
		} else {
			checkForUpdates(false)
		}
	}, [refreshApkList, checkForUpdates])

	const isAndroid = Platform.OS === 'android'
	const isWeb = Platform.OS === 'web'
	const maxLayoutWidth = 620
	const isWide = width > maxLayoutWidth

	// Helper to format bytes into readable strings
	const formatBytes = (bytes: number): string => {
		if (bytes <= 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	// Helper to format date cleanly
	const formatDate = (dateStr?: string): string => {
		if (!dateStr) return ''
		try {
			const d = new Date(dateStr)
			return d.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			})
		} catch (e) {
			return dateStr
		}
	}

	// Copy to clipboard helper
	const handleCopyUrl = async () => {
		if (latestRelease?.download_url) {
			await Clipboard.setStringAsync(latestRelease.download_url)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}

	// Share download URL helper using native Share API
	const handleShareUrl = async () => {
		if (latestRelease?.download_url) {
			try {
				await Share.share({
					message: latestRelease.download_url,
					title: 'Share Drinaluza Update Link'
				})
			} catch (err) {
				console.warn('[UpdatesScreen] Sharing URL failed:', err)
			}
		}
	}

	// Share APK file helper with Advisory Dialog recommendation
	const handleShareApk = async (fileUri: string) => {
		Alert.alert('Quick Share Advisory', 'We recommend using Quick Share or Bluetooth to share this installer file quickly with nearby devices without using mobile data. Do you want to continue?', [
			{ text: translate('cancel', 'Cancel'), style: 'cancel' },
			{
				text: translate('continue', 'Continue'),
				onPress: async () => {
					try {
						if (await Sharing.isAvailableAsync()) {
							await Sharing.shareAsync(fileUri)
						} else {
							Alert.alert(translate('error', 'Error'), 'Sharing is not available on this device.')
						}
					} catch (err) {
						console.error('[UpdatesScreen] Sharing APK failed:', err)
					}
				}
			}
		])
	}

	// Version comparison: returns true if current version is equal or higher than latest release
	const isUpToDate = useMemo(() => {
		if (!latestRelease) return true
		const cur = config.app.version.split('.').map(Number)
		const lat = latestRelease.latest_version.split('.').map(Number)
		for (let i = 0; i < Math.max(cur.length, lat.length); i++) {
			const c = cur[i] || 0
			const l = lat[i] || 0
			if (c > l) return true
			if (c < l) return false
		}
		return true
	}, [latestRelease])

	// Check if there is an APK file in local cache whose version matches the latest release version
	const hasLatestApkInCache = useMemo(() => {
		if (!latestRelease) return false
		return downloadedApks.some((apk) => apk.version === latestRelease.latest_version)
	}, [latestRelease, downloadedApks])

	// Check if there is any installable APK in cache (its version is higher than APP_VERSION)
	const installableApk = useMemo(() => {
		return downloadedApks.find((apk) => apk.isInstallable)
	}, [downloadedApks])

	// Download button state
	const isDownloadDisabled = isChecking || isDownloading || !latestRelease || isUpToDate || hasLatestApkInCache

	// Install button state (enabled if there's a cached APK with version higher than APP_VERSION)
	const isInstallDisabled = !installableApk

	// Handler to launch installation of the cached installable APK
	const handleInstallPress = () => {
		if (installableApk) {
			installApk(installableApk.fileUri)
		}
	}

	// Handle instant download on web
	const handleDownloadWeb = () => {
		if (!latestRelease?.download_url) return
		const link = document.createElement('a')
		link.href = latestRelease.download_url
		link.setAttribute('download', '')
		link.style.display = 'none'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
	}

	const renderAndroidSection = () => {
		return (
			<View style={[styles.card, { borderColor: colors.borderLight }]}>
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('device_status', 'Device Status')}</Text>
				<View style={styles.metaRow}>
					<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('free_storage', 'Free Storage')}</Text>
					<Text style={[styles.metaValue, { color: colors.text }]}>{formatBytes(deviceFreeStorage)}</Text>
				</View>

				{/* Disk Space Warning */}
				{latestRelease && deviceFreeStorage < latestRelease.size * 1.5 && (
					<View style={[styles.warningBox, { backgroundColor: colors.error + '1A', borderColor: colors.error }]}>
						<Ionicons name="warning" size={16} color={colors.error} />
						<Text style={[styles.warningText, { color: colors.error }]}>{translate('low_space_warning', 'Your device is low on storage space. The download might fail.')}</Text>
					</View>
				)}
			</View>
		)
	}

	const renderEnvironmentBadge = () => {
		const nodeEnv = config.NODE_ENV.toLowerCase()
		let badgeColors: [string, string] = ['#10B981', '#059669'] // Green
		let badgeText = config.NODE_ENV.toUpperCase()

		if (nodeEnv === 'production' || nodeEnv === 'prod') {
			badgeColors = ['#EF4444', '#DC2626'] // Red
		} else if (nodeEnv === 'local' || nodeEnv === 'dev' || nodeEnv === 'development') {
			badgeColors = ['#3B82F6', '#2563EB'] // Blue
		} else if (nodeEnv === 'staging') {
			badgeColors = ['#F59E0B', '#D97706'] // Amber
		}

		return (
			<LinearGradient colors={badgeColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badgeContainer}>
				<Ionicons name="git-branch-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
				<Text style={styles.badgeText}>{badgeText}</Text>
			</LinearGradient>
		)
	}

	const renderStatusCard = () => {
		const statusText = isUpToDate ? translate('up_to_date', 'App is Up to Date') : translate('update_available', 'Update is Available')
		const statusSubtitle = isUpToDate
			? translate('running_latest', 'You are running the latest version of Drinaluza.')
			: translate('new_version_found', 'A new release is available with new features and fixes.')

		return (
			<View style={[styles.statusCard, { borderColor: isUpToDate ? 'rgba(16, 185, 129, 0.15)' : 'rgba(59, 130, 246, 0.15)' }]}>
				<View style={styles.statusRow}>
					<View style={[styles.statusIndicatorContainer, { backgroundColor: isUpToDate ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)' }]}>
						{isUpToDate ? <Ionicons name="checkmark-circle" size={40} color="#10B981" /> : <Ionicons name="cloud-download" size={40} color="#3B82F6" style={styles.pulsingIcon} />}
					</View>
					<View style={styles.statusContent}>
						<View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
							<Text style={[styles.statusTitle, { color: colors.text }]}>{statusText}</Text>
							{renderEnvironmentBadge()}
						</View>
						<Text style={[styles.statusSubtitle, { color: colors.textTertiary }]}>{statusSubtitle}</Text>
					</View>
				</View>
			</View>
		)
	}

	const renderVersionComparison = () => {
		const latestVer = latestRelease ? `v${latestRelease.latest_version}` : '—'
		return (
			<View style={styles.comparisonGrid}>
				{/* Current Version */}
				<View style={[styles.comparisonCard, { borderColor: colors.borderLight }]}>
					<Text style={[styles.comparisonLabel, { color: colors.textTertiary }]}>{translate('current_version', 'Current Version')}</Text>
					<Text style={[styles.comparisonValue, { color: colors.text }]}>v{config.app.version}</Text>
				</View>
				{/* Latest Version */}
				<View style={[styles.comparisonCard, { borderColor: colors.borderLight }]}>
					<Text style={[styles.comparisonLabel, { color: colors.textTertiary }]}>{translate('latest_version', 'Latest Version')}</Text>
					<Text style={[styles.comparisonValue, { color: isUpToDate ? colors.text : '#3B82F6', fontWeight: 'bold' }]}>{latestVer}</Text>
				</View>
			</View>
		)
	}

	const renderReleaseMetaList = () => {
		if (!latestRelease) return null
		return (
			<View style={[styles.card, { borderColor: colors.borderLight }]}>
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('release_details', 'Release Details')}</Text>
				<View style={styles.metaRow}>
					<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('published_date', 'Published Date')}</Text>
					<Text style={[styles.metaValue, { color: colors.text }]}>{formatDate(latestRelease.published_at)}</Text>
				</View>
				<View style={styles.metaDivider} />
				<View style={styles.metaRow}>
					<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('file_size', 'Download Size')}</Text>
					<Text style={[styles.metaValue, { color: colors.text }]}>{formatBytes(latestRelease.size)}</Text>
				</View>
				<View style={styles.metaDivider} />
				<View style={styles.metaRow}>
					<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('total_downloads', 'Total Downloads')}</Text>
					<Text style={[styles.metaValue, { color: colors.text }]}>{latestRelease.download_count}</Text>
				</View>
			</View>
		)
	}

	const renderWebActions = () => {
		const isUpToDateWeb = latestRelease ? isUpToDate : false
		return (
			<View style={styles.actionsContainer}>
				<TouchableOpacity
					disabled={!latestRelease || !latestRelease.download_url}
					onPress={handleDownloadWeb}
					style={[
						styles.primaryButton,
						{
							backgroundColor: !latestRelease || !latestRelease.download_url ? colors.surfaceVariant : colors.primary,
							opacity: !latestRelease || !latestRelease.download_url ? 0.6 : 1
						}
					]}
				>
					<Ionicons name="download-outline" size={20} color="#FFFFFF" />
					<Text style={styles.primaryButtonText}>{translate('download_update', 'Download Update')}</Text>
				</TouchableOpacity>

				<View style={styles.rowButtons}>
					<TouchableOpacity onPress={() => checkForUpdates(true)} disabled={isChecking} style={[styles.secondaryButton, { backgroundColor: colors.surface, flex: 1 }]}>
						{isChecking ? <ActivityIndicator size="small" color={colors.textSecondary} /> : <Ionicons name="search-outline" size={16} color={colors.textSecondary} />}
						<Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>{translate('check_for_updates', 'Check Updates')}</Text>
					</TouchableOpacity>

					<TouchableOpacity
						onPress={() => {
							if (typeof window !== 'undefined') {
								window.location.reload()
							}
						}}
						disabled={isChecking || isUpToDateWeb}
						style={[styles.secondaryButton, { backgroundColor: isUpToDateWeb ? colors.surfaceVariant : colors.surface, flex: 1, opacity: isUpToDateWeb ? 0.6 : 1 }]}
					>
						<Ionicons name="sync-outline" size={16} color={isUpToDateWeb ? colors.textTertiary : colors.textSecondary} />
						<Text style={[styles.secondaryButtonText, { color: isUpToDateWeb ? colors.textTertiary : colors.textSecondary }]}>{translate('refresh', 'Refresh')}</Text>
					</TouchableOpacity>
				</View>

				<TouchableOpacity
					disabled={!latestRelease || !latestRelease.download_url}
					onPress={handleCopyUrl}
					style={[
						styles.secondaryButton,
						{
							backgroundColor: colors.surface,
							width: '100%',
							opacity: !latestRelease || !latestRelease.download_url ? 0.6 : 1
						}
					]}
				>
					<Ionicons name={copied ? 'checkmark-circle-outline' : 'copy-outline'} size={18} color={copied ? colors.success : colors.textSecondary} />
					<Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>{copied ? translate('copied', 'Copied') : translate('copy_url', 'Copy Link to Clipboard')}</Text>
				</TouchableOpacity>
			</View>
		)
	}

	const renderNativeActions = () => {
		return (
			<View style={styles.actionsContainer}>
				{isDownloading ? (
					<View style={styles.progressContainer}>
						<View style={[styles.progressBarBg, { backgroundColor: colors.surfaceVariant }]}>
							<LinearGradient colors={[colors.primary, '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressBarFill, { width: `${Math.round(downloadProgress * 100)}%` }]} />
						</View>
						<Text style={[styles.progressText, { color: colors.textSecondary }]}>
							{translate('downloading', 'Downloading')}... {Math.round(downloadProgress * 100)}%
						</Text>
					</View>
				) : (
					<View style={styles.rowButtons}>
						<TouchableOpacity
							disabled={isDownloadDisabled}
							onPress={downloadUpdate}
							style={[
								styles.primaryButton,
								{
									backgroundColor: isDownloadDisabled ? colors.surfaceVariant : colors.primary,
									flex: 1,
									opacity: isDownloadDisabled ? 0.6 : 1
								}
							]}
						>
							<Ionicons name="cloud-download-outline" size={20} color={isDownloadDisabled ? colors.textTertiary : '#FFFFFF'} />
							<Text style={[styles.primaryButtonText, { color: isDownloadDisabled ? colors.textTertiary : '#FFFFFF' }]} numberOfLines={1}>
								{translate('download', 'Download')}
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							disabled={isInstallDisabled}
							onPress={handleInstallPress}
							style={[
								styles.primaryButton,
								{
									backgroundColor: isInstallDisabled ? colors.surfaceVariant : colors.success,
									flex: 1,
									opacity: isInstallDisabled ? 0.6 : 1
								}
							]}
						>
							<Ionicons name="rocket-outline" size={20} color={isInstallDisabled ? colors.textTertiary : '#FFFFFF'} />
							<Text style={[styles.primaryButtonText, { color: isInstallDisabled ? colors.textTertiary : '#FFFFFF' }]} numberOfLines={1}>
								{translate('install', 'Install')}
							</Text>
						</TouchableOpacity>
					</View>
				)}

				{latestRelease && (
					<View style={styles.rowButtons}>
						<TouchableOpacity onPress={handleCopyUrl} style={[styles.secondaryButton, { backgroundColor: colors.surface, flex: 1 }]}>
							<Ionicons name={copied ? 'checkmark-circle-outline' : 'copy-outline'} size={16} color={copied ? colors.success : colors.textSecondary} />
							<Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]} numberOfLines={1}>
								{copied ? translate('copied', 'Copied') : translate('copy_url', 'Copy Link')}
							</Text>
						</TouchableOpacity>

						<TouchableOpacity onPress={handleShareUrl} style={[styles.secondaryButton, { backgroundColor: colors.surface, flex: 1 }]}>
							<Ionicons name="share-social-outline" size={16} color={colors.textSecondary} />
							<Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]} numberOfLines={1}>
								{translate('share_url', 'Share Link')}
							</Text>
						</TouchableOpacity>

						<TouchableOpacity onPress={() => checkForUpdates(true)} disabled={isChecking} style={[styles.secondaryButton, { backgroundColor: colors.surface, flex: 1 }]}>
							<Ionicons name="sync-outline" size={16} color={colors.textSecondary} />
							<Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]} numberOfLines={1}>
								{translate('refresh', 'Refresh')}
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<SmartScreenHeader title={translate('updates', 'Updates')} fallbackRoute="/(home)/feed" loading={isChecking} disableAnimations={true} />

			<ScrollView contentContainerStyle={[styles.scrollContent, isWide && { maxWidth: maxLayoutWidth, alignSelf: 'center', width: '100%' }]}>
				{renderStatusCard()}

				{renderVersionComparison()}

				{isWeb ? renderWebActions() : renderNativeActions()}

				{renderReleaseMetaList()}

				{/* Free storage / space warnings on Android */}
				{isAndroid && renderAndroidSection()}

				{/* Cached APK installers list */}
				{downloadedApks.length > 0 && (
					<View style={[styles.card, { borderColor: colors.borderLight }]}>
						<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('cached_apk_files', 'Cached APK Installers')}</Text>
						<View style={styles.apkSection}>
							{downloadedApks.map((apk) => (
								<View key={apk.filename} style={[styles.apkItem, { borderColor: colors.borderLight }]}>
									<View style={styles.apkInfo}>
										<Text style={[styles.apkTitle, { color: colors.text }]} numberOfLines={1}>
											{apk.filename}
										</Text>
										<Text style={[styles.apkMeta, { color: colors.textTertiary }]}>
											v{apk.version} • {formatBytes(apk.size)}
										</Text>
									</View>
									<View style={styles.apkActions}>
										{/* Share APK Button */}
										<TouchableOpacity onPress={() => handleShareApk(apk.fileUri)} accessibilityLabel="Share APK Installer" style={[styles.apkBtn, { backgroundColor: colors.primaryContainer }]}>
											<Ionicons name="share-social-outline" size={18} color={colors.primary} />
										</TouchableOpacity>

										{/* Delete Button */}
										<TouchableOpacity onPress={() => deleteApk(apk.fileUri)} accessibilityLabel="Delete cached APK" style={[styles.apkBtn, { backgroundColor: colors.error + '1F' }]}>
											<Ionicons name="trash-outline" size={18} color={colors.error} />
										</TouchableOpacity>
									</View>
								</View>
							))}
						</View>
					</View>
				)}

				{/* Changelog section */}
				{(isWeb || (latestRelease && latestRelease.changelog !== '')) && (
					<View style={[styles.card, { borderColor: colors.borderLight }]}>
						<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('whats_new', "What's New")}</Text>
						<View style={[styles.changelogBox, { backgroundColor: colors.surface }]}>
							<Text style={[styles.changelogText, { color: colors.text }]}>
								{latestRelease && latestRelease.changelog !== '' ? latestRelease.changelog : translate('no_changelog', 'No changelog details available.')}
							</Text>
						</View>
					</View>
				)}

				{/* Error Status Box */}
				{error && (
					<View style={[styles.errorBox, { backgroundColor: colors.error + '1A', borderColor: colors.error }]}>
						<Ionicons name="alert-circle-outline" size={20} color={colors.error} />
						<Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
					</View>
				)}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 40,
		gap: 16
	},
	statusCard: {
		borderRadius: 20,
		borderWidth: 1,
		padding: 20,
		backgroundColor: '#1E293B' // Glassy slate card
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16
	},
	statusIndicatorContainer: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: 'center',
		alignItems: 'center'
	},
	statusContent: {
		flex: 1,
		gap: 4
	},
	statusTitle: {
		fontSize: 18,
		fontWeight: '700',
		letterSpacing: -0.3
	},
	statusSubtitle: {
		fontSize: 13,
		lineHeight: 18
	},
	badgeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12
	},
	badgeText: {
		color: '#FFFFFF',
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.5
	},
	comparisonGrid: {
		flexDirection: 'row',
		gap: 12
	},
	comparisonCard: {
		flex: 1,
		borderRadius: 16,
		borderWidth: 1,
		padding: 16,
		backgroundColor: '#1E293B',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 4
	},
	comparisonLabel: {
		fontSize: 11,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	comparisonValue: {
		fontSize: 22,
		fontWeight: '700',
		letterSpacing: -0.5
	},
	card: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 16,
		backgroundColor: '#1C2541' // Deep sleep slate card background
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: '600',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
		marginBottom: 12
	},
	metaRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8
	},
	metaLabel: {
		fontSize: 13,
		fontWeight: '500'
	},
	metaValue: {
		fontSize: 13,
		fontWeight: '600'
	},
	metaDivider: {
		height: 1,
		backgroundColor: 'rgba(255, 255, 255, 0.06)',
		marginVertical: 4
	},
	actionsContainer: {
		gap: 12,
		width: '100%'
	},
	rowButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		width: '100%'
	},
	primaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		height: 50,
		borderRadius: 14,
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '600'
	},
	secondaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		height: 44,
		borderRadius: 12,
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	},
	secondaryButtonText: {
		fontSize: 13,
		fontWeight: '600'
	},
	progressContainer: {
		gap: 8
	},
	progressBarBg: {
		height: 10,
		borderRadius: 5,
		overflow: 'hidden'
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 5
	},
	progressText: {
		fontSize: 12,
		textAlign: 'center',
		fontWeight: '600'
	},
	warningBox: {
		flexDirection: 'row',
		gap: 8,
		alignItems: 'center',
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		marginTop: 12
	},
	warningText: {
		fontSize: 12,
		fontWeight: '500',
		flex: 1
	},
	changelogBox: {
		borderRadius: 12,
		padding: 12,
		minHeight: 80
	},
	changelogText: {
		fontSize: 14,
		lineHeight: 20
	},
	errorBox: {
		flexDirection: 'row',
		gap: 8,
		alignItems: 'center',
		padding: 12,
		borderRadius: 12,
		borderWidth: 1
	},
	errorText: {
		fontSize: 13,
		fontWeight: '500',
		flex: 1
	},
	apkSection: {
		marginTop: 4
	},
	apkItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: 1
	},
	apkInfo: {
		flex: 1,
		marginRight: 8
	},
	apkTitle: {
		fontSize: 14,
		fontWeight: '500'
	},
	apkMeta: {
		fontSize: 12,
		marginTop: 2
	},
	apkActions: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	apkBtn: {
		width: 34,
		height: 34,
		borderRadius: 9,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	},
	pulsingIcon: {
		transform: [{ scale: 1 }]
	}
})
