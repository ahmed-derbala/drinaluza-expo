import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking, useWindowDimensions, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'

import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../components/settings/settings.interface'
import { APP_VERSION } from '../../config'
import Toast from '../../components/common/Toast'

export default function SettingsScreen() {
	const { theme, colors, isDark, setTheme } = useTheme()
	const router = useRouter()
	const { width } = useWindowDimensions()
	const maxWidth = 600
	const isWideScreen = width > maxWidth

	const styles = createStyles(colors, isDark)
	const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
		visible: false,
		message: '',
		type: 'success'
	})

	const toggleTheme = () => {
		const newTheme = isDark ? 'light' : 'dark'
		setTheme(newTheme)
	}

	const handleResetApp = async () => {
		const performReset = async () => {
			try {
				await AsyncStorage.clear()
				// Force reload or navigate to auth
				if (Platform.OS === 'web') {
					router.replace('/auth' as any)
					// Optional: window.location.reload() to fully clear state
				} else {
					Alert.alert('Success', 'App reset successfully. You will be signed out.', [{ text: 'OK', onPress: () => router.replace('/auth' as any) }])
				}
			} catch (error) {
				console.error('Failed to reset app:', error)
				if (Platform.OS !== 'web') {
					Alert.alert('Error', 'Failed to reset app.')
				} else {
					alert('Failed to reset app')
				}
			}
		}

		if (Platform.OS === 'web') {
			if (window.confirm('Are you sure you want to reset the app? This will clear all data, logs, and sign you out.')) {
				await performReset()
			}
		} else {
			Alert.alert('Reset App', 'Are you sure you want to reset the app? This will clear all data, logs, and sign you out.', [
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Reset',
					style: 'destructive',
					onPress: performReset
				}
			])
		}
	}

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
		value?: string | boolean
		onPress?: () => void
		type?: 'arrow' | 'switch' | 'value' | 'none'
		color?: string
		copyValue?: string
	}) => {
		const handleCopy = async () => {
			if (copyValue) {
				await Clipboard.setStringAsync(copyValue)
				setToast({
					visible: true,
					message: 'Copied to clipboard!',
					type: 'success'
				})
			}
		}

		return (
			<TouchableOpacity style={styles.item} onPress={type === 'switch' ? onPress : onPress} disabled={type === 'switch' && !onPress} activeOpacity={type === 'none' ? 1 : 0.7}>
				<View style={[styles.iconContainer, { backgroundColor: color ? color + '20' : colors.primary + '20' }]}>
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
					{type === 'switch' && <Switch value={value as boolean} onValueChange={onPress} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={'#fff'} />}
					{type === 'value' && <Text style={styles.itemValue}>{value as string}</Text>}
				</View>
			</TouchableOpacity>
		)
	}

	return (
		<ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isWideScreen && { maxWidth: maxWidth, alignSelf: 'center', width: '100%' }]}>
			<View style={styles.header}>
				<Text style={styles.title}>Settings</Text>
			</View>

			<SettingSection title="Appearance">
				<SettingItem icon={isDark ? 'moon' : 'sunny'} title="Dark Mode" subtitle="Toggle app theme" type="switch" value={isDark} onPress={toggleTheme} color={isDark ? '#A855F7' : '#F59E0B'} />
			</SettingSection>

			<SettingSection title="General">
				<SettingItem icon="language" title="Language" value="English" type="value" onPress={() => {}} color="#10B981" />
				<SettingItem icon="cash" title="Currency" value="TND" type="value" onPress={() => {}} color="#10B981" />
			</SettingSection>

			<SettingSection title="Contact">
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
					subtitle="Follow us on Instagram"
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
				<SettingItem icon="mail" title="Email" subtitle="drinaluza@gmail.com" onPress={() => Linking.openURL('mailto:drinaluza@gmail.com')} copyValue="drinaluza@gmail.com" color="#EA4335" />
				<SettingItem
					icon="logo-google"
					title="Download App"
					subtitle="Google Drive"
					onPress={() => Linking.openURL('https://drive.google.com/drive/folders/1euN1ogdssvbiq4wJdxYQBYqMXWbwIpBm')}
					copyValue="https://drive.google.com/drive/folders/1euN1ogdssvbiq4wJdxYQBYqMXWbwIpBm"
					color="#4285F4"
				/>
			</SettingSection>

			<SettingSection title="Advanced">
				<SettingItem icon="trash-bin" title="Reset App" subtitle="Clear all data" onPress={handleResetApp} color="#EF4444" />
			</SettingSection>

			<View style={styles.footer}>
				<Text style={styles.version}>Version {APP_VERSION}</Text>
				<Text style={styles.copyright}>© 2025 Drinaluza</Text>
			</View>

			<Toast visible={toast.visible} message={toast.message} type={toast.type} onHide={() => setToast((prev) => ({ ...prev, visible: false }))} />
		</ScrollView>
	)
}

const createStyles = (colors: any, isDark: boolean) =>
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
			marginBottom: 24
		},
		title: {
			fontSize: 32,
			fontWeight: 'bold',
			color: colors.text,
			letterSpacing: -0.5
		},
		section: {
			marginBottom: 24
		},
		sectionTitle: {
			fontSize: 14,
			fontWeight: '600',
			color: colors.textSecondary,
			marginBottom: 8,
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
			width: 36,
			height: 36,
			borderRadius: 10,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 12
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
			alignItems: 'center'
		},
		copyButton: {
			padding: 8,
			marginRight: 4,
			borderRadius: 8,
			backgroundColor: colors.background,
			borderWidth: 1,
			borderColor: colors.border
		},
		itemValue: {
			fontSize: 15,
			color: colors.textSecondary,
			marginRight: 4
		},
		footer: {
			alignItems: 'center',
			marginTop: 20,
			marginBottom: 20
		},
		version: {
			fontSize: 14,
			color: colors.textTertiary,
			fontWeight: '500'
		},
		copyright: {
			fontSize: 12,
			color: colors.textTertiary,
			marginTop: 4
		}
	})
