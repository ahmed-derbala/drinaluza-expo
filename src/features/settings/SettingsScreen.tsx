import HeaderTitle from '@/features/common/HeaderTitle'
import { Tabs } from 'expo-router'
import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, useWindowDimensions, Platform, ActivityIndicator, Modal, Share, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'

import { useTheme, useThemeContext } from '@/core/theme'
import { APP_VERSION, BACKEND_URL, NODE_ENV } from '@/config'
import { toast } from '@/features/common/Toast'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { useUpdater } from '@/features/appUpdater/AppUpdater'
import QRCodeModal from '@/features/common/QRCodeModal'
import HeaderActionButton from '@/features/common/HeaderActionButton'

const formatUptime = (uptime: string | undefined): string => {
	if (!uptime) return ''
	return uptime
		.replace(/\s*days?,?\s*/gi, 'd ')
		.replace(/\s*hours?,?\s*/gi, 'h ')
		.replace(/\s*minutes?,?\s*/gi, 'm ')
		.replace(/\s*seconds?,?\s*/gi, 's')
		.trim()
}

export default function SettingsScreen() {
	const { colors } = useTheme()
	const { themeMode, setThemeMode } = useThemeContext()
	const { translate } = useUser()
	const { width } = useWindowDimensions()
	const maxWidth = 600
	const isWideScreen = width > maxWidth
	const { onScroll } = useScrollHandler()

	const { isChecking, updateStatus, latestVersion, minVersion, serverVersion, checkForUpdates, apkDownloadUrl } = useUpdater()

	const styles = useMemo(() => createStyles(colors), [colors])
	const [serverInfo, setServerInfo] = useState<any>(null)
	const [showApkQRCode, setShowApkQRCode] = useState(false)

	const handleShareApk = async () => {
		const version = latestVersion || APP_VERSION
		const localUri = `${FileSystem.cacheDirectory}drinaluza-${version}.apk`
		const downloadUrl = apkDownloadUrl || `https://github.com/ahmed-derbala/drinaluza-expo/releases/download/v${version}/drinaluza-${version}.apk`

		const shareUrl = async () => {
			try {
				await Share.share({
					message: translate('share_apk_url_msg', `Download Drinaluza v${version} APK: ${downloadUrl}`),
					title: `Drinaluza v${version}`
				})
			} catch (error) {
				console.warn('[settings] Failed to share URL:', error)
				Linking.openURL(downloadUrl)
			}
		}

		const shareFile = async () => {
			try {
				if (Platform.OS !== 'web') {
					if (await Sharing.isAvailableAsync()) {
						await Sharing.shareAsync(localUri, {
							mimeType: 'application/vnd.android.package-archive',
							dialogTitle: translate('share_apk_file_title', `Share Drinaluza v${version} APK`)
						})
					}
				}
			} catch (error) {
				console.warn('[settings] Failed to share file:', error)
				toast.show({
					title: translate('error', 'Error'),
					message: translate('share_file_failed', 'Failed to share file. Please try again.'),
					color: colors.error
				})
			}
		}

		const handleShareFileWithAdvisory = () => {
			Alert.alert(
				translate('quickshare_advisory_title', 'Quick Share'),
				translate('quickshare_advisory_msg', 'To share the APK file with a nearby Android phone, please select "Quick Share" (or Bluetooth) in the system sharing menu that opens next.'),
				[
					{ text: translate('cancel', 'Cancel'), style: 'cancel' },
					{ text: translate('ok', 'OK'), onPress: shareFile }
				]
			)
		}

		if (Platform.OS === 'web') {
			await shareUrl()
			return
		}

		try {
			const fileInfo = await FileSystem.getInfoAsync(localUri)
			if (fileInfo.exists) {
				Alert.alert(translate('share_options_title', 'Share Options'), translate('share_options_msg', 'Choose how you want to share Drinaluza:'), [
					{ text: translate('cancel', 'Cancel'), style: 'cancel' },
					{ text: translate('share_version_url', 'Share Latest Version URL'), onPress: shareUrl },
					{ text: translate('share_apk_file', 'Share Latest APK File'), onPress: handleShareFileWithAdvisory }
				])
			} else {
				Alert.alert(
					translate('share_options_title', 'Share Options'),
					translate('share_apk_not_downloaded', 'The latest APK file has not been downloaded yet. You can share the latest version URL instead.'),
					[
						{ text: translate('cancel', 'Cancel'), style: 'cancel' },
						{ text: translate('share_version_url', 'Share Latest Version URL'), onPress: shareUrl }
					]
				)
			}
		} catch (error) {
			console.warn('[settings] Error checking APK for share:', error)
			await shareUrl()
		}
	}

	useEffect(() => {
		// Silent check on mount
		checkForUpdates(false)

		if (!BACKEND_URL) return

		fetch(BACKEND_URL)
			.then(async (res) => {
				const text = await res.text()
				try {
					const json = JSON.parse(text)
					setServerInfo(json.data || json)
				} catch (e) {
					console.warn('[settings] Failed to parse server info:', e)
				}
			})
			.catch((err) => {
				console.warn('[settings] Failed to fetch server info:', err)
			})
	}, [checkForUpdates])

	const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>{title}</Text>
			<View style={styles.sectionContent}>{children}</View>
		</View>
	)

	const SettingItem = ({
		icon,
		title,
		subtitle,
		value,
		onPress,
		type = 'arrow',
		color,
		copyValue
	}: {
		icon: any
		title: string
		subtitle?: string
		value?: string
		onPress?: () => void
		type?: 'arrow' | 'value' | 'none'
		color?: string
		copyValue?: string
	}) => {
		const handleCopy = async () => {
			if (copyValue) {
				await Clipboard.setStringAsync(copyValue)
				toast.show({ title: 'Success', message: translate('copied_to_clipboard', 'Copied to clipboard!'), color: '#10B981' })
			}
		}

		return (
			<TouchableOpacity style={styles.item} onPress={onPress} disabled={type === 'none'} activeOpacity={type === 'none' ? 1 : 0.7}>
				<View style={[styles.iconContainer, { backgroundColor: (color || colors.primary) + '20' }]}>
					<Ionicons name={icon} size={20} color={color || colors.primary} />
				</View>
				<View style={styles.itemContent}>
					<Text style={styles.itemTitle}>{title}</Text>
					{subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
				</View>
				<View style={styles.itemRight}>
					{copyValue && (
						<TouchableOpacity
							onPress={(e) => {
								e.stopPropagation()
								handleCopy()
							}}
							style={styles.copyButton}
						>
							<Ionicons name="copy-outline" size={18} color={colors.textTertiary} />
						</TouchableOpacity>
					)}
					{type === 'arrow' && <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />}
					{type === 'value' && <Text style={styles.itemValue}>{value}</Text>}
				</View>
			</TouchableOpacity>
		)
	}

	return (
		<ScrollView
			style={styles.container}
			contentContainerStyle={[styles.contentContainer, isWideScreen && { maxWidth: maxWidth, alignSelf: 'center', width: '100%' }]}
			onScroll={onScroll}
			scrollEventThrottle={16}
		>
			<Tabs.Screen
				options={{
					headerTitle: () => <HeaderTitle title={translate('settings', 'Settings')} subtitle={'Drinaluza - Business Manager'} />,
					headerLeft: () => null,
					headerRight: () => (
						<View style={{ flexDirection: 'row', gap: 8, paddingRight: 16, alignItems: 'center' }}>
							<HeaderActionButton iconName="share-social-outline" onPress={handleShareApk} accessibilityLabel="Share APK" backgroundColor={colors.surface} size={38} />
							<HeaderActionButton iconName="qr-code-outline" onPress={() => setShowApkQRCode(true)} accessibilityLabel="APK QR Code" backgroundColor={colors.surface} size={38} />
						</View>
					)
				}}
			/>
			<View style={{ height: 16 }} />

			{/* Version Info & Update Center */}
			<View style={[styles.updaterCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<View style={styles.updaterHeader}>
					<View style={[styles.updaterIconContainer, { backgroundColor: colors.primary + '15' }]}>
						<Ionicons name="phone-portrait-outline" size={22} color={colors.primary} />
					</View>
					<View style={styles.updaterInfo}>
						<Text style={[styles.updaterAppName, { color: colors.text }]}>Drinaluza</Text>
						<Text style={[styles.updaterVersionText, { color: colors.textSecondary }]}>
							Active: v{APP_VERSION} • {NODE_ENV}
						</Text>
						{latestVersion && (
							<Text style={[styles.updaterLatestText, { color: updateStatus !== 'up_to_date' ? colors.primary : colors.success, fontWeight: '700' }]}>
								{updateStatus === 'up_to_date' ? 'Running latest version' : `Latest: v${latestVersion}`}
							</Text>
						)}
					</View>
				</View>

				<View style={[styles.updaterDivider, { backgroundColor: colors.border }]} />

				<TouchableOpacity
					style={[
						styles.updaterBtn,
						{
							backgroundColor: updateStatus !== 'up_to_date' ? colors.primary : colors.surfaceVariant,
							borderColor: colors.border
						}
					]}
					onPress={() => checkForUpdates(true)}
					disabled={isChecking}
					activeOpacity={0.8}
				>
					{isChecking ? (
						<ActivityIndicator size="small" color={updateStatus !== 'up_to_date' ? '#fff' : colors.text} />
					) : (
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
							<Ionicons name={updateStatus !== 'up_to_date' ? 'download-outline' : 'sync-outline'} size={18} color={updateStatus !== 'up_to_date' ? '#fff' : colors.text} />
							<Text
								style={[
									styles.updaterBtnText,
									{
										color: updateStatus !== 'up_to_date' ? '#fff' : colors.text,
										fontWeight: '700'
									}
								]}
							>
								{updateStatus === 'up_to_date' ? translate('check_for_updates', 'Check for Updates') : translate('update_now', 'Update Now')}
							</Text>
						</View>
					)}
				</TouchableOpacity>
			</View>

			<SettingSection title={translate('appearance', 'Appearance')}>
				<View style={{ flexDirection: 'row', gap: 8, padding: 12 }}>
					{(['system', 'light', 'dark'] as const).map((mode) => {
						const isSelected = themeMode === mode
						const label = mode === 'system' ? translate('theme_system', 'System') : mode === 'light' ? translate('theme_light', 'Light') : translate('theme_dark', 'Dark')
						const icon = mode === 'system' ? 'options-outline' : mode === 'light' ? 'sunny-outline' : 'moon-outline'

						return (
							<TouchableOpacity
								key={mode}
								onPress={() => setThemeMode(mode)}
								style={{
									flex: 1,
									borderWidth: 1.5,
									borderRadius: 12,
									paddingVertical: 10,
									alignItems: 'center',
									justifyContent: 'center',
									gap: 6,
									backgroundColor: isSelected ? colors.primary + '15' : colors.card,
									borderColor: isSelected ? colors.primary : colors.border
								}}
								activeOpacity={0.8}
							>
								<Ionicons name={icon} size={20} color={isSelected ? colors.primary : colors.text} />
								<Text style={{ fontSize: 12, color: isSelected ? colors.primary : colors.text, fontWeight: isSelected ? '700' : '500' }}>{label}</Text>
							</TouchableOpacity>
						)
					})}
				</View>
			</SettingSection>

			<SettingSection title={translate('social_media', 'Social Media')}>
				<SettingItem
					icon="logo-facebook"
					title="Facebook"
					subtitle="Follow us on Facebook"
					onPress={() => Linking.openURL('https://www.facebook.com/Drinaluza')}
					copyValue="https://www.facebook.com/Drinaluza"
					color="#1877F2"
				/>
				<SettingItem
					icon="logo-instagram"
					title="Instagram"
					subtitle={translate('follow_on_instagram', 'Follow us on Instagram')}
					onPress={() => Linking.openURL('https://www.instagram.com/drinaluza/')}
					copyValue="https://www.instagram.com/drinaluza/"
					color="#E4405F"
				/>
				<SettingItem
					icon="logo-tiktok"
					title="TikTok"
					subtitle="Follow us on TikTok"
					onPress={() => Linking.openURL('https://www.tiktok.com/@drinaluza')}
					copyValue="https://www.tiktok.com/@drinaluza"
					color="#000000"
				/>
			</SettingSection>

			<SettingSection title={translate('contact', 'Contact')}>
				<SettingItem icon="mail" title="Email" subtitle="drinaluza@gmail.com" onPress={() => Linking.openURL('mailto:drinaluza@gmail.com')} copyValue="drinaluza@gmail.com" color="#EA4335" />
			</SettingSection>

			<SettingSection title={translate('downloads', 'Downloads')}>
				<SettingItem
					icon="globe-outline"
					title="Netlify"
					subtitle="drinaluza.netlify.app"
					onPress={() => Linking.openURL('https://drinaluza.netlify.app/')}
					copyValue="https://drinaluza.netlify.app/"
					color="#00C7B7"
				/>
				<SettingItem
					icon="globe-outline"
					title="Vercel"
					subtitle="drinaluza.vercel.app"
					onPress={() => Linking.openURL('https://drinaluza.vercel.app/')}
					copyValue="https://drinaluza.vercel.app/"
					color={colors.text}
				/>
			</SettingSection>

			<SettingSection title={translate('developer', 'Developer')}>
				<SettingItem
					icon="logo-linkedin"
					title="Ahmed Derbala"
					subtitle="Connect on LinkedIn"
					onPress={() => Linking.openURL('https://www.linkedin.com/in/ahmed-derbala/')}
					copyValue="https://www.linkedin.com/in/ahmed-derbala/"
					color="#0077B5"
				/>
			</SettingSection>

			{serverInfo && (
				<SettingSection title={translate('server_info', 'Server Info')}>
					<SettingItem icon="server-outline" title={translate('environment', 'Environment')} value={serverInfo.NODE_ENV} type="value" color={colors.textSecondary} />
					<SettingItem icon="information-circle-outline" title={translate('app_name', 'App Name')} value={serverInfo.app?.name} type="value" color={colors.textSecondary} />
					<SettingItem icon="git-network-outline" title={translate('version', 'Version')} value={serverInfo.app?.version} type="value" color={colors.textSecondary} />
					{serverInfo.NODE_VERSION && <SettingItem icon="logo-nodejs" title="Node.js" value={serverInfo.NODE_VERSION} type="value" color="#339933" />}
					{serverInfo.uptime && <SettingItem icon="time-outline" title={translate('uptime', 'Uptime')} value={formatUptime(serverInfo.uptime)} type="value" color={colors.textSecondary} />}
				</SettingSection>
			)}

			<View style={styles.footer}>
				<View style={styles.versionBadge}>
					<Text style={styles.versionText}>
						v{APP_VERSION} • {NODE_ENV}
					</Text>
				</View>
				<Text style={styles.copyright}>© 2026 Drinaluza</Text>
				<Text style={styles.madeWith}>{translate('made_with', 'Made with 💙 in Tunisia')}</Text>
			</View>

			<QRCodeModal
				visible={showApkQRCode}
				onClose={() => setShowApkQRCode(false)}
				value={apkDownloadUrl || `https://github.com/ahmed-derbala/drinaluza-expo/releases/download/v${latestVersion || APP_VERSION}/drinaluza-${latestVersion || APP_VERSION}.apk`}
				title="APK Download"
				subtitle={`v${latestVersion || APP_VERSION} • Android Package`}
				filenamePrefix={`drinaluza-apk-v${latestVersion || APP_VERSION}`}
			/>
		</ScrollView>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background
		},
		contentContainer: {
			padding: 20,
			paddingBottom: 90
		},
		header: {
			marginBottom: 28
		},
		title: {
			fontSize: 32,
			fontWeight: '700',
			color: colors.text,
			letterSpacing: -0.5
		},
		headerSubtitle: {
			fontSize: 14,
			color: colors.textSecondary,
			marginTop: 4
		},
		section: {
			marginBottom: 24
		},
		sectionTitle: {
			fontSize: 13,
			fontWeight: '600',
			color: colors.textSecondary,
			marginBottom: 10,
			textTransform: 'uppercase',
			letterSpacing: 0.5,
			marginLeft: 4
		},
		sectionContent: {
			backgroundColor: colors.card,
			borderRadius: 16,
			overflow: 'hidden',
			borderWidth: 1,
			borderColor: colors.info || '#3B82F6'
		},
		item: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 16,
			borderBottomWidth: 1,
			borderBottomColor: colors.border
		},
		iconContainer: {
			width: 40,
			height: 40,
			borderRadius: 12,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 14
		},
		itemContent: {
			flex: 1
		},
		itemTitle: {
			fontSize: 16,
			fontWeight: '500',
			color: colors.text
		},
		itemSubtitle: {
			fontSize: 13,
			color: colors.textTertiary,
			marginTop: 2
		},
		itemRight: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			flexShrink: 1
		},
		copyButton: {
			padding: 10,
			borderRadius: 10,
			backgroundColor: colors.surface
		},
		itemValue: {
			fontSize: 14,
			color: colors.textSecondary,
			fontWeight: '500'
		},
		footer: {
			alignItems: 'center',
			marginTop: 32,
			marginBottom: 20,
			gap: 8
		},
		versionBadge: {
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 8,
			backgroundColor: colors.primaryContainer
		},
		versionText: {
			fontSize: 13,
			color: colors.primary,
			fontWeight: '600'
		},
		copyright: {
			fontSize: 13,
			color: colors.textTertiary
		},
		madeWith: {
			fontSize: 12,
			color: colors.textTertiary
		},
		updaterCard: {
			borderRadius: 20,
			borderWidth: 1.5,
			padding: 20,
			marginBottom: 20,
			...Platform.select({
				ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
				android: { elevation: 2 }
			})
		},
		updaterHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 16
		},
		updaterIconContainer: {
			width: 48,
			height: 48,
			borderRadius: 14,
			justifyContent: 'center',
			alignItems: 'center'
		},
		updaterInfo: {
			flex: 1
		},
		updaterAppName: {
			fontSize: 16,
			fontWeight: '800',
			letterSpacing: -0.3
		},
		updaterVersionText: {
			fontSize: 12,
			marginTop: 2
		},
		updaterLatestText: {
			fontSize: 12,
			marginTop: 4
		},
		updaterDivider: {
			height: 1,
			marginVertical: 16
		},
		updaterBtn: {
			height: 44,
			borderRadius: 12,
			borderWidth: 1,
			justifyContent: 'center',
			alignItems: 'center'
		},
		updaterBtnText: {
			fontSize: 14
		}
	})
