import React, { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, Platform, Alert, useWindowDimensions, Share } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Sharing from 'expo-sharing'
import { useTheme, AppThemeColors } from '@/core/theme'
import { translate } from '@/core/translation'
import { SmartHeader } from '@/core/smart-header'
import { config } from '@/config'
import { useUpdates } from './useUpdates'
import { isVersionGreater } from './UpdatesContext'
import { hexToRgba } from '@/core/helpers/colors'
import { InstallButton } from '@/features/common/buttons/InstallButton'
import { DownloadButton } from '@/features/common/buttons/DownloadButton'
import { CancelButton } from '@/features/common/buttons/CancelButton'
import { DeleteButton } from '@/features/common/buttons/DeleteButton'
import { ShareButton } from '@/features/common/buttons/ShareButton'
import { CopyUrlButton } from '@/features/common/buttons/CopyUrlButton'

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
	row: {
		gap: 12
	},
	rowWide: {
		flexDirection: 'row'
	},
	infoCard: {
		flex: 1,
		flexDirection: 'column',
		gap: 14,
		padding: 16,
		borderRadius: 20,
		borderWidth: 1
	},
	infoCardTopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14
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
		alignItems: 'flex-start',
		justifyContent: 'space-between',
		padding: 14,
		borderRadius: 18,
		borderWidth: 1
	},
	apkLeft: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 12,
		flex: 1
	},
	apkIcon: {
		width: 36,
		height: 36,
		borderRadius: 10,
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
		justifyContent: 'flex-end',
		gap: 8,
		marginTop: 4
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
	icon?: React.ComponentProps<typeof Ionicons>['name']
	/** Replaces the default icon container entirely, e.g. with an actionable button. */
	iconElement?: React.ReactNode
	label: string
	value: string
	color: string
	active?: boolean
	activeBorderColor?: string
	footer?: React.ReactNode
	colors: AppThemeColors
	/** Extra content rendered below the icon/value row, inside the same card. */
	children?: React.ReactNode
}

