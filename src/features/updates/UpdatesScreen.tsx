import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Modal, Dimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import * as Clipboard from 'expo-clipboard'
import { useUpdates } from '@/core/updates/UpdatesContext'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { APP_VERSION } from '@/config'
import { SmartScreenHeader } from '@/core/smart-screen-header/SmartScreenHeader'
import { toast } from '@/features/common/Toast'
import { compareVersions } from '@/core/updates/UpdatesContext'

const { width } = Dimensions.get('window')

export const UpdatesScreen: React.FC = () => {
	const { colors } = useTheme()
	const { status, downloadProgress, updateInfo, downloadedApks, cachedApk, checkForUpdates, downloadUpdate, installApk, deleteApk } = useUpdates()

	const [freeStorage, setFreeStorage] = useState<number | null>(null)
	const [showShareModal, setShowShareModal] = useState(false)
	const [showQuickShareInfo, setShowQuickShareInfo] = useState(false)

	const isAndroid = Platform.OS === 'android'

	useEffect(() => {
		if (isAndroid) {
			FileSystem.getFreeDiskStorageAsync()
				.then((bytes) => setFreeStorage(bytes))
				.catch(() => {})
		}
	}, [isAndroid])

	const formatBytes = (bytes?: number) => {
		if (!bytes) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	const formatDate = (isoStr?: string) => {
		if (!isoStr) return ''
		try {
			const d = new Date(isoStr)
			return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
		} catch {
			return isoStr
		}
	}

	const handleCheckForUpdates = async () => {
		const info = await checkForUpdates()
		if (info) {
			const hasNew = compareVersions(info.latest_version, APP_VERSION) > 0
			if (!hasNew) {
				toast.show({
					title: translate('success', 'Success'),
					message: translate('updates_up_to_date', 'Your app is up to date!'),
					color: colors.success || '#10B981'
				})
			}
		} else {
			toast.show({
				title: translate('error', 'Error'),
				message: translate('unknown_error_message', 'An unexpected error occurred.'),
				color: colors.error || '#EF4444'
			})
		}
	}

	const handleShare = async () => {
		if (isAndroid) {
			setShowShareModal(true)
		} else {
			// Web copy download URL
			if (updateInfo?.download_url) {
				await Clipboard.setStringAsync(updateInfo.download_url)
				toast.show({
					title: translate('success', 'Success'),
					message: translate('updates_share_toast', 'Download link copied to clipboard!'),
					color: colors.primary || '#0EA5E9'
				})
			}
		}
	}

	const shareApk = async () => {
		if (!cachedApk) return
		setShowShareModal(false)
		setShowQuickShareInfo(true)
	}

	const proceedWithApkShare = async () => {
		if (!cachedApk) return
		setShowQuickShareInfo(false)
		try {
			if (await Sharing.isAvailableAsync()) {
				await Sharing.shareAsync(cachedApk.uri)
			}
		} catch {}
	}

	const shareUrlOnly = async () => {
		setShowShareModal(false)
		if (updateInfo?.download_url) {
			await Clipboard.setStringAsync(updateInfo.download_url)
			toast.show({
				title: translate('success', 'Success'),
				message: translate('updates_share_toast', 'Download link copied to clipboard!'),
				color: colors.primary || '#0EA5E9'
			})
		}
	}

	const hasUpdate = updateInfo ? compareVersions(updateInfo.latest_version, APP_VERSION) > 0 : false

	return (
		<View style={[styles.container, { backgroundColor: '#000000' }]}>
			<SmartScreenHeader title={translate('updates_title', 'App Updates')} showBackButton={true} />

			<ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
				{/* Top Hero Card */}
				<View style={[styles.heroCard, { backgroundColor: colors.card || '#1C2541', borderColor: colors.border || '#3A506B' }]}>
					<View style={styles.heroHeader}>
						<Ionicons name={hasUpdate ? 'arrow-down-circle-outline' : 'checkmark-circle-outline'} size={44} color={hasUpdate ? colors.primary || '#0EA5E9' : colors.success || '#10B981'} />
						<View style={styles.heroHeaderTexts}>
							<Text style={[styles.heroTitle, { color: colors.text }]}>
								{hasUpdate ? translate('updates_new_available', 'A new version is available!') : translate('updates_up_to_date', 'Your app is up to date!')}
							</Text>
							<Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Drinaluza Business Manager</Text>
						</View>
					</View>

					{/* Version comparison row */}
					<View style={[styles.versionRow, { borderTopColor: colors.borderLight || '#1E293B' }]}>
						<View style={styles.versionCol}>
							<Text style={[styles.versionLabel, { color: colors.textTertiary }]}>{translate('updates_current_version', 'Current Version')}</Text>
							<Text style={[styles.versionValue, { color: colors.text }]}>{APP_VERSION}</Text>
						</View>
						<View style={[styles.versionDivider, { backgroundColor: colors.borderLight || '#1E293B' }]} />
						<View style={styles.versionCol}>
							<Text style={[styles.versionLabel, { color: colors.textTertiary }]}>{translate('updates_latest_version', 'Latest Version')}</Text>
							<Text style={[styles.versionValue, { color: colors.text }]}>{updateInfo ? updateInfo.latest_version : '--'}</Text>
						</View>
					</View>
				</View>

				{/* Primary Platform Controls */}
				<View style={styles.controlsRow}>
					<Pressable
						onPress={handleCheckForUpdates}
						disabled={status === 'checking'}
						style={({ pressed }) => [
							styles.button,
							{
								backgroundColor: colors.borderLight || '#1E293B',
								borderColor: colors.border || '#3A506B',
								opacity: pressed || status === 'checking' ? 0.7 : 1
							}
						]}
					>
						{status === 'checking' ? (
							<ActivityIndicator size="small" color={colors.primary} />
						) : (
							<>
								<Ionicons name="refresh" size={20} color={colors.primary} />
								<Text style={[styles.buttonText, { color: colors.text }]}>{translate('updates_check_btn', 'Check for Updates')}</Text>
							</>
						)}
					</Pressable>

					{updateInfo && (
						<Pressable
							onPress={handleShare}
							style={({ pressed }) => [
								styles.button,
								{
									backgroundColor: colors.borderLight || '#1E293B',
									borderColor: colors.border || '#3A506B',
									opacity: pressed ? 0.7 : 1
								}
							]}
						>
							<Ionicons name="share-social-outline" size={20} color={colors.primary} />
							<Text style={[styles.buttonText, { color: colors.text }]}>{translate('updates_share_title', 'Share Update')}</Text>
						</Pressable>
					)}
				</View>

				{/* Update Information Details Card */}
				{updateInfo && (
					<View style={[styles.infoCard, { backgroundColor: colors.card || '#1C2541', borderColor: colors.border || '#3A506B' }]}>
						{updateInfo.name && (
							<View style={styles.infoRow}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Release Name</Text>
								<Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
									{updateInfo.name}
								</Text>
							</View>
						)}

						{updateInfo.published_at && (
							<View style={styles.infoRow}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('updates_published_date', 'Published Date')}</Text>
								<Text style={[styles.infoValue, { color: colors.text }]}>{formatDate(updateInfo.published_at)}</Text>
							</View>
						)}

						<View style={styles.infoRow}>
							<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('updates_file_size', 'File Size')}</Text>
							<Text style={[styles.infoValue, { color: colors.text }]}>{formatBytes(updateInfo.size)}</Text>
						</View>

						{isAndroid && freeStorage !== null && (
							<View style={styles.infoRow}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('updates_free_storage', 'Free Storage')}</Text>
								<Text style={[styles.infoValue, { color: colors.text }]}>{formatBytes(freeStorage)}</Text>
							</View>
						)}

						<View style={styles.infoRow}>
							<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('updates_download_count', 'Downloads')}</Text>
							<Text style={[styles.infoValue, { color: colors.text }]}>{updateInfo.download_count}</Text>
						</View>
					</View>
				)}

				{/* What's New Collapsible / Scrollable panel */}
				{updateInfo?.changelog && (
					<View style={[styles.changelogCard, { backgroundColor: colors.card || '#1C2541', borderColor: colors.border || '#3A506B' }]}>
						<Text style={[styles.changelogTitle, { color: colors.text }]}>{translate('updates_whats_new', "What's New")}</Text>
						<Text style={[styles.changelogBody, { color: colors.textSecondary }]}>{updateInfo.changelog}</Text>
					</View>
				)}

				{/* Main Action Action (Download / Install) */}
				{updateInfo && (
					<View style={styles.primaryActionContainer}>
						{status === 'downloading' ? (
							<View style={styles.downloadProgressContainer}>
								<View style={[styles.progressBarTrack, { backgroundColor: colors.borderLight || '#1E293B' }]}>
									<View
										style={[
											styles.progressBarFill,
											{
												backgroundColor: colors.primary || '#0EA5E9',
												width: `${Math.round(downloadProgress * 100)}%`
											}
										]}
									/>
								</View>
								<Text style={[styles.progressText, { color: colors.textSecondary }]}>
									{translate('updates_downloading', 'Downloading update...')} ({Math.round(downloadProgress * 100)}%)
								</Text>
							</View>
						) : (
							isAndroid && (
								<Pressable
									onPress={downloadUpdate}
									disabled={!hasUpdate && !cachedApk}
									style={({ pressed }) => [
										styles.primaryButton,
										{
											backgroundColor: hasUpdate || cachedApk ? colors.primary || '#0EA5E9' : colors.borderLight || '#1E293B',
											opacity: pressed || (!hasUpdate && !cachedApk) ? 0.7 : 1
										}
									]}
								>
									<Ionicons name={cachedApk ? 'checkmark-circle' : 'cloud-download-outline'} size={20} color="#FFFFFF" />
									<Text style={styles.primaryButtonText}>{cachedApk ? translate('updates_install_btn', 'Install') : translate('updates_download_btn', 'Download Update')}</Text>
								</Pressable>
							)
						)}
					</View>
				)}

				{/* List of downloaded APK files details (Android only) */}
				{isAndroid && (
					<View style={styles.downloadsSection}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('downloads', 'Downloads')}</Text>

						{downloadedApks.length === 0 ? (
							<View style={[styles.emptyContainer, { backgroundColor: colors.card || '#1C2541', borderColor: colors.border || '#3A506B' }]}>
								<Ionicons name="folder-open-outline" size={28} color={colors.textTertiary} />
								<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('updates_no_downloaded', 'No downloaded updates found.')}</Text>
							</View>
						) : (
							downloadedApks.map((apk) => (
								<View
									key={apk.uri}
									style={[
										styles.apkCard,
										{
											backgroundColor: colors.card || '#1C2541',
											borderColor: colors.border || '#3A506B'
										}
									]}
								>
									<View style={styles.apkLeft}>
										<Ionicons name="document-text-outline" size={24} color={colors.primary} />
										<View style={styles.apkTexts}>
											<Text style={[styles.apkName, { color: colors.text }]} numberOfLines={1}>
												{apk.name}
											</Text>
											<Text style={[styles.apkDetails, { color: colors.textSecondary }]}>
												Version: {apk.version} • {formatBytes(apk.size)}
											</Text>
										</View>
									</View>

									<View style={styles.apkActions}>
										<Pressable
											onPress={() => deleteApk(apk.uri)}
											style={({ pressed }) => [
												styles.apkActionBtn,
												{
													backgroundColor: 'rgba(239, 68, 68, 0.1)',
													opacity: pressed ? 0.6 : 1
												}
											]}
										>
											<Ionicons name="trash-outline" size={16} color={colors.error || '#EF4444'} />
										</Pressable>

										<Pressable
											onPress={() => installApk(apk.uri)}
											style={({ pressed }) => [
												styles.apkActionBtn,
												{
													backgroundColor: 'rgba(16, 185, 129, 0.1)',
													opacity: pressed ? 0.6 : 1
												}
											]}
										>
											<Ionicons name="checkmark-circle-outline" size={16} color={colors.success || '#10B981'} />
										</Pressable>
									</View>
								</View>
							))
						)}
					</View>
				)}
			</ScrollView>

			{/* Android Sharing Choice Modal */}
			<Modal visible={showShareModal} transparent={true} animationType="fade" onRequestClose={() => setShowShareModal(false)}>
				<Pressable style={styles.modalOverlay} onPress={() => setShowShareModal(false)}>
					<View
						style={[
							styles.modalContent,
							{
								backgroundColor: colors.card || '#1C2541',
								borderColor: colors.border || '#3A506B'
							}
						]}
					>
						<Text style={[styles.modalTitle, { color: colors.text }]}>{translate('updates_share_title', 'Share Update')}</Text>
						<Text style={[styles.modalPrompt, { color: colors.textSecondary }]}>{translate('updates_share_prompt', 'How would you like to share the update?')}</Text>

						<Pressable
							onPress={shareUrlOnly}
							style={({ pressed }) => [
								styles.modalBtn,
								{
									backgroundColor: colors.borderLight || '#1E293B',
									opacity: pressed ? 0.8 : 1
								}
							]}
						>
							<Ionicons name="copy-outline" size={20} color={colors.primary} />
							<Text style={[styles.modalBtnText, { color: colors.text }]}>{translate('updates_share_url', 'Share Download URL')}</Text>
						</Pressable>

						{cachedApk && (
							<Pressable
								onPress={shareApk}
								style={({ pressed }) => [
									styles.modalBtn,
									{
										backgroundColor: colors.borderLight || '#1E293B',
										opacity: pressed ? 0.8 : 1
									}
								]}
							>
								<Ionicons name="logo-android" size={20} color={colors.success || '#10B981'} />
								<Text style={[styles.modalBtnText, { color: colors.text }]}>{translate('updates_share_apk', 'Share APK File')}</Text>
							</Pressable>
						)}

						<Pressable onPress={() => setShowShareModal(false)} style={({ pressed }) => [styles.modalCancelBtn, { opacity: pressed ? 0.6 : 1 }]}>
							<Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{translate('cancel', 'Cancel')}</Text>
						</Pressable>
					</View>
				</Pressable>
			</Modal>

			{/* Android Quick Share Alert Info Modal */}
			<Modal visible={showQuickShareInfo} transparent={true} animationType="fade" onRequestClose={() => setShowQuickShareInfo(false)}>
				<Pressable style={styles.modalOverlay} onPress={() => setShowQuickShareInfo(false)}>
					<View
						style={[
							styles.modalContent,
							{
								backgroundColor: colors.card || '#1C2541',
								borderColor: colors.border || '#3A506B'
							}
						]}
					>
						<Ionicons name="flash-outline" size={36} color={colors.warning || '#F59E0B'} style={{ marginBottom: 12 }} />
						<Text style={[styles.modalTitle, { color: colors.text }]}>{translate('updates_quick_share_title', 'Fast Sharing')}</Text>
						<Text style={[styles.modalPrompt, { color: colors.textSecondary, textAlign: 'center', lineHeight: 18 }]}>
							{translate('updates_quick_share_desc', 'We recommend using Quick Share or Wi-Fi Direct for faster local transfers to other devices.')}
						</Text>

						<Pressable
							onPress={proceedWithApkShare}
							style={({ pressed }) => [
								styles.modalBtn,
								{
									backgroundColor: colors.primary || '#0EA5E9',
									opacity: pressed ? 0.8 : 1,
									marginTop: 16
								}
							]}
						>
							<Text style={{ color: '#FFFFFF', fontWeight: '700' }}>{translate('continue', 'Continue')}</Text>
						</Pressable>

						<Pressable onPress={() => setShowQuickShareInfo(false)} style={({ pressed }) => [styles.modalCancelBtn, { opacity: pressed ? 0.6 : 1 }]}>
							<Text style={{ color: colors.textSecondary, fontWeight: '600' }}>{translate('cancel', 'Cancel')}</Text>
						</Pressable>
					</View>
				</Pressable>
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
		paddingBottom: 40
	},
	heroCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 20,
		marginBottom: 16
	},
	heroHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16
	},
	heroHeaderTexts: {
		flex: 1
	},
	heroTitle: {
		fontSize: 16,
		fontWeight: '700',
		lineHeight: 20
	},
	heroSubtitle: {
		fontSize: 12,
		marginTop: 4
	},
	versionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		borderTopWidth: 1,
		paddingTop: 16,
		marginTop: 16
	},
	versionCol: {
		flex: 1,
		alignItems: 'center'
	},
	versionLabel: {
		fontSize: 11,
		fontWeight: '500',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	versionValue: {
		fontSize: 16,
		fontWeight: '700',
		marginTop: 4
	},
	versionDivider: {
		width: 1,
		height: 32
	},
	controlsRow: {
		flexDirection: 'row',
		gap: 12,
		marginBottom: 16
	},
	button: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		height: 48,
		borderRadius: 12,
		borderWidth: 1
	},
	buttonText: {
		fontSize: 14,
		fontWeight: '600'
	},
	infoCard: {
		borderRadius: 16,
		borderWidth: 1,
		paddingHorizontal: 16,
		paddingVertical: 8,
		marginBottom: 16
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 10,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: 'rgba(255, 255, 255, 0.05)'
	},
	infoLabel: {
		fontSize: 13,
		fontWeight: '500'
	},
	infoValue: {
		fontSize: 13,
		fontWeight: '600',
		maxWidth: '60%'
	},
	changelogCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 16,
		marginBottom: 16
	},
	changelogTitle: {
		fontSize: 14,
		fontWeight: '700',
		marginBottom: 8
	},
	changelogBody: {
		fontSize: 13,
		lineHeight: 18
	},
	primaryActionContainer: {
		marginBottom: 24
	},
	primaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		height: 52,
		borderRadius: 12
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '700'
	},
	downloadProgressContainer: {
		width: '100%',
		alignItems: 'center'
	},
	progressBarTrack: {
		width: '100%',
		height: 8,
		borderRadius: 4,
		overflow: 'hidden',
		marginBottom: 8
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 4
	},
	progressText: {
		fontSize: 12,
		fontWeight: '500'
	},
	downloadsSection: {
		marginTop: 8
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: '700',
		marginBottom: 12
	},
	emptyContainer: {
		borderRadius: 16,
		borderWidth: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 28,
		gap: 8
	},
	emptyText: {
		fontSize: 13,
		fontWeight: '500'
	},
	apkCard: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 12,
		borderWidth: 1,
		padding: 12,
		marginBottom: 8
	},
	apkLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 12
	},
	apkTexts: {
		flex: 1
	},
	apkName: {
		fontSize: 13,
		fontWeight: '600'
	},
	apkDetails: {
		fontSize: 11,
		marginTop: 2
	},
	apkActions: {
		flexDirection: 'row',
		gap: 8
	},
	apkActionBtn: {
		width: 32,
		height: 32,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center'
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(3, 7, 18, 0.75)',
		alignItems: 'center',
		justifyContent: 'center',
		padding: 20
	},
	modalContent: {
		width: width - 40,
		maxWidth: 340,
		borderRadius: 16,
		borderWidth: 1,
		padding: 20,
		alignItems: 'center'
	},
	modalTitle: {
		fontSize: 16,
		fontWeight: '700',
		marginBottom: 8
	},
	modalPrompt: {
		fontSize: 13,
		marginBottom: 16,
		textAlign: 'center'
	},
	modalBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		width: '100%',
		height: 48,
		borderRadius: 12,
		marginBottom: 10
	},
	modalBtnText: {
		fontSize: 14,
		fontWeight: '600'
	},
	modalCancelBtn: {
		paddingVertical: 10,
		marginTop: 6
	}
})
