import React, { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, Platform, Alert, useWindowDimensions, Share } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'
import { useTheme, AppThemeColors } from '@/core/theme'
import { translate } from '@/core/translation'
import { SmartHeader } from '@/core/smart-header'
import { config } from '@/config'
import { useUpdates } from './useUpdates'
import { isVersionGreater } from './UpdatesContext'
import { hexToRgba } from '@/core/helpers/colors'
import { IconButton } from '@/features/common/buttons/IconButton'
import { InstallButton } from '@/features/common/buttons/InstallButton'
import { DownloadUpdateButton } from '@/features/common/buttons/DownloadUpdateButton'
import { CancelButton } from '@/features/common/buttons/CancelButton'
import { DeleteButton } from '@/features/common/buttons/DeleteButton'

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		padding: 20,
		paddingBottom: 80,
		gap: 28
	},
	section: {
		gap: 14
	},
	sectionLabel: {
		fontSize: 12,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 1
	},
	row: {
		gap: 12
	},
	rowWide: {
		flexDirection: 'row'
	},
	infoCard: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14,
		padding: 16,
		borderRadius: 20,
		borderWidth: 1
	},
	infoIcon: {
		width: 48,
		height: 48,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center'
	},
	infoText: {
		flex: 1,
		gap: 4
	},
	infoTextRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap'
	},
	infoLabel: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.8
	},
	infoValue: {
		fontSize: 16,
		fontWeight: '700'
	},
	badgeColumn: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 4,
		alignItems: 'center'
	},
	infoBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 2,
		paddingHorizontal: 6,
		paddingVertical: 3,
		borderRadius: 8
	},
	infoBadgeText: {
		fontSize: 10,
		fontWeight: '600'
	},
	actionButton: {
		height: 50,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	},
	actionBar: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		flexWrap: 'wrap',
		gap: 12
	},
	progressPanel: {
		gap: 12
	},
	progressTrack: {
		height: 12,
		borderRadius: 6,
		overflow: 'hidden'
	},
	progressFill: {
		height: '100%',
		borderRadius: 6
	},
	progressMeta: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 10
	},
	progressText: {
		flex: 1,
		marginRight: 4,
		fontSize: 13,
		fontWeight: '700'
	},
	progressBadges: {
		flexDirection: 'row',
		gap: 10
	},
	progressBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		gap: 6,
		paddingHorizontal: 8,
		paddingVertical: 6,
		borderRadius: 10,
		width: 100,
		height: 30
	},
	progressBadgeText: {
		flex: 1,
		fontSize: 12,
		fontWeight: '600'
	},
	apkList: {
		gap: 10
	},
	apkCard: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		padding: 14,
		borderRadius: 18,
		borderWidth: 1
	},
	apkLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		flex: 1,
		marginRight: 12
	},
	apkIcon: {
		width: 44,
		height: 44,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center'
	},
	apkText: {
		flex: 1,
		gap: 2
	},
	apkTitle: {
		fontSize: 15,
		fontWeight: '600'
	},
	apkMeta: {
		fontSize: 12,
		fontWeight: '500'
	},
	apkActions: {
		flexDirection: 'row',
		gap: 8
	},
	iconBtn: {
		width: 42,
		height: 42,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	}
})

interface InfoCardProps {
	icon: React.ComponentProps<typeof Ionicons>['name']
	label: string
	value: string
	color: string
	active?: boolean
	activeBorderColor?: string
	footer?: React.ReactNode
	colors: AppThemeColors
}

const InfoCard = ({ icon, label, value, color, active, activeBorderColor, footer, colors }: InfoCardProps) => (
	<View
		style={[
			styles.infoCard,
			{
				backgroundColor: active ? hexToRgba(color, 0.06) : colors.background,
				borderColor: active ? activeBorderColor || hexToRgba(color, 0.3) : colors.borderLight
			}
		]}
	>
		<View style={[styles.infoIcon, { backgroundColor: hexToRgba(color, 0.12) }]}>
			<Ionicons name={icon} size={22} color={color} />
		</View>
		<View style={[styles.infoText, styles.infoTextRow]}>
			{label ? <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{label}</Text> : null}
			<Text style={[styles.infoValue, { color: active ? color : colors.text }]} numberOfLines={1}>
				{value}
			</Text>
			{footer}
		</View>
	</View>
)

