import HeaderTitle from '@/features/common/HeaderTitle'
import { Tabs } from 'expo-router'
import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, useWindowDimensions, Platform, ActivityIndicator, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'

import { useTheme } from '@/core/theme'
import { useVersion } from '@/core/contexts/VersionContext'
import { APP_VERSION, BACKEND_URL, NODE_ENV } from '@/config'
import { toast } from '@/features/common/Toast'
import { log, listLogFiles, readLogFile, clearLogFile, shareLogFile, downloadLogFile, LogFileInfo } from '@/core/log'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'

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
	const { translate } = useUser()
	const { checkVersion } = useVersion()
	const { width } = useWindowDimensions()
	const maxWidth = 600
	const isWideScreen = width > maxWidth
	const { onScroll } = useScrollHandler()

	const styles = useMemo(() => createStyles(colors), [colors])
	const [serverInfo, setServerInfo] = useState<any>(null)

	// System Logs Management States
	const [isLogsModalVisible, setIsLogsModalVisible] = useState(false)
	const [logFiles, setLogFiles] = useState<LogFileInfo[]>([])
	const [selectedLogFile, setSelectedLogFile] = useState<LogFileInfo | null>(null)
	const [selectedLogContent, setSelectedLogContent] = useState('')
	const [isViewingContent, setIsViewingContent] = useState(false)
	const [isLoadingLogs, setIsLoadingLogs] = useState(false)

	const loadLogFilesList = async () => {
		try {
			setIsLoadingLogs(true)
			const list = await listLogFiles()
			setLogFiles(list)
		} catch (e) {
			console.error('Failed to load log files list:', e)
		} finally {
			setIsLoadingLogs(false)
		}
	}

	const handleOpenLogsManager = async () => {
		setIsLogsModalVisible(true)
		setIsViewingContent(false)
		setSelectedLogFile(null)
		setSelectedLogContent('')
		await loadLogFilesList()
	}

	const handleSelectLogFile = async (file: LogFileInfo) => {
		try {
			setIsLoadingLogs(true)
			const content = await readLogFile(file.name)
			setSelectedLogContent(content)
			setSelectedLogFile(file)
			setIsViewingContent(true)
		} catch (e) {
			console.error('Failed to read log content:', e)
		} finally {
			setIsLoadingLogs(false)
		}
	}

	const handleDeleteLogFile = async (name: string) => {
		try {
			setIsLoadingLogs(true)
			await clearLogFile(name)
			toast.show({ title: 'Success', message: translate('logs_cleared', 'Logs cleared successfully!'), color: '#10B981' })
			if (isViewingContent && selectedLogFile?.name === name) {
				setIsViewingContent(false)
				setSelectedLogFile(null)
				setSelectedLogContent('')
			}
			await loadLogFilesList()
		} catch (e) {
			console.error('Failed to clear logs:', e)
		} finally {
			setIsLoadingLogs(false)
		}
	}

	const formatSize = (bytes: number): string => {
		if (bytes === 0) return '0 Bytes'
		const k = 1024
		const sizes = ['Bytes', 'KB', 'MB', 'GB']
		const i = Math.floor(Math.log(bytes) / Math.log(k))
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
	}

	const formatTime = (mtime?: number): string => {
		if (!mtime) return ''
		return new Date(mtime).toLocaleString()
	}

	useEffect(() => {
		// Trigger version check when settings screen opens
		checkVersion()

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
			<Tabs.Screen options={{ headerTitle: () => <HeaderTitle title={translate('settings', 'Settings')} subtitle={'Drinaluza - Business Manager'} />, headerLeft: () => null }} />
			<View style={{ height: 16 }} />

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
				<SettingItem
					icon="cloud-download-outline"
					title="APK Download"
					subtitle="Google Drive"
					onPress={() => Linking.openURL('https://drive.google.com/drive/u/1/folders/18qrVyyTbe4-nXcTlyDyqoB1jAbwAzOzW')}
					copyValue="https://drive.google.com/drive/u/1/folders/18qrVyyTbe4-nXcTlyDyqoB1jAbwAzOzW"
					color="#4285F4"
				/>
			</SettingSection>

			<SettingSection title={translate('diagnostic_logs', 'Diagnostic Logs')}>
				<SettingItem
					icon="document-text-outline"
					title={translate('app_logs', 'App Logs')}
					subtitle={translate('view_share_logs', 'List, view, share and download app logs')}
					onPress={handleOpenLogsManager}
					color={colors.primary}
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

			{/* Logs Manager Modal */}
			<Modal visible={isLogsModalVisible} transparent animationType="fade" onRequestClose={() => setIsLogsModalVisible(false)}>
				<View style={styles.modalOverlay}>
					<View style={styles.modalCard}>
						<View style={styles.modalHeader}>
							<Text style={styles.modalTitle}>{isViewingContent ? translate('view_logs', 'View Log File') : translate('logs_manager', 'App Logs Manager')}</Text>
							<TouchableOpacity style={styles.closeModalButton} onPress={() => setIsLogsModalVisible(false)} activeOpacity={0.7}>
								<Ionicons name="close" size={20} color={colors.text} />
							</TouchableOpacity>
						</View>

						<View style={styles.modalBody}>
							{isLoadingLogs ? (
								<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
									<ActivityIndicator size="large" color={colors.primary} />
								</View>
							) : isViewingContent && selectedLogFile ? (
								<View style={{ flex: 1 }}>
									<View style={styles.viewerSubheader}>
										<TouchableOpacity style={styles.backButton} onPress={() => setIsViewingContent(false)} activeOpacity={0.7}>
											<Ionicons name="arrow-back" size={18} color={colors.primary} />
											<Text style={styles.backButtonText}>{translate('back', 'Back')}</Text>
										</TouchableOpacity>

										<View style={styles.logViewerActions}>
											<TouchableOpacity style={[styles.logActionIconButton, { backgroundColor: colors.info + '20' }]} onPress={() => shareLogFile(selectedLogFile.name)} activeOpacity={0.7}>
												<Ionicons name="share-social-outline" size={18} color={colors.info} />
											</TouchableOpacity>
											<TouchableOpacity style={[styles.logActionIconButton, { backgroundColor: colors.primaryContainer }]} onPress={() => downloadLogFile(selectedLogFile.name)} activeOpacity={0.7}>
												<Ionicons name="download-outline" size={18} color={colors.primary} />
											</TouchableOpacity>
											<TouchableOpacity style={[styles.logActionIconButton, { backgroundColor: colors.error + '20' }]} onPress={() => handleDeleteLogFile(selectedLogFile.name)} activeOpacity={0.7}>
												<Ionicons name="trash-outline" size={18} color={colors.error} />
											</TouchableOpacity>
										</View>
									</View>

									<ScrollView style={styles.logScrollView} showsVerticalScrollIndicator={true}>
										<Text style={styles.logText}>{selectedLogContent || 'No log lines recorded.'}</Text>
									</ScrollView>
								</View>
							) : (
								<View style={{ flex: 1 }}>
									{logFiles.length === 0 ? (
										<View style={styles.emptyLogs}>
											<Ionicons name="document-outline" size={48} color={colors.textTertiary} />
											<Text style={styles.emptyLogsText}>{translate('no_logs_found', 'No log files recorded yet.')}</Text>
										</View>
									) : (
										<ScrollView style={{ flex: 1 }}>
											{logFiles.map((file) => (
												<View key={file.name} style={styles.logFileItem}>
													<TouchableOpacity style={styles.logFileInfo} onPress={() => handleSelectLogFile(file)} activeOpacity={0.7}>
														<Text style={styles.logFileName} numberOfLines={1}>
															{file.name}
														</Text>
														<Text style={styles.logFileMeta}>
															{formatSize(file.size)} • {formatTime(file.mtime)}
														</Text>
													</TouchableOpacity>

													<View style={styles.logFileActions}>
														<TouchableOpacity style={[styles.logActionIconButton, { backgroundColor: colors.info + '15' }]} onPress={() => shareLogFile(file.name)} activeOpacity={0.7}>
															<Ionicons name="share-social" size={16} color={colors.info} />
														</TouchableOpacity>
														<TouchableOpacity style={[styles.logActionIconButton, { backgroundColor: colors.primaryContainer }]} onPress={() => downloadLogFile(file.name)} activeOpacity={0.7}>
															<Ionicons name="download" size={16} color={colors.primary} />
														</TouchableOpacity>
														<TouchableOpacity style={[styles.logActionIconButton, { backgroundColor: colors.error + '15' }]} onPress={() => handleDeleteLogFile(file.name)} activeOpacity={0.7}>
															<Ionicons name="trash" size={16} color={colors.error} />
														</TouchableOpacity>
													</View>
												</View>
											))}
										</ScrollView>
									)}
								</View>
							)}
						</View>
					</View>
				</View>
			</Modal>
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
		modalOverlay: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			padding: 20,
			backgroundColor: colors.modalOverlay
		},
		modalCard: {
			width: '100%',
			maxWidth: 550,
			height: '80%',
			borderRadius: 24,
			borderWidth: 1.5,
			borderColor: colors.border,
			backgroundColor: colors.card,
			padding: 24,
			display: 'flex',
			flexDirection: 'column'
		},
		modalHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginBottom: 20
		},
		modalTitle: {
			fontSize: 20,
			fontWeight: '700',
			color: colors.text
		},
		closeModalButton: {
			width: 36,
			height: 36,
			borderRadius: 18,
			backgroundColor: colors.surfaceVariant,
			justifyContent: 'center',
			alignItems: 'center'
		},
		modalBody: {
			flex: 1
		},
		logFileItem: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingVertical: 14,
			borderBottomWidth: 1,
			borderBottomColor: colors.border
		},
		logFileInfo: {
			flex: 1,
			marginRight: 12
		},
		logFileName: {
			fontSize: 15,
			fontWeight: '600',
			color: colors.text
		},
		logFileMeta: {
			fontSize: 12,
			color: colors.textTertiary,
			marginTop: 4
		},
		logFileActions: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8
		},
		logActionIconButton: {
			width: 36,
			height: 36,
			borderRadius: 10,
			justifyContent: 'center',
			alignItems: 'center'
		},
		emptyLogs: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			paddingVertical: 40,
			gap: 12
		},
		emptyLogsText: {
			fontSize: 14,
			color: colors.textSecondary
		},
		viewerSubheader: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingBottom: 12,
			borderBottomWidth: 1,
			borderBottomColor: colors.border,
			marginBottom: 16
		},
		backButton: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4
		},
		backButtonText: {
			fontSize: 14,
			fontWeight: '600',
			color: colors.primary
		},
		logViewerActions: {
			flexDirection: 'row',
			gap: 8
		},
		logScrollView: {
			flex: 1,
			backgroundColor: '#0F172A',
			borderRadius: 12,
			padding: 12
		},
		logText: {
			fontFamily: Platform.select({ ios: 'Courier', android: 'monospace', web: 'monospace' }),
			fontSize: 11,
			color: '#38BDF8',
			lineHeight: 16
		}
	})
