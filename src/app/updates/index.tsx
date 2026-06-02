import React, { useEffect, useState, useMemo } from 'react'
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'
import { useRouter } from 'expo-router'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { useUpdates } from '@/features/updates'
import { SmartScreenHeader } from '@/core/smart-screen-header'
import { APP_VERSION } from '@/config'

export default function UpdatesScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const { width } = useWindowDimensions()

	const { isChecking, latestRelease, error, downloadProgress, isDownloading, downloadedApks, deviceFreeStorage, checkForUpdates, downloadUpdate, installApk, deleteApk, refreshApkList } = useUpdates()

	const [copied, setCopied] = useState(false)

	// Refresh cache list on mount
	useEffect(() => {
		if (Platform.OS === 'android') {
			refreshApkList()
		}
	}, [refreshApkList])

	const isAndroid = Platform.OS === 'android'
	const maxLayoutWidth = 600
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

	// Share download URL helper
	const handleShareUrl = async () => {
		if (latestRelease?.download_url) {
			try {
				if (await Sharing.isAvailableAsync()) {
					await Sharing.shareAsync(latestRelease.download_url)
				} else {
					Alert.alert(translate('error', 'Error'), 'Sharing is not available on this device.')
				}
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
		const cur = APP_VERSION.split('.').map(Number)
		const lat = latestRelease.latest_version.split('.').map(Number)
		for (let i = 0; i < Math.max(cur.length, lat.length); i++) {
			const c = cur[i] || 0
			const l = lat[i] || 0
			if (c > l) return true
			if (c < l) return false
		}
		return true
	}, [latestRelease])

	const renderAndroidSection = () => {
		return (
			<View style={styles.card}>
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('device_status', 'Device Status')}</Text>
				<View style={styles.row}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>{translate('free_storage', 'Free Storage')}</Text>
					<Text style={[styles.value, { color: colors.text }]}>{formatBytes(deviceFreeStorage)}</Text>
				</View>

				{/* Disk Space Warning */}
				{latestRelease && deviceFreeStorage < latestRelease.size * 1.5 && (
					<View style={[styles.warningBox, { backgroundColor: colors.error + '1A', borderColor: colors.error }]}>
						<Ionicons name="warning" size={16} color={colors.error} />
						<Text style={[styles.warningText, { color: colors.error }]}>{translate('low_space_warning', 'Your device is low on storage space. The download might fail.')}</Text>
					</View>
				)}

				{/* APK Files Cache List */}
				{downloadedApks.length > 0 && (
					<View style={styles.apkSection}>
						<Text style={[styles.subsectionTitle, { color: colors.textSecondary }]}>{translate('cached_apk_files', 'Cached APK Installers')}</Text>
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

									{/* Install Button */}
									<TouchableOpacity
										onPress={() => installApk(apk.fileUri)}
										disabled={!apk.isInstallable}
										accessibilityLabel="Install APK"
										style={[
											styles.apkBtn,
											{
												backgroundColor: apk.isInstallable ? colors.success + '20' : colors.surfaceVariant
											}
										]}
									>
										<Ionicons name="rocket-outline" size={18} color={apk.isInstallable ? colors.success : colors.textTertiary} />
									</TouchableOpacity>

									{/* Delete Button */}
									<TouchableOpacity onPress={() => deleteApk(apk.fileUri)} accessibilityLabel="Delete cached APK" style={[styles.apkBtn, { backgroundColor: colors.error + '1F' }]}>
										<Ionicons name="trash-outline" size={18} color={colors.error} />
									</TouchableOpacity>
								</View>
							</View>
						))}
					</View>
				)}
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			{/* Custom Responsive Header */}
			<SmartScreenHeader title={translate('updates', 'Updates')} showBackButton={true} safeArea={true} />

			<ScrollView contentContainerStyle={[styles.scrollContent, isWide && { maxWidth: maxLayoutWidth, alignSelf: 'center', width: '100%' }]}>
				{/* Top Status Banner */}
				<View style={[styles.card, { borderColor: colors.borderLight }]}>
					<View style={styles.statusHeader}>
						<View>
							<Text style={[styles.title, { color: colors.text }]}>{latestRelease ? latestRelease.name : translate('checking_updates', 'Software Updates')}</Text>
							<Text style={[styles.subtitle, { color: colors.textTertiary }]}>
								{translate('current_version', 'Current Version')}: v{APP_VERSION}
							</Text>
						</View>
						{isChecking && <ActivityIndicator size="small" color={colors.primary} />}
					</View>

					{/* Version Details */}
					{latestRelease && (
						<View style={styles.releaseMeta}>
							<View style={styles.row}>
								<Text style={[styles.label, { color: colors.textSecondary }]}>{translate('latest_version', 'Latest Version')}</Text>
								<Text style={[styles.value, { color: colors.text, fontWeight: 'bold' }]}>v{latestRelease.latest_version}</Text>
							</View>
							<View style={styles.row}>
								<Text style={[styles.label, { color: colors.textSecondary }]}>{translate('published_date', 'Published Date')}</Text>
								<Text style={[styles.value, { color: colors.text }]}>{formatDate(latestRelease.published_at)}</Text>
							</View>
							<View style={styles.row}>
								<Text style={[styles.label, { color: colors.textSecondary }]}>{translate('file_size', 'Download Size')}</Text>
								<Text style={[styles.value, { color: colors.text }]}>{formatBytes(latestRelease.size)}</Text>
							</View>
							<View style={styles.row}>
								<Text style={[styles.label, { color: colors.textSecondary }]}>{translate('download_count', 'Total Downloads')}</Text>
								<Text style={[styles.value, { color: colors.text }]}>{latestRelease.download_count}</Text>
							</View>
						</View>
					)}

					{/* Main Call to Action Button */}
					<View style={styles.actionBlock}>
						{isDownloading ? (
							<View style={styles.progressContainer}>
								<View style={[styles.progressBarBg, { backgroundColor: colors.surfaceVariant }]}>
									<View
										style={[
											styles.progressBarFill,
											{
												backgroundColor: colors.primary,
												width: `${Math.round(downloadProgress * 100)}%`
											}
										]}
									/>
								</View>
								<Text style={[styles.progressText, { color: colors.textSecondary }]}>
									{translate('downloading', 'Downloading')}... {Math.round(downloadProgress * 100)}%
								</Text>
							</View>
						) : (
							<TouchableOpacity
								disabled={isChecking || (latestRelease ? isUpToDate : false)}
								onPress={isAndroid ? downloadUpdate : undefined}
								style={[
									styles.actionButton,
									{
										backgroundColor: isChecking ? colors.surfaceVariant : latestRelease && isUpToDate ? colors.surfaceVariant : colors.primary
									}
								]}
							>
								<Ionicons name={isAndroid ? 'cloud-download-outline' : 'globe-outline'} size={20} color="#FFFFFF" />
								<Text style={styles.actionButtonText}>
									{latestRelease
										? isUpToDate
											? translate('up_to_date', 'Up to Date')
											: isAndroid
												? translate('download_update', 'Download Update')
												: translate('visit_releases', 'Open Release Page')
										: translate('check_for_updates', 'Check for Updates')}
								</Text>
							</TouchableOpacity>
						)}
					</View>

					{/* Clipboard and Share Utilities */}
					{latestRelease && (
						<View style={styles.utilitiesRow}>
							<TouchableOpacity onPress={handleCopyUrl} style={[styles.utilityBtn, { backgroundColor: colors.surface }]}>
								<Ionicons name={copied ? 'checkmark-circle-outline' : 'copy-outline'} size={18} color={copied ? colors.success : colors.textSecondary} />
								<Text style={[styles.utilityBtnText, { color: colors.textSecondary }]}>{copied ? translate('copied', 'Copied') : translate('copy_url', 'Copy Link')}</Text>
							</TouchableOpacity>

							{isAndroid && (
								<TouchableOpacity onPress={handleShareUrl} style={[styles.utilityBtn, { backgroundColor: colors.surface }]}>
									<Ionicons name="share-social-outline" size={18} color={colors.textSecondary} />
									<Text style={[styles.utilityBtnText, { color: colors.textSecondary }]}>{translate('share_url', 'Share Link')}</Text>
								</TouchableOpacity>
							)}

							<TouchableOpacity onPress={() => checkForUpdates(true)} disabled={isChecking} style={[styles.utilityBtn, { backgroundColor: colors.surface }]}>
								<Ionicons name="sync-outline" size={18} color={colors.textSecondary} />
								<Text style={[styles.utilityBtnText, { color: colors.textSecondary }]}>{translate('refresh', 'Refresh')}</Text>
							</TouchableOpacity>
						</View>
					)}
				</View>

				{/* Android cached installer and storage checker section */}
				{isAndroid && renderAndroidSection()}

				{/* Changelog (Body) Section */}
				{latestRelease && latestRelease.changelog !== '' && (
					<View style={[styles.card, { borderColor: colors.borderLight }]}>
						<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('whats_new', "What's New")}</Text>
						<View style={[styles.changelogBox, { backgroundColor: colors.surface }]}>
							<Text style={[styles.changelogText, { color: colors.text }]}>{latestRelease.changelog}</Text>
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
	card: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 16,
		backgroundColor: '#1C2541' // Sleep slate card background
	},
	statusHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16
	},
	title: {
		fontSize: 20,
		fontWeight: '700',
		letterSpacing: -0.3
	},
	subtitle: {
		fontSize: 13,
		marginTop: 4
	},
	releaseMeta: {
		marginVertical: 8,
		gap: 12
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	label: {
		fontSize: 14,
		fontWeight: '500'
	},
	value: {
		fontSize: 14,
		fontWeight: '600'
	},
	actionBlock: {
		marginTop: 20,
		width: '100%'
	},
	actionButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		height: 48,
		borderRadius: 12,
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	},
	actionButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '600'
	},
	progressContainer: {
		gap: 8
	},
	progressBarBg: {
		height: 8,
		borderRadius: 4,
		overflow: 'hidden'
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 4
	},
	progressText: {
		fontSize: 12,
		textAlign: 'center',
		fontWeight: '500'
	},
	utilitiesRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		flexWrap: 'wrap',
		gap: 8,
		marginTop: 16
	},
	utilityBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	},
	utilityBtnText: {
		fontSize: 12,
		fontWeight: '600'
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: '600',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
		marginBottom: 12
	},
	subsectionTitle: {
		fontSize: 13,
		fontWeight: '600',
		marginTop: 16,
		marginBottom: 8
	},
	warningBox: {
		flexDirection: 'row',
		gap: 8,
		alignItems: 'center',
		padding: 12,
		borderRadius: 10,
		borderWidth: 1,
		marginTop: 12
	},
	warningText: {
		fontSize: 12,
		fontWeight: '500',
		flex: 1
	},
	changelogBox: {
		borderRadius: 10,
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
		marginTop: 8
	},
	apkItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 10,
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
		gap: 6
	},
	apkBtn: {
		width: 32,
		height: 32,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	}
})
