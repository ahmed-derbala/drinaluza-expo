import React, { useEffect, useState, useMemo, useRef } from 'react'
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert, useWindowDimensions, Animated, Easing, Share, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'
import { useRouter } from 'expo-router'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { useUpdates } from '@/features/updates'
import { SmartHeader } from '@/core/smart-header'
import { config } from '@/config'
import { LinearGradient } from 'expo-linear-gradient'

// Helper to render inline styles like bold (**bold**) and inline code (`code`)
const renderInlineStyles = (text: string, colors: any) => {
	const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)

	return parts.map((part, index) => {
		if (part.startsWith('**') && part.endsWith('**')) {
			const boldText = part.slice(2, -2)
			return (
				<Text key={index} style={{ fontWeight: '700', color: '#FFFFFF' }}>
					{boldText}
				</Text>
			)
		}
		if (part.startsWith('`') && part.endsWith('`')) {
			const codeText = part.slice(1, -1)
			return (
				<Text
					key={index}
					style={{
						fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
						fontSize: 12,
						backgroundColor: 'rgba(255, 255, 255, 0.08)',
						color: '#38BDF8',
						paddingHorizontal: 4,
						borderRadius: 4
					}}
				>
					{codeText}
				</Text>
			)
		}
		return part
	})
}

const MarkdownRenderer = ({ content, colors }: { content: string; colors: any }) => {
	if (!content) return null

	const lines = content.split('\n')

	return (
		<View style={{ gap: 8 }}>
			{lines.map((line, lineIdx) => {
				const trimmed = line.trim()

				// Headers (e.g. ### Added)
				if (trimmed.startsWith('#')) {
					const match = trimmed.match(/^(#+)\s*(.*)$/)
					if (match) {
						const level = match[1].length
						const text = match[2]
						const fontSize = level === 1 ? 18 : level === 2 ? 15 : 13
						const fontWeight = '700'
						const marginTop = lineIdx > 0 ? 14 : 2

						return (
							<Text
								key={lineIdx}
								style={{
									fontSize,
									fontWeight,
									color: '#FFFFFF',
									marginTop,
									marginBottom: 2
								}}
							>
								{text}
							</Text>
						)
					}
				}

				// Bullet lists (e.g. - Added new screens)
				if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
					const text = trimmed.replace(/^[-*]\s*/, '')
					return (
						<View key={lineIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 6, gap: 6, marginVertical: 1 }}>
							<Text style={{ color: colors.primary || '#38BDF8', fontSize: 14, marginTop: 1 }}>•</Text>
							<Text style={{ flex: 1, fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19 }}>{renderInlineStyles(text, colors)}</Text>
						</View>
					)
				}

				// Blank lines spacing
				if (trimmed === '') {
					return <View key={lineIdx} style={{ height: 4 }} />
				}

				// Default paragraph lines
				return (
					<Text key={lineIdx} style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', lineHeight: 19, marginVertical: 1 }}>
						{renderInlineStyles(trimmed, colors)}
					</Text>
				)
			})}
		</View>
	)
}

