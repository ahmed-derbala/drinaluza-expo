import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert, BackHandler, useWindowDimensions } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useUpdates, parseVersion } from '@/core/updates'
import { useTheme } from '@/core/theme'
import { APP_VERSION } from '@/config'
import { toast } from '@/features/common/Toast'
import { useUser } from '@/core/contexts/UserContext'
import { SmartScreenHeader } from '@/core/smart-screen-header'
import { useSmartKebabMenu } from '@/core/smart-kebab-menu'

export default function UpdatesScreen() {
	const { colors } = useTheme()
	const { translate } = useUser()
	const router = useRouter()
	const { width } = useWindowDimensions()
	const isWide = width >= 768

	const {
		isChecking,
		updateAvailable,
		updateType,
		latestUpdate,
		downloadProgress,
		downloading,
		cachedApk,
		error,
		freeStorage,
		checkForUpdates,
		downloadUpdate,
		cancelDownload,
		installUpdate,
		deleteCachedApk,
		shareUpdate,
		loadFreeStorage
	} = useUpdates()

	const [hasShownStartupAlert, setHasShownStartupAlert] = useState(false)

	// Block back navigation on Android if the update is REQUIRED
	useEffect(() => {
		if (Platform.OS !== 'android') return

		const onBackPress = () => {
			if (updateType === 'REQUIRED') {
				Alert.alert(
					translate('update_required_title', 'Required Update'),
					translate('update_required_message_block', 'This update is required to continue using the application. Please install the update or exit.'),
					[
						{ text: translate('exit_app', 'Exit App'), onPress: () => BackHandler.exitApp() },
						{ text: translate('ok', 'OK'), style: 'cancel' }
					]
				)
				return true // Blocks standard back action
			}
			return false
		}

		BackHandler.addEventListener('hardwareBackPress', onBackPress)
		return () => BackHandler.removeEventListener('hardwareBackPress', onBackPress)
	}, [updateType, translate])

	// Automatically load free disk storage and trigger startup dialogs
	useEffect(() => {
		loadFreeStorage()
	}, [loadFreeStorage])

	useEffect(() => {
		if (Platform.OS === 'web' || hasShownStartupAlert || isChecking) return
		if (!updateAvailable || !latestUpdate) return

		setHasShownStartupAlert(true)

		const hasCached = !!cachedApk?.localUri

		if (updateType === 'REQUIRED') {
			Alert.alert(
				translate('required_update_available', 'Required Update Available'),
				translate('required_update_desc', 'A new required version is available. Please download and install the update to continue.'),
				[
					{
						text: translate('download_now', 'Download & Install'),
						onPress: () => downloadUpdate().then((uri) => uri && installUpdate(uri))
					},
					{
						text: translate('exit_app', 'Exit App'),
						onPress: () => BackHandler.exitApp(),
						style: 'destructive'
					}
				],
				{ cancelable: false }
			)
		} else if (updateType === 'OPTIONAL') {
			const optionalButtons = [
				{
					text: translate('download_now', 'Download'),
					onPress: () => downloadUpdate()
				}
			]

			if (hasCached) {
				optionalButtons.push({
					text: `${translate('install', 'Install')} (v${cachedApk.version})`,
					onPress: () => installUpdate()
				})
			}

			optionalButtons.push({
				text: translate('continue_to_app', 'Later'),
				onPress: () => router.replace('/(home)/feed'),
				style: 'cancel' as any
			})

			Alert.alert(translate('new_update_available', 'New Update Available'), translate('optional_update_desc', 'A new optional update is available. What would you like to do?'), optionalButtons)
		}
	}, [updateAvailable, updateType, latestUpdate, cachedApk, isChecking, hasShownStartupAlert, downloadUpdate, installUpdate, router, translate])

	const handleCheck = async () => {
		try {
			const res = await checkForUpdates(true)
			if (res) {
				toast.show({
					title: translate('success', 'Success'),
					message: translate('update_info_refreshed', 'Refreshed update details!'),
					color: '#10B981'
				})
			} else {
				toast.show({
					title: translate('info', 'Info'),
					message: translate('already_latest', 'You are already running the latest version.'),
					color: '#3B82F6'
				})
			}
		} catch (err: any) {
			toast.show({
				title: translate('error', 'Error'),
				message: err.message || translate('check_failed', 'Failed to check for updates'),
				color: '#EF4444'
			})
		}
	}

	useSmartKebabMenu([
		{
			key: 'check-updates',
			label: translate('checking_for_updates', 'Check for updates...'),
			icon: 'sync-outline',
			onPress: handleCheck,
			disabled: isChecking || downloading,
			loading: isChecking
		}
	])

	const handleDownload = async () => {
		if (Platform.OS === 'web') {
			if (latestUpdate?.download_url) {
				window.open(latestUpdate.download_url, '_blank')
			}
			return
		}

		const uri = await downloadUpdate()
		if (uri) {
			toast.show({
				title: translate('success', 'Success'),
				message: translate('download_complete', 'Download complete! Ready to install.'),
				color: '#10B981'
			})
		}
	}

	const handleWebRefresh = () => {
		if (Platform.OS === 'web') {
			window.location.reload()
		}
	}

	// Format size in MB
	const formattedSize = useMemo(() => {
		if (!latestUpdate?.size) return 'N/A'
		return `${(latestUpdate.size / (1024 * 1024)).toFixed(1)} MB`
	}, [latestUpdate])

	// Format published date
	const formattedDate = useMemo(() => {
		if (!latestUpdate?.published_at) return 'N/A'
		try {
			const d = new Date(latestUpdate.published_at)
			return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
		} catch (e) {
			return latestUpdate.published_at
		}
	}, [latestUpdate])

	return (
		<View style={[styles.container, { backgroundColor: '#000000' }]}>
			<SmartScreenHeader
				title={translate('updates', 'Updates')}
				subtitle={translate('manage_app_version', 'Manage App Version')}
				showBackButton={updateType !== 'REQUIRED'}
				onBackPress={() => router.replace('/(home)/feed')}
				loading={isChecking}
				headerRight={<SmartScreenHeader.Action iconName="refresh" onPress={handleCheck} disabled={isChecking || downloading} accessibilityLabel="Check for updates" />}
			/>

			<ScrollView contentContainerStyle={[styles.scrollContent, isWide && styles.wideContainer]}>
				{/* Sleek Gradient Title Card */}
				<LinearGradient colors={['#0F172A', '#020617']} style={[styles.glassCard, { borderColor: updateType === 'REQUIRED' ? '#EF4444' : colors.primary }]}>
					<View style={styles.cardHeader}>
						<Ionicons name={updateAvailable ? 'cloud-download-outline' : 'checkmark-circle-outline'} size={44} color={updateType === 'REQUIRED' ? '#EF4444' : colors.primary} />
						<View style={styles.cardHeaderInfo}>
							<Text style={styles.appTitle}>Drinaluza App</Text>
							<Text style={styles.versionStatus}>
								{translate('current', 'Current')}: v{APP_VERSION}
							</Text>
						</View>
					</View>

					{updateAvailable && latestUpdate ? (
						<View style={styles.updateAvailableBox}>
							<View style={[styles.badge, { backgroundColor: updateType === 'REQUIRED' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(14, 165, 233, 0.15)' }]}>
								<Text style={[styles.badgeText, { color: updateType === 'REQUIRED' ? '#EF4444' : '#0EA5E9' }]}>
									{updateType === 'REQUIRED' ? translate('required_update', 'REQUIRED UPDATE') : translate('optional_update', 'OPTIONAL UPDATE')}
								</Text>
							</View>
							<Text style={styles.updateMessage}>
								{updateType === 'REQUIRED'
									? translate('required_msg', 'A new required update is available. Please update your app to continue using it.')
									: translate('optional_msg', 'A new update is available. You can update your app to continue using it.')}
							</Text>
						</View>
					) : (
						<Text style={styles.upToDateText}>{translate('up_to_date_msg', 'Your application is fully up to date.')}</Text>
					)}
				</LinearGradient>

				{/* Update Information Table */}
				{updateAvailable && latestUpdate && (
					<View style={styles.glassCard}>
						<Text style={styles.sectionTitle}>{translate('update_details', 'Update Details')}</Text>

						<View style={styles.grid}>
							<View style={styles.gridItem}>
								<Ionicons name="git-branch-outline" size={18} color={colors.textSecondary} />
								<View style={styles.gridItemText}>
									<Text style={styles.gridLabel}>{translate('new_version', 'Latest Version')}</Text>
									<Text style={styles.gridValue}>v{latestUpdate.latest_version}</Text>
								</View>
							</View>

							<View style={styles.gridItem}>
								<Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
								<View style={styles.gridItemText}>
									<Text style={styles.gridLabel}>{translate('published_at', 'Release Date')}</Text>
									<Text style={styles.gridValue}>{formattedDate}</Text>
								</View>
							</View>

							<View style={styles.gridItem}>
								<Ionicons name="document-attach-outline" size={18} color={colors.textSecondary} />
								<View style={styles.gridItemText}>
									<Text style={styles.gridLabel}>{translate('file_size', 'Size')}</Text>
									<Text style={styles.gridValue}>{formattedSize}</Text>
								</View>
							</View>

							<View style={styles.gridItem}>
								<Ionicons name="download-outline" size={18} color={colors.textSecondary} />
								<View style={styles.gridItemText}>
									<Text style={styles.gridLabel}>{translate('downloads_count', 'Downloads')}</Text>
									<Text style={styles.gridValue}>{latestUpdate.download_count}</Text>
								</View>
							</View>

							{Platform.OS !== 'web' && (
								<View style={[styles.gridItem, { width: '100%' }]}>
									<Ionicons name="save-outline" size={18} color={colors.textSecondary} />
									<View style={styles.gridItemText}>
										<Text style={styles.gridLabel}>{translate('free_disk_space', 'Device Free Storage')}</Text>
										<Text style={styles.gridValue}>{freeStorage > 1024 ? `${(freeStorage / 1024).toFixed(2)} GB` : `${freeStorage} MB`}</Text>
									</View>
								</View>
							)}
						</View>
					</View>
				)}

				{/* Active Download Progress Row */}
				{downloading && downloadProgress >= 0 && (
					<View style={styles.glassCard}>
						<View style={styles.progressRow}>
							<Text style={styles.progressLabel}>{translate('downloading_progress', 'Downloading update')}...</Text>
							<Text style={styles.progressValue}>{Math.round(downloadProgress * 100)}%</Text>
						</View>
						<View style={styles.progressTrack}>
							<View style={[styles.progressBar, { width: `${downloadProgress * 100}%`, backgroundColor: colors.primary }]} />
						</View>
						<TouchableOpacity style={styles.cancelButton} onPress={cancelDownload}>
							<Ionicons name="close-circle-outline" size={16} color="#EF4444" />
							<Text style={styles.cancelText}>{translate('cancel', 'Cancel')}</Text>
						</TouchableOpacity>
					</View>
				)}

				{/* Direct Install & Actions Panel */}
				{updateAvailable && latestUpdate && (
					<View style={styles.actionCard}>
						{Platform.OS === 'web' ? (
							<View style={styles.rowActions}>
								{updateType === 'REQUIRED' ? (
									<TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={handleWebRefresh}>
										<Ionicons name="refresh-outline" size={20} color="#FFFFFF" />
										<Text style={styles.buttonText}>{translate('refresh_web', 'Refresh Page to Update')}</Text>
									</TouchableOpacity>
								) : (
									<TouchableOpacity style={[styles.primaryButton, { flex: 1 }]} onPress={handleDownload}>
										<Ionicons name="open-outline" size={20} color="#FFFFFF" />
										<Text style={styles.buttonText}>{translate('open_download', 'Download APK')}</Text>
									</TouchableOpacity>
								)}
								<TouchableOpacity style={styles.secondaryButton} onPress={shareUpdate}>
									<Ionicons name="share-social-outline" size={20} color={colors.text} />
								</TouchableOpacity>
							</View>
						) : (
							<View style={styles.columnActions}>
								{cachedApk && cachedApk.version === latestUpdate.latest_version ? (
									<TouchableOpacity style={styles.primaryButton} onPress={() => installUpdate()}>
										<Ionicons name="cube-outline" size={20} color="#FFFFFF" />
										<Text style={styles.buttonText}>{translate('install_now', 'Install Update')}</Text>
									</TouchableOpacity>
								) : (
									<TouchableOpacity style={[styles.primaryButton, downloading && styles.buttonDisabled]} disabled={downloading} onPress={handleDownload}>
										<Ionicons name="download-outline" size={20} color="#FFFFFF" />
										<Text style={styles.buttonText}>{downloading ? translate('downloading', 'Downloading...') : translate('download_install', 'Download APK')}</Text>
									</TouchableOpacity>
								)}

								<View style={styles.rowActions}>
									<TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={shareUpdate}>
										<Ionicons name="share-social-outline" size={20} color={colors.text} />
										<Text style={styles.secondaryButtonText}>{translate('share', 'Share Update')}</Text>
									</TouchableOpacity>

									{updateType !== 'REQUIRED' && (
										<TouchableOpacity style={[styles.secondaryButton, { flex: 1 }]} onPress={() => router.replace('/(home)/feed')}>
											<Ionicons name="arrow-forward-outline" size={20} color={colors.text} />
											<Text style={styles.secondaryButtonText}>{translate('later', 'Skip & Open App')}</Text>
										</TouchableOpacity>
									)}
								</View>
							</View>
						)}
					</View>
				)}

				{/* APK Local Cache Info */}
				{Platform.OS !== 'web' && cachedApk && (
					<View style={styles.glassCard}>
						<Text style={styles.sectionTitle}>{translate('local_cache', 'Local Storage Cache')}</Text>
						<View style={styles.cacheRow}>
							<Ionicons name="archive-outline" size={24} color={colors.textSecondary} />
							<View style={styles.cacheInfo}>
								<Text style={styles.cacheTitle}>drinaluza-{cachedApk.version}.apk</Text>
								<Text style={styles.cacheSubtitle}>{translate('ready_to_install', 'Ready to install offline')}</Text>
							</View>
							<View style={styles.cacheActions}>
								<TouchableOpacity style={styles.cacheActionButton} onPress={() => installUpdate(cachedApk.localUri)}>
									<Ionicons name="cube-outline" size={20} color={colors.primary} />
								</TouchableOpacity>
								<TouchableOpacity style={styles.cacheActionButton} onPress={deleteCachedApk}>
									<Ionicons name="trash-outline" size={20} color="#EF4444" />
								</TouchableOpacity>
							</View>
						</View>
					</View>
				)}

				{/* Changelog "What's New" display */}
				{updateAvailable && latestUpdate && latestUpdate.changelog ? (
					<View style={styles.glassCard}>
						<Text style={styles.sectionTitle}>{translate('whats_new', "What's New")}</Text>
						<View style={styles.changelogBox}>
							<Text style={[styles.changelogText, { color: colors.textSecondary }]}>{latestUpdate.changelog}</Text>
						</View>
					</View>
				) : null}

				{error && <Text style={styles.errorText}>{error}</Text>}
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		padding: 20,
		paddingBottom: 60,
		gap: 16
	},
	wideContainer: {
		maxWidth: 680,
		alignSelf: 'center',
		width: '100%'
	},
	glassCard: {
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		borderColor: '#1E293B',
		backgroundColor: '#0F172A',
		overflow: 'hidden'
	},
	actionCard: {
		gap: 12
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		marginBottom: 12
	},
	cardHeaderInfo: {
		flex: 1
	},
	appTitle: {
		fontSize: 20,
		fontWeight: '700',
		color: '#FFFFFF',
		letterSpacing: -0.3
	},
	versionStatus: {
		fontSize: 14,
		color: '#64748B',
		marginTop: 2
	},
	updateAvailableBox: {
		marginTop: 4,
		gap: 10
	},
	badge: {
		alignSelf: 'flex-start',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6
	},
	badgeText: {
		fontSize: 11,
		fontWeight: '700',
		letterSpacing: 0.5
	},
	updateMessage: {
		fontSize: 15,
		color: '#94A3B8',
		lineHeight: 22
	},
	upToDateText: {
		fontSize: 15,
		color: '#94A3B8',
		marginTop: 4
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: '#64748B',
		textTransform: 'uppercase',
		letterSpacing: 0.5,
		marginBottom: 14
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 12
	},
	gridItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		width: '47%',
		backgroundColor: 'rgba(255,255,255,0.02)',
		padding: 10,
		borderRadius: 10,
		borderWidth: 0.5,
		borderColor: 'rgba(255,255,255,0.05)'
	},
	gridItemText: {
		flex: 1
	},
	gridLabel: {
		fontSize: 11,
		color: '#64748B'
	},
	gridValue: {
		fontSize: 13,
		fontWeight: '600',
		color: '#F8FAFC',
		marginTop: 2
	},
	progressRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8
	},
	progressLabel: {
		fontSize: 14,
		color: '#F8FAFC',
		fontWeight: '500'
	},
	progressValue: {
		fontSize: 14,
		color: '#F8FAFC',
		fontWeight: '700'
	},
	progressTrack: {
		height: 6,
		borderRadius: 3,
		backgroundColor: '#1E293B',
		overflow: 'hidden',
		width: '100%'
	},
	progressBar: {
		height: '100%',
		borderRadius: 3
	},
	cancelButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		alignSelf: 'flex-end',
		marginTop: 10,
		padding: 4
	},
	cancelText: {
		fontSize: 13,
		color: '#EF4444',
		fontWeight: '600'
	},
	primaryButton: {
		backgroundColor: '#0EA5E9',
		height: 48,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row',
		gap: 10,
		...Platform.select({
			web: {
				cursor: 'pointer' as any
			}
		})
	},
	secondaryButton: {
		height: 48,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: '#1E293B',
		backgroundColor: '#0F172A',
		justifyContent: 'center',
		alignItems: 'center',
		flexDirection: 'row',
		gap: 8,
		paddingHorizontal: 16,
		...Platform.select({
			web: {
				cursor: 'pointer' as any
			}
		})
	},
	buttonDisabled: {
		opacity: 0.5
	},
	buttonText: {
		color: '#FFFFFF',
		fontWeight: '600',
		fontSize: 15
	},
	secondaryButtonText: {
		color: '#F8FAFC',
		fontWeight: '600',
		fontSize: 14
	},
	columnActions: {
		gap: 10
	},
	rowActions: {
		flexDirection: 'row',
		gap: 10
	},
	cacheRow: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(255,255,255,0.02)',
		padding: 12,
		borderRadius: 12,
		borderWidth: 0.5,
		borderColor: 'rgba(255,255,255,0.05)',
		gap: 12
	},
	cacheInfo: {
		flex: 1
	},
	cacheTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#F8FAFC'
	},
	cacheSubtitle: {
		fontSize: 12,
		color: '#64748B',
		marginTop: 2
	},
	cacheActions: {
		flexDirection: 'row',
		gap: 4
	},
	cacheActionButton: {
		padding: 8,
		borderRadius: 8,
		backgroundColor: 'rgba(255,255,255,0.04)'
	},
	changelogBox: {
		backgroundColor: 'rgba(255,255,255,0.01)',
		borderRadius: 8,
		padding: 10,
		borderWidth: 0.5,
		borderColor: 'rgba(255,255,255,0.04)'
	},
	changelogText: {
		fontSize: 13,
		lineHeight: 20,
		fontFamily: Platform.select({ ios: 'CourierNewPSMT', android: 'monospace', web: 'monospace' })
	},
	errorText: {
		color: '#EF4444',
		textAlign: 'center',
		fontSize: 14,
		marginTop: 8
	}
})
