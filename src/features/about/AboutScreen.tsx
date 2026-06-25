import React, { useMemo, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, useWindowDimensions, Platform } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'

import { useTheme } from '@/core/theme'
import { config } from '@/config'
import { toast } from '@/features/common/Toast'
import { translate } from '@/core/translation'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { SmartScreenHeader } from '@/core/smart-screen-header'

export default function AboutScreen() {
	const { colors } = useTheme()
	const { width } = useWindowDimensions()
	const maxWidth = 600
	const isWideScreen = width > maxWidth
	const { onScroll } = useScrollHandler()

	const styles = useMemo(() => createStyles(colors), [colors])

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
		onPress,
		type = 'arrow',
		color,
		copyValue
	}: {
		icon: any
		title: string
		subtitle?: string
		onPress?: () => void
		type?: 'arrow' | 'none'
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
				</View>
			</TouchableOpacity>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<SmartScreenHeader title={translate('about', 'About')} fallbackRoute="/(home)/feed" />

			<ScrollView
				style={styles.scrollView}
				contentContainerStyle={[styles.contentContainer, isWideScreen && { maxWidth: maxWidth, alignSelf: 'center', width: '100%' }]}
				onScroll={onScroll}
				scrollEventThrottle={16}
			>
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

				<View style={styles.footer}>
					<View style={styles.versionBadge}>
						<Text style={styles.versionText}>
							v{config.app.version} • {config.NODE_ENV}
						</Text>
					</View>
					<Text style={styles.copyright}>© 2026 Drinaluza</Text>
					<Text style={styles.madeWith}>{translate('made_with', 'Made with 💙 in Tunisia')}</Text>
				</View>
			</ScrollView>
		</View>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		container: {
			flex: 1
		},
		scrollView: {
			flex: 1
		},
		contentContainer: {
			padding: 20,
			paddingBottom: 90
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