export default function UpdatesScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const { width } = useWindowDimensions()

	const {
		isChecking,
		latestRelease,
		error,
		downloadProgress,
		isDownloading,
		downloadedApks,
		deviceFreeStorage,
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

		const timeDiff = (now - prevTimeRef.current) / 1000 // in seconds
		if (timeDiff >= 0.5) {
			const progressDiff = downloadProgress - prevProgressRef.current
			if (progressDiff > 0 && latestRelease) {
				const bytesDiff = progressDiff * latestRelease.size
				const currentSpeed = bytesDiff / timeDiff // bytes per second

				setDownloadSpeed((prevSpeed) => {
					if (prevSpeed === null) return currentSpeed
					return prevSpeed * 0.7 + currentSpeed * 0.3
				})

				const remainingBytes = (1 - downloadProgress) * latestRelease.size
				const speedToUse = downloadSpeed || currentSpeed
				if (speedToUse > 0) {
					setRemainingTime(Math.max(0, Math.round(remainingBytes / speedToUse)))
				}
			}
			prevTimeRef.current = now
			prevProgressRef.current = downloadProgress
		}
	}, [downloadProgress, isDownloading, isPaused, latestRelease, downloadSpeed])

	const formatRemainingTime = (seconds: number | null): string => {
		if (seconds === null) return ''
		if (seconds < 60) {
			return `${seconds}s ${translate('remaining', 'remaining')}`
		}
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}m ${remainingSeconds}s ${translate('remaining', 'remaining')}`
	}

	const formatSpeed = (speedBytesPerSec: number | null): string => {
		if (speedBytesPerSec === null || speedBytesPerSec <= 0) return ''
		return `${formatBytes(speedBytesPerSec)}/s`
	}

	// Pulse animation for checking / available updates icon
	const pulseAnim = useRef(new Animated.Value(1)).current

	useEffect(() => {
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(pulseAnim, {
					toValue: 1.1,
					duration: 1000,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: Platform.OS !== 'web'
				}),
				Animated.timing(pulseAnim, {
					toValue: 1,
					duration: 1000,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: Platform.OS !== 'web'
				})
			])
		)
		animation.start()
		return () => animation.stop()
	}, [pulseAnim])

	// Refresh cache list on mount, and trigger fetch automatically on Web
	useEffect(() => {
		if (Platform.OS !== 'web') {
			refreshApkList()
		} else {
			checkForUpdates(false)
		}
	}, [refreshApkList, checkForUpdates])

	const isAndroid = Platform.OS === 'android'
	const isWeb = Platform.OS === 'web'
	const maxLayoutWidth = 620
	const isWide = width > maxLayoutWidth

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
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
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
		return downloadedApks.find((apk) => apk.isInstallable)
	}, [downloadedApks])

	const isDownloadDisabled = isChecking || isDownloading || !latestRelease || isUpToDate || hasLatestApkInCache
	const isInstallDisabled = !installableApk

	const handleInstallPress = () => {
		if (installableApk) {
			installApk(installableApk.fileUri)
		}
	}

	const handleDownloadWeb = () => {
		if (!latestRelease?.download_url) return
		const link = document.createElement('a')
		link.href = latestRelease.download_url
		link.setAttribute('download', '')
		link.style.display = 'none'
		document.body.appendChild(link)
		link.click()
		document.body.removeChild(link)
	}

	const renderAndroidSection = () => {
		return (
			<View style={[styles.card, { borderColor: colors.borderLight }]}>
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('device_status', 'Device Status')}</Text>
				<View style={styles.metaRow}>
					<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('free_storage', 'Free Storage')}</Text>
					<Text style={[styles.metaValue, { color: colors.text }]}>{formatBytes(deviceFreeStorage)}</Text>
				</View>

				{latestRelease && deviceFreeStorage < latestRelease.size * 1.5 && (
					<View style={[styles.warningBox, { backgroundColor: colors.error + '1A', borderColor: colors.error }]}>
						<Ionicons name="warning" size={16} color={colors.error} />
						<Text style={[styles.warningText, { color: colors.error }]}>{translate('low_space_warning', 'Your device is low on storage space. The download might fail.')}</Text>
					</View>
				)}
			</View>
		)
	}

	const renderEnvironmentBadge = () => {
		const nodeEnv = config.NODE_ENV.toLowerCase()
		let badgeColors: [string, string] = ['#10B981', '#059669']
		let badgeText = config.NODE_ENV.toUpperCase()

		if (nodeEnv === 'production' || nodeEnv === 'prod') {
			badgeColors = ['#EF4444', '#DC2626']
		} else if (nodeEnv === 'local' || nodeEnv === 'dev' || nodeEnv === 'development') {
			badgeColors = ['#3B82F6', '#2563EB']
		} else if (nodeEnv === 'staging') {
			badgeColors = ['#F59E0B', '#D97706']
		}

		return (
			<LinearGradient colors={badgeColors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.badgeContainer}>
				<Ionicons name="git-branch-outline" size={12} color="#FFFFFF" style={{ marginRight: 4 }} />
				<Text style={styles.badgeText}>{badgeText}</Text>
			</LinearGradient>
		)
	}

	const renderStatusCard = () => {
		const statusText = isUpToDate ? translate('up_to_date', 'App is Up to Date') : translate('update_available', 'Update is Available')
		const statusSubtitle = isUpToDate
			? translate('running_latest', 'You are running the latest version of Drinaluza.')
			: translate('new_version_found', 'A new release is available with new features and fixes.')

		const cardGradients = (isUpToDate ? ['rgba(16, 185, 129, 0.12)', 'rgba(16, 185, 129, 0.02)'] : ['rgba(14, 165, 233, 0.16)', 'rgba(139, 92, 246, 0.03)']) as [string, string]

		const borderColor = isUpToDate ? 'rgba(16, 185, 129, 0.3)' : 'rgba(14, 165, 233, 0.3)'

		return (
			<View style={{ borderRadius: 24, overflow: 'hidden' }}>
				<LinearGradient colors={cardGradients} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.statusCard, { borderColor }]}>
					<View style={styles.statusRow}>
						<View style={[styles.statusIndicatorContainer, { backgroundColor: isUpToDate ? 'rgba(16, 185, 129, 0.1)' : 'rgba(14, 165, 233, 0.1)' }]}>
							{isUpToDate ? (
								<Ionicons name="checkmark-circle" size={38} color="#10B981" />
							) : (
								<Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
									<Ionicons name="cloud-download" size={38} color="#0EA5E9" />
								</Animated.View>
							)}
						</View>
						<View style={styles.statusContent}>
							<View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
								<Text style={[styles.statusTitle, { color: colors.text }]}>{statusText}</Text>
								{renderEnvironmentBadge()}
							</View>
							<Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>{statusSubtitle}</Text>
						</View>
					</View>
				</LinearGradient>
			</View>
		)
	}

	const renderVersionComparison = () => {
		const latestVer = latestRelease ? `v${latestRelease.latest_version}` : '—'
		return (
			<View style={styles.comparisonGrid}>
				<View style={{ flex: 1, borderRadius: 20, overflow: 'hidden' }}>
					<LinearGradient colors={['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)']} style={[styles.comparisonCard, { borderColor: colors.borderLight }]}>
						<Text style={[styles.comparisonLabel, { color: colors.textTertiary }]}>{translate('current_version', 'Current Version')}</Text>
						<Text style={[styles.comparisonValue, { color: colors.text }]}>v{config.app.version}</Text>
					</LinearGradient>
				</View>
				<View style={{ flex: 1, borderRadius: 20, overflow: 'hidden' }}>
					<LinearGradient
						colors={!isUpToDate ? ['rgba(14, 165, 233, 0.1)', 'rgba(14, 165, 233, 0.01)'] : ['rgba(255, 255, 255, 0.04)', 'rgba(255, 255, 255, 0.01)']}
						style={[styles.comparisonCard, { borderColor: !isUpToDate ? 'rgba(14, 165, 233, 0.25)' : colors.borderLight }]}
					>
						<Text style={[styles.comparisonLabel, { color: colors.textTertiary }]}>{translate('latest_version', 'Latest Version')}</Text>
						<Text style={[styles.comparisonValue, { color: isUpToDate ? colors.text : '#0EA5E9', fontWeight: '800' }]}>{latestVer}</Text>
					</LinearGradient>
				</View>
			</View>
		)
	}

	const renderReleaseMetaList = () => {
		if (!latestRelease) return null
		return (
			<View style={[styles.card, { borderColor: colors.borderLight }]}>
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('release_details', 'Release Details')}</Text>
				<View style={styles.metaRow}>
					<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('published_date', 'Published Date')}</Text>
					<Text style={[styles.metaValue, { color: colors.text }]}>{formatDate(latestRelease.published_at)}</Text>
				</View>
				<View style={styles.metaDivider} />
				<View style={styles.metaRow}>
					<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('file_size', 'Download Size')}</Text>
					<Text style={[styles.metaValue, { color: colors.text }]}>{formatBytes(latestRelease.size)}</Text>
				</View>
				<View style={styles.metaDivider} />
				<View style={styles.metaRow}>
					<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('total_downloads', 'Total Downloads')}</Text>
					<Text style={[styles.metaValue, { color: colors.text }]}>{latestRelease.download_count}</Text>
				</View>
			</View>
		)
	}

	const renderWebActions = () => {
		const isUpToDateWeb = latestRelease ? isUpToDate : false
		return (
			<View style={styles.actionsContainer}>
				<TouchableOpacity
					disabled={!latestRelease || !latestRelease.download_url}
					onPress={handleDownloadWeb}
					style={[styles.primaryButtonTouch, { opacity: !latestRelease || !latestRelease.download_url ? 0.5 : 1 }]}
				>
					<LinearGradient
						colors={!latestRelease || !latestRelease.download_url ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)'] : ['#0EA5E9', '#2563EB']}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						style={styles.primaryButtonGradient}
					>
						<Ionicons name="download-outline" size={20} color={!latestRelease || !latestRelease.download_url ? colors.textTertiary : '#FFFFFF'} />
						<Text style={[styles.primaryButtonText, { color: !latestRelease || !latestRelease.download_url ? colors.textTertiary : '#FFFFFF' }]}>
							{translate('download_update', 'Download Update')}
						</Text>
					</LinearGradient>
				</TouchableOpacity>

				<TouchableOpacity
					disabled={!latestRelease || !latestRelease.download_url}
					onPress={handleCopyUrl}
					style={[
						styles.secondaryButton,
						{
							backgroundColor: colors.surface,
							width: '100%',
							opacity: !latestRelease || !latestRelease.download_url ? 0.6 : 1
						}
					]}
				>
					<Ionicons name={copied ? 'checkmark-circle-outline' : 'copy-outline'} size={18} color={copied ? colors.success : colors.textSecondary} />
					<Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>{copied ? translate('copied', 'Copied') : translate('copy_url', 'Copy Link to Clipboard')}</Text>
				</TouchableOpacity>
			</View>
		)
	}

	const renderNativeActions = () => {
		const isDownloadingOrPaused = isDownloading || isPaused

		return (
			<View style={styles.actionsContainer}>
				{isDownloadingOrPaused ? (
					<View style={styles.progressContainer}>
						<View style={[styles.progressBarBg, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
							<LinearGradient colors={['#0EA5E9', '#8B5CF6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.progressBarFill, { width: `${Math.round(downloadProgress * 100)}%` }]} />
						</View>
						<Text style={[styles.progressText, { color: colors.textSecondary }]}>
							{isPaused ? `${translate('paused', 'Paused')} • ${Math.round(downloadProgress * 100)}%` : `${translate('downloading', 'Downloading')} • ${Math.round(downloadProgress * 100)}%`}
						</Text>

						{isDownloading && (downloadSpeed !== null || remainingTime !== null) && (
							<View style={styles.downloadMetaRow}>
								{downloadSpeed !== null && (
									<Text style={[styles.downloadMetaText, { color: colors.textTertiary }]}>
										<Ionicons name="speedometer-outline" size={12} color={colors.textTertiary} /> {formatSpeed(downloadSpeed)}
									</Text>
								)}
								{remainingTime !== null && (
									<Text style={[styles.downloadMetaText, { color: colors.textTertiary }]}>
										<Ionicons name="time-outline" size={12} color={colors.textTertiary} /> {formatRemainingTime(remainingTime)}
									</Text>
								)}
							</View>
						)}

						<View style={[styles.rowButtons, { marginTop: 12 }]}>
							{isDownloading && (
								<>
									<TouchableOpacity onPress={pauseDownload} style={[styles.secondaryButton, { backgroundColor: colors.surface, flex: 1, height: 44 }]}>
										<Ionicons name="pause-outline" size={18} color={colors.textSecondary} />
										<Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>{translate('pause', 'Pause')}</Text>
									</TouchableOpacity>

									<TouchableOpacity onPress={cancelDownload} style={[styles.secondaryButton, { backgroundColor: colors.surface, flex: 1, height: 44 }]}>
										<Ionicons name="close-outline" size={18} color={colors.error} />
										<Text style={[styles.secondaryButtonText, { color: colors.error }]}>{translate('cancel', 'Cancel')}</Text>
									</TouchableOpacity>
								</>
							)}

							{isPaused && (
								<>
									<TouchableOpacity onPress={resumeDownload} style={[styles.primaryButtonTouch, { flex: 1 }]}>
										<LinearGradient colors={['#0EA5E9', '#2563EB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.primaryButtonGradient, { height: 44 }]}>
											<Ionicons name="play-outline" size={18} color="#FFFFFF" />
											<Text style={styles.primaryButtonText}>{translate('resume', 'Resume')}</Text>
										</LinearGradient>
									</TouchableOpacity>

									<TouchableOpacity onPress={cancelDownload} style={[styles.secondaryButton, { backgroundColor: colors.surface, flex: 1, height: 44 }]}>
										<Ionicons name="close-outline" size={18} color={colors.error} />
										<Text style={[styles.secondaryButtonText, { color: colors.error }]}>{translate('cancel', 'Cancel')}</Text>
									</TouchableOpacity>
								</>
							)}
						</View>
					</View>
				) : (
					<View style={styles.rowButtons}>
						<TouchableOpacity disabled={isDownloadDisabled} onPress={downloadUpdate} style={[styles.primaryButtonTouch, { flex: 1, opacity: isDownloadDisabled ? 0.5 : 1 }]}>
							<LinearGradient
								colors={isDownloadDisabled ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)'] : ['#0EA5E9', '#2563EB']}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={styles.primaryButtonGradient}
							>
								<Ionicons name="cloud-download-outline" size={20} color={isDownloadDisabled ? colors.textTertiary : '#FFFFFF'} />
								<Text style={[styles.primaryButtonText, { color: isDownloadDisabled ? colors.textTertiary : '#FFFFFF' }]} numberOfLines={1}>
									{translate('download', 'Download')}
								</Text>
							</LinearGradient>
						</TouchableOpacity>

						<TouchableOpacity disabled={isInstallDisabled} onPress={handleInstallPress} style={[styles.primaryButtonTouch, { flex: 1, opacity: isInstallDisabled ? 0.5 : 1 }]}>
							<LinearGradient
								colors={isInstallDisabled ? ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)'] : ['#10B981', '#059669']}
								start={{ x: 0, y: 0 }}
								end={{ x: 1, y: 1 }}
								style={styles.primaryButtonGradient}
							>
								<Ionicons name="rocket-outline" size={20} color={isInstallDisabled ? colors.textTertiary : '#FFFFFF'} />
								<Text style={[styles.primaryButtonText, { color: isInstallDisabled ? colors.textTertiary : '#FFFFFF' }]} numberOfLines={1}>
									{translate('install', 'Install')}
								</Text>
							</LinearGradient>
						</TouchableOpacity>
					</View>
				)}

				{latestRelease && (
					<View style={styles.rowButtons}>
						<TouchableOpacity onPress={handleCopyUrl} style={[styles.secondaryButton, { backgroundColor: colors.surface, flex: 1 }]}>
							<Ionicons name={copied ? 'checkmark-circle-outline' : 'copy-outline'} size={16} color={copied ? colors.success : colors.textSecondary} />
							<Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]} numberOfLines={1}>
								{copied ? translate('copied', 'Copied') : translate('copy_url', 'Copy Link')}
							</Text>
						</TouchableOpacity>

						<TouchableOpacity onPress={handleShareUrl} style={[styles.secondaryButton, { backgroundColor: colors.surface, flex: 1 }]}>
							<Ionicons name="share-social-outline" size={16} color={colors.textSecondary} />
							<Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]} numberOfLines={1}>
								{translate('share_url', 'Share Link')}
							</Text>
						</TouchableOpacity>
					</View>
				)}
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<SmartHeader
				title={translate('updates', 'Updates')}
				fallbackRoute="/(home)/feed"
				loading={isChecking}
				disableAnimations={true}
				headerActions={[
					<SmartHeader.RefreshButton
						key="refresh"
						onRefresh={async () => {
							await checkForUpdates(true)
							if (Platform.OS === 'web' && typeof window !== 'undefined') {
								window.location.reload()
							}
						}}
						isRefreshing={isChecking}
					/>
				]}
			/>

			<SmartHeader.ScrollView contentContainerStyle={[styles.scrollContent, isWide && { maxWidth: maxLayoutWidth, alignSelf: 'center', width: '100%' }]}>
				{renderStatusCard()}

				{renderVersionComparison()}

				{isWeb ? renderWebActions() : renderNativeActions()}

				{renderReleaseMetaList()}

				{/* Free storage / space warnings on Android */}
				{isAndroid && renderAndroidSection()}

				{/* Cached APK installers list */}
				{downloadedApks.length > 0 && (
					<View style={[styles.card, { borderColor: colors.borderLight }]}>
						<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('cached_apk_files', 'Cached APK Installers')}</Text>
						<View style={styles.apkSection}>
							{downloadedApks.map((apk) => (
								<View key={apk.filename} style={[styles.apkItem, { borderColor: 'rgba(255, 255, 255, 0.05)' }]}>
									<View style={styles.apkInfoContainer}>
										<View style={[styles.apkIconWrap, { backgroundColor: 'rgba(14, 165, 233, 0.08)' }]}>
											<Ionicons name="logo-android" size={18} color="#0EA5E9" />
										</View>
										<View style={styles.apkInfo}>
											<Text style={[styles.apkTitle, { color: colors.text }]} numberOfLines={1}>
												{apk.filename}
											</Text>
											<Text style={[styles.apkMeta, { color: colors.textTertiary }]}>
												v{apk.version} • {formatBytes(apk.size)}
											</Text>
										</View>
									</View>
									<View style={styles.apkActions}>
										{/* Share APK Button */}
										<TouchableOpacity onPress={() => handleShareApk(apk.fileUri)} accessibilityLabel="Share APK Installer" style={[styles.apkBtn, { backgroundColor: 'rgba(14, 165, 233, 0.08)' }]}>
											<Ionicons name="share-social-outline" size={16} color="#0EA5E9" />
										</TouchableOpacity>

										{/* Delete Button */}
										<TouchableOpacity onPress={() => deleteApk(apk.fileUri)} accessibilityLabel="Delete cached APK" style={[styles.apkBtn, { backgroundColor: 'rgba(239, 68, 68, 0.08)' }]}>
											<Ionicons name="trash-outline" size={16} color="#EF4444" />
										</TouchableOpacity>
									</View>
								</View>
							))}
						</View>
					</View>
				)}

				{/* Changelog section */}
				{(isWeb || (latestRelease && latestRelease.changelog !== '')) && (
					<View style={[styles.card, { borderColor: colors.borderLight }]}>
						<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('whats_new', "What's New")}</Text>
						<View style={[styles.changelogBox, { backgroundColor: 'rgba(0,0,0,0.22)', borderColor: 'rgba(255,255,255,0.05)', borderWidth: 1 }]}>
							{latestRelease && latestRelease.changelog !== '' ? (
								<MarkdownRenderer content={latestRelease.changelog} colors={colors} />
							) : (
								<Text style={[styles.changelogText, { color: 'rgba(255,255,255,0.5)', fontStyle: 'italic' }]}>{translate('no_changelog', 'No changelog details available.')}</Text>
							)}
						</View>
					</View>
				)}

				{/* Error Status Box */}
				{error && (
					<View style={[styles.errorBox, { backgroundColor: colors.error + '12', borderColor: colors.error }]}>
						<Ionicons name="alert-circle-outline" size={20} color={colors.error} />
						<Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
					</View>
				)}
			</SmartHeader.ScrollView>
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
	statusCard: {
		borderRadius: 24,
		borderWidth: 1,
		padding: 20,
		...Platform.select({
			web: {
				backdropFilter: 'blur(20px)',
				WebkitBackdropFilter: 'blur(20px)'
			} as any
		})
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 16
	},
	statusIndicatorContainer: {
		width: 60,
		height: 60,
		borderRadius: 30,
		justifyContent: 'center',
		alignItems: 'center'
	},
	statusContent: {
		flex: 1,
		gap: 4
	},
	statusTitle: {
		fontSize: 18,
		fontWeight: '700',
		letterSpacing: -0.3
	},
	statusSubtitle: {
		fontSize: 13,
		lineHeight: 18
	},
	badgeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 12
	},
	badgeText: {
		color: '#FFFFFF',
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.5
	},
	comparisonGrid: {
		flexDirection: 'row',
		gap: 12
	},
	comparisonCard: {
		flex: 1,
		borderRadius: 20,
		borderWidth: 1,
		padding: 16,
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6
	},
	comparisonLabel: {
		fontSize: 11,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	comparisonValue: {
		fontSize: 22,
		fontWeight: '700',
		letterSpacing: -0.5
	},
	card: {
		borderRadius: 20,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.08)',
		padding: 20,
		backgroundColor: 'rgba(15, 23, 42, 0.55)', // Translucent sleek glass background
		...Platform.select({
			web: {
				backdropFilter: 'blur(20px)',
				WebkitBackdropFilter: 'blur(20px)'
			} as any
		})
	},
	downloadMetaRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 2,
		paddingHorizontal: 4
	},
	downloadMetaText: {
		fontSize: 12,
		fontWeight: '600',
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4
	},
	sectionTitle: {
		fontSize: 12,
		fontWeight: '600',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
		marginBottom: 12
	},
	metaRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 8
	},
	metaLabel: {
		fontSize: 13,
		fontWeight: '500'
	},
	metaValue: {
		fontSize: 13,
		fontWeight: '600'
	},
	metaDivider: {
		height: 1,
		backgroundColor: 'rgba(255, 255, 255, 0.06)',
		marginVertical: 4
	},
	actionsContainer: {
		gap: 12,
		width: '100%'
	},
	rowButtons: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		width: '100%'
	},
	primaryButtonTouch: {
		width: '100%',
		borderRadius: 16,
		overflow: 'hidden',
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	},
	primaryButtonGradient: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 8,
		height: 50,
		paddingHorizontal: 16,
		width: '100%'
	},
	primaryButtonText: {
		color: '#FFFFFF',
		fontSize: 15,
		fontWeight: '600'
	},
	secondaryButton: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 6,
		height: 46,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.08)',
		backgroundColor: 'rgba(255, 255, 255, 0.02)',
		...Platform.select({
			web: {
				cursor: 'pointer',
				transition: 'background-color 0.15s ease, border-color 0.15s ease'
			} as any
		})
	},
	secondaryButtonText: {
		fontSize: 13,
		fontWeight: '600'
	},
	progressContainer: {
		gap: 8
	},
	progressBarBg: {
		height: 10,
		borderRadius: 5,
		overflow: 'hidden'
	},
	progressBarFill: {
		height: '100%',
		borderRadius: 5
	},
	progressText: {
		fontSize: 12,
		textAlign: 'center',
		fontWeight: '600'
	},
	warningBox: {
		flexDirection: 'row',
		gap: 8,
		alignItems: 'center',
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		marginTop: 12
	},
	warningText: {
		fontSize: 12,
		fontWeight: '500',
		flex: 1
	},
	changelogBox: {
		borderRadius: 14,
		padding: 14,
		minHeight: 80
	},
	changelogText: {
		fontSize: 13,
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
		marginTop: 4,
		gap: 4
	},
	apkItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: 1
	},
	apkInfoContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 12,
		marginRight: 8
	},
	apkIconWrap: {
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	apkInfo: {
		flex: 1
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
		gap: 8
	},
	apkBtn: {
		width: 34,
		height: 34,
		borderRadius: 9,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	}
})
