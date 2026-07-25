import React, { useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, Platform, Alert, useWindowDimensions, Animated, Easing, Share } from 'react-native'
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

const hexToRgba = (hex: string, alpha: number): string => {
	if (!hex) return `rgba(0, 0, 0, ${alpha})`
	if (!hex.startsWith('#')) return `rgba(128, 128, 128, ${alpha})`

	const c = hex.slice(1)
	const expand = (ch: string) => ch + ch

	if (c.length === 3 || c.length === 4) {
		const r = parseInt(expand(c[0]), 16)
		const g = parseInt(expand(c[1]), 16)
		const b = parseInt(expand(c[2]), 16)
		return `rgba(${r}, ${g}, ${b}, ${alpha})`
	}

	if (c.length === 6 || c.length === 8) {
		const r = parseInt(c.substring(0, 2), 16)
		const g = parseInt(c.substring(2, 4), 16)
		const b = parseInt(c.substring(4, 6), 16)
		return `rgba(${r}, ${g}, ${b}, ${alpha})`
	}

	return `rgba(128, 128, 128, ${alpha})`
}

const renderInlineStyles = (text: string, colors: AppThemeColors) => {
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

const MarkdownRenderer = ({ content, colors }: { content: string; colors: AppThemeColors }) => {
	if (!content) return null

	const lines = content.split('\n')

	return (
		<View style={{ gap: 8 }}>
			{lines.map((line, lineIdx) => {
				const trimmed = line.trim()

				if (trimmed.startsWith('#')) {
					const match = trimmed.match(/^(#+)\s*(.*)$/)
					if (match) {
						const level = match[1].length
						const text = match[2]
						const fontSize = level === 1 ? 18 : level === 2 ? 15 : 13
						const marginTop = lineIdx > 0 ? 14 : 2
						return (
							<Text
								key={lineIdx}
								style={{
									fontSize,
									fontWeight: '700',
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

				if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
					const text = trimmed.replace(/^[-*]\s*/, '')
					return (
						<View key={lineIdx} style={{ flexDirection: 'row', alignItems: 'flex-start', paddingLeft: 6, gap: 6, marginVertical: 1 }}>
							<Text style={{ color: colors.primary, fontSize: 14, marginTop: 1 }}>•</Text>
							<Text style={{ flex: 1, fontSize: 13, color: colors.text, lineHeight: 19 }}>{renderInlineStyles(text, colors)}</Text>
						</View>
					)
				}

				if (trimmed === '') {
					return <View key={lineIdx} style={{ height: 4 }} />
				}

				return (
					<Text key={lineIdx} style={{ fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginVertical: 1 }}>
						{renderInlineStyles(trimmed, colors)}
					</Text>
				)
			})}
		</View>
	)
}

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
	heroCard: {
		borderRadius: 32,
		borderWidth: 1,
		overflow: 'hidden'
	},
	heroInner: {
		padding: 28,
		alignItems: 'center',
		gap: 14
	},
	heroIconCircle: {
		width: 96,
		height: 96,
		borderRadius: 48,
		justifyContent: 'center',
		alignItems: 'center'
	},
	envBadge: {
		paddingHorizontal: 12,
		paddingVertical: 5,
		borderRadius: 20,
		borderWidth: 1
	},
	envText: {
		fontSize: 11,
		fontWeight: '800',
		letterSpacing: 0.6
	},
	heroTitle: {
		fontSize: 28,
		fontWeight: '800',
		textAlign: 'center'
	},
	heroSubtitle: {
		fontSize: 15,
		fontWeight: '500',
		textAlign: 'center'
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
		flexDirection: 'column',
		gap: 8,
		marginTop: 10,
		alignItems: 'flex-start'
	},
	infoBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 10
	},
	infoBadgeText: {
		fontSize: 12,
		fontWeight: '600'
	},
	iconButton: {
		width: 50,
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
		justifyContent: 'center',
		gap: 6,
		paddingHorizontal: 8,
		paddingVertical: 6,
		borderRadius: 10,
		width: 100,
		height: 30
	},
	progressBadgeText: {
		fontSize: 12,
		fontWeight: '600'
	},
	warningBox: {
		flexDirection: 'row',
		gap: 10,
		alignItems: 'center',
		padding: 14,
		borderRadius: 16,
		borderWidth: 1,
		marginTop: 12
	},
	warningText: {
		flex: 1,
		fontSize: 13,
		fontWeight: '500',
		lineHeight: 20
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
	},
	changelogCard: {
		borderRadius: 20,
		padding: 20,
		borderWidth: 1,
		minHeight: 120
	},
	emptyChangelog: {
		fontSize: 14,
		lineHeight: 22,
		fontStyle: 'italic'
	},
	errorBanner: {
		flexDirection: 'row',
		gap: 12,
		alignItems: 'center',
		padding: 16,
		borderRadius: 16,
		borderWidth: 1
	},
	errorText: {
		flex: 1,
		fontSize: 14,
		fontWeight: '500',
		lineHeight: 20
	}
})

interface InfoCardProps {
	icon: React.ComponentProps<typeof Ionicons>['name']
	label: string
	value: string
	color: string
	active?: boolean
	footer?: React.ReactNode
	colors: AppThemeColors
}

const InfoCard = ({ icon, label, value, color, active, footer, colors }: InfoCardProps) => (
	<View
		style={[
			styles.infoCard,
			{
				backgroundColor: active ? hexToRgba(color, 0.06) : colors.background,
				borderColor: active ? hexToRgba(color, 0.3) : colors.borderLight
			}
		]}
	>
		<View style={[styles.infoIcon, { backgroundColor: hexToRgba(color, 0.12) }]}>
			<Ionicons name={icon} size={22} color={color} />
		</View>
		<View style={styles.infoText}>
			<Text style={[styles.infoLabel, { color: colors.textTertiary }]}>{label}</Text>
			<Text style={[styles.infoValue, { color: active ? color : colors.text }]} numberOfLines={1}>
				{value}
			</Text>
			{footer}
		</View>
	</View>
)

type IconVariant = 'primary' | 'success' | 'secondary' | 'danger'

interface IconButtonProps {
	icon: React.ComponentProps<typeof Ionicons>['name']
	label: string
	onPress: () => void
	disabled?: boolean
	variant?: IconVariant
	colors: AppThemeColors
}

const IconButton = ({ icon, label, onPress, disabled, variant = 'secondary', colors }: IconButtonProps) => {
	const isPrimary = variant === 'primary'
	const isSuccess = variant === 'success'
	const isDanger = variant === 'danger'

	const backgroundColor = disabled ? colors.surfaceVariant : isPrimary ? colors.primary : isSuccess ? colors.success : isDanger ? hexToRgba(colors.error, 0.1) : colors.surface

	const borderColor = disabled ? colors.surfaceVariant : isPrimary ? colors.primary : isSuccess ? colors.success : isDanger ? hexToRgba(colors.error, 0.25) : colors.borderLight

	const iconColor = disabled ? colors.textTertiary : isPrimary || isSuccess ? colors.textOnPrimary : isDanger ? colors.error : colors.textSecondary

	return (
		<TouchableOpacity onPress={onPress} disabled={disabled} activeOpacity={0.8} accessibilityLabel={label} style={[styles.iconButton, { backgroundColor, borderColor, opacity: disabled ? 0.5 : 1 }]}>
			<Ionicons name={icon} size={24} color={iconColor} />
		</TouchableOpacity>
	)
}

export default function UpdatesScreen() {
	const { colors } = useTheme()
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
		if (seconds < 60) {
			return `${seconds}s`
		}
		const minutes = Math.floor(seconds / 60)
		const remainingSeconds = seconds % 60
		return `${minutes}m ${remainingSeconds}s`
	}

	const formatSpeed = (speedBytesPerSec: number | null): string => {
		if (speedBytesPerSec === null || speedBytesPerSec <= 0) return ''
		return `${formatBytes(speedBytesPerSec)}/s`
	}

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

	useEffect(() => {
		if (Platform.OS !== 'web') {
			refreshApkList()
		}
	}, [refreshApkList])

	const isAndroid = Platform.OS === 'android'
	const isSupported = useMemo(() => {
		if (Platform.OS === 'android') {
			const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10)
			return apiLevel >= 23
		}
		if (Platform.OS === 'web' && typeof navigator !== 'undefined') {
			const match = navigator.userAgent.match(/Android\s([0-9\.]+)/)
			if (match) return parseFloat(match[1]) >= 6.0
		}
		return false
	}, [])
	const isWeb = Platform.OS === 'web'
	const isWebAndroid = Platform.OS === 'web' && typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent || '')
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
		if (Platform.OS === 'web' && typeof document !== 'undefined') {
			const link = (document as any).createElement('a')
			link.href = latestRelease.download_url
			link.setAttribute('download', '')
			link.style.display = 'none'
			document.body.appendChild(link)
			link.click()
			document.body.removeChild(link)
		}
	}

	const heroColor = isChecking ? colors.info : isUpToDate ? colors.success : colors.primary
	const heroIcon = isChecking ? 'refresh' : isUpToDate ? 'checkmark-circle' : 'cloud-download'
	const heroTitle = isChecking ? translate('checking', 'Checking...') : isUpToDate ? translate('up_to_date', 'App is up to date') : translate('update_available', 'Update available')
	const heroSubtitle = isChecking || isUpToDate || latestRelease ? '' : translate('pull_to_refresh', 'Pull down to refresh')

	const env = config.app.env.toLowerCase()
	const envLabel = env === 'production' ? 'PRODUCTION' : env === 'development' ? 'DEVELOPMENT' : env.toUpperCase()
	const envColor = env === 'production' ? colors.success : env === 'development' ? colors.warning : colors.info

	const heroTint = hexToRgba(heroColor, 0.18)
	const heroTop = hexToRgba(heroColor, 0.22)
	const heroBorder = hexToRgba(heroColor, 0.3)

	const enoughSpace = !isWebAndroid && deviceFreeStorage >= 1024 * 1024 * 1024
	const lowSpace = !isWebAndroid && latestRelease && deviceFreeStorage < latestRelease.size * 1.5

	const releaseBadges = useMemo(
		() =>
			latestRelease ? (
				<View style={styles.badgeColumn}>
					<View style={[styles.infoBadge, { backgroundColor: hexToRgba(colors.info, 0.12) }]}>
						<Ionicons name="calendar-outline" size={12} color={colors.info} />
						<Text style={[styles.infoBadgeText, { color: colors.info }]}>{formatDate(latestRelease.published_at)}</Text>
					</View>
					<View style={[styles.infoBadge, { backgroundColor: hexToRgba(colors.primary, 0.12) }]}>
						<Ionicons name="cube-outline" size={12} color={colors.primary} />
						<Text style={[styles.infoBadgeText, { color: colors.primary }]}>{formatBytes(latestRelease.size)}</Text>
					</View>
					<View style={[styles.infoBadge, { backgroundColor: hexToRgba(colors.success, 0.12) }]}>
						<Ionicons name="download-outline" size={12} color={colors.success} />
						<Text style={[styles.infoBadgeText, { color: colors.success }]}>{latestRelease.download_count}</Text>
					</View>
				</View>
			) : undefined,
		[latestRelease, colors]
	)

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
				{!!error && (
					<View style={[styles.errorBanner, { backgroundColor: hexToRgba(colors.error, 0.1), borderColor: hexToRgba(colors.error, 0.3) }]}>
						<Ionicons name="alert-circle-outline" size={22} color={colors.error} />
						<Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
					</View>
				)}

				<View style={[styles.heroCard, { borderColor: heroBorder, backgroundColor: colors.surface }]}>
					<LinearGradient colors={[heroTop, colors.surface]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
					<View style={styles.heroInner}>
						<Animated.View style={[styles.heroIconCircle, { backgroundColor: heroTint, transform: [{ scale: pulseAnim }] }]}>
							<Ionicons name={heroIcon} size={44} color={heroColor} />
						</Animated.View>
						<View style={[styles.envBadge, { backgroundColor: hexToRgba(envColor, 0.12), borderColor: hexToRgba(envColor, 0.25) }]}>
							<Text style={[styles.envText, { color: envColor }]}>{envLabel}</Text>
						</View>
						<Text style={[styles.heroTitle, { color: colors.text }]}>{heroTitle}</Text>
						{heroSubtitle !== '' && <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>{heroSubtitle}</Text>}
					</View>
				</View>

				<View style={styles.section}>
					<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{translate('version', 'Version')}</Text>
					<View style={[styles.row, isWide && styles.rowWide]}>
						<InfoCard icon="phone-portrait-outline" label={translate('current_version', 'Current')} value={`v${config.app.version}`} color={colors.textTertiary} colors={colors} />
						<InfoCard
							icon="cloud-outline"
							label={translate('latest_version', 'Latest')}
							value={latestRelease ? `v${latestRelease.latest_version}` : '—'}
							color={isUpToDate ? colors.textTertiary : colors.primary}
							active={!isUpToDate && !!latestRelease}
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
										<Text style={[styles.progressBadgeText, { color: colors.textTertiary }]}>{formatSpeed(downloadSpeed)}</Text>
									</View>
									<View style={[styles.progressBadge, { backgroundColor: colors.surface, opacity: remainingTime === null ? 0 : 1 }]}>
										<Ionicons name="time-outline" size={12} color={colors.textTertiary} />
										<Text style={[styles.progressBadgeText, { color: colors.textTertiary }]}>{formatRemainingTime(remainingTime)}</Text>
									</View>
								</View>
							</View>
						</View>
					)}

					<View style={styles.actionBar}>
						{isWeb ? (
							<>
								<IconButton icon="download-outline" label={translate('download', 'Download')} onPress={handleDownloadWeb} disabled={!latestRelease?.download_url} variant="primary" colors={colors} />
								<IconButton
									icon={copied ? 'checkmark-circle-outline' : 'copy-outline'}
									label={copied ? translate('copied', 'Copied') : translate('copy_url', 'Copy Link')}
									onPress={handleCopyUrl}
									disabled={!latestRelease?.download_url}
									variant={copied ? 'success' : 'secondary'}
									colors={colors}
								/>
								<View style={[styles.iconButton, { opacity: 0 }]} />
								<View style={[styles.iconButton, { opacity: 0 }]} />
							</>
						) : (
							<>
								<IconButton
									icon={isPaused ? 'play-outline' : isDownloading ? 'pause-outline' : 'cloud-download-outline'}
									label={isPaused ? translate('resume', 'Resume') : isDownloading ? translate('pause', 'Pause') : translate('download', 'Download')}
									onPress={isPaused ? resumeDownload : isDownloading ? pauseDownload : downloadUpdate}
									disabled={!isDownloading && !isPaused && isDownloadDisabled}
									variant={isPaused ? 'primary' : isDownloading ? 'secondary' : 'primary'}
									colors={colors}
								/>
								<IconButton icon="close-outline" label={translate('cancel', 'Cancel')} onPress={cancelDownload} disabled={!isDownloading && !isPaused} variant="danger" colors={colors} />
								<IconButton
									icon="archive-outline"
									label={translate('install', 'Install')}
									onPress={handleInstallPress}
									disabled={isInstallDisabled || isDownloading || isPaused}
									variant="success"
									colors={colors}
								/>
								<IconButton
									icon={copied ? 'checkmark-circle-outline' : 'copy-outline'}
									label={copied ? translate('copied', 'Copied') : translate('copy_url', 'Copy Link')}
									onPress={handleCopyUrl}
									disabled={!latestRelease?.download_url}
									variant={copied ? 'success' : 'secondary'}
									colors={colors}
								/>
								<IconButton
									icon="share-social-outline"
									label={translate('share_url', 'Share Link')}
									onPress={handleShareUrl}
									disabled={!latestRelease?.download_url}
									variant="secondary"
									colors={colors}
								/>
							</>
						)}
					</View>
				</View>

				{(isAndroid || isWebAndroid) && (
					<View style={styles.section}>
						<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{translate('device_status', 'Device Status')}</Text>
						<View style={[styles.row, isWide && styles.rowWide]}>
							{!isWebAndroid && (
								<InfoCard
									icon="save-outline"
									label={translate('free_storage', 'Free Storage')}
									value={formatBytes(deviceFreeStorage)}
									color={enoughSpace ? colors.success : colors.error}
									active={!enoughSpace}
									colors={colors}
								/>
							)}
							<InfoCard
								icon="logo-android"
								label={translate('min_android_version', 'Min Android Version')}
								value="6.0 (API 23)"
								color={isSupported ? colors.success : colors.error}
								active={!isSupported}
								colors={colors}
							/>
						</View>
						{lowSpace && (
							<View style={[styles.warningBox, { backgroundColor: hexToRgba(colors.error, 0.1), borderColor: hexToRgba(colors.error, 0.3) }]}>
								<Ionicons name="warning" size={18} color={colors.error} />
								<Text style={[styles.warningText, { color: colors.error }]}>{translate('low_space_warning', 'Your device is low on storage space. The download might fail.')}</Text>
							</View>
						)}
					</View>
				)}

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
											<Text style={[styles.apkTitle, { color: colors.text }]} numberOfLines={1}>
												{apk.filename}
											</Text>
											<Text style={[styles.apkMeta, { color: colors.textTertiary }]}>
												v{apk.version} • {formatBytes(apk.size)}
											</Text>
										</View>
									</View>
									<View style={styles.apkActions}>
										<TouchableOpacity
											onPress={() => handleShareApk(apk.fileUri)}
											accessibilityLabel="Share APK Installer"
											style={[styles.iconBtn, { backgroundColor: hexToRgba(colors.primary, 0.12) }]}
										>
											<Ionicons name="share-social-outline" size={20} color={colors.primary} />
										</TouchableOpacity>
										<TouchableOpacity onPress={() => deleteApk(apk.fileUri)} accessibilityLabel="Delete cached APK" style={[styles.iconBtn, { backgroundColor: hexToRgba(colors.error, 0.12) }]}>
											<Ionicons name="trash-outline" size={20} color={colors.error} />
										</TouchableOpacity>
									</View>
								</View>
							))}
						</View>
					</View>
				)}

				{(isWeb || (latestRelease && latestRelease.changelog !== '')) && (
					<View style={styles.section}>
						<Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>{translate('whats_new', "What's New")}</Text>
						<View style={[styles.changelogCard, { backgroundColor: colors.background, borderColor: colors.borderLight }]}>
							{latestRelease && latestRelease.changelog !== '' ? (
								<MarkdownRenderer content={latestRelease.changelog} colors={colors} />
							) : (
								<Text style={[styles.emptyChangelog, { color: colors.textSecondary }]}>{translate('no_changelog', 'No changelog details available.')}</Text>
							)}
						</View>
					</View>
				)}
			</SmartHeader.ScrollView>
		</View>
	)
}
