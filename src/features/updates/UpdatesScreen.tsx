import React, { useEffect, useState, useMemo, useRef } from 'react'
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, ActivityIndicator, Platform, Alert, useWindowDimensions, Animated, Easing, Share, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Sharing from 'expo-sharing'
import { useRouter } from 'expo-router'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { useUpdates } from './useUpdates'
import { isVersionGreater } from './UpdatesContext'
import { SmartHeader } from '@/core/smart-header'
import { config } from '@/config'

// Helper to render inline styles like bold (**bold**) and inline code (`code`)
const renderInlineStyles = (text: string, colors: any) => {
	const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g)

	return parts.map((part, index) => {
		if (part.startsWith('**') && part.endsWith('**')) {
			const boldText = part.slice(2, -2)
			return (
				<Text key={index} style={{ fontWeight: '700', color: colors.text }}>
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
						backgroundColor: colors.surfaceVariant,
						color: colors.info,
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
									color: colors.text,
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
							<Text style={{ color: colors.primary, fontSize: 14, marginTop: 1 }}>•</Text>
							<Text style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 }}>{renderInlineStyles(text, colors)}</Text>
						</View>
					)
				}

				// Blank lines spacing
				if (trimmed === '') {
					return <View key={lineIdx} style={{ height: 4 }} />
				}

				// Default paragraph lines
				return (
					<Text key={lineIdx} style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginVertical: 1 }}>
						{renderInlineStyles(trimmed, colors)}
					</Text>
				)
			})}
		</View>
	)
}

