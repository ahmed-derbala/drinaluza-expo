import { Tabs } from 'expo-router'
import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useWindowDimensions, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

import { useTheme } from '@/core/theme'
import { APP_VERSION, BACKEND_URL, NODE_ENV } from '@/config'
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
	const { width } = useWindowDimensions()
	const maxWidth = 600
	const isWideScreen = width > maxWidth
	const { onScroll } = useScrollHandler()

	const styles = useMemo(() => createStyles(colors), [colors])
	const [serverInfo, setServerInfo] = useState<any>(null)
	const [loading, setLoading] = useState(false)

	const fetchServerInfo = () => {
		if (!BACKEND_URL) return
		setLoading(true)
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
			.finally(() => {
				setLoading(false)
			})
	}

	useEffect(() => {
		fetchServerInfo()
	}, [])

	const SettingSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
		<View style={styles.section}>
			<Text style={styles.sectionTitle}>{title}</Text>
			<View style={styles.sectionContent}>{children}</View>
		</View>
	)

	const SettingItem = ({ icon, title, value, color }: { icon: any; title: string; value?: string; color?: string }) => {
		return (
			<View style={styles.item}>
				<View style={[styles.iconContainer, { backgroundColor: (color || colors.primary) + '20' }]}>
					<Ionicons name={icon} size={20} color={color || colors.primary} />
				</View>
				<View style={styles.itemContent}>
					<Text style={styles.itemTitle}>{title}</Text>
				</View>
				<View style={styles.itemRight}>
					<Text style={styles.itemValue}>{value}</Text>
				</View>
			</View>
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
					title: translate('settings', 'Settings'),
					headerRight: () => (
						<TouchableOpacity onPress={fetchServerInfo} disabled={loading} style={{ marginRight: 16 }}>
							{loading ? <ActivityIndicator size="small" color={colors.text} /> : <Ionicons name="refresh" size={24} color={colors.text} />}
						</TouchableOpacity>
					)
				}}
			/>
			<View style={{ height: 16 }} />

			{serverInfo && (
				<SettingSection title={translate('server_info', 'Server Info')}>
					<SettingItem icon="server-outline" title={translate('environment', 'Environment')} value={serverInfo.NODE_ENV} color={colors.textSecondary} />
					<SettingItem icon="information-circle-outline" title={translate('app_name', 'App Name')} value={serverInfo.app?.name} color={colors.textSecondary} />
					<SettingItem icon="git-network-outline" title={translate('version', 'Version')} value={serverInfo.app?.version} color={colors.textSecondary} />
					{serverInfo.NODE_VERSION && <SettingItem icon="logo-nodejs" title="Node.js" value={serverInfo.NODE_VERSION} color="#339933" />}
					{serverInfo.uptime && <SettingItem icon="time-outline" title={translate('uptime', 'Uptime')} value={formatUptime(serverInfo.uptime)} color={colors.textSecondary} />}
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
		}
	})
