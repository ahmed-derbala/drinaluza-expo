import React, { useState, useEffect, useMemo, useRef } from 'react'
import { StyleSheet, Text, View, Platform, Share } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, themeColors } from '@theme'
import { translate } from '@translation'
import { config } from '@/config'
import { log } from '@log'
import { BaseCard } from '@cards/BaseCard'
import { FreeStorageBadge } from '@ui/badges'
import { DownloadButton, CancelButton, ShareButton, CopyUrlButton } from '@buttons'
import { useUpdates } from './useUpdates'
import { isVersionGreater } from './UpdatesContext'
import { formatBytes } from '@helpers/format'

const styles = StyleSheet.create({
	card: {
		flex: 1,
		minHeight: 0
		// radius via borderRadius prop; padding/overflow from BaseCard defaults
	},
	topRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 14
	},
	textContainer: {
		flex: 1,
		minWidth: 0,
		flexShrink: 1,
		gap: 6
	},
	versionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flexWrap: 'wrap'
	},
	value: {
		fontSize: 16,
		fontWeight: '700',
		flexShrink: 1,
		minWidth: 0
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
		width: '100%',
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		flexWrap: 'wrap',
		gap: 12,
		marginTop: 10,
		...Platform.select({
			web: {
				paddingBottom: 50
			} as any
		})
	},
	progressPanel: {
		gap: 12,
		minHeight: 30,
		marginTop: 10
	},
	progressMeta: {
		flexDirection: 'row',
		justifyContent: 'flex-start',
		alignItems: 'center',
		gap: 10,
		flexWrap: 'wrap'
	},
	progressText: {
		marginRight: 4,
		fontSize: 13,
		fontWeight: '700',
		flexShrink: 1,
		minWidth: 44,
		textAlign: 'left'
	},
	progressBadges: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		flexWrap: 'wrap',
		flex: 1,
		minWidth: 0
	},
	progressBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		gap: 6,
		paddingHorizontal: 8,
		paddingVertical: 6,
		borderRadius: 10,
		width: 90,
		height: 30,
		flexShrink: 0
	},
	progressBadgeText: {
		fontSize: 12,
		fontWeight: '600',
		flexShrink: 1
	}
})

function formatDate(dateStr?: string): string {
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
	} catch {
		return dateStr
	}
}

function formatRemainingTime(seconds: number | null): string {
	if (seconds === null) return ''
	const hours = Math.floor(seconds / 3600)
	const minutes = Math.floor((seconds % 3600) / 60)
	const remainingSeconds = seconds % 60
	const pad = (value: number) => value.toString().padStart(2, '0')
	return `${pad(hours)}:${pad(minutes)}:${pad(remainingSeconds)}`
}

function formatSpeed(speedBytesPerSec: number | null): string {
	if (speedBytesPerSec === null || speedBytesPerSec <= 0) return ''
	const mbs = speedBytesPerSec / (1024 * 1024)
	return `${mbs.toFixed(1)} MB/s`
}

export const LatestReleaseCard: React.FC = () => {
	const { colors } = useTheme()
	const { isChecking, latestRelease, downloadProgress, isDownloading, downloadedApks, deviceFreeStorage, downloadUpdate, isPaused, pauseDownload, resumeDownload, cancelDownload } = useUpdates()

	const isAndroid = Platform.OS === 'android'
	const isWeb = Platform.OS === 'web'

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

	const isUpToDate = useMemo(() => {
		if (!latestRelease?.latest_version) return true
		return !isVersionGreater(latestRelease.latest_version, config.app.version)
	}, [latestRelease])

	const hasLatestApkInCache = useMemo(() => {
		if (!latestRelease) return false
		return downloadedApks.some((apk) => apk.version === latestRelease.latest_version)
	}, [latestRelease, downloadedApks])

	const isDownloadDisabled = isChecking || isDownloading || !latestRelease || isUpToDate || hasLatestApkInCache

	const handleShareUrl = async () => {
		if (latestRelease?.download_url) {
			try {
				await Share.share({
					message: latestRelease.download_url,
					title: 'Share Drinaluza Update Link'
				})
			} catch (err) {
				log({ level: 'warn', label: 'LatestReleaseCard', message: 'Sharing URL failed', error: err })
			}
		}
	}

	const releaseBadges = useMemo(
		() =>
			latestRelease ? (
				<View style={styles.badgeColumn}>
					<View style={[styles.infoBadge, { backgroundColor: themeColors.info12 }]}>
						<Ionicons name="calendar-outline" size={10} color={colors.info} />
						<Text style={[styles.infoBadgeText, { color: colors.info }]} numberOfLines={1}>
							{formatDate(latestRelease.published_at)}
						</Text>
					</View>
					<View style={styles.badgeColumn}>
						<View style={[styles.infoBadge, { backgroundColor: themeColors.primary12 }]}>
							<Ionicons name="cube-outline" size={10} color={colors.primary} />
							<Text style={[styles.infoBadgeText, { color: colors.primary }]} numberOfLines={1}>
								{formatBytes(latestRelease.size)}
							</Text>
						</View>
						{isAndroid && deviceFreeStorage > 0 && <FreeStorageBadge bytes={deviceFreeStorage} />}
					</View>
				</View>
			) : undefined,
		[latestRelease, colors, isAndroid, deviceFreeStorage]
	)

	const isHighlight = !isUpToDate && !!latestRelease
	const resolvedBackground = isHighlight ? themeColors.info06 : colors.background
	const resolvedBorder = isHighlight ? themeColors.info30 : colors.border
	const valueColor = isHighlight ? colors.info : colors.textTertiary

	return (
		<BaseCard backgroundColor={resolvedBackground} borderColor={resolvedBorder} borderRadius={20} style={styles.card}>
			<View style={styles.topRow}>
				{isWeb ? (
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
				)}
				<View style={styles.textContainer}>
					<View style={styles.versionRow}>
						<Text style={[styles.value, { color: valueColor }]} numberOfLines={1}>
							{latestRelease ? `v${latestRelease.latest_version}` : '—'}
						</Text>
						{latestRelease && (
							<View style={[styles.infoBadge, { backgroundColor: themeColors.success12 }]}>
								<Ionicons name="download-outline" size={10} color={colors.success} />
								<Text style={[styles.infoBadgeText, { color: colors.success }]} numberOfLines={1}>
									{latestRelease.download_count}
								</Text>
							</View>
						)}
					</View>
					{releaseBadges}
				</View>
			</View>

			{!isWeb && (
				<View style={styles.progressPanel}>
					<View style={styles.progressMeta}>
						<Text style={[styles.progressText, { color: isDownloading ? colors.primary : isPaused ? colors.warning : colors.textSecondary }]} numberOfLines={1} adjustsFontSizeToFit>
							{isDownloading || isPaused ? `${Math.round(downloadProgress * 100)}%` : ''}
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
					<CopyUrlButton url={latestRelease?.download_url} size={50} style={styles.actionButton} />
				) : (
					<>
						<CancelButton onPress={cancelDownload} disabled={!isDownloading && !isPaused} size={50} style={styles.actionButton} />
						<CopyUrlButton url={latestRelease?.download_url} size={50} style={styles.actionButton} />
						<ShareButton label={translate('share_url', 'Share Link')} onPress={handleShareUrl} disabled={!latestRelease?.download_url} size={50} style={styles.actionButton} />
					</>
				)}
			</View>
		</BaseCard>
	)
}

export default LatestReleaseCard
