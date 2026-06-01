import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Modal, Dimensions, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useUpdates, isVersionHigher } from '@/core/updates/UpdatesContext'
import { SmartScreenHeader } from '@/core/smart-screen-header'
import { useTheme } from '@/core/theme'
import { useRouter } from 'expo-router'
import { toast } from '@/features/common/Toast'
import * as Clipboard from 'expo-clipboard'
import { log } from '@/core/log'
import { APP_VERSION } from '@/config'

export const UpdatesScreen: React.FC = () => {
	const router = useRouter()
	const { colors } = useTheme()
	const { width } = useWindowDimensions()
	const isTablet = width >= 768

	const {
		startupRedirect,
		status,
		error,
		updateInfo,
		cachedApk,
		downloadedApks,
		downloadProgress,
		freeStorageSize,
		checkForUpdates,
		downloadUpdate,
		cancelDownload,
		installUpdate,
		deleteCache,
		shareUpdate,
		skipStartupRedirect
	} = useUpdates()

	const [isCheckingManual, setIsCheckingManual] = useState(false)
	const [showChoiceModal, setShowChoiceModal] = useState(false)
	const [showQuickShareModal, setShowQuickShareModal] = useState(false)

	// Semver condition check: is current installed version strictly higher than latest release version?
	const isCurrentHigher = updateInfo ? isVersionHigher(APP_VERSION, updateInfo.latest_version) : false

	// Format helpers
	const formatMB = (bytes?: number) => {
		if (!bytes) return '0.00 MB'
		return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
	}

	const formatDate = (isoString?: string) => {
		if (!isoString) return 'N/A'
		try {
			return new Date(isoString).toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			})
		} catch (e) {
			return isoString
		}
	}

	// Trigger update checking manually
	const handleCheckForUpdates = async () => {
		setIsCheckingManual(true)
		try {
			const info = await checkForUpdates(true)
			if (info) {
				toast.show({
					title: 'Check Complete',
					message: 'Fetched latest release details.',
					color: '#10B981'
				})
			} else {
				toast.show({
					title: 'Offline',
					message: 'Could not connect to server.',
					color: '#EF4444'
				})
			}
		} catch (e) {
			log({ level: 'error', label: 'UpdatesScreen', message: 'Manual check failed', error: e })
		} finally {
			setIsCheckingManual(false)
		}
	}

	// Web specific copy URL
	const handleCopyUrl = async () => {
		if (updateInfo?.download_url) {
			await Clipboard.setStringAsync(updateInfo.download_url)
			toast.show({
				title: 'Copied',
				message: 'Download URL copied to clipboard!',
				color: '#10B981'
			})
		} else {
			toast.show({
				title: 'Error',
				message: 'No download URL available to copy.',
				color: '#EF4444'
			})
		}
	}

	// Web specific page refresh
	const handleWebRefresh = () => {
		if (Platform.OS === 'web') {
			window.location.reload()
		}
	}

	// Handle sharing popup on Android
	const handleSharePress = () => {
		if (!cachedApk) {
			shareUpdate('link')
			return
		}

		import('react-native').then(({ Alert }) => {
			Alert.alert('Share App Update', 'Would you like to share the download link or the cached APK installation file?', [
				{
					text: 'Cancel',
					style: 'cancel'
				},
				{
					text: 'Share Download Link',
					onPress: () => shareUpdate('link')
				},
				{
					text: 'Share APK File',
					onPress: () => {
						setShowQuickShareModal(true)
					}
				}
			])
		})
	}

	const confirmQuickShareAndShare = () => {
		setShowQuickShareModal(false)
		shareUpdate('file')
	}

	// Show startup choice modal if opened via startup redirect
	useEffect(() => {
		if (startupRedirect === '/updates' && updateInfo) {
			setShowChoiceModal(true)
		}
	}, [startupRedirect, updateInfo])

	const handleStartupInstallCache = async () => {
		setShowChoiceModal(false)
		skipStartupRedirect()
		await installUpdate()
	}

	const handleStartupDownloadNew = async () => {
		setShowChoiceModal(false)
		skipStartupRedirect()
		await downloadUpdate()
	}

	const handleStartupContinue = () => {
		setShowChoiceModal(false)
		skipStartupRedirect()
		router.replace('/(home)/feed')
	}

	// Dynamic action section based on platform & status
	const renderActionSection = () => {
		if (Platform.OS === 'web') {
			return (
				<View style={styles.actionBlock}>
					<TouchableOpacity
						style={[styles.primaryButton, { backgroundColor: isCurrentHigher ? colors.borderLight : colors.primary, opacity: isCurrentHigher ? 0.6 : 1 }]}
						onPress={() => updateInfo?.download_url && import('react-native').then(({ Linking }) => Linking.openURL(updateInfo.download_url))}
						disabled={!updateInfo?.download_url || isCurrentHigher}
					>
						<Ionicons name="download" size={18} color="#FFFFFF" />
						<Text style={styles.primaryButtonText}>Download APK</Text>
					</TouchableOpacity>

					<View style={styles.buttonRow}>
						<TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={handleCopyUrl}>
							<Ionicons name="copy-outline" size={16} color={colors.text} />
							<Text style={[styles.secondaryButtonText, { color: colors.text }]}>Copy Link</Text>
						</TouchableOpacity>

						<TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border, opacity: isCurrentHigher ? 0.5 : 1 }]} onPress={handleWebRefresh} disabled={isCurrentHigher}>
							<Ionicons name="refresh-outline" size={16} color={isCurrentHigher ? colors.textTertiary : colors.text} />
							<Text style={[styles.secondaryButtonText, { color: isCurrentHigher ? colors.textTertiary : colors.text }]}>Refresh</Text>
						</TouchableOpacity>
					</View>
				</View>
			)
		}

		// Android specific actions
		switch (status) {
			case 'downloading':
				return (
					<View style={styles.actionBlock}>
						<View style={styles.progressContainer}>
							<View style={styles.progressHeader}>
								<Text style={[styles.progressText, { color: colors.textSecondary }]}>Downloading update package...</Text>
								<Text style={[styles.percentText, { color: colors.primary }]}>{Math.round(downloadProgress * 100)}%</Text>
							</View>
							<View style={[styles.progressBarTrack, { backgroundColor: colors.borderLight }]}>
								<View style={[styles.progressBarFill, { backgroundColor: colors.primary, width: `${downloadProgress * 100}%` }]} />
							</View>
						</View>

						<TouchableOpacity style={styles.cancelButton} onPress={cancelDownload}>
							<Ionicons name="close-circle-outline" size={18} color="#EF4444" />
							<Text style={styles.cancelButtonText}>Cancel Download</Text>
						</TouchableOpacity>
					</View>
				)

			case 'completed':
			default:
				const isCacheReady = !!cachedApk
				return (
					<View style={styles.actionBlock}>
						{isCacheReady ? (
							<TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#10B981' }]} onPress={() => installUpdate()}>
								<Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
								<Text style={styles.primaryButtonText}>Install Update</Text>
							</TouchableOpacity>
						) : (
							<TouchableOpacity
								style={[styles.primaryButton, { backgroundColor: isCurrentHigher ? colors.borderLight : colors.primary, opacity: isCurrentHigher ? 0.6 : 1 }]}
								onPress={downloadUpdate}
								disabled={!updateInfo || isCurrentHigher}
							>
								<Ionicons name="download-outline" size={18} color="#FFFFFF" />
								<Text style={styles.primaryButtonText}>Download & Install</Text>
							</TouchableOpacity>
						)}

						<View style={styles.buttonRow}>
							<TouchableOpacity style={[styles.secondaryButton, { borderColor: colors.border }]} onPress={handleSharePress} disabled={!updateInfo}>
								<Ionicons name="share-social-outline" size={16} color={colors.text} />
								<Text style={[styles.secondaryButtonText, { color: colors.text }]}>Share</Text>
							</TouchableOpacity>

							{isCacheReady && (
								<TouchableOpacity style={[styles.secondaryButton, { borderColor: '#EF444420' }]} onPress={() => deleteCache()}>
									<Ionicons name="trash-outline" size={16} color="#EF4444" />
									<Text style={[styles.secondaryButtonText, { color: '#EF4444' }]}>Delete Cache</Text>
								</TouchableOpacity>
							)}
						</View>
					</View>
				)
		}
	}

	return (
		<View style={styles.container}>
			<SmartScreenHeader title="Software Updates" showBackButton={Platform.OS !== 'android' || startupRedirect !== '/updates'} onBackPress={() => router.back()} />

			<ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
				{/* Top Hero Section */}
				<View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.heroHeader}>
						<View style={[styles.iconWrapper, { backgroundColor: colors.primaryContainer }]}>
							<Ionicons name="cloud-download-outline" size={28} color={colors.primary} />
						</View>
						<View style={styles.heroTextContainer}>
							<Text style={[styles.appName, { color: colors.text }]}>Drinaluza</Text>
							<Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>Keep your business operations secure</Text>
						</View>
					</View>

					{/* Versions grid */}
					<View style={[styles.versionGrid, { borderTopColor: colors.borderLight }]}>
						<View style={styles.versionCol}>
							<Text style={[styles.versionLabel, { color: colors.textTertiary }]}>Installed Version</Text>
							<Text style={[styles.versionValue, { color: colors.text }]}>v{Platform.OS === 'web' ? '1.18.6' : APP_VERSION}</Text>
						</View>
						<View style={[styles.versionCol, { borderLeftColor: colors.borderLight, borderLeftWidth: 1 }]}>
							<Text style={[styles.versionLabel, { color: colors.textTertiary }]}>Latest Available</Text>
							<Text style={[styles.versionValue, { color: updateInfo ? colors.primary : colors.text }]}>{updateInfo ? updateInfo.latest_version : 'Checking...'}</Text>
						</View>
					</View>
				</View>

				{/* Check for updates button */}
				<TouchableOpacity style={[styles.checkButton, { borderColor: colors.border }]} onPress={handleCheckForUpdates} disabled={isCheckingManual || status === 'downloading'}>
					{isCheckingManual ? (
						<ActivityIndicator size="small" color={colors.primary} />
					) : (
						<>
							<Ionicons name="sync-outline" size={16} color={colors.primary} />
							<Text style={[styles.checkButtonText, { color: colors.text }]}>Check for Updates</Text>
						</>
					)}
				</TouchableOpacity>

				{/* Main Info Blocks */}
				{updateInfo ? (
					<View style={[styles.layoutWrapper, { flexDirection: isTablet ? 'row' : 'column', gap: 16 }]}>
						{/* Stats & Actions Area */}
						<View style={[styles.detailsSection, { flex: isTablet ? 1.2 : undefined }]}>
							<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Release Details</Text>

							<View style={styles.statsGrid}>
								<View style={[styles.statItem, { backgroundColor: colors.card }]}>
									<Ionicons name="document-text-outline" size={16} color={colors.primary} />
									<Text style={[styles.statVal, { color: colors.text }]} numberOfLines={1}>
										{updateInfo.name}
									</Text>
									<Text style={[styles.statLbl, { color: colors.textTertiary }]}>Release Name</Text>
								</View>

								<View style={[styles.statItem, { backgroundColor: colors.card }]}>
									<Ionicons name="calendar-outline" size={16} color={colors.primary} />
									<Text style={[styles.statVal, { color: colors.text }]}>{formatDate(updateInfo.published_at)}</Text>
									<Text style={[styles.statLbl, { color: colors.textTertiary }]}>Published Date</Text>
								</View>

								<View style={[styles.statItem, { backgroundColor: colors.card }]}>
									<Ionicons name="save-outline" size={16} color={colors.primary} />
									<Text style={[styles.statVal, { color: colors.text }]}>{formatMB(updateInfo.size)}</Text>
									<Text style={[styles.statLbl, { color: colors.textTertiary }]}>File Size</Text>
								</View>

								{Platform.OS === 'android' && (
									<View style={[styles.statItem, { backgroundColor: colors.card }]}>
										<Ionicons name="disc-outline" size={16} color={colors.primary} />
										<Text style={[styles.statVal, { color: colors.text }]}>{freeStorageSize !== null ? `${freeStorageSize} MB` : 'N/A'}</Text>
										<Text style={[styles.statLbl, { color: colors.textTertiary }]}>Free Space</Text>
									</View>
								)}

								<View style={[styles.statItem, { backgroundColor: colors.card }]}>
									<Ionicons name="stats-chart-outline" size={16} color={colors.primary} />
									<Text style={[styles.statVal, { color: colors.text }]}>{updateInfo.download_count}</Text>
									<Text style={[styles.statLbl, { color: colors.textTertiary }]}>Downloads</Text>
								</View>
							</View>

							{/* Actions Block */}
							{renderActionSection()}

							{/* Cache List Section (Downloaded APK Files with delete buttons) */}
							{Platform.OS === 'android' && downloadedApks.length > 0 && (
								<View style={styles.downloadedList}>
									<Text style={[styles.sectionTitle, { color: colors.textSecondary, marginTop: 12 }]}>Downloaded APK files</Text>

									{downloadedApks.map((apk) => (
										<View key={apk.uri} style={[styles.cacheCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
											<View style={styles.cacheHeader}>
												<Ionicons name="cube-outline" size={20} color={colors.primary} />
												<View style={styles.cacheInfo}>
													<Text style={[styles.cacheTitle, { color: colors.text }]}>{apk.filename}</Text>
													<Text style={[styles.cacheSubtitle, { color: colors.textSecondary }]}>
														{formatMB(apk.size)} • Version {apk.version}
													</Text>
												</View>
												<View style={styles.cacheActions}>
													<TouchableOpacity style={[styles.cacheDeleteBtn, { backgroundColor: '#10B98115', marginRight: 8 }]} onPress={() => installUpdate(apk.uri)}>
														<Ionicons name="checkmark-circle-outline" size={18} color="#10B981" />
													</TouchableOpacity>
													<TouchableOpacity style={styles.cacheDeleteBtn} onPress={() => deleteCache(apk.uri)}>
														<Ionicons name="trash-outline" size={18} color="#EF4444" />
													</TouchableOpacity>
												</View>
											</View>
										</View>
									))}
								</View>
							)}
						</View>

						{/* Whats New (Changelog) Area */}
						<View style={[styles.changelogSection, { flex: isTablet ? 1.8 : undefined }]}>
							<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>What's New</Text>
							<View style={[styles.changelogCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
								<ScrollView style={styles.changelogScroll} nestedScrollEnabled>
									<Text style={[styles.changelogText, { color: colors.text }]}>{updateInfo.changelog || 'No release notes provided for this release.'}</Text>
								</ScrollView>
							</View>
						</View>
					</View>
				) : error ? (
					<View style={styles.errorContainer}>
						<Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
						<Text style={[styles.errorTitle, { color: colors.text }]}>Failed to check updates</Text>
						<Text style={[styles.errorText, { color: colors.textSecondary }]}>{error}</Text>
						<TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={handleCheckForUpdates}>
							<Text style={styles.retryButtonText}>Retry</Text>
						</TouchableOpacity>
					</View>
				) : (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={colors.primary} />
						<Text style={[styles.loadingText, { color: colors.textSecondary }]}>Checking for updates...</Text>
					</View>
				)}
			</ScrollView>

			{/* GORGEOUS GLASSMORPHIC STARTUP CHOICES MODAL */}
			<Modal visible={showChoiceModal} transparent animationType="fade" onRequestClose={() => {}}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: '#0B132B', borderColor: colors.border }]}>
						<View style={[styles.modalHeaderIcon, { backgroundColor: colors.primaryContainer }]}>
							<Ionicons name="rocket-outline" size={32} color={colors.primary} />
						</View>

						<Text style={[styles.modalTitle, { color: colors.text }]}>New Update Available!</Text>
						<Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
							A newer software version <Text style={{ color: colors.primary, fontWeight: '700' }}>{updateInfo?.latest_version}</Text> is ready. We highly recommend updating to get the latest features
							and security improvements.
						</Text>

						<View style={styles.modalActions}>
							{/* Option 1: Install Cached APK if ready */}
							{!!cachedApk && (
								<TouchableOpacity style={[styles.modalOptionCard, { borderColor: '#10B98160', backgroundColor: '#10B98110' }]} onPress={handleStartupInstallCache}>
									<Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
									<View style={styles.optionTextCol}>
										<Text style={[styles.optionTitle, { color: colors.text }]}>Install Cached Update</Text>
										<Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Version {cachedApk.version} is already downloaded and ready to install.</Text>
									</View>
								</TouchableOpacity>
							)}

							{/* Option 2: Download Newer Version */}
							<TouchableOpacity style={[styles.modalOptionCard, { borderColor: '#0EA5E960', backgroundColor: '#0EA5E910' }]} onPress={handleStartupDownloadNew}>
								<Ionicons name="download-outline" size={20} color="#0EA5E9" />
								<View style={styles.optionTextCol}>
									<Text style={[styles.optionTitle, { color: colors.text }]}>Download & Install</Text>
									<Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Fetch the latest {updateInfo?.latest_version} package from the release servers.</Text>
								</View>
							</TouchableOpacity>

							{/* Option 3: Skip / Continue */}
							<TouchableOpacity style={[styles.modalOptionCard, { borderColor: '#334155', backgroundColor: '#1E293B30' }]} onPress={handleStartupContinue}>
								<Ionicons name="arrow-forward-outline" size={20} color="#94A3B8" />
								<View style={styles.optionTextCol}>
									<Text style={[styles.optionTitle, { color: colors.text }]}>Skip for Now</Text>
									<Text style={[styles.optionDesc, { color: colors.textSecondary }]}>Continue into the application without updating.</Text>
								</View>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* QUICK SHARE RECOMMENDATION MODAL */}
			<Modal visible={showQuickShareModal} transparent animationType="fade" onRequestClose={() => setShowQuickShareModal(false)}>
				<View style={styles.modalOverlay}>
					<View style={[styles.modalContent, { backgroundColor: '#0B132B', borderColor: colors.border }]}>
						<View style={[styles.modalHeaderIcon, { backgroundColor: '#F59E0B20' }]}>
							<Ionicons name="flash-outline" size={32} color="#F59E0B" />
						</View>

						<Text style={[styles.modalTitle, { color: colors.text }]}>Recommended Method</Text>
						<Text style={[styles.modalDesc, { color: colors.textSecondary, textAlign: 'center' }]}>
							For the fastest transfer of this APK installation package to another device, we highly recommend selecting <Text style={{ color: '#F59E0B', fontWeight: 'bold' }}>Quick Share</Text> (or
							Nearby Share) in the system share sheet that opens next.
						</Text>

						<View style={[styles.modalActions, { width: '100%', gap: 12, flexDirection: 'row' }]}>
							<TouchableOpacity style={[styles.flexButton, { backgroundColor: '#1E293B', borderColor: colors.border }]} onPress={() => setShowQuickShareModal(false)}>
								<Text style={[styles.flexButtonText, { color: colors.text }]}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity style={[styles.flexButton, { backgroundColor: '#F59E0B' }]} onPress={confirmQuickShareAndShare}>
								<Text style={[styles.flexButtonText, { color: '#000000', fontWeight: '700' }]}>Continue</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: '#000000'
	},
	scrollContainer: {
		padding: 16,
		paddingBottom: 40
	},
	heroCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 16,
		marginBottom: 16,
		overflow: 'hidden'
	},
	heroHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16
	},
	iconWrapper: {
		width: 56,
		height: 56,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 14
	},
	heroTextContainer: {
		flex: 1
	},
	appName: {
		fontSize: 22,
		fontWeight: '800',
		letterSpacing: -0.5
	},
	heroSubtitle: {
		fontSize: 13,
		marginTop: 2
	},
	versionGrid: {
		flexDirection: 'row',
		borderTopWidth: 1,
		paddingTop: 16
	},
	versionCol: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center'
	},
	versionLabel: {
		fontSize: 11,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 4
	},
	versionValue: {
		fontSize: 16,
		fontWeight: '700'
	},
	checkButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		borderWidth: 1,
		height: 48,
		width: '100%',
		gap: 8,
		marginBottom: 24,
		borderStyle: 'dashed'
	},
	checkButtonText: {
		fontSize: 14,
		fontWeight: '600'
	},
	layoutWrapper: {
		width: '100%'
	},
	detailsSection: {
		width: '100%'
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 1,
		marginBottom: 12
	},
	statsGrid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8,
		marginBottom: 16
	},
	statItem: {
		width: '48%',
		flexGrow: 1,
		borderRadius: 12,
		padding: 12,
		gap: 4
	},
	statVal: {
		fontSize: 14,
		fontWeight: '700',
		marginTop: 4
	},
	statLbl: {
		fontSize: 10,
		fontWeight: '600'
	},
	actionBlock: {
		gap: 10,
		marginBottom: 16
	},
	primaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		height: 52,
		gap: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.3,
		shadowRadius: 6,
		elevation: 4
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '700'
	},
	secondaryButton: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		borderWidth: 1,
		height: 46,
		gap: 6
	},
	secondaryButtonText: {
		fontSize: 13,
		fontWeight: '600'
	},
	buttonRow: {
		flexDirection: 'row',
		gap: 10
	},
	cancelButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#EF444440',
		height: 48,
		gap: 6,
		backgroundColor: '#EF444410'
	},
	cancelButtonText: {
		color: '#EF4444',
		fontSize: 14,
		fontWeight: '600'
	},
	progressContainer: {
		borderRadius: 12,
		padding: 12,
		backgroundColor: '#1C2541'
	},
	progressHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8
	},
	progressText: {
		fontSize: 12,
		fontWeight: '500'
	},
	percentText: {
		fontSize: 13,
		fontWeight: '700'
	},
	progressBarTrack: {
		height: 6,
		borderRadius: 3,
		width: '100%',
		overflow: 'hidden'
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 3
	},
	downloadedList: {
		width: '100%',
		gap: 8,
		marginBottom: 16
	},
	cacheCard: {
		borderRadius: 12,
		borderWidth: 1,
		padding: 12,
		marginTop: 8
	},
	cacheHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	cacheInfo: {
		flex: 1,
		marginLeft: 10,
		marginRight: 10
	},
	cacheTitle: {
		fontSize: 13,
		fontWeight: '700'
	},
	cacheSubtitle: {
		fontSize: 11,
		marginTop: 2
	},
	cacheActions: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	cacheDeleteBtn: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#EF444415',
		justifyContent: 'center',
		alignItems: 'center'
	},
	changelogSection: {
		width: '100%'
	},
	changelogCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 14,
		height: 250
	},
	changelogScroll: {
		flex: 1
	},
	changelogText: {
		fontSize: 13,
		lineHeight: 20
	},
	errorContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 30,
		gap: 12
	},
	errorTitle: {
		fontSize: 16,
		fontWeight: '700'
	},
	errorText: {
		fontSize: 13,
		textAlign: 'center'
	},
	retryButton: {
		borderRadius: 10,
		height: 40,
		paddingHorizontal: 24,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 8
	},
	retryButtonText: {
		color: '#FFFFFF',
		fontWeight: '700',
		fontSize: 13
	},
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 40,
		gap: 16
	},
	loadingText: {
		fontSize: 14
	},
	// Modals layout
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(3, 7, 18, 0.85)',
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20
	},
	modalContent: {
		width: '100%',
		maxWidth: 440,
		borderRadius: 24,
		borderWidth: 1,
		padding: 24,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 10 },
		shadowOpacity: 0.5,
		shadowRadius: 15,
		elevation: 10
	},
	modalHeaderIcon: {
		width: 64,
		height: 64,
		borderRadius: 20,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16
	},
	modalTitle: {
		fontSize: 20,
		fontWeight: '800',
		letterSpacing: -0.5,
		marginBottom: 8,
		textAlign: 'center'
	},
	modalDesc: {
		fontSize: 13,
		lineHeight: 20,
		textAlign: 'center',
		marginBottom: 24
	},
	modalActions: {
		width: '100%',
		gap: 10
	},
	modalOptionCard: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 16,
		borderWidth: 1,
		padding: 14,
		gap: 12
	},
	optionTextCol: {
		flex: 1
	},
	optionTitle: {
		fontSize: 14,
		fontWeight: '700'
	},
	optionDesc: {
		fontSize: 11,
		marginTop: 2,
		lineHeight: 15
	},
	flexButton: {
		flex: 1,
		borderRadius: 12,
		height: 48,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		borderColor: 'transparent'
	},
	flexButtonText: {
		fontSize: 14
	}
})
