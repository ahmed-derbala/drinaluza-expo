import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, Modal, Dimensions, useWindowDimensions } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Sharing from 'expo-sharing'
import * as Clipboard from 'expo-clipboard'
import { useUpdates, isVersionNewer } from '@/core/updates/UpdatesContext'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { APP_VERSION } from '@/config'
import { SmartScreenHeader } from '@/core/smart-screen-header/SmartScreenHeader'
import { toast } from '@/features/common/Toast'
import { log } from '@/core/log'

export const UpdatesScreen: React.FC = () => {
	const router = useRouter()
	const { colors } = useTheme()
	const { width: windowWidth } = useWindowDimensions()

	const { status, downloadProgress, cachedApkList, freeDiskSpace, updateInfo, error, checkForUpdates, downloadUpdate, cancelDownload, installApk, deleteApk } = useUpdates()

	// Modals State
	const [shareModalVisible, setShareModalVisible] = useState(false)
	const [quickShareModalVisible, setQuickShareModalVisible] = useState(false)

	const isAndroid = Platform.OS === 'android'
	const isWeb = Platform.OS === 'web'

	// Parse current and latest update availability
	const latestVersionName = updateInfo?.name || translate('unavailable', 'Unavailable')
	const publishedDate = updateInfo?.published_at
		? new Date(updateInfo.published_at).toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})
		: translate('unavailable', 'Unavailable')

	const currentVersion = APP_VERSION
	const latestVersion = updateInfo?.latest_version || APP_VERSION
	const hasUpdate = isVersionNewer(currentVersion, latestVersion)
	const updateSize = updateInfo?.size || 0
	const downloadCount = updateInfo?.download_count || 0
	const changelog = updateInfo?.changelog || translate('updates_whats_new', "What's New")

	// Formatter utilities
	const formatBytes = (bytes?: number | null) => {
		if (bytes === undefined || bytes === null) return translate('unavailable', 'Unavailable')
		if (bytes === 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	// Handlers
	const handleBackPress = () => {
		if (router.canGoBack()) {
			router.back()
		} else {
			router.replace('/(home)/feed')
		}
	}

	const handleCheckForUpdates = async () => {
		try {
			await checkForUpdates(true)
			toast.show({
				title: translate('success', 'Success'),
				message: translate('success', 'Update check complete'),
				color: colors.success
			})
		} catch (err) {
			toast.show({
				title: translate('error', 'Error'),
				message: translate('error', 'Update check failed'),
				color: colors.error
			})
		}
	}

	const handleDownloadPress = async () => {
		if (isAndroid) {
			await downloadUpdate()
		} else if (updateInfo?.download_url) {
			// On Web, open download URL directly in window
			window.open(updateInfo.download_url, '_blank')
		}
	}

	const handleSharePress = async () => {
		if (isWeb) {
			// Share on Web: Copy download URL to clipboard
			if (updateInfo?.download_url) {
				await Clipboard.setStringAsync(updateInfo.download_url)
				toast.show({
					title: translate('success', 'Success'),
					message: translate('updates_share_toast', 'Download link copied to clipboard!'),
					color: colors.success
				})
			} else {
				toast.show({
					title: translate('error', 'Error'),
					message: translate('error', 'No download URL available to share'),
					color: colors.error
				})
			}
		} else {
			// Share on Android: Show custom share selection sheet
			setShareModalVisible(true)
		}
	}

	const handleShareLink = async () => {
		setShareModalVisible(false)
		if (updateInfo?.download_url) {
			try {
				const isAvailable = await Sharing.isAvailableAsync()
				// For text link sharing, use a simple fallback to clipboard if native sharing fails or copy is preferred,
				// but let's try expo-sharing with a local text link file, or direct native share if standard.
				// Since expo-sharing handles local files, copy link to clipboard and show toast, or share link string using web API if available.
				await Clipboard.setStringAsync(updateInfo.download_url)
				toast.show({
					title: translate('success', 'Success'),
					message: translate('updates_share_toast', 'Link copied! You can now share it.'),
					color: colors.success
				})
			} catch (err) {
				log({ level: 'error', label: 'Updates', message: 'Failed to share URL', error: err })
			}
		}
	}

	const handleShareApkFile = () => {
		setShareModalVisible(false)
		if (cachedApkList.length > 0) {
			// Show Quick Share recommendation modal first
			setQuickShareModalVisible(true)
		}
	}

	const proceedToShareApk = async () => {
		setQuickShareModalVisible(false)
		if (cachedApkList.length > 0) {
			try {
				const apk = cachedApkList[0]
				const isAvailable = await Sharing.isAvailableAsync()
				if (isAvailable) {
					await Sharing.shareAsync(apk.uri, {
						mimeType: 'application/vnd.android.package-archive',
						dialogTitle: translate('updates_share_title', 'Share Update')
					})
				} else {
					toast.show({
						title: translate('error', 'Error'),
						message: translate('error', 'Sharing is not supported on this device'),
						color: colors.error
					})
				}
			} catch (err) {
				log({ level: 'error', label: 'Updates', message: 'Failed to share APK file', error: err })
				toast.show({
					title: translate('error', 'Error'),
					message: translate('error', 'Failed to share APK file'),
					color: colors.error
				})
			}
		}
	}

	const handleWebRefresh = () => {
		if (isWeb) {
			window.location.reload()
		}
	}

	// Layout adaptations
	const isTabletOrDesktop = windowWidth >= 768
	const contentMaxWidth = 640

	return (
		<View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
			<SmartScreenHeader title={translate('updates_title', 'App Updates')} showBackButton={true} onBackPress={handleBackPress} loading={status === 'checking'} />

			<ScrollView
				style={styles.scrollContainer}
				contentContainerStyle={[
					styles.scrollContent,
					isTabletOrDesktop && {
						maxWidth: contentMaxWidth,
						alignSelf: 'center',
						width: '100%'
					}
				]}
			>
				{/* Top Status Hero Card */}
				<View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.heroHeader}>
						<View style={[styles.heroIconContainer, { backgroundColor: hasUpdate ? `${colors.warning}15` : `${colors.success}15` }]}>
							<Ionicons name={hasUpdate ? 'alert-circle-outline' : 'checkmark-circle-outline'} size={36} color={hasUpdate ? colors.warning : colors.success} />
						</View>
						<View style={styles.heroTextContainer}>
							<Text style={[styles.heroStatusText, { color: colors.text }]}>
								{hasUpdate ? translate('updates_new_available', 'A new version is available!') : translate('updates_up_to_date', 'Your app is up to date!')}
							</Text>
							{status === 'checking' && <Text style={[styles.heroSubText, { color: colors.textSecondary }]}>{translate('updates_checking', 'Checking for updates...')}</Text>}
						</View>
					</View>

					{/* Version comparison row */}
					<View style={[styles.versionRow, { backgroundColor: colors.surface }]}>
						<View style={styles.versionCol}>
							<Text style={[styles.versionLabel, { color: colors.textSecondary }]}>{translate('updates_current_version', 'Current')}</Text>
							<Text style={[styles.versionValue, { color: colors.text }]}>{currentVersion}</Text>
						</View>
						<Ionicons name="arrow-forward" size={18} color={colors.textTertiary} />
						<View style={styles.versionCol}>
							<Text style={[styles.versionLabel, { color: colors.textSecondary }]}>{translate('updates_latest_version', 'Latest')}</Text>
							<Text style={[styles.versionValue, { color: hasUpdate ? colors.primary : colors.text }]}>{latestVersion}</Text>
						</View>
					</View>
				</View>

				{/* Update Information Details list */}
				<View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('business_information', 'Details')}</Text>

					<View style={styles.detailItem}>
						<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Release Name</Text>
						<Text style={[styles.detailValue, { color: colors.text }]} numberOfLines={1}>
							{latestVersionName}
						</Text>
					</View>

					<View style={styles.detailItem}>
						<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{translate('updates_published_date', 'Published Date')}</Text>
						<Text style={[styles.detailValue, { color: colors.text }]}>{publishedDate}</Text>
					</View>

					<View style={styles.detailItem}>
						<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{translate('updates_file_size', 'File Size')}</Text>
						<Text style={[styles.detailValue, { color: colors.text }]}>{formatBytes(updateSize)}</Text>
					</View>

					<View style={styles.detailItem}>
						<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{translate('updates_download_count', 'Downloads')}</Text>
						<Text style={[styles.detailValue, { color: colors.text }]}>{downloadCount}</Text>
					</View>

					{isAndroid && (
						<View style={[styles.detailItem, { borderBottomWidth: 0 }]}>
							<Text style={[styles.detailLabel, { color: colors.textSecondary }]}>{translate('updates_free_storage', 'Free Storage')}</Text>
							<Text
								style={[
									styles.detailValue,
									{
										color: freeDiskSpace && freeDiskSpace < updateSize ? colors.error : colors.text
									}
								]}
							>
								{formatBytes(freeDiskSpace)}
							</Text>
						</View>
					)}
				</View>

				{/* Active Download Progress bar */}
				{status === 'downloading' && (
					<View style={[styles.downloadCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<View style={styles.downloadHeader}>
							<Text style={[styles.downloadTitle, { color: colors.text }]}>{translate('updates_downloading', 'Downloading update...')}</Text>
							<Text style={[styles.downloadPct, { color: colors.primary }]}>{Math.round(downloadProgress * 100)}%</Text>
						</View>

						{/* Premium visual progress bar */}
						<View style={[styles.progressBarTrack, { backgroundColor: colors.borderLight }]}>
							<View
								style={[
									styles.progressBarFill,
									{
										backgroundColor: colors.primary,
										width: `${downloadProgress * 100}%`
									}
								]}
							/>
						</View>

						<Pressable style={[styles.cancelBtn, { borderColor: colors.error }]} onPress={cancelDownload}>
							<Ionicons name="close-circle-outline" size={18} color={colors.error} />
							<Text style={[styles.cancelBtnText, { color: colors.error }]}>{translate('cancel', 'Cancel Download')}</Text>
						</Pressable>
					</View>
				)}

				{/* Action Buttons row */}
				<View style={styles.actionsContainer}>
					<Pressable
						style={[
							styles.primaryActionBtn,
							{
								backgroundColor: !hasUpdate || status === 'downloading' ? colors.borderLight : colors.primary,
								opacity: !hasUpdate || status === 'downloading' ? 0.6 : 1
							}
						]}
						disabled={!hasUpdate || status === 'downloading'}
						onPress={handleDownloadPress}
					>
						{status === 'checking' ? (
							<ActivityIndicator size="small" color="#FFFFFF" />
						) : (
							<>
								<Ionicons name="download-outline" size={18} color="#FFFFFF" />
								<Text style={styles.actionBtnText}>{translate('updates_download_btn', 'Download Update')}</Text>
							</>
						)}
					</Pressable>

					<View style={styles.secondaryActionsRow}>
						<Pressable style={[styles.secondaryActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleCheckForUpdates} disabled={status === 'checking'}>
							<Ionicons name="refresh-outline" size={18} color={colors.text} />
							<Text style={[styles.secondaryActionText, { color: colors.text }]}>{translate('updates_check_btn', 'Check')}</Text>
						</Pressable>

						{isWeb && (
							<Pressable
								style={[
									styles.secondaryActionBtn,
									{
										backgroundColor: colors.card,
										borderColor: colors.border,
										opacity: !hasUpdate ? 0.5 : 1
									}
								]}
								disabled={!hasUpdate}
								onPress={handleWebRefresh}
							>
								<Ionicons name="sync-outline" size={18} color={colors.text} />
								<Text style={[styles.secondaryActionText, { color: colors.text }]}>{translate('refresh', 'Refresh')}</Text>
							</Pressable>
						)}

						<Pressable style={[styles.secondaryActionBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={handleSharePress}>
							<Ionicons name={isWeb ? 'copy-outline' : 'share-social-outline'} size={18} color={colors.text} />
							<Text style={[styles.secondaryActionText, { color: colors.text }]}>{isWeb ? 'Copy' : 'Share'}</Text>
						</Pressable>
					</View>
				</View>

				{/* Error display */}
				{error && (
					<View style={[styles.errorCard, { backgroundColor: `${colors.error}10`, borderColor: colors.error }]}>
						<Ionicons name="warning-outline" size={18} color={colors.error} />
						<Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
					</View>
				)}

				{/* Android APK Cache files list */}
				{isAndroid && (
					<View style={[styles.detailsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
						<Text style={[styles.sectionTitle, { color: colors.text }]}>Downloaded Files (Cache)</Text>
						{cachedApkList.length === 0 ? (
							<Text style={[styles.emptyCacheText, { color: colors.textSecondary }]}>{translate('updates_no_downloaded', 'No downloaded updates found.')}</Text>
						) : (
							cachedApkList.map((apk, index) => (
								<View
									key={apk.uri}
									style={[
										styles.cacheItem,
										{
											borderBottomWidth: index === cachedApkList.length - 1 ? 0 : StyleSheet.hairlineWidth,
											borderBottomColor: colors.borderLight
										}
									]}
								>
									<View style={styles.cacheTextCol}>
										<Text style={[styles.cacheName, { color: colors.text }]} numberOfLines={1}>
											{apk.name}
										</Text>
										<Text style={[styles.cacheDetails, { color: colors.textSecondary }]}>
											Version {apk.version} • {formatBytes(apk.size)}
										</Text>
									</View>
									<View style={styles.cacheActionsCol}>
										<Pressable style={[styles.cacheActionBtn, { backgroundColor: colors.primaryContainer }]} onPress={() => installApk(apk.uri)}>
											<Text style={[styles.cacheActionText, { color: colors.primary }]}>{translate('updates_install_btn', 'Install')}</Text>
										</Pressable>
										<Pressable style={[styles.cacheActionBtn, { backgroundColor: `${colors.error}15` }]} onPress={() => deleteApk(apk.uri)}>
											<Text style={[styles.cacheActionText, { color: colors.error }]}>{translate('updates_delete_btn', 'Delete')}</Text>
										</Pressable>
									</View>
								</View>
							))
						)}
					</View>
				)}

				{/* What's New section */}
				<View style={[styles.changelogCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.changelogHeader}>
						<Ionicons name="list-outline" size={18} color={colors.primary} />
						<Text style={[styles.changelogTitle, { color: colors.text }]}>{translate('updates_whats_new', "What's New")}</Text>
					</View>
					<ScrollView style={styles.changelogScroll} nestedScrollEnabled={true}>
						<Text style={[styles.changelogBody, { color: colors.textSecondary }]}>{changelog || 'No release notes provided.'}</Text>
					</ScrollView>
				</View>
			</ScrollView>

			{/* Share selection custom modal sheet */}
			<Modal visible={shareModalVisible} transparent animationType="slide" onRequestClose={() => setShareModalVisible(false)}>
				<Pressable style={styles.modalBackdrop} onPress={() => setShareModalVisible(false)}>
					<View style={[styles.bottomSheetContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
						<View style={[styles.modalIndicator, { backgroundColor: colors.border }]} />
						<Text style={[styles.modalTitle, { color: colors.text }]}>{translate('updates_share_title', 'Share Update')}</Text>
						<Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>{translate('updates_share_prompt', 'How would you like to share the update?')}</Text>

						<Pressable style={[styles.modalOptionBtn, { borderBottomColor: colors.borderLight }]} onPress={handleShareLink}>
							<Ionicons name="link-outline" size={22} color={colors.primary} />
							<Text style={[styles.modalOptionText, { color: colors.text }]}>{translate('updates_share_url', 'Share Download URL')}</Text>
						</Pressable>

						<Pressable
							style={[
								styles.modalOptionBtn,
								{
									opacity: cachedApkList.length === 0 ? 0.4 : 1
								}
							]}
							disabled={cachedApkList.length === 0}
							onPress={handleShareApkFile}
						>
							<Ionicons name="document-attach-outline" size={22} color={colors.primary} />
							<Text style={[styles.modalOptionText, { color: colors.text }]}>{translate('updates_share_apk', 'Share APK File (Cache)')}</Text>
							{cachedApkList.length === 0 && <Text style={[styles.modalOptionSubtitle, { color: colors.textTertiary }]}>(No downloaded file in cache)</Text>}
						</Pressable>

						<Pressable style={[styles.modalCancelBtn, { backgroundColor: colors.borderLight }]} onPress={() => setShareModalVisible(false)}>
							<Text style={[styles.modalCancelText, { color: colors.text }]}>{translate('cancel', 'Cancel')}</Text>
						</Pressable>
					</View>
				</Pressable>
			</Modal>

			{/* Quick Share Recommendation modal */}
			<Modal visible={quickShareModalVisible} transparent animationType="fade" onRequestClose={() => setQuickShareModalVisible(false)}>
				<View style={styles.modalCenterBackdrop}>
					<View style={[styles.alertContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
						<View style={[styles.alertIconBg, { backgroundColor: `${colors.primary}15` }]}>
							<Ionicons name="flash-outline" size={32} color={colors.primary} />
						</View>
						<Text style={[styles.alertTitle, { color: colors.text }]}>{translate('updates_quick_share_title', 'Fast Sharing')}</Text>
						<Text style={[styles.alertDesc, { color: colors.textSecondary }]}>
							{translate('updates_quick_share_desc', 'We recommend using Quick Share or Nearby Share for faster transfers without using internet data.')}
						</Text>

						<View style={styles.alertButtonsRow}>
							<Pressable style={[styles.alertBtn, { borderColor: colors.border }]} onPress={() => setQuickShareModalVisible(false)}>
								<Text style={[styles.alertBtnText, { color: colors.textSecondary }]}>{translate('cancel', 'Cancel')}</Text>
							</Pressable>
							<Pressable style={[styles.alertBtn, styles.alertBtnPrimary, { backgroundColor: colors.primary }]} onPress={proceedToShareApk}>
								<Text style={[styles.alertBtnText, { color: '#FFFFFF', fontWeight: '600' }]}>{translate('confirm', 'Confirm')}</Text>
							</Pressable>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	)
}

const styles = StyleSheet.create({
	screenContainer: {
		flex: 1,
		width: '100%'
	},
	scrollContainer: {
		flex: 1
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 40,
		gap: 16
	},
	heroCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 16,
		gap: 16
	},
	heroHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16
	},
	heroIconContainer: {
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center'
	},
	heroTextContainer: {
		flex: 1,
		gap: 4
	},
	heroStatusText: {
		fontSize: 16,
		fontWeight: '600',
		lineHeight: 22
	},
	heroSubText: {
		fontSize: 13
	},
	versionRow: {
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		paddingHorizontal: 20
	},
	versionCol: {
		alignItems: 'center',
		gap: 4
	},
	versionLabel: {
		fontSize: 11,
		fontWeight: '500',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	versionValue: {
		fontSize: 18,
		fontWeight: '700'
	},
	detailsCard: {
		borderRadius: 16,
		borderWidth: 1,
		paddingHorizontal: 16,
		paddingVertical: 8
	},
	sectionTitle: {
		fontSize: 15,
		fontWeight: '600',
		marginTop: 8,
		marginBottom: 12
	},
	detailItem: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: 'rgba(255, 255, 255, 0.08)'
	},
	detailLabel: {
		fontSize: 14
	},
	detailValue: {
		fontSize: 14,
		fontWeight: '500',
		maxWidth: '60%'
	},
	downloadCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 16,
		gap: 12
	},
	downloadHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	downloadTitle: {
		fontSize: 14,
		fontWeight: '600'
	},
	downloadPct: {
		fontSize: 14,
		fontWeight: '700'
	},
	progressBarTrack: {
		height: 6,
		borderRadius: 3,
		overflow: 'hidden',
		width: '100%'
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 3
	},
	cancelBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 8,
		borderRadius: 8,
		borderWidth: 1,
		marginTop: 4,
		gap: 6
	},
	cancelBtnText: {
		fontSize: 13,
		fontWeight: '600'
	},
	actionsContainer: {
		flexDirection: 'column',
		gap: 10
	},
	primaryActionBtn: {
		height: 48,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		...Platform.select({
			web: {
				cursor: 'pointer' as any
			}
		})
	},
	actionBtnText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '600'
	},
	secondaryActionsRow: {
		flexDirection: 'row',
		gap: 10
	},
	secondaryActionBtn: {
		flex: 1,
		height: 40,
		borderRadius: 10,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		...Platform.select({
			web: {
				cursor: 'pointer' as any
			}
		})
	},
	secondaryActionText: {
		fontSize: 13,
		fontWeight: '500'
	},
	errorCard: {
		borderRadius: 12,
		borderWidth: 1,
		padding: 12,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10
	},
	errorText: {
		fontSize: 13,
		flex: 1,
		fontWeight: '500'
	},
	emptyCacheText: {
		fontSize: 13,
		textAlign: 'center',
		paddingVertical: 20
	},
	cacheItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12
	},
	cacheTextCol: {
		flex: 1,
		marginRight: 12,
		gap: 2
	},
	cacheName: {
		fontSize: 13,
		fontWeight: '500'
	},
	cacheDetails: {
		fontSize: 11
	},
	cacheActionsCol: {
		flexDirection: 'row',
		gap: 8
	},
	cacheActionBtn: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 6,
		justifyContent: 'center',
		alignItems: 'center'
	},
	cacheActionText: {
		fontSize: 11,
		fontWeight: '600'
	},
	changelogCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 16,
		gap: 12
	},
	changelogHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	changelogTitle: {
		fontSize: 15,
		fontWeight: '600'
	},
	changelogScroll: {
		maxHeight: 180,
		width: '100%'
	},
	changelogBody: {
		fontSize: 13,
		lineHeight: 19
	},
	// Modals & Bottom Sheets
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(3, 7, 18, 0.6)',
		justifyContent: 'flex-end'
	},
	bottomSheetContainer: {
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		borderTopWidth: 1,
		paddingHorizontal: 20,
		paddingTop: 12,
		paddingBottom: Platform.OS === 'ios' ? 36 : 24,
		gap: 16
	},
	modalIndicator: {
		width: 40,
		height: 4,
		borderRadius: 2,
		alignSelf: 'center',
		marginBottom: 8
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		textAlign: 'center'
	},
	modalSubtitle: {
		fontSize: 14,
		textAlign: 'center',
		marginBottom: 8
	},
	modalOptionBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 14,
		borderBottomWidth: StyleSheet.hairlineWidth,
		gap: 12
	},
	modalOptionText: {
		fontSize: 15,
		fontWeight: '500'
	},
	modalOptionSubtitle: {
		fontSize: 12,
		marginLeft: 'auto'
	},
	modalCancelBtn: {
		height: 48,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 8
	},
	modalCancelText: {
		fontSize: 15,
		fontWeight: '600'
	},
	// Alert style modal
	modalCenterBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(3, 7, 18, 0.7)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24
	},
	alertContainer: {
		width: '100%',
		maxWidth: 320,
		borderRadius: 16,
		borderWidth: 1,
		padding: 20,
		alignItems: 'center',
		gap: 16
	},
	alertIconBg: {
		width: 60,
		height: 60,
		borderRadius: 30,
		justifyContent: 'center',
		alignItems: 'center'
	},
	alertTitle: {
		fontSize: 17,
		fontWeight: '700',
		textAlign: 'center'
	},
	alertDesc: {
		fontSize: 13,
		textAlign: 'center',
		lineHeight: 18
	},
	alertButtonsRow: {
		flexDirection: 'row',
		width: '100%',
		gap: 10,
		marginTop: 8
	},
	alertBtn: {
		flex: 1,
		height: 40,
		borderRadius: 8,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	alertBtnPrimary: {
		borderWidth: 0
	},
	alertBtnText: {
		fontSize: 14
	}
})
