import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, Linking, useWindowDimensions, Platform } from 'react-native'
import { useRouter } from 'expo-router'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { signOut } from '../../core/auth/auth.api'
import { useTheme } from '../../contexts/ThemeContext'
import { Theme } from '../../components/settings/settings.interface'
import { APP_VERSION } from '../../config'

export default function SettingsScreen() {
	const { theme, colors, isDark, setTheme } = useTheme()
	const router = useRouter()
	const { width } = useWindowDimensions()
	const [notificationsEnabled, setNotificationsEnabled] = useState(true)
	const [emailNotifications, setEmailNotifications] = useState(true)
	const maxWidth = 600
	const isWideScreen = width > maxWidth

	const styles = createStyles(colors, isDark)

	const handleSignOut = async () => {
		const performSignOut = async () => {
			try {
				await signOut()
				router.replace('/auth')
			} catch (error) {
				console.error('Sign out failed:', error)
				router.replace('/auth')
			}
		}

		if (Platform.OS === 'web') {
			if (window.confirm('Are you sure you want to sign out?')) {
				await performSignOut()
			}
		} else {
			Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
				{
					text: 'Cancel',
					style: 'cancel'
				},
				{
					text: 'Sign Out',
					style: 'destructive',
					onPress: performSignOut
				}
			])
		}
	}

	const toggleTheme = () => {
		const newTheme = isDark ? 'light' : 'dark'
		setTheme(newTheme)
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
		color
	}: {
		icon: any
		title: string
		subtitle?: string
		value?: string | boolean
		onPress?: () => void
		type?: 'arrow' | 'switch' | 'value' | 'none'
		color?: string
	}) => (
		<TouchableOpacity style={styles.item} onPress={type === 'switch' ? onPress : onPress} disabled={type === 'switch' && !onPress} activeOpacity={type === 'none' ? 1 : 0.7}>
			<View style={[styles.iconContainer, { backgroundColor: color ? color + '20' : colors.primary + '20' }]}>
				<Ionicons name={icon} size={20} color={color || colors.primary} />
			</View>
			<View style={styles.itemContent}>
				<Text style={styles.itemTitle}>{title}</Text>
				{subtitle && <Text style={styles.itemSubtitle}>{subtitle}</Text>}
			</View>
			<View style={styles.itemRight}>
				{type === 'arrow' && <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />}
				{type === 'switch' && <Switch value={value as boolean} onValueChange={onPress} trackColor={{ false: colors.border, true: colors.primary }} thumbColor={'#fff'} />}
				{type === 'value' && <Text style={styles.itemValue}>{value as string}</Text>}
			</View>
		</TouchableOpacity>
	)

	return (
		<ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, isWideScreen && { maxWidth: maxWidth, alignSelf: 'center', width: '100%' }]}>
			<View style={styles.header}>
				<Text style={styles.title}>Settings</Text>
			</View>

			<SettingSection title="Appearance">
				<SettingItem icon={isDark ? 'moon' : 'sunny'} title="Dark Mode" subtitle="Toggle app theme" type="switch" value={isDark} onPress={toggleTheme} color={isDark ? '#A855F7' : '#F59E0B'} />
			</SettingSection>

			<SettingSection title="Notifications">
				<SettingItem icon="notifications" title="Push Notifications" type="switch" value={notificationsEnabled} onPress={() => setNotificationsEnabled(!notificationsEnabled)} color="#EF4444" />
				<SettingItem icon="mail" title="Email Newsletters" type="switch" value={emailNotifications} onPress={() => setEmailNotifications(!emailNotifications)} color="#3B82F6" />
			</SettingSection>

			<SettingSection title="General">
				<SettingItem icon="language" title="Language" value="English" type="value" onPress={() => {}} color="#10B981" />
				<SettingItem icon="cash" title="Currency" value="TND" type="value" onPress={() => {}} color="#10B981" />
			</SettingSection>

			<SettingSection title="Support">
				<SettingItem icon="help-circle" title="Help Center" onPress={() => {}} color="#6366F1" />
				<SettingItem icon="document-text" title="Terms of Service" onPress={() => {}} color="#8B5CF6" />
				<SettingItem icon="shield-checkmark" title="Privacy Policy" onPress={() => {}} color="#8B5CF6" />
			</SettingSection>

			<SettingSection title="Account">
				<SettingItem icon="log-out" title="Sign Out" onPress={handleSignOut} color="#EF4444" />
			</SettingSection>

			<View style={styles.footer}>
				<Text style={styles.version}>Version {APP_VERSION}</Text>
				<Text style={styles.copyright}>© 2025 Drinaluza</Text>
			</View>
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