const InfoCard = ({ icon, iconElement, label, value, color, active, activeBorderColor, footer, colors, children }: InfoCardProps) => (
	<View
		style={[
			styles.infoCard,
			{
				backgroundColor: active ? hexToRgba(color, 0.06) : colors.background,
				borderColor: active ? activeBorderColor || hexToRgba(color, 0.3) : colors.border
			}
		]}
	>
		<View style={styles.infoCardTopRow}>
			{iconElement ?? <View style={[styles.infoIcon, { backgroundColor: hexToRgba(color, 0.12) }]}>{icon ? <Ionicons name={icon} size={22} color={color} /> : null}</View>}
			<View style={styles.infoText}>
				<View style={styles.infoTextRow}>
					{label ? <Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{label}</Text> : null}
					<Text style={[styles.infoValue, { color: active ? color : colors.text }]} numberOfLines={1}>
						{value}
					</Text>
				</View>
				{footer}
			</View>
		</View>
		{children}
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
		const mbs = speedBytesPerSec / (1024 * 1024)
		return `${mbs.toFixed(1)} MB/s`
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

	const sortedApks = useMemo(() => {
		return [...downloadedApks].sort((a, b) => {
			if (isVersionGreater(a.version, b.version)) return -1
			if (isVersionGreater(b.version, a.version)) return 1
			return 0
		})
	}, [downloadedApks])

	const isDownloadDisabled = isChecking || isDownloading || !latestRelease || isUpToDate || hasLatestApkInCache

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
					<View style={styles.row}>
						<InfoCard icon="phone-portrait-outline" label="" value={`v${config.app.version}`} color={colors.textTertiary} colors={colors} />
						<InfoCard
							label=""
							value={latestRelease ? `v${latestRelease.latest_version}` : '—'}
							color={isUpToDate || !latestRelease ? colors.textTertiary : colors.info}
							active={!isUpToDate && !!latestRelease}
							activeBorderColor={colors.info}
							colors={colors}
							footer={releaseBadges}
							iconElement={
								isWeb ? (
									<DownloadButton downloadUrl={latestRelease?.download_url} size={48} variant="primary" disabled={!latestRelease?.download_url} />
								) : (
									<DownloadButton
										size={48}
										variant={isPaused ? 'primary' : isDownloading ? 'warning' : isUpToDate || !latestRelease ? 'secondary' : 'primary'}
										isDownloading={isDownloading}
										isPaused={isPaused}
										onPress={isPaused ? resumeDownload : isDownloading ? pauseDownload : downloadUpdate}
										disabled={!isDownloading && !isPaused && isDownloadDisabled}
									/>
								)
							}
						>
							{!isWeb && (
								<View style={styles.progressPanel}>
									<View style={styles.progressMeta}>
										<Text style={[styles.progressText, { color: isDownloading ? colors.primary : isPaused ? colors.warning : colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
											{isDownloading
												? `${translate('downloading', 'Downloading')} • ${Math.round(downloadProgress * 100)}%`
												: isPaused
													? `${translate('paused', 'Paused')} • ${Math.round(downloadProgress * 100)}%`
													: ''}
										</Text>
										<View style={styles.progressBadges}>
											<View style={[styles.progressBadge, { backgroundColor: colors.surface, opacity: downloadSpeed === null ? 0 : 1 }]}>
												<Ionicons name="speedometer-outline" size={12} color={colors.textTertiary} />
												<Text style={[styles.progressBadgeText, { color: colors.textTertiary }]} numberOfLines={1}>
													{formatSpeed(downloadSpeed)}
												</Text>
											</View>
											<View style={[styles.progressBadge, { backgroundColor: colors.surface, opacity: remainingTime === null ? 0 : 1 }]}>
												<Ionicons name="time-outline" size={12} color={colors.textTertiary} />
												<Text style={[styles.progressBadgeText, { color: colors.textTertiary, textAlign: 'center' }]} numberOfLines={1} adjustsFontSizeToFit>
													{formatRemainingTime(remainingTime)}
												</Text>
											</View>
										</View>
									</View>
								</View>
							)}

							<View style={styles.actionBar}>
								{isWeb ? (
									<CopyUrlButton url={latestRelease?.download_url} style={styles.actionButton} />
								) : (
									<>
										<CancelButton onPress={cancelDownload} disabled={!isDownloading && !isPaused} style={styles.actionButton} />
										<CopyUrlButton url={latestRelease?.download_url} style={styles.actionButton} />
										<ShareButton label={translate('share_url', 'Share Link')} onPress={handleShareUrl} disabled={!latestRelease?.download_url} style={styles.actionButton} />
									</>
								)}
							</View>
						</InfoCard>
					</View>
				</View>

				{sortedApks.length > 0 && (
					<View style={styles.section}>
						<View style={styles.apkList}>
							{sortedApks.map((apk) => (
								<View key={apk.filename} style={[styles.apkCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
									<View style={styles.apkLeft}>
										<View style={[styles.apkIcon, { backgroundColor: hexToRgba(colors.primary, 0.12) }]}>
											<Ionicons name="logo-android" size={18} color={colors.primary} />
										</View>
										<View style={styles.apkText}>
											<Text style={[styles.apkTitle, { color: colors.text }]} numberOfLines={1} adjustsFontSizeToFit>
												{apk.filename}
											</Text>
											<Text style={[styles.apkMeta, { color: colors.textTertiary }]}>
												v{apk.version} • {formatBytes(apk.size)}
											</Text>
											<View style={styles.apkActions}>
												<InstallButton
													fileUri={apk.fileUri}
													onPress={() => installApk(apk.fileUri)}
													disabled={!isAndroid || isDownloading || isPaused || apk.version === config.app.version}
													style={styles.iconBtn}
												/>
												<ShareButton label="Share APK Installer" onPress={() => handleShareApk(apk.fileUri)} style={styles.iconBtn} />
												<DeleteButton onPress={() => deleteApk(apk.fileUri)} style={styles.iconBtn} />
											</View>
										</View>
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
