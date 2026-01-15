import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, useWindowDimensions, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'

import { useTheme } from '../../contexts/ThemeContext'
import { APP_VERSION, BACKEND_URL } from '../../config'
import Toast from '../../components/common/Toast'
import { log } from '../../core/log'
import { useUser } from '../../contexts/UserContext'

export default function SettingsScreen() {
	const { colors } = useTheme()
	const { translate } = useUser()
	const { width } = useWindowDimensions()
	const maxWidth = 600
	const isWideScreen = width > maxWidth

	const styles = useMemo(() => createStyles(colors), [colors])
	const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
		visible: false,
		message: '',
		type: 'success'
	})
	const [serverInfo, setServerInfo] = useState<any>(null)

	useEffect(() => {
		if (!BACKEND_URL) return

		fetch(BACKEND_URL)
			.then(async (res) => {
				const text = await res.text()
				try {
					const json = JSON.parse(text)
					setServerInfo(json.data || json)
				} catch (e) {
					log({
						level: 'warn',
						label: 'settings',
						message: 'Failed to parse server info',
						error: e,
						data: {
							responseText: text.substring(0, 200),
							status: res.status,
							url: res.url
						}
					})
				}
			})
			.catch((err) => {
				log({ level: 'warn', label: 'settings', message: 'Failed to fetch server info', error: err })
			})
	}, [])

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
				setToast({
					visible: true,
					message: translate('copied_to_clipboard', 'Copied to clipboard!'),
					type: 'success'
				})
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
		<ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isWideScreen && { maxWidth: maxWidth, alignSelf: 'center', width: '100%' }]}>
			<View style={styles.header}>
				<Text style={styles.title}>{translate('settings', 'Settings')}</Text>
				<Text style={styles.headerSubtitle}>Drinaluza - Seafood Business Manager</Text>
			</View>

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
					icon="logo-google-playstore"
					title="Google Play"
					subtitle="Download for Android"
					onPress={() => Linking.openURL('https://play.google.com/store/apps/details?id=com.ahmedderbala.drinaluza')}
					copyValue="https://play.google.com/store/apps/details?id=com.ahmedderbala.drinaluza"
					color="#34A853"
				/>
				<SettingItem
					icon="globe-outline"
					title="Web App"
					subtitle="Access via Browser"
					onPress={() => Linking.openURL('https://drinaluza.netlify.app/')}
					copyValue="https://drinaluza.netlify.app/"
					color="#6366F1"
				/>
				<SettingItem
					icon="cloud-download-outline"
					title="APK Download"
					subtitle="Google Drive"
					onPress={() => Linking.openURL('https://drive.google.com/drive/folders/1euN1ogdssvbiq4wJdxYQBYqMXWbwIpBm')}
					copyValue="https://drive.google.com/drive/folders/1euN1ogdssvbiq4wJdxYQBYqMXWbwIpBm"
					color="#4285F4"
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
				<SettingItem
					icon="logo-github"
					title="Source Code"
					subtitle="View on GitHub"
					onPress={() => Linking.openURL('https://github.com/ahmed-derbala/')}
					copyValue="https://github.com/ahmed-derbala/"
					color={colors.text}
				/>
			</SettingSection>

			{serverInfo && (
				<SettingSection title={translate('server_info', 'Server Info')}>
					<SettingItem icon="server-outline" title={translate('environment', 'Environment')} value={serverInfo.NODE_ENV} type="value" color={colors.textSecondary} />
					<SettingItem icon="information-circle-outline" title={translate('app_name', 'App Name')} value={serverInfo.app?.name} type="value" color={colors.textSecondary} />
					<SettingItem icon="git-network-outline" title={translate('version', 'Version')} value={serverInfo.app?.version} type="value" color={colors.textSecondary} />
				</SettingSection>
			)}

			<View style={styles.footer}>
				<View style={styles.versionBadge}>
					<Text style={styles.versionText}>v{APP_VERSION}</Text>
				</View>
				<Text style={styles.copyright}>© 2026 Drinaluza</Text>
				<Text style={styles.madeWith}>{translate('made_with', 'Made with 💙 in Tunisia')}</Text>
			</View>

			<Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast((prev) => ({ ...prev, visible: false }))} />
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
			paddingBottom: 40
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
			borderColor: colors.border
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
			gap: 8
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
		}
	})