function isNetworkError(msg: string | null | undefined): boolean {
	if (!msg) return false
	const lowercase = msg.toLowerCase()
	return (
		lowercase.includes('unknownhostexception') ||
		lowercase.includes('unable to resolve host') ||
		lowercase.includes('network error') ||
		lowercase.includes('fetch failed') ||
		lowercase.includes('timeout') ||
		lowercase.includes('failed to fetch') ||
		lowercase.includes('net::err') ||
		lowercase.includes('connection')
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

	// Refresh cache list on mount, and trigger fetch automatically
	useEffect(() => {
		if (Platform.OS !== 'web') {
			refreshApkList()
		}
		checkForUpdates()
	}, [refreshApkList, checkForUpdates])

	const isAndroid = Platform.OS === 'android'
	const isWeb = Platform.OS === 'web'
	const isWebAndroid = Platform.OS === 'web' && typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '')
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
		let isSupported = false
		if (Platform.OS === 'android') {
			const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10)
			isSupported = apiLevel >= 23
		} else if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
			const match = navigator.userAgent.match(/Android\s([0-9\.]+)/)
			if (match) {
				const majorVersion = parseFloat(match[1])
				isSupported = majorVersion >= 6.0
			}
		}

		return (
			<View style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.card + '90' }]}>
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('device_status', 'Device Status')}</Text>

				{!isWebAndroid && (
					<View style={styles.metaRow}>
						<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('free_storage', 'Free Storage')}</Text>
						<Text
							style={[
								styles.metaValue,
								{
									color: deviceFreeStorage > config.updates.minFreeStorage * 1024 * 1024 ? colors.success : colors.error
								}
							]}
						>
							{formatBytes(deviceFreeStorage)}
						</Text>
					</View>
				)}

				<View style={styles.metaRow}>
					<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('min_android_version', 'Min Android Version')}</Text>
					<Text style={[styles.metaValue, { color: isSupported ? colors.success : colors.error }]}>6.0 (API 23)</Text>
				</View>

				{!isWebAndroid && latestRelease && deviceFreeStorage < latestRelease.size * 1.5 && (
					<View style={[styles.warningBox, { backgroundColor: colors.error + '1A', borderColor: colors.error }]}>
						<Ionicons name="warning" size={16} color={colors.error} />
						<Text style={[styles.warningText, { color: colors.error }]}>{translate('low_space_warning', 'Your device is low on storage space. The download might fail.')}</Text>
					</View>
				)}
			</View>
		)
	}

	const renderEnvironmentBadge = () => {
		const nodeEnv = config.nodeEnv.toLowerCase()
		let badgeColor = colors.success
		let badgeText = config.nodeEnv.toUpperCase()

		if (nodeEnv === 'production' || nodeEnv === 'prod') {
			badgeColor = colors.error
		} else if (nodeEnv === 'local' || nodeEnv === 'dev' || nodeEnv === 'development') {
			badgeColor = colors.info
		} else if (nodeEnv === 'staging') {
			badgeColor = colors.warning
		}

		return (
			<View style={[styles.badgeContainer, { backgroundColor: badgeColor + '15', borderColor: badgeColor + '30' }]}>
				<Ionicons name="git-branch-outline" size={12} color={badgeColor} style={{ marginRight: 4 }} />
				<Text style={[styles.badgeText, { color: badgeColor }]}>{badgeText}</Text>
			</View>
		)
	}

	const renderStatusCard = () => {
		const statusText = isUpToDate ? translate('up_to_date', 'App is Up to Date') : translate('update_available', 'Update is Available')
		const statusSubtitle = isUpToDate
			? translate('running_latest', 'You are running the latest version of Drinaluza.')
			: translate('new_version_found', 'A new release is available with new features and fixes.')

		const accentColor = isUpToDate ? colors.success : colors.primary
		const borderColor = accentColor + '28'
		const backgroundColor = accentColor + '14'

		return (
			<View style={[styles.statusCard, { borderColor, backgroundColor }]}>
				{renderEnvironmentBadge()}
				<View style={[styles.statusRow, { borderColor: accentColor + '22' }]}>
					<View style={[styles.statusGlowRing, { backgroundColor: accentColor + '12' }]}>
						<View style={[styles.statusIndicatorContainer, { backgroundColor: accentColor + '18' }]}>
							{isUpToDate ? (
								<Ionicons name="checkmark-circle" size={44} color={accentColor} />
							) : (
								<Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
									<Ionicons name="cloud-download" size={44} color={accentColor} />
								</Animated.View>
							)}
						</View>
					</View>
				</View>
				<View style={styles.statusContent}>
					<Text style={[styles.statusTitle, { color: colors.text }]}>{statusText}</Text>
					<Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>{statusSubtitle}</Text>
				</View>
			</View>
		)
	}

	const renderVersionComparison = () => {
		const latestVer = latestRelease ? `v${latestRelease.latest_version}` : '—'
		const arrowColor = isUpToDate ? colors.textTertiary : colors.primary
		const arrowBg = isUpToDate ? colors.surfaceVariant : colors.primary + '15'
		const latestColor = isUpToDate ? colors.text : colors.primary

		return (
			<View style={[styles.comparisonGrid, { borderColor: colors.borderLight, backgroundColor: colors.card + '90' }]}>
				<View style={styles.comparisonCard}>
					<Ionicons name="phone-portrait-outline" size={18} color={colors.textTertiary} />
					<Text style={[styles.comparisonLabel, { color: colors.textTertiary }]}>{translate('current_version', 'Current')}</Text>
					<Text style={[styles.comparisonValue, { color: colors.text }]}>v{config.app.version}</Text>
				</View>

				<View style={[styles.comparisonArrow, { backgroundColor: colors.borderLight }]}>
					<View style={[styles.arrowCircle, { backgroundColor: arrowBg, borderColor: isUpToDate ? colors.borderLight : colors.primary + '30' }]}>
						<Ionicons name={isUpToDate ? 'checkmark' : 'arrow-forward'} size={16} color={arrowColor} />
					</View>
				</View>

				<View style={styles.comparisonCard}>
					<Ionicons name="cloud-outline" size={18} color={latestColor} />
					<Text style={[styles.comparisonLabel, { color: colors.textTertiary }]}>{translate('latest_version', 'Latest')}</Text>
					<Text style={[styles.comparisonValue, { color: latestColor }]}>{latestVer}</Text>
				</View>
			</View>
		)
	}

	const renderReleaseMetaList = () => {
		if (!latestRelease) return null
		return (
			<View style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.card + '90' }]}>
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('release_details', 'Release Details')}</Text>
				<View style={styles.metaRow}>
					<View style={styles.metaLabelRow}>
						<View style={[styles.metaIconWrap, { backgroundColor: colors.info + '15' }]}>
							<Ionicons name="calendar-outline" size={16} color={colors.info} />
						</View>
						<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('published_date', 'Published')}</Text>
					</View>
					<Text style={[styles.metaValue, { color: colors.text }]}>{formatDate(latestRelease.published_at)}</Text>
				</View>
				<View style={[styles.metaDivider, { backgroundColor: colors.borderLight }]} />
				<View style={styles.metaRow}>
					<View style={styles.metaLabelRow}>
						<View style={[styles.metaIconWrap, { backgroundColor: colors.primary + '15' }]}>
							<Ionicons name="cube-outline" size={16} color={colors.primary} />
						</View>
						<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('file_size', 'Download Size')}</Text>
					</View>
					<Text style={[styles.metaValue, { color: colors.text }]}>{formatBytes(latestRelease.size)}</Text>
				</View>
				<View style={[styles.metaDivider, { backgroundColor: colors.borderLight }]} />
				<View style={styles.metaRow}>
					<View style={styles.metaLabelRow}>
						<View style={[styles.metaIconWrap, { backgroundColor: colors.success + '15' }]}>
							<Ionicons name="download-outline" size={16} color={colors.success} />
						</View>
						<Text style={[styles.metaLabel, { color: colors.textTertiary }]}>{translate('total_downloads', 'Downloads')}</Text>
					</View>
					<Text style={[styles.metaValue, { color: colors.text }]}>{latestRelease.download_count}</Text>
				</View>
			</View>
		)
	}

	const renderWebActions = () => {
		const isDisabled = !latestRelease || !latestRelease.download_url
		return (
			<View style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.card + '90' }]}>
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('actions', 'Actions')}</Text>
				<View style={styles.actionsContainer}>
					<TouchableOpacity
						disabled={isDisabled}
						onPress={handleDownloadWeb}
						accessibilityLabel={translate('download_android_apk', 'Download Android APK')}
						style={[styles.primaryButtonTouch, { opacity: isDisabled ? 0.5 : 1, backgroundColor: isDisabled ? colors.surfaceVariant : colors.primary }]}
					>
						<View style={styles.primaryButtonGradient}>
							<Ionicons name="download-outline" size={24} color={isDisabled ? colors.textTertiary : colors.textOnPrimary} />
						</View>
					</TouchableOpacity>

					<View style={styles.iconButtonRow}>
						<TouchableOpacity
							disabled={isDisabled}
							onPress={handleCopyUrl}
							accessibilityLabel={copied ? translate('copied', 'Copied') : translate('copy_url', 'Copy Link to Clipboard')}
							style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.borderLight, opacity: isDisabled ? 0.6 : 1 }]}
						>
							<Ionicons name={copied ? 'checkmark-circle-outline' : 'copy-outline'} size={20} color={copied ? colors.success : colors.textSecondary} />
						</TouchableOpacity>
					</View>
				</View>
			</View>
		)
	}

	const renderNativeActions = () => {
		const isDownloadingOrPaused = isDownloading || isPaused

		return (
			<View style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.card + '90' }]}>
				<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('actions', 'Actions')}</Text>
				<View style={styles.actionsContainer}>
					{isDownloadingOrPaused ? (
						<View style={styles.progressContainer}>
							<View style={[styles.progressBarBg, { backgroundColor: colors.surfaceVariant }]}>
								<View style={[styles.progressBarFill, { width: `${Math.round(downloadProgress * 100)}%`, backgroundColor: colors.primary }]} />
							</View>
							<Text style={[styles.progressText, { color: colors.textSecondary }]}>
								{isPaused ? `${translate('paused', 'Paused')} • ${Math.round(downloadProgress * 100)}%` : `${translate('downloading', 'Downloading')} • ${Math.round(downloadProgress * 100)}%`}
							</Text>

							{isDownloading && (downloadSpeed !== null || remainingTime !== null) && (
								<View style={styles.progressMeta}>
									{downloadSpeed !== null && (
										<Text style={[styles.progressMetaText, { color: colors.textTertiary }]}>
											<Ionicons name="speedometer-outline" size={12} color={colors.textTertiary} /> {formatSpeed(downloadSpeed)}
										</Text>
									)}
									{remainingTime !== null && (
										<Text style={[styles.progressMetaText, { color: colors.textTertiary }]}>
											<Ionicons name="time-outline" size={12} color={colors.textTertiary} /> {formatRemainingTime(remainingTime)}
										</Text>
									)}
								</View>
							)}

							<View style={[styles.iconButtonRow, { marginTop: 8 }]}>
								{isDownloading && (
									<>
										<TouchableOpacity
											onPress={pauseDownload}
											accessibilityLabel={translate('pause', 'Pause')}
											style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
										>
											<Ionicons name="pause-outline" size={22} color={colors.textSecondary} />
										</TouchableOpacity>

										<TouchableOpacity
											onPress={cancelDownload}
											accessibilityLabel={translate('cancel', 'Cancel')}
											style={[styles.iconButton, { backgroundColor: colors.error + '10', borderColor: colors.error + '30' }]}
										>
											<Ionicons name="close-outline" size={22} color={colors.error} />
										</TouchableOpacity>
									</>
								)}

								{isPaused && (
									<>
										<TouchableOpacity
											onPress={resumeDownload}
											accessibilityLabel={translate('resume', 'Resume')}
											style={[styles.iconButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
										>
											<Ionicons name="play-outline" size={22} color={colors.textOnPrimary} />
										</TouchableOpacity>

										<TouchableOpacity
											onPress={cancelDownload}
											accessibilityLabel={translate('cancel', 'Cancel')}
											style={[styles.iconButton, { backgroundColor: colors.error + '10', borderColor: colors.error + '30' }]}
										>
											<Ionicons name="close-outline" size={22} color={colors.error} />
										</TouchableOpacity>
									</>
								)}
							</View>
						</View>
					) : (
						<View style={[styles.rowButtons, { flexDirection: isWide ? 'row' : 'column' }]}>
							<TouchableOpacity
								disabled={isDownloadDisabled}
								onPress={downloadUpdate}
								accessibilityLabel={translate('download', 'Download')}
								style={[
									styles.primaryButtonTouch,
									{
										flex: isWide ? 1 : undefined,
										width: isWide ? undefined : '100%',
										opacity: isDownloadDisabled ? 0.5 : 1,
										backgroundColor: isDownloadDisabled ? colors.surfaceVariant : colors.primary
									}
								]}
							>
								<View style={styles.primaryButtonGradient}>
									<Ionicons name="cloud-download-outline" size={24} color={isDownloadDisabled ? colors.textTertiary : colors.textOnPrimary} />
								</View>
							</TouchableOpacity>

							<TouchableOpacity
								disabled={isInstallDisabled}
								onPress={handleInstallPress}
								accessibilityLabel={translate('install', 'Install')}
								style={[
									styles.primaryButtonTouch,
									{
										flex: isWide ? 1 : undefined,
										width: isWide ? undefined : '100%',
										opacity: isInstallDisabled ? 0.5 : 1,
										backgroundColor: isInstallDisabled ? colors.surfaceVariant : colors.success
									}
								]}
							>
								<View style={styles.primaryButtonGradient}>
									<Ionicons name="archive-outline" size={24} color={isInstallDisabled ? colors.textTertiary : colors.textOnPrimary} />
								</View>
							</TouchableOpacity>
						</View>
					)}

					{latestRelease && (
						<View style={styles.iconButtonRow}>
							<TouchableOpacity
								onPress={handleCopyUrl}
								accessibilityLabel={copied ? translate('copied', 'Copied') : translate('copy_url', 'Copy Link')}
								style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
							>
								<Ionicons name={copied ? 'checkmark-circle-outline' : 'copy-outline'} size={20} color={copied ? colors.success : colors.textSecondary} />
							</TouchableOpacity>

							<TouchableOpacity
								onPress={handleShareUrl}
								accessibilityLabel={translate('share_url', 'Share Link')}
								style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
							>
								<Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
							</TouchableOpacity>
						</View>
					)}
				</View>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<SmartHeader
				title={translate('updates', 'Updates')}
				fallbackRoute="/feed"
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
						disabled={isDownloading}
					/>
				]}
			/>

			<SmartHeader.ScrollView contentContainerStyle={[styles.scrollContent, isWide && { maxWidth: maxLayoutWidth, alignSelf: 'center', width: '100%' }]}>
				{renderStatusCard()}

				{renderVersionComparison()}

				{isWeb ? renderWebActions() : renderNativeActions()}

				{renderReleaseMetaList()}

				{/* Free storage / space warnings on Android / Android browsers */}
				{(isAndroid || isWebAndroid) && renderAndroidSection()}

				{/* Cached APK installers list */}
				{sortedApks.length > 0 && (
					<View style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.card + '90' }]}>
						<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('cached_apk_files', 'Cached APK Installers')}</Text>
						<View style={styles.apkSection}>
							{sortedApks.map((apk) => (
								<View key={apk.filename} style={[styles.apkItem, { borderColor: colors.borderLight }]}>
									<View style={styles.apkInfoContainer}>
										<View style={[styles.apkIconWrap, { backgroundColor: colors.primary + '10' }]}>
											<Ionicons name="logo-android" size={18} color={colors.primary} />
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
										<TouchableOpacity onPress={() => handleShareApk(apk.fileUri)} accessibilityLabel="Share APK Installer" style={[styles.apkBtn, { backgroundColor: colors.primary + '10' }]}>
											<Ionicons name="share-social-outline" size={16} color={colors.primary} />
										</TouchableOpacity>

										{/* Delete Button */}
										<TouchableOpacity onPress={() => deleteApk(apk.fileUri)} accessibilityLabel="Delete cached APK" style={[styles.apkBtn, { backgroundColor: colors.error + '10' }]}>
											<Ionicons name="trash-outline" size={16} color={colors.error} />
										</TouchableOpacity>
									</View>
								</View>
							))}
						</View>
					</View>
				)}

				{/* Changelog section */}
				{(isWeb || (latestRelease && latestRelease.changelog !== '')) && (
					<View style={[styles.card, { borderColor: colors.borderLight, backgroundColor: colors.card + '90' }]}>
						<Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{translate('whats_new', "What's New")}</Text>
						<View style={[styles.changelogBox, { backgroundColor: colors.surface + '60', borderColor: colors.borderLight, borderWidth: 1 }]}>
							{latestRelease && latestRelease.changelog !== '' ? (
								<MarkdownRenderer content={latestRelease.changelog} colors={colors} />
							) : (
								<Text style={[styles.changelogText, { color: colors.textSecondary, fontStyle: 'italic' }]}>{translate('no_changelog', 'No changelog details available.')}</Text>
							)}
						</View>
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
		paddingBottom: 48,
		gap: 18
	},
	// Hero card
	statusCard: {
		borderRadius: 28,
		borderWidth: 1,
		padding: 24,
		alignItems: 'center',
		gap: 14
	},
	statusRow: {
		width: 92,
		height: 92,
		borderRadius: 46,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 4
	},
	statusGlowRing: {
		width: '100%',
		height: '100%',
		borderRadius: 42,
		justifyContent: 'center',
		alignItems: 'center'
	},
	statusIndicatorContainer: {
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center'
	},
	statusContent: {
		alignItems: 'center',
		gap: 6
	},
	statusTitle: {
		fontSize: 22,
		fontWeight: '700',
		letterSpacing: -0.4,
		textAlign: 'center'
	},
	statusSubtitle: {
		fontSize: 14,
		lineHeight: 20,
		textAlign: 'center'
	},
	badgeContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12,
		borderWidth: 1
	},
	badgeText: {
		fontSize: 10,
		fontWeight: '700',
		letterSpacing: 0.5
	},
	// Version card
	comparisonGrid: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		borderRadius: 24,
		borderWidth: 1,
		padding: 20,
		gap: 16
	},
	comparisonCard: {
		flex: 1,
		alignItems: 'center',
		gap: 4
	},
	comparisonLabel: {
		fontSize: 11,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	comparisonValue: {
		fontSize: 24,
		fontWeight: '700',
		letterSpacing: -0.5
	},
	comparisonArrow: {
		width: 1,
		height: 40
	},
	arrowCircle: {
		width: 32,
		height: 32,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		position: 'absolute',
		left: -16,
		top: 4
	},
	// Cards
	card: {
		borderRadius: 24,
		borderWidth: 1,
		padding: 20
	},
	sectionTitle: {
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 14
	},
	// Buttons
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
		height: 52,
		width: '100%'
	},
	iconButtonRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		gap: 12,
		width: '100%'
	},
	iconButton: {
		width: 48,
		height: 48,
		borderRadius: 24,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 1,
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	},
	// Progress
	progressContainer: {
		gap: 10
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
	progressText: {
		fontSize: 13,
		textAlign: 'center',
		fontWeight: '600'
	},
	progressMeta: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	progressMetaText: {
		fontSize: 12,
		fontWeight: '500'
	},
	// Meta rows
	metaRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 6
	},
	metaLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10
	},
	metaIconWrap: {
		width: 32,
		height: 32,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center'
	},
	metaLabel: {
		fontSize: 14,
		fontWeight: '500'
	},
	metaValue: {
		fontSize: 14,
		fontWeight: '600'
	},
	metaDivider: {
		height: 1,
		marginVertical: 4
	},
	// Changelog
	changelogBox: {
		borderRadius: 16,
		padding: 16,
		minHeight: 80
	},
	changelogText: {
		fontSize: 14,
		lineHeight: 20
	},
	// APK
	apkSection: {
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
		width: 40,
		height: 40,
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
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	},
	// Warning / Error
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
		fontSize: 13,
		fontWeight: '500',
		flex: 1,
		lineHeight: 18
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
		flex: 1,
		lineHeight: 18
	}
})
