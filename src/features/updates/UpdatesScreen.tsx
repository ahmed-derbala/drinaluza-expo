import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, Pressable, ActivityIndicator, Platform, useWindowDimensions, Modal, Share } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'
import { translate } from '@/core/translation'
import { useTheme } from '@/core/theme'
import { useUpdates, compareVersions } from '@/core/updates/UpdatesContext'
import { SmartScreenHeader } from '@/core/smart-screen-header/SmartScreenHeader'
import { log } from '@/core/log'
import { APP_VERSION } from '@/config'

// Helper to format bytes nicely
function formatBytes(bytes: number, decimals = 2) {
	if (bytes === 0) return '0 Bytes'
	const k = 1024
	const dm = decimals < 0 ? 0 : decimals
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
	const i = Math.floor(Math.log(bytes) / Math.log(k))
	return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i]
}

// Helper to format date
function formatDate(dateStr: string) {
	if (!dateStr) return ''
	try {
		const d = new Date(dateStr)
		return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
	} catch {
		return dateStr
	}
}

export const UpdatesScreen: React.FC = () => {
	const router = useRouter()
	const { colors } = useTheme()
	const { width } = useWindowDimensions()

	const { updateInfo, status, downloadProgress, downloadedApks, freeDiskStorage, checkForUpdates, downloadUpdate, cancelDownload, deleteApk, installApk, refreshDownloadedList } = useUpdates()

	const [checking, setChecking] = useState(false)
	const [shareModalVisible, setShareModalVisible] = useState(false)
	const [quickShareModalVisible, setQuickShareModalVisible] = useState(false)
	const [toastMsg, setToastMsg] = useState<string | null>(null)

	const isAndroid = Platform.OS === 'android'
	const isTabletOrWeb = width >= 768

	// Back action: if there is no previous screen, back opens /feed
	const handleBack = () => {
		if (router.canGoBack()) {
			router.back()
		} else {
			router.replace('/(home)/feed')
		}
	}

	const handleCheckForUpdates = async () => {
		setChecking(true)
		try {
			await checkForUpdates()
		} finally {
			setChecking(false)
		}
	}

	const handleDownload = async () => {
		if (!updateInfo?.download_url) return
		await downloadUpdate(updateInfo.download_url, updateInfo.latest_version)
	}

	const handleShare = async () => {
		if (!updateInfo) return

		if (isAndroid) {
			// On Android, if there is a downloaded APK ready/cached, offer file sharing
			const latestApk = downloadedApks.find((apk) => compareVersions(apk.version, updateInfo.latest_version) === 0)
			if (latestApk) {
				setShareModalVisible(true)
			} else {
				// Otherwise, directly share the URL
				try {
					await Share.share({
						message: `${translate('updates_new_available', 'A new version is available!')} ${updateInfo.name}\n${updateInfo.download_url}`
					})
				} catch (err) {
					log({ level: 'error', label: 'UpdatesScreen', message: 'Sharing failed', error: err })
				}
			}
		} else {
			// On Web, copy download url to clipboard
			await Clipboard.setStringAsync(updateInfo.download_url)
			showToast(translate('updates_share_toast', 'Download link copied to clipboard!'))
		}
	}

	const shareOnlyUrl = async () => {
		setShareModalVisible(false)
		if (!updateInfo) return
		try {
			await Share.share({
				message: `${translate('updates_new_available', 'A new version is available!')} ${updateInfo.name}\n${updateInfo.download_url}`
			})
		} catch (err) {
			log({ level: 'error', label: 'UpdatesScreen', message: 'Sharing failed', error: err })
		}
	}

	const shareApkFile = () => {
		setShareModalVisible(false)
		// Recommendation to use quick share
		setQuickShareModalVisible(true)
	}

	const proceedSharingApkFile = async () => {
		setQuickShareModalVisible(false)
		if (!updateInfo) return
		const latestApk = downloadedApks.find((apk) => compareVersions(apk.version, updateInfo.latest_version) === 0)
		if (latestApk) {
			try {
				await Sharing.shareAsync(latestApk.uri, {
					mimeType: 'application/vnd.android.package-archive',
					dialogTitle: translate('updates_share_title', 'Share Update')
				})
			} catch (err) {
				log({ level: 'error', label: 'UpdatesScreen', message: 'File sharing failed', error: err })
			}
		}
	}

	const handleRefreshWeb = () => {
		if (Platform.OS === 'web') {
			window.location.reload()
		}
	}

	const showToast = (msg: string) => {
		setToastMsg(msg)
		setTimeout(() => setToastMsg(null), 3000)
	}

	// Trigger checked updates on initial mount if not fetched yet
	useEffect(() => {
		if (!updateInfo) {
			handleCheckForUpdates()
		} else if (isAndroid) {
			refreshDownloadedList()
		}
	}, [])

	const hasUpdate = updateInfo ? compareVersions(APP_VERSION, updateInfo.latest_version) < 0 : false

	const renderMainContent = () => {
		return (
			<View style={styles.cardContainer}>
				{/* Header Info */}
				<View style={[styles.infoCard, { backgroundColor: colors.card || '#1C2541', borderColor: colors.border || '#3A506B' }]}>
					<View style={styles.infoRow}>
						<Ionicons name="phone-portrait-outline" size={24} color={colors.primary || '#0EA5E9'} />
						<View style={styles.infoTextContainer}>
							<Text style={[styles.infoLabel, { color: colors.textSecondary || '#94A3B8' }]}>{translate('updates_current_version', 'Current Version')}</Text>
							<Text style={[styles.infoValue, { color: colors.text || '#F8FAFC' }]}>{APP_VERSION}</Text>
						</View>
					</View>

					{updateInfo && (
						<>
							<View style={[styles.divider, { backgroundColor: colors.borderLight || '#1E293B' }]} />

							<View style={styles.infoRow}>
								<Ionicons name="cloud-upload-outline" size={24} color="#10B981" />
								<View style={styles.infoTextContainer}>
									<Text style={[styles.infoLabel, { color: colors.textSecondary || '#94A3B8' }]}>{translate('updates_latest_version', 'Latest Version')}</Text>
									<Text style={[styles.infoValue, { color: colors.text || '#F8FAFC' }]}>
										{updateInfo.latest_version} {hasUpdate && <Text style={{ color: colors.primary, fontSize: 12 }}>({translate('updates_new_available', 'A new version is available!')})</Text>}
									</Text>
								</View>
							</View>

							<View style={[styles.divider, { backgroundColor: colors.borderLight || '#1E293B' }]} />

							<View style={styles.metaGrid}>
								<View style={styles.metaItem}>
									<Text style={[styles.metaLabel, { color: colors.textSecondary || '#94A3B8' }]}>{translate('updates_published_date', 'Published Date')}</Text>
									<Text style={[styles.metaValue, { color: colors.text || '#F8FAFC' }]}>{formatDate(updateInfo.published_at)}</Text>
								</View>

								<View style={styles.metaItem}>
									<Text style={[styles.metaLabel, { color: colors.textSecondary || '#94A3B8' }]}>{translate('updates_file_size', 'File Size')}</Text>
									<Text style={[styles.metaValue, { color: colors.text || '#F8FAFC' }]}>{formatBytes(updateInfo.size)}</Text>
								</View>

								<View style={styles.metaItem}>
									<Text style={[styles.metaLabel, { color: colors.textSecondary || '#94A3B8' }]}>{translate('updates_download_count', 'Downloads')}</Text>
									<Text style={[styles.metaValue, { color: colors.text || '#F8FAFC' }]}>{updateInfo.download_count}</Text>
								</View>

								{isAndroid && (
									<View style={styles.metaItem}>
										<Text style={[styles.metaLabel, { color: colors.textSecondary || '#94A3B8' }]}>{translate('updates_free_storage', 'Free Storage')}</Text>
										<Text style={[styles.metaValue, { color: colors.text || '#F8FAFC' }]}>{formatBytes(freeDiskStorage)}</Text>
									</View>
								)}
							</View>
						</>
					)}
				</View>

				{/* What's New Block */}
				{updateInfo?.changelog ? (
					<View style={[styles.changelogCard, { backgroundColor: colors.card || '#1C2541', borderColor: colors.border || '#3A506B' }]}>
						<Text style={[styles.changelogTitle, { color: colors.text || '#F8FAFC' }]}>{translate('updates_whats_new', "What's New")}</Text>
						<ScrollView style={styles.changelogScroll} nestedScrollEnabled>
							<Text style={[styles.changelogText, { color: colors.textSecondary || '#94A3B8' }]}>{updateInfo.changelog}</Text>
						</ScrollView>
					</View>
				) : null}
			</View>
		)
	}

	const renderActions = () => {
		const isDownloading = status === 'downloading'
		const downloadBtnDisabled = !hasUpdate || isDownloading

		return (
			<View style={styles.cardContainer}>
				{/* Update Checking/Action Panel */}
				<View style={[styles.actionsCard, { backgroundColor: colors.card || '#1C2541', borderColor: colors.border || '#3A506B' }]}>
					{isDownloading && (
						<View style={styles.progressContainer}>
							<View style={styles.progressRow}>
								<Text style={[styles.progressLabel, { color: colors.text || '#F8FAFC' }]}>{translate('updates_downloading', 'Downloading update...')}</Text>
								<Text style={[styles.progressPercent, { color: colors.primary || '#0EA5E9' }]}>{Math.round(downloadProgress * 100)}%</Text>
							</View>
							<View style={[styles.progressBarTrack, { backgroundColor: colors.borderLight || '#1E293B' }]}>
								<View style={[styles.progressBarFill, { width: `${downloadProgress * 100}%`, backgroundColor: colors.primary || '#0EA5E9' }]} />
							</View>
							<Pressable onPress={cancelDownload} style={[styles.cancelBtn, { borderColor: colors.error || '#EF4444' }]} accessibilityRole="button" accessibilityLabel="Cancel download">
								<Text style={[styles.cancelBtnText, { color: colors.error || '#EF4444' }]}>{translate('cancel', 'Cancel')}</Text>
							</Pressable>
						</View>
					)}

					<View style={styles.btnStack}>
						{isAndroid ? (
							<>
								{/* Download Button */}
								<Pressable
									disabled={downloadBtnDisabled}
									onPress={handleDownload}
									style={({ pressed }) => [
										styles.actionBtn,
										{
											backgroundColor: downloadBtnDisabled ? '#334155' : colors.primary || '#0EA5E9',
											opacity: pressed && !downloadBtnDisabled ? 0.8 : 1
										}
									]}
									accessibilityRole="button"
									accessibilityLabel="Download Update"
									accessibilityState={{ disabled: downloadBtnDisabled }}
								>
									{status === 'checking' || checking ? (
										<ActivityIndicator size="small" color="#FFFFFF" />
									) : (
										<>
											<Ionicons name="download-outline" size={18} color="#FFFFFF" style={styles.btnIcon} />
											<Text style={styles.actionBtnText}>{translate('updates_download_btn', 'Download Update')}</Text>
										</>
									)}
								</Pressable>

								{/* Share Button */}
								{updateInfo && (
									<Pressable
										onPress={handleShare}
										style={({ pressed }) => [
											styles.shareBtn,
											{
												borderColor: colors.primary || '#0EA5E9',
												opacity: pressed ? 0.8 : 1
											}
										]}
										accessibilityRole="button"
										accessibilityLabel="Share Update"
									>
										<Ionicons name="share-social-outline" size={18} color={colors.primary || '#0EA5E9'} style={styles.btnIcon} />
										<Text style={[styles.shareBtnText, { color: colors.primary || '#0EA5E9' }]}>{translate('updates_share_title', 'Share Update')}</Text>
									</Pressable>
								)}
							</>
						) : (
							<>
								{/* Web Download Link */}
								{updateInfo?.download_url ? (
									<Pressable
										disabled={!hasUpdate}
										onPress={() => {
											if (updateInfo.download_url) {
												window.open(updateInfo.download_url, '_blank')
											}
										}}
										style={({ pressed }) => [
											styles.actionBtn,
											{
												backgroundColor: !hasUpdate ? '#334155' : colors.primary || '#0EA5E9',
												opacity: pressed && hasUpdate ? 0.8 : 1
											}
										]}
										accessibilityRole="button"
										accessibilityLabel="Download Link"
										accessibilityState={{ disabled: !hasUpdate }}
									>
										<Ionicons name="open-outline" size={18} color="#FFFFFF" style={styles.btnIcon} />
										<Text style={styles.actionBtnText}>{translate('updates_download_btn', 'Download Update')}</Text>
									</Pressable>
								) : null}

								{/* Web Refresh Page Button */}
								<Pressable
									disabled={!hasUpdate}
									onPress={handleRefreshWeb}
									style={({ pressed }) => [
										styles.shareBtn,
										{
											borderColor: !hasUpdate ? '#334155' : colors.primary || '#0EA5E9',
											opacity: pressed && hasUpdate ? 0.8 : 1
										}
									]}
									accessibilityRole="button"
									accessibilityLabel="Refresh Web Client"
									accessibilityState={{ disabled: !hasUpdate }}
								>
									<Ionicons name="refresh-outline" size={18} color={!hasUpdate ? '#64748B' : colors.primary || '#0EA5E9'} style={styles.btnIcon} />
									<Text style={[styles.shareBtnText, { color: !hasUpdate ? '#64748B' : colors.primary || '#0EA5E9' }]}>{translate('refresh', 'Refresh')}</Text>
								</Pressable>

								{/* Web Copy Link Share Button */}
								{updateInfo && (
									<Pressable
										onPress={handleShare}
										style={({ pressed }) => [
											styles.shareBtn,
											{
												borderColor: colors.primary || '#0EA5E9',
												opacity: pressed ? 0.8 : 1
											}
										]}
										accessibilityRole="button"
										accessibilityLabel="Copy Download URL"
									>
										<Ionicons name="copy-outline" size={18} color={colors.primary || '#0EA5E9'} style={styles.btnIcon} />
										<Text style={[styles.shareBtnText, { color: colors.primary || '#0EA5E9' }]}>{translate('updates_share_url', 'Share Download URL')}</Text>
									</Pressable>
								)}
							</>
						)}

						{/* Global Check for Updates Button */}
						<Pressable
							disabled={checking}
							onPress={handleCheckForUpdates}
							style={({ pressed }) => [
								styles.checkUpdatesBtn,
								{
									backgroundColor: '#1E293B',
									borderColor: colors.border || '#3A506B',
									opacity: pressed ? 0.8 : 1
								}
							]}
							accessibilityRole="button"
							accessibilityLabel="Check for Updates"
							accessibilityState={{ disabled: checking }}
						>
							{checking ? (
								<ActivityIndicator size="small" color={colors.primary || '#0EA5E9'} />
							) : (
								<>
									<Ionicons name="sync-outline" size={18} color={colors.text || '#F8FAFC'} style={styles.btnIcon} />
									<Text style={[styles.checkUpdatesBtnText, { color: colors.text || '#F8FAFC' }]}>{translate('updates_check_btn', 'Check for Updates')}</Text>
								</>
							)}
						</Pressable>
					</View>
				</View>

				{/* Android Downloaded APK List */}
				{isAndroid && (
					<View style={[styles.apkListCard, { backgroundColor: colors.card || '#1C2541', borderColor: colors.border || '#3A506B' }]}>
						<Text style={[styles.apkListTitle, { color: colors.text || '#F8FAFC' }]}>{translate('downloads', 'Downloads')}</Text>

						{downloadedApks.length === 0 ? (
							<View style={styles.emptyContainer}>
								<Ionicons name="folder-open-outline" size={32} color={colors.textTertiary || '#64748B'} />
								<Text style={[styles.emptyText, { color: colors.textTertiary || '#64748B' }]}>{translate('updates_no_downloaded', 'No downloaded updates found.')}</Text>
							</View>
						) : (
							<View style={styles.apkList}>
								{downloadedApks.map((apk) => {
									const isInstalled = compareVersions(APP_VERSION, apk.version) >= 0

									return (
										<View key={apk.uri} style={[styles.apkItem, { borderBottomColor: colors.borderLight || '#1E293B' }]}>
											<View style={styles.apkInfo}>
												<Text style={[styles.apkName, { color: colors.text || '#F8FAFC' }]} numberOfLines={1} ellipsizeMode="middle">
													{apk.name}
												</Text>
												<Text style={[styles.apkMeta, { color: colors.textSecondary || '#94A3B8' }]}>
													{formatBytes(apk.size)} • v{apk.version} {isInstalled && <Text style={{ color: '#10B981', fontSize: 10 }}>(Installed)</Text>}
												</Text>
											</View>

											<View style={styles.apkActions}>
												<Pressable
													onPress={() => installApk(apk.uri)}
													style={[styles.apkBtn, styles.installApkBtn, { backgroundColor: '#10B981' }]}
													accessibilityRole="button"
													accessibilityLabel={`Install ${apk.name}`}
												>
													<Text style={styles.apkBtnText}>{translate('updates_install_btn', 'Install')}</Text>
												</Pressable>

												<Pressable
													onPress={() => deleteApk(apk.uri)}
													style={[styles.apkBtn, styles.deleteApkBtn, { backgroundColor: colors.error || '#EF4444' }]}
													accessibilityRole="button"
													accessibilityLabel={`Delete ${apk.name}`}
												>
													<Text style={styles.apkBtnText}>{translate('updates_delete_btn', 'Delete')}</Text>
												</Pressable>
											</View>
										</View>
									)
								})}
							</View>
						)}
					</View>
				)}
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: '#000000' }]}>
			<SmartScreenHeader title={translate('updates_title', 'App Updates')} showBackButton={true} onBackPress={handleBack} />

			<ScrollView style={styles.scrollBody} contentContainerStyle={styles.scrollContent}>
				{isTabletOrWeb ? (
					<View style={styles.rowLayout}>
						<View style={styles.colLeft}>{renderMainContent()}</View>
						<View style={styles.colRight}>{renderActions()}</View>
					</View>
				) : (
					<View style={styles.columnLayout}>
						{renderMainContent()}
						{renderActions()}
					</View>
				)}
			</ScrollView>

			{/* Custom Toast Alert */}
			{toastMsg && (
				<View style={[styles.toastContainer, { backgroundColor: colors.surface || '#1C2541', borderColor: colors.primary || '#0EA5E9' }]}>
					<Text style={[styles.toastText, { color: colors.text || '#F8FAFC' }]}>{toastMsg}</Text>
				</View>
			)}

			{/* Android Android APK Share Sheet Dialog */}
			<Modal visible={shareModalVisible} transparent animationType="fade" onRequestClose={() => setShareModalVisible(false)}>
				<Pressable style={styles.modalBackdrop} onPress={() => setShareModalVisible(false)}>
					<View style={[styles.modalContent, { backgroundColor: colors.card || '#1C2541', borderColor: colors.border || '#3A506B' }]}>
						<Text style={[styles.modalTitle, { color: colors.text || '#F8FAFC' }]}>{translate('updates_share_title', 'Share Update')}</Text>
						<Text style={[styles.modalPrompt, { color: colors.textSecondary || '#94A3B8' }]}>{translate('updates_share_prompt', 'How would you like to share the update?')}</Text>

						<View style={styles.modalActions}>
							<Pressable onPress={shareOnlyUrl} style={[styles.modalBtn, { borderColor: colors.primary || '#0EA5E9', borderWidth: 1 }]}>
								<Text style={[styles.modalBtnText, { color: colors.primary || '#0EA5E9' }]}>{translate('updates_share_url', 'Share Download URL')}</Text>
							</Pressable>

							<Pressable onPress={shareApkFile} style={[styles.modalBtn, { backgroundColor: colors.primary || '#0EA5E9' }]}>
								<Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>{translate('updates_share_apk', 'Share APK File')}</Text>
							</Pressable>

							<Pressable onPress={() => setShareModalVisible(false)} style={[styles.modalBtn, { backgroundColor: '#1E293B', marginTop: 10 }]}>
								<Text style={[styles.modalBtnText, { color: colors.textSecondary || '#94A3B8' }]}>{translate('cancel', 'Cancel')}</Text>
							</Pressable>
						</View>
					</View>
				</Pressable>
			</Modal>

			{/* Quick Share Tip Dialog */}
			<Modal visible={quickShareModalVisible} transparent animationType="fade" onRequestClose={() => setQuickShareModalVisible(false)}>
				<Pressable style={styles.modalBackdrop} onPress={() => setQuickShareModalVisible(false)}>
					<View style={[styles.modalContent, { backgroundColor: colors.card || '#1C2541', borderColor: colors.border || '#3A506B' }]}>
						<View style={styles.modalHeaderIconContainer}>
							<Ionicons name="flash-outline" size={40} color="#F59E0B" />
						</View>
						<Text style={[styles.modalTitle, { color: colors.text || '#F8FAFC', textAlign: 'center' }]}>{translate('updates_quick_share_title', 'Fast Sharing')}</Text>
						<Text style={[styles.modalPrompt, { color: colors.textSecondary || '#94A3B8', textAlign: 'center' }]}>
							{translate('updates_quick_share_desc', 'We recommend using Quick Share or Wi-Fi Direct for faster local transfers to other devices.')}
						</Text>

						<View style={styles.modalActions}>
							<Pressable onPress={proceedSharingApkFile} style={[styles.modalBtn, { backgroundColor: colors.primary || '#0EA5E9' }]}>
								<Text style={[styles.modalBtnText, { color: '#FFFFFF' }]}>{translate('continue', 'Continue')}</Text>
							</Pressable>

							<Pressable onPress={() => setQuickShareModalVisible(false)} style={[styles.modalBtn, { backgroundColor: '#1E293B', marginTop: 10 }]}>
								<Text style={[styles.modalBtnText, { color: colors.textSecondary || '#94A3B8' }]}>{translate('cancel', 'Cancel')}</Text>
							</Pressable>
						</View>
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
	scrollBody: {
		flex: 1
	},
	scrollContent: {
		padding: 16
	},
	columnLayout: {
		flexDirection: 'column',
		gap: 16
	},
	rowLayout: {
		flexDirection: 'row',
		gap: 16
	},
	colLeft: {
		flex: 3,
		gap: 16
	},
	colRight: {
		flex: 2,
		gap: 16
	},
	cardContainer: {
		width: '100%',
		gap: 16
	},
	infoCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 20
	},
	infoRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 4
	},
	infoTextContainer: {
		marginLeft: 16,
		flex: 1
	},
	infoLabel: {
		fontSize: 12,
		fontWeight: '500'
	},
	infoValue: {
		fontSize: 16,
		fontWeight: '600',
		marginTop: 2
	},
	divider: {
		height: 1,
		marginVertical: 14,
		opacity: 0.5
	},
	metaGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		marginTop: 4,
		gap: 16
	},
	metaItem: {
		minWidth: '45%',
		flex: 1
	},
	metaLabel: {
		fontSize: 11,
		fontWeight: '500'
	},
	metaValue: {
		fontSize: 14,
		fontWeight: '600',
		marginTop: 2
	},
	changelogCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 20
	},
	changelogTitle: {
		fontSize: 16,
		fontWeight: '700',
		marginBottom: 12
	},
	changelogScroll: {
		maxHeight: 200,
		minHeight: 100
	},
	changelogText: {
		fontSize: 13,
		lineHeight: 20
	},
	actionsCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 20
	},
	progressContainer: {
		marginBottom: 16
	},
	progressRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8
	},
	progressLabel: {
		fontSize: 13,
		fontWeight: '600'
	},
	progressPercent: {
		fontSize: 13,
		fontWeight: '700'
	},
	progressBarTrack: {
		height: 8,
		borderRadius: 4,
		overflow: 'hidden',
		width: '100%'
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 4
	},
	cancelBtn: {
		borderWidth: 1,
		borderRadius: 8,
		paddingVertical: 6,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 12
	},
	cancelBtnText: {
		fontSize: 12,
		fontWeight: '600'
	},
	btnStack: {
		gap: 12
	},
	actionBtn: {
		height: 48,
		borderRadius: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		width: '100%'
	},
	actionBtnText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '600'
	},
	shareBtn: {
		height: 48,
		borderRadius: 12,
		borderWidth: 1.5,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		width: '100%',
		backgroundColor: 'transparent'
	},
	shareBtnText: {
		fontSize: 15,
		fontWeight: '600'
	},
	checkUpdatesBtn: {
		height: 48,
		borderRadius: 12,
		borderWidth: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		width: '100%'
	},
	checkUpdatesBtnText: {
		fontSize: 15,
		fontWeight: '500'
	},
	btnIcon: {
		marginRight: 8
	},
	apkListCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 20
	},
	apkListTitle: {
		fontSize: 16,
		fontWeight: '700',
		marginBottom: 14
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 24,
		gap: 8
	},
	emptyText: {
		fontSize: 12,
		textAlign: 'center'
	},
	apkList: {
		gap: 12
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
		marginRight: 12
	},
	apkName: {
		fontSize: 13,
		fontWeight: '600'
	},
	apkMeta: {
		fontSize: 11,
		marginTop: 2
	},
	apkActions: {
		flexDirection: 'row',
		gap: 8
	},
	apkBtn: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center'
	},
	installApkBtn: {},
	deleteApkBtn: {},
	apkBtnText: {
		color: '#FFFFFF',
		fontSize: 11,
		fontWeight: '600'
	},
	toastContainer: {
		position: 'absolute',
		bottom: 32,
		alignSelf: 'center',
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderRadius: 24,
		borderWidth: 1,
		...Platform.select({
			ios: {
				shadowColor: '#000000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.3,
				shadowRadius: 4
			},
			android: {
				elevation: 6
			},
			web: {
				boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)' as any
			}
		})
	},
	toastText: {
		fontSize: 13,
		fontWeight: '600',
		textAlign: 'center'
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.75)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 24
	},
	modalContent: {
		borderRadius: 20,
		borderWidth: 1,
		padding: 24,
		width: '100%',
		maxWidth: 400
	},
	modalHeaderIconContainer: {
		alignSelf: 'center',
		marginBottom: 16
	},
	modalTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 10
	},
	modalPrompt: {
		fontSize: 14,
		lineHeight: 20,
		marginBottom: 20
	},
	modalActions: {
		gap: 12
	},
	modalBtn: {
		height: 44,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		width: '100%'
	},
	modalBtnText: {
		fontSize: 14,
		fontWeight: '600'
	}
})