export default function UpdatesScreen() {
	const { colors } = useTheme()
	const { width } = useWindowDimensions()
	const {
		isChecking,
		latestRelease,
		downloadProgress,
		isDownloading,
		downloadedApks,
		checkForUpdates,
		downloadUpdate,
		installApk,
		deleteApk,
		refreshApkList,
		isPaused,
		pauseDownload,
		resumeDownload,
		cancelDownload
	} = useUpdates()

	useEffect(() => {
		checkForUpdates()
	}, [checkForUpdates])

	const [copied, setCopied] = useState(false)
	const [downloadSpeed, setDownloadSpeed] = useState<number | null>(null)
	const [remainingTime, setRemainingTime] = useState<number | null>(null)
	const prevProgressRef = useRef(downloadProgress)
	const prevTimeRef = useRef<number | null>(null)

	useEffect(() => {
		if (!isDownloading || isPaused) {
			setDownloadSpeed(null)
			setRemainingTime(null)
			prevTimeRef.current = null
			return
		}

		const now = Date.now()
		if (prevTimeRef.current === null) {
			prevTimeRef.current = now
			prevProgressRef.current = downloadProgress
			return
		}

		const timeDiff = (now - prevTimeRef.current) / 1000
		if (timeDiff >= 0.5) {
			const progressDiff = downloadProgress - prevProgressRef.current
			if (progressDiff > 0 && latestRelease) {
				const bytesDiff = progressDiff * latestRelease.size
				const currentSpeed = bytesDiff / timeDiff
				let nextSpeed = currentSpeed

				setDownloadSpeed((prev) => {
					nextSpeed = prev === null ? currentSpeed : prev * 0.7 + currentSpeed * 0.3
					return nextSpeed
				})

				const remainingBytes = (1 - downloadProgress) * latestRelease.size
				const speedToUse = nextSpeed || currentSpeed
				if (speedToUse > 0) {
					setRemainingTime(Math.max(0, Math.round(remainingBytes / speedToUse)))
				}
			}
			prevTimeRef.current = now
			prevProgressRef.current = downloadProgress
		}
	}, [downloadProgress, isDownloading, isPaused, latestRelease])

	const formatRemainingTime = (seconds: number | null): string => {
		if (seconds === null) return ''
		const hours = Math.floor(seconds / 3600)
		const minutes = Math.floor((seconds % 3600) / 60)
		const remainingSeconds = seconds % 60
		const pad = (value: number) => value.toString().padStart(2, '0')
		return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`
	}

	const formatSpeed = (speedBytesPerSec: number | null): string => {
		if (speedBytesPerSec === null || speedBytesPerSec <= 0) return ''
		return `${formatBytes(speedBytesPerSec)}/s`
	}

	useEffect(() => {
		if (Platform.OS !== 'web') {
			refreshApkList()
		}
	}, [refreshApkList])

	const isAndroid = Platform.OS === 'android'
	const isWeb = Platform.OS === 'web'
	const isWide = width > 680
	const maxContentWidth = 920

	const formatBytes = (bytes: number): string => {
		if (bytes <= 0) return '0 B'
		const k = 1024
		const sizes = ['B', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	const formatDate = (dateStr?: string): string => {
		if (!dateStr) return ''
		try {
			const d = new Date(dateStr)
			return d.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
				hour12: false
			})
		} catch (e) {
			return dateStr
		}
	}

	const handleCopyUrl = async () => {
		if (latestRelease?.download_url) {
			await Clipboard.setStringAsync(latestRelease.download_url)
			setCopied(true)
			setTimeout(() => setCopied(false), 2000)
		}
	}

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

	const hasLatestApkInCache = useMemo(() => {
		if (!latestRelease) return false
		return downloadedApks.some((apk) => apk.version === latestRelease.latest_version)
	}, [latestRelease, downloadedApks])

	const installableApk = useMemo(() => {
		const installables = downloadedApks.filter((apk) => apk.isInstallable)
		if (installables.length === 0) return undefined
		return [...installables].sort((a, b) => {
			if (isVersionGreater(a.version, b.version)) return -1
			if (isVersionGreater(b.version, a.version)) return 1
			return 0
		})[0]
	}, [downloadedApks])

	const sortedApks = useMemo(() => {
		return [...downloadedApks].sort((a, b) => {
			if (isVersionGreater(a.version, b.version)) return -1
			if (isVersionGreater(b.version, a.version)) return 1
			return 0
		})
	}, [downloadedApks])

	const isDownloadDisabled = isChecking || isDownloading || !latestRelease || isUpToDate || hasLatestApkInCache
	const isInstallDisabled = !installableApk

	const handleInstallPress = () => {
		if (installableApk) {
			installApk(installableApk.fileUri)
		}
	}

	const releaseBadges = useMemo(
		() =>
			latestRelease ? (
				<View style={styles.badgeColumn}>
					<View style={[styles.infoBadge, { backgroundColor: hexToRgba(colors.info, 0.12) }]}>
						<Ionicons name="calendar-outline" size={10} color={colors.info} />
						<Text style={[styles.infoBadgeText, { color: colors.info }]} numberOfLines={1} adjustsFontSizeToFit>
							{formatDate(latestRelease.published_at)}
						</Text>
					</View>
					<View style={[styles.infoBadge, { backgroundColor: hexToRgba(colors.primary, 0.12) }]}>
						<Ionicons name="cube-outline" size={10} color={colors.primary} />
						<Text style={[styles.infoBadgeText, { color: colors.primary }]} numberOfLines={1} adjustsFontSizeToFit>
							{formatBytes(latestRelease.size)}
						</Text>
					</View>
					<View style={[styles.infoBadge, { backgroundColor: hexToRgba(colors.success, 0.12) }]}>
						<Ionicons name="download-outline" size={10} color={colors.success} />
						<Text style={[styles.infoBadgeText, { color: colors.success }]} numberOfLines={1} adjustsFontSizeToFit>
							{latestRelease.download_count}
						</Text>
					</View>
				</View>
			) : undefined,
		[latestRelease, colors]
	)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<SmartHeader
				title={translate('updates', 'Updates')}
				subtitle={config.app.env}
				fallbackRoute="/feed"
				loading={isChecking}
				disableAnimations={true}
				headerActions={[
					<SmartHeader.RefreshButton
						key="refresh"
						onRefresh={async () => {
							if (Platform.OS === 'web' && typeof window !== 'undefined') {
								;(window as any).location.reload()
							} else {
								await checkForUpdates()
							}
						}}
						isRefreshing={isChecking}
						disabled={isDownloading}
					/>
				]}
			/>

			<SmartHeader.ScrollView
				contentContainerStyle={[styles.scrollContent, { paddingBottom: 80 }, isWide && { maxWidth: maxContentWidth, alignSelf: 'center', width: '100%', padding: 32, paddingBottom: 100 }]}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.section}>
					<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{translate('version', 'Version')}</Text>
					<View style={styles.row}>
						<InfoCard icon="phone-portrait-outline" label="" value={`v${config.app.version}`} color={colors.textTertiary} colors={colors} />
						<InfoCard
							icon={isUpToDate || !latestRelease ? 'cloud-outline' : 'cloud'}
							label=""
							value={latestRelease ? `v${latestRelease.latest_version}` : '—'}
							color={isUpToDate || !latestRelease ? colors.textTertiary : colors.info}
							active={!isUpToDate && !!latestRelease}
							activeBorderColor={colors.info}
							colors={colors}
							footer={releaseBadges}
						/>
					</View>
				</View>

				<View style={styles.section}>
					<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{translate('actions', 'Actions')}</Text>

					{!isWeb && (
						<View style={styles.progressPanel}>
							<View style={[styles.progressTrack, { backgroundColor: colors.surfaceVariant }]}>
								<LinearGradient colors={[colors.primary, colors.info]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressFill, { width: `${Math.round(downloadProgress * 100)}%` }]} />
							</View>
							<View style={styles.progressMeta}>
								<Text style={[styles.progressText, { color: colors.textSecondary }]}>
									{isDownloading
										? `${translate('downloading', 'Downloading')} • ${Math.round(downloadProgress * 100)}%`
										: isPaused
											? `${translate('paused', 'Paused')} • ${Math.round(downloadProgress * 100)}%`
											: translate('ready', 'Ready')}
								</Text>
								<View style={styles.progressBadges}>
									<View style={[styles.progressBadge, { backgroundColor: colors.surface, opacity: downloadSpeed === null ? 0 : 1 }]}>
										<Ionicons name="speedometer-outline" size={12} color={colors.textTertiary} />
										<Text style={[styles.progressBadgeText, { color: colors.textTertiary }]} numberOfLines={1} adjustsFontSizeToFit>
											{formatSpeed(downloadSpeed)}
										</Text>
									</View>
									<View style={[styles.progressBadge, { backgroundColor: colors.surface, opacity: remainingTime === null ? 0 : 1 }]}>
										<Ionicons name="time-outline" size={12} color={colors.textTertiary} />
										<Text
											style={[styles.progressBadgeText, { color: colors.textTertiary, textAlign: 'center', fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', web: 'monospace' }) }]}
											numberOfLines={1}
											adjustsFontSizeToFit
										>
											{formatRemainingTime(remainingTime)}
										</Text>
									</View>
								</View>
							</View>
						</View>
					)}

					<View style={styles.actionBar}>
						{isWeb ? (
							<>
								<DownloadUpdateButton downloadUrl={latestRelease?.download_url} version={latestRelease?.latest_version} variant="primary" style={styles.actionButton} />
								<IconButton
									icon={copied ? 'checkmark-circle-outline' : 'copy-outline'}
									label={copied ? translate('copied', 'Copied') : translate('copy_url', 'Copy Link')}
									onPress={handleCopyUrl}
									disabled={!latestRelease?.download_url}
									variant={copied ? 'success' : 'secondary'}
									colors={colors}
									style={styles.actionButton}
								/>
								<View style={[styles.actionButton, { opacity: 0, width: 50 }]} />
								<View style={[styles.actionButton, { opacity: 0, width: 50 }]} />
							</>
						) : (
							<>
								<DownloadUpdateButton
									version={latestRelease?.latest_version}
									isPaused={isPaused}
									isDownloading={isDownloading}
									onPress={isPaused ? resumeDownload : isDownloading ? pauseDownload : downloadUpdate}
									disabled={!isDownloading && !isPaused && isDownloadDisabled}
									variant={isPaused ? 'primary' : isDownloading ? 'secondary' : 'primary'}
									style={styles.actionButton}
								/>
								<CancelButton onPress={cancelDownload} disabled={!isDownloading && !isPaused} style={styles.actionButton} />
								<InstallButton
									fileUri={installableApk?.fileUri}
									version={installableApk?.version}
									onPress={handleInstallPress}
									disabled={isInstallDisabled || isDownloading || isPaused}
									variant="success"
									style={styles.actionButton}
								/>
								<IconButton
									icon={copied ? 'checkmark-circle-outline' : 'copy-outline'}
									label={copied ? translate('copied', 'Copied') : translate('copy_url', 'Copy Link')}
									onPress={handleCopyUrl}
									disabled={!latestRelease?.download_url}
									variant={copied ? 'success' : 'secondary'}
									colors={colors}
									style={styles.actionButton}
								/>
								<IconButton
									icon="share-social-outline"
									label={translate('share_url', 'Share Link')}
									onPress={handleShareUrl}
									disabled={!latestRelease?.download_url}
									variant="secondary"
									colors={colors}
									style={styles.actionButton}
								/>
							</>
						)}
					</View>
				</View>

				{sortedApks.length > 0 && (
					<View style={styles.section}>
						<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{translate('cached_apk_files', 'Cached APK Installers')}</Text>
						<View style={styles.apkList}>
							{sortedApks.map((apk) => (
								<View key={apk.filename} style={[styles.apkCard, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
									<View style={styles.apkLeft}>
										<View style={[styles.apkIcon, { backgroundColor: hexToRgba(colors.primary, 0.12) }]}>
											<Ionicons name="logo-android" size={22} color={colors.primary} />
										</View>
										<View style={styles.apkText}>
											<Text style={[styles.apkTitle, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
												{apk.filename}
											</Text>
											<Text style={[styles.apkMeta, { color: colors.textTertiary }]}>
												v{apk.version} • {formatBytes(apk.size)}
											</Text>
										</View>
									</View>
									<View style={styles.apkActions}>
										{(() => {
											const apkInstallDisabled = !isAndroid || isDownloading || isPaused || apk.version === config.app.version
											return (
												<TouchableOpacity
													onPress={() => installApk(apk.fileUri)}
													disabled={apkInstallDisabled}
													accessibilityLabel={translate('install', 'Install')}
													style={[styles.iconBtn, { backgroundColor: apkInstallDisabled ? colors.surfaceVariant : hexToRgba(colors.success, 0.12), opacity: apkInstallDisabled ? 0.5 : 1 }]}
												>
													<Ionicons name="archive-outline" size={20} color={apkInstallDisabled ? colors.textTertiary : colors.success} />
												</TouchableOpacity>
											)
										})()}
										<TouchableOpacity
											onPress={() => handleShareApk(apk.fileUri)}
											accessibilityLabel="Share APK Installer"
											style={[styles.iconBtn, { backgroundColor: hexToRgba(colors.primary, 0.12) }]}
										>
											<Ionicons name="share-social-outline" size={20} color={colors.primary} />
										</TouchableOpacity>
										<DeleteButton onPress={() => deleteApk(apk.fileUri)} style={styles.iconBtn} />
									</View>
								</View>
							))}
						</View>
					</View>
				)}
			</SmartHeader.ScrollView>
		</View>
	)
}
