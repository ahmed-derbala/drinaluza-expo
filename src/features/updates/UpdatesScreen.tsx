import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, ActivityIndicator, BackHandler, Modal, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'

import { useTheme } from '@/core/theme'
import { SmartScreenHeader } from '@/core/smart-screen-header'
import { useUpdates } from '@/core/updates/UpdatesContext'
import { APP_VERSION } from '@/config'
import { toast } from '@/features/common/Toast'

export const UpdatesScreen: React.FC = () => {
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const { status, updateInfo, updateType, cachedApk, downloadProgress, freeStorage, error, checkForUpdates, downloadUpdate, installUpdate, deleteCachedApk } = useUpdates()

	const [isCheckingManual, setIsCheckingManual] = useState(false)
	const [shareModalVisible, setShareModalVisible] = useState(false)
	const [quickShareDialogVisible, setQuickShareDialogVisible] = useState(false)

	// Block hardware back button on Android if the update is REQUIRED
	useEffect(() => {
		if (Platform.OS === 'android' && updateType === 'required') {
			const backAction = () => {
				// Block back navigation
				return true
			}
			const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction)
			return () => backHandler.remove()
		}
	}, [updateType])

	const formatSize = (bytes: number) => {
		if (!bytes) return '0 MB'
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	}

	const formatDate = (dateStr: string) => {
		if (!dateStr) return ''
		try {
			const date = new Date(dateStr)
			return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
		} catch {
			return dateStr
		}
	}

	const handleManualCheck = async () => {
		setIsCheckingManual(true)
		try {
			const res = await checkForUpdates(false)
			if (res) {
				const hasNew = updateType !== 'none'
				toast.show({
					title: hasNew ? 'Update Available' : 'Up to Date',
					message: hasNew ? `Version ${res.latest_version} is now available.` : 'You are running the latest version of Drinaluza.',
					color: hasNew ? '#0EA5E9' : '#10B981'
				})
			} else {
				toast.show({
					title: 'Check Failed',
					message: 'Unable to fetch update information. Please try again.',
					color: '#EF4444'
				})
			}
		} catch {
			// handled inside checkForUpdates
		} finally {
			setIsCheckingManual(false)
		}
	}

	const handleWebDownload = () => {
		if (updateInfo?.download_url) {
			if (Platform.OS === 'web') {
				window.open(updateInfo.download_url, '_blank')
			}
		}
	}

	const handleWebRefresh = () => {
		if (Platform.OS === 'web') {
			window.location.reload()
		}
	}

	const handleCopyUrl = async () => {
		if (updateInfo?.download_url) {
			await Clipboard.setStringAsync(updateInfo.download_url)
			toast.show({
				title: 'Copied!',
				message: 'Download link copied to clipboard.',
				color: '#10B981'
			})
		}
	}

	const handleAndroidExit = () => {
		if (Platform.OS === 'android') {
			BackHandler.exitApp()
		}
	}

	const handleSharePress = () => {
		setShareModalVisible(true)
	}

	const handleShareUrl = async () => {
		setShareModalVisible(false)
		if (!updateInfo?.download_url) return
		try {
			await Sharing.shareAsync(updateInfo.download_url)
		} catch (e) {
			toast.show({
				title: 'Share Failed',
				message: 'Could not share the download URL.',
				color: '#EF4444'
			})
		}
	}

	const handleShareApk = async () => {
		setShareModalVisible(false)
		if (!cachedApk?.localUri) return

		// Show quick share recommendation dialog first
		setQuickShareDialogVisible(true)
	}

	const triggerApkFileShare = async () => {
		setQuickShareDialogVisible(false)
		if (!cachedApk?.localUri) return
		try {
			await Sharing.shareAsync(cachedApk.localUri, {
				mimeType: 'application/vnd.android.package-archive',
				dialogTitle: 'Share Drinaluza APK File'
			})
		} catch (e) {
			toast.show({
				title: 'Share Failed',
				message: 'Could not share the APK file.',
				color: '#EF4444'
			})
		}
	}

	const isDownloading = status === 'downloading'
	const isCompleted = status === 'completed' || !!cachedApk
	const isChecking = status === 'checking' || isCheckingManual

	return (
		<View style={[styles.container, { backgroundColor: '#000000' }]}>
			<SmartScreenHeader title="Software Updates" showBackButton={updateType !== 'required'} loading={isChecking || isDownloading} />

			<ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]} showsVerticalScrollIndicator={false}>
				{/* Top status card */}
				<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.statusHeader}>
						<View style={[styles.iconCircle, { backgroundColor: colors.primaryContainer }]}>
							<Ionicons name={updateType !== 'none' ? 'cloud-download-outline' : 'checkmark-circle-outline'} size={32} color={colors.primary} />
						</View>
						<View style={styles.statusInfo}>
							<Text style={[styles.statusTitle, { color: colors.text }]}>{updateType !== 'none' ? 'Update Available' : 'App is Up to Date'}</Text>
							<Text style={[styles.versionLabel, { color: colors.textSecondary }]}>Installed Version: v{APP_VERSION}</Text>
						</View>
					</View>

					{updateType !== 'none' && updateInfo && (
						<View style={[styles.typeBadgeContainer, { borderTopColor: colors.borderLight }]}>
							<View
								style={[
									styles.badge,
									{
										backgroundColor: updateType === 'required' ? `${colors.error}20` : `${colors.warning}20`,
										borderColor: updateType === 'required' ? colors.error : colors.warning
									}
								]}
							>
								<Text style={[styles.badgeText, { color: updateType === 'required' ? colors.error : colors.warning }]}>{updateType.toUpperCase()} UPDATE</Text>
							</View>
							<Text style={[styles.messageText, { color: colors.text }]}>
								{updateType === 'required' ? 'A new update is available, please update your app to continue using it.' : 'A new update is available, you can update your app to continue using it.'}
							</Text>
						</View>
					)}
				</View>

				{/* Version details card */}
				{updateType !== 'none' && updateInfo && (
					<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<Text style={[styles.cardTitle, { color: colors.text }]}>Release Details</Text>
						<View style={styles.detailRow}>
							<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Release Name</Text>
							<Text style={[styles.detailValue, { color: colors.text }]}>{updateInfo.name}</Text>
						</View>
						<View style={[styles.detailRow, { borderTopColor: colors.borderLight }]}>
							<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Latest Version</Text>
							<Text style={[styles.detailValue, { color: colors.text }]}>v{updateInfo.latest_version}</Text>
						</View>
						<View style={[styles.detailRow, { borderTopColor: colors.borderLight }]}>
							<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Release Size</Text>
							<Text style={[styles.detailValue, { color: colors.text }]}>{formatSize(updateInfo.size)}</Text>
						</View>
						<View style={[styles.detailRow, { borderTopColor: colors.borderLight }]}>
							<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Download Count</Text>
							<Text style={[styles.detailValue, { color: colors.text }]}>{updateInfo.download_count.toLocaleString()}</Text>
						</View>
						<View style={[styles.detailRow, { borderTopColor: colors.borderLight }]}>
							<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Published Date</Text>
							<Text style={[styles.detailValue, { color: colors.text }]}>{formatDate(updateInfo.published_at)}</Text>
						</View>

						{Platform.OS === 'android' && freeStorage !== null && (
							<View style={[styles.detailRow, { borderTopColor: colors.borderLight }]}>
								<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Free Storage Size</Text>
								<Text style={[styles.detailValue, { color: freeStorage < updateInfo.size ? colors.error : colors.text }]}>{formatSize(freeStorage)}</Text>
							</View>
						)}
					</View>
				)}

				{/* Cache/Offline APK Card (Android only) */}
				{Platform.OS === 'android' && cachedApk && (
					<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<Text style={[styles.cardTitle, { color: colors.text }]}>Cached Update File</Text>
						<Text style={[styles.cachedDescription, { color: colors.textSecondary }]}>An installer package for version v{cachedApk.version} is saved locally on this device.</Text>
						<View style={styles.cachedActions}>
							<TouchableOpacity style={[styles.cachedButton, { backgroundColor: colors.primaryContainer }]} onPress={installUpdate} activeOpacity={0.8}>
								<Ionicons name="build-outline" size={18} color={colors.primary} />
								<Text style={[styles.cachedButtonText, { color: colors.primary }]}>Install APK</Text>
							</TouchableOpacity>

							<TouchableOpacity style={[styles.cachedButton, { backgroundColor: `${colors.error}15` }]} onPress={deleteCachedApk} activeOpacity={0.8}>
								<Ionicons name="trash-outline" size={18} color={colors.error} />
								<Text style={[styles.cachedButtonText, { color: colors.error }]}>Delete Cache</Text>
							</TouchableOpacity>
						</View>
					</View>
				)}

				{/* Release Notes Changelog */}
				{updateInfo && updateInfo.changelog ? (
					<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<Text style={[styles.cardTitle, { color: colors.text }]}>What's New</Text>
						<View style={[styles.changelogBox, { backgroundColor: colors.background }]}>
							<ScrollView nestedScrollEnabled style={styles.changelogScroll} showsVerticalScrollIndicator>
								<Text style={[styles.changelogText, { color: colors.textSecondary }]}>{updateInfo.changelog}</Text>
							</ScrollView>
						</View>
					</View>
				) : null}

				{/* Error display */}
				{error && (
					<View style={[styles.card, styles.errorCard, { borderColor: colors.error }]}>
						<Ionicons name="alert-circle-outline" size={24} color={colors.error} style={styles.errorIcon} />
						<Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
					</View>
				)}

				{/* Dynamic Action Buttons Section */}
				<View style={styles.actionContainer}>
					{/* Download Progress Bar */}
					{isDownloading && (
						<View style={styles.progressContainer}>
							<Text style={[styles.progressLabel, { color: colors.text }]}>Downloading Update... {Math.round(downloadProgress * 100)}%</Text>
							<View style={[styles.progressBarBg, { backgroundColor: colors.borderLight }]}>
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
						</View>
					)}

					{/* Manual Check Button */}
					{!isDownloading && !isCompleted && updateType === 'none' && (
						<TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleManualCheck} disabled={isChecking} activeOpacity={0.8}>
							{isChecking ? (
								<ActivityIndicator size="small" color="#FFFFFF" />
							) : (
								<>
									<Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
									<Text style={styles.primaryButtonText}>Check for Updates</Text>
								</>
							)}
						</TouchableOpacity>
					)}

					{/* Android Actions */}
					{Platform.OS === 'android' && updateType !== 'none' && (
						<View style={styles.buttonStack}>
							{/* Required/Optional custom block actions */}
							{updateType === 'required' && !isDownloading && !isCompleted && (
								<View style={styles.startupActions}>
									<TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary, flex: 1 }]} onPress={downloadUpdate} activeOpacity={0.8}>
										<Ionicons name="download-outline" size={20} color="#FFFFFF" />
										<Text style={styles.primaryButtonText}>Download Update</Text>
									</TouchableOpacity>

									<TouchableOpacity style={[styles.secondaryButton, { backgroundColor: '#1C2541', borderColor: colors.border, flex: 1 }]} onPress={handleAndroidExit} activeOpacity={0.8}>
										<Ionicons name="exit-outline" size={20} color={colors.text} />
										<Text style={[styles.secondaryButtonText, { color: colors.text }]}>Exit App</Text>
									</TouchableOpacity>
								</View>
							)}

							{/* Optional update prompt options */}
							{updateType === 'optional' && !isDownloading && !isCompleted && (
								<View style={styles.buttonStack}>
									<TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={downloadUpdate} activeOpacity={0.8}>
										<Ionicons name="download-outline" size={20} color="#FFFFFF" />
										<Text style={styles.primaryButtonText}>Download Newer Version</Text>
									</TouchableOpacity>
								</View>
							)}

							{/* Install trigger */}
							{isCompleted && !isDownloading && (
								<TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.success || '#10B981' }]} onPress={installUpdate} activeOpacity={0.8}>
									<Ionicons name="build-outline" size={20} color="#FFFFFF" />
									<Text style={styles.primaryButtonText}>Install Update Package</Text>
								</TouchableOpacity>
							)}

							{/* Share action */}
							{(updateInfo?.download_url || cachedApk) && (
								<TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={handleSharePress} activeOpacity={0.8}>
									<Ionicons name="share-social-outline" size={20} color={colors.primary} />
									<Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Share Update</Text>
								</TouchableOpacity>
							)}
						</View>
					)}

					{/* Web Actions */}
					{Platform.OS === 'web' && updateType !== 'none' && (
						<View style={styles.buttonStack}>
							<TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary }]} onPress={handleWebDownload} activeOpacity={0.8}>
								<Ionicons name="download-outline" size={20} color="#FFFFFF" />
								<Text style={styles.primaryButtonText}>Download Update</Text>
							</TouchableOpacity>

							<View style={styles.webRow}>
								<TouchableOpacity style={[styles.webButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleWebRefresh} activeOpacity={0.8}>
									<Ionicons name="refresh" size={18} color={colors.text} />
									<Text style={[styles.webButtonText, { color: colors.text }]}>Refresh Page</Text>
								</TouchableOpacity>

								<TouchableOpacity style={[styles.webButton, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleCopyUrl} activeOpacity={0.8}>
									<Ionicons name="copy-outline" size={18} color={colors.text} />
									<Text style={[styles.webButtonText, { color: colors.text }]}>Copy Link</Text>
								</TouchableOpacity>
							</View>
						</View>
					)}
				</View>
			</ScrollView>

			{/* Android Share Modal Options */}
			<Modal visible={shareModalVisible} transparent animationType="fade" onRequestClose={() => setShareModalVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<Text style={[styles.modalTitle, { color: colors.text }]}>Share Option</Text>
						<Text style={[styles.modalDesc, { color: colors.textSecondary }]}>Select how you would like to share this software update:</Text>

						<TouchableOpacity style={[styles.modalBtn, { borderBottomColor: colors.borderLight, borderBottomWidth: 1 }]} onPress={handleShareUrl}>
							<Ionicons name="link-outline" size={20} color={colors.primary} />
							<Text style={[styles.modalBtnText, { color: colors.text }]}>Share Download URL</Text>
						</TouchableOpacity>

						{cachedApk && (
							<TouchableOpacity style={[styles.modalBtn, { borderBottomColor: colors.borderLight, borderBottomWidth: 1 }]} onPress={handleShareApk}>
								<Ionicons name="document-attach-outline" size={20} color={colors.primary} />
								<Text style={[styles.modalBtnText, { color: colors.text }]}>Share Cached APK File</Text>
							</TouchableOpacity>
						)}

						<TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShareModalVisible(false)}>
							<Text style={[styles.modalCancelText, { color: colors.error }]}>Cancel</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>

			{/* Quick Share Recommendation Dialog */}
			<Modal visible={quickShareDialogVisible} transparent animationType="fade" onRequestClose={() => setQuickShareDialogVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={styles.alertHeader}>
							<Ionicons name="flash-outline" size={28} color={colors.warning} />
							<Text style={[styles.modalTitle, { color: colors.text, marginLeft: 8 }]}>Quick Share Recommended</Text>
						</View>
						<Text style={[styles.modalDesc, { color: colors.textSecondary, marginTop: 12 }]}>
							We recommend using **Quick Share** or **Nearby Share** on your Android device to send this APK package. It allows extremely fast and internet-free offline sharing between devices.
						</Text>

						<TouchableOpacity style={[styles.primaryButton, { backgroundColor: colors.primary, marginTop: 16 }]} onPress={triggerApkFileShare}>
							<Text style={styles.primaryButtonText}>Continue with Share</Text>
						</TouchableOpacity>

						<TouchableOpacity style={styles.modalCancelBtn} onPress={() => setQuickShareDialogVisible(false)}>
							<Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>Go Back</Text>
						</TouchableOpacity>
					</View>
				</View>
			</Modal>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scroll: {
		flex: 1
	},
	scrollContent: {
		padding: 16,
		gap: 16
	},
	card: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 16,
		...Platform.select({
			web: {
				boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
			}
		})
	},
	statusHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16
	},
	iconCircle: {
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center'
	},
	statusInfo: {
		flex: 1
	},
	statusTitle: {
		fontSize: 18,
		fontWeight: '700'
	},
	versionLabel: {
		fontSize: 14,
		marginTop: 2
	},
	typeBadgeContainer: {
		marginTop: 16,
		paddingTop: 16,
		borderTopWidth: 1,
		gap: 10
	},
	badge: {
		alignSelf: 'flex-start',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		borderWidth: 1
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.5
	},
	messageText: {
		fontSize: 14,
		lineHeight: 20
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '700',
		marginBottom: 16
	},
	detailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderTopWidth: 1
	},
	detailLabel: {
		fontSize: 14
	},
	detailValue: {
		fontSize: 14,
		fontWeight: '600'
	},
	cachedDescription: {
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 16
	},
	cachedActions: {
		flexDirection: 'row',
		gap: 12
	},
	cachedButton: {
		flex: 1,
		height: 40,
		borderRadius: 8,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8
	},
	cachedButtonText: {
		fontSize: 14,
		fontWeight: '600'
	},
	changelogBox: {
		borderRadius: 8,
		padding: 12,
		height: 220,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.05)'
	},
	changelogScroll: {
		flex: 1
	},
	changelogText: {
		fontSize: 13,
		lineHeight: 20,
		fontFamily: Platform.select({ ios: 'Courier New', android: 'monospace', default: 'monospace' })
	},
	errorCard: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 12,
		padding: 12,
		backgroundColor: 'rgba(239, 68, 68, 0.08)'
	},
	errorIcon: {
		marginRight: 8
	},
	errorText: {
		flex: 1,
		fontSize: 13
	},
	actionContainer: {
		marginTop: 8,
		gap: 16
	},
	progressContainer: {
		gap: 8
	},
	progressLabel: {
		fontSize: 14,
		fontWeight: '600'
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
	primaryButton: {
		height: 48,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		width: '100%'
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 16,
		fontWeight: '700'
	},
	secondaryButton: {
		height: 48,
		borderRadius: 12,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		width: '100%'
	},
	secondaryButtonText: {
		fontSize: 16,
		fontWeight: '600'
	},
	buttonStack: {
		gap: 12,
		width: '100%'
	},
	startupActions: {
		flexDirection: 'row',
		gap: 12,
		width: '100%'
	},
	webRow: {
		flexDirection: 'row',
		gap: 12
	},
	webButton: {
		flex: 1,
		height: 44,
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8
	},
	webButtonText: {
		fontSize: 14,
		fontWeight: '600'
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0,0,0,0.8)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24
	},
	modalCard: {
		width: '100%',
		maxWidth: 380,
		borderRadius: 16,
		borderWidth: 1,
		padding: 20
	},
	alertHeader: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700'
	},
	modalDesc: {
		fontSize: 14,
		lineHeight: 20,
		marginTop: 8,
		marginBottom: 20
	},
	modalBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		gap: 12
	},
	modalBtnText: {
		fontSize: 15,
		fontWeight: '600'
	},
	modalCancelBtn: {
		paddingVertical: 12,
		alignItems: 'center',
		marginTop: 12
	},
	modalCancelText: {
		fontSize: 15,
		fontWeight: '700'
	}
})
