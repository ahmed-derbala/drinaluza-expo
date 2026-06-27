import React, { useState, useEffect, useMemo, useRef, useContext } from 'react'
import { StyleSheet, Text, View, Animated, Platform, Pressable, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { usePathname, useRouter, useNavigation } from 'expo-router'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { SmartKebabMenuContext } from './SmartKebabMenuProvider'
import { SmartKebabMenuItem } from './types'

import { useUpdates, isVersionGreater } from '@/features/updates'
import { config } from '@/config'

export const SmartKebabMenu: React.FC = () => {
	const { colors } = useTheme()
	const router = useRouter()
	const pathname = usePathname()
	const navigation = useNavigation()
	const { width } = useWindowDimensions()

	const context = useContext(SmartKebabMenuContext)
	const screenItems = context ? context.screenItems : []

	const { isDownloading, downloadProgress, downloadedApks, latestRelease } = useUpdates()

	const [isOpen, setIsOpen] = useState(false)
	const scaleAnim = useRef(new Animated.Value(0)).current
	const opacityAnim = useRef(new Animated.Value(0)).current

	// Toggle menu open/close
	const toggleMenu = () => {
		if (isOpen) {
			closeMenu()
		} else {
			setIsOpen(true)
			Animated.parallel([
				Animated.timing(scaleAnim, {
					toValue: 1,
					duration: 150,
					useNativeDriver: Platform.OS !== 'web'
				}),
				Animated.timing(opacityAnim, {
					toValue: 1,
					duration: 150,
					useNativeDriver: Platform.OS !== 'web'
				})
			]).start()
		}
	}

	const closeMenu = () => {
		Animated.parallel([
			Animated.timing(scaleAnim, {
				toValue: 0.9,
				duration: 100,
				useNativeDriver: Platform.OS !== 'web'
			}),
			Animated.timing(opacityAnim, {
				toValue: 0,
				duration: 100,
				useNativeDriver: Platform.OS !== 'web'
			})
		]).start(() => {
			setIsOpen(false)
		})
	}

	// 1. Close when route/pathname changes
	useEffect(() => {
		closeMenu()
	}, [pathname])

	// 2. Close when screen loses focus
	useEffect(() => {
		const unsubscribe = navigation.addListener('blur', () => {
			closeMenu()
		})
		return unsubscribe
	}, [navigation])

	// 3. Web keyboard navigation listener
	useEffect(() => {
		if (!isOpen || Platform.OS !== 'web') return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				closeMenu()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen])

	const updatesBadge = useMemo(() => {
		if (isDownloading) {
			return `${Math.round(downloadProgress * 100)}%`
		}
		const hasInstallable = downloadedApks.some((apk) => apk.isInstallable)
		if (hasInstallable) {
			return 'READY'
		}
		const hasDownloadable = latestRelease && isVersionGreater(latestRelease.latest_version, config.app.version)
		if (hasDownloadable) {
			return 'NEW'
		}
		return undefined
	}, [isDownloading, downloadProgress, downloadedApks, latestRelease])

	// Default menu items: /home, /settings, /about, and /updates
	const defaultItems: SmartKebabMenuItem[] = useMemo(
		() => [
			{
				key: 'home',
				label: translate('home', 'Home'),
				icon: 'home-outline',
				onPress: () => {
					router.push('/(home)/feed' as any)
				}
			},
			{
				key: 'settings',
				label: translate('settings', 'Settings'),
				icon: 'settings-outline',
				onPress: () => {
					router.push('/settings')
				}
			},
			{
				key: 'about',
				label: translate('about', 'About'),
				icon: 'information-circle-outline',
				onPress: () => {
					router.push('/about' as any)
				}
			},
			{
				key: 'updates',
				label: translate('updates', 'Updates'),
				icon: 'cloud-download-outline',
				badge: updatesBadge,
				onPress: () => {
					router.push('/updates' as any)
				}
			}
		],
		[router, updatesBadge]
	)

	// Combine default and screen-registered menu items, filtering out the current screen's item
	const allItems = useMemo(() => {
		const filteredDefaults = defaultItems.filter((item) => {
			const cleanPath = pathname.toLowerCase()
			if (item.key === 'home') {
				return !(cleanPath === '/' || cleanPath === '/feed' || cleanPath.endsWith('/feed'))
			}
			if (item.key === 'settings') {
				return !(cleanPath === '/settings' || cleanPath.endsWith('/settings'))
			}
			if (item.key === 'about') {
				return !(cleanPath === '/about' || cleanPath.endsWith('/about'))
			}
			if (item.key === 'updates') {
				return !(cleanPath === '/updates' || cleanPath.endsWith('/updates'))
			}
			return true
		})
		return [...filteredDefaults, ...screenItems]
	}, [defaultItems, screenItems, pathname])

	const handleItemPress = async (item: SmartKebabMenuItem) => {
		if (item.disabled) return
		closeMenu()
		// Wait short duration for animation to clear before triggering action
		setTimeout(async () => {
			try {
				await item.onPress()
			} catch (err) {
				console.error('[SmartKebabMenu] failed to execute item onPress:', err)
			}
		}, 120)
	}

	const formatBadge = (badge?: string | number) => {
		if (badge === undefined || badge === null) return ''
		const str = String(badge)
		if (str.length > 5) {
			return str.slice(0, 4) + '…'
		}
		return str
	}

	// Calculate responsive positioning (desktop vs mobile viewport check)
	const isDesktop = width >= 768
	const menuStyle = [
		styles.menuContainer,
		{
			backgroundColor: colors.card || '#1C2541',
			borderColor: colors.borderLight || '#1E293B',
			opacity: opacityAnim,
			transform: [{ scale: scaleAnim }, { translateY: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }],
			right: isDesktop ? 20 : 16
		}
	]

	return (
		<View style={styles.container}>
			{/* Kebab Icon Button */}
			<Pressable
				onPress={toggleMenu}
				focusable={true}
				accessibilityRole="button"
				accessibilityLabel={translate('kebab_menu_button', 'Open menu')}
				accessibilityState={{ expanded: isOpen }}
				hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
				style={({ hovered, pressed }) => [
					styles.kebabButton,
					{
						backgroundColor: isOpen ? colors.surfaceVariant || '#3A506B30' : hovered ? colors.surfaceVariant || '#3A506B30' : pressed ? colors.primary + '15' : colors.primary + '0A'
					}
				]}
			>
				<Ionicons name="ellipsis-vertical" size={20} color={colors.primary} />
			</Pressable>

			{/* Backdrop overlay for outside tap/click to close */}
			{isOpen && (
				<Pressable
					style={[
						styles.backdrop,
						Platform.select({
							web: { position: 'fixed' } as any,
							default: {
								position: 'absolute',
								top: -500,
								left: -1000,
								right: -1000,
								bottom: -2000
							}
						})
					]}
					onPress={closeMenu}
					accessibilityLabel="Close menu backdrop"
					accessibilityRole="button"
				/>
			)}

			{/* Dropdown Menu Container */}
			{isOpen && (
				<Animated.View style={menuStyle} accessibilityRole="menu">
					{allItems.map((item, idx) => {
						const isDestructive = item.destructive
						const finalColor = item.disabled ? colors.textTertiary || '#64748B' : isDestructive ? colors.error || '#EF4444' : colors.text || '#F8FAFC'

						const hasSeparator = item.type === 'separator'

						if (hasSeparator) {
							return <View key={`sep-${idx}`} style={[styles.separator, { backgroundColor: colors.borderLight || '#1E293B' }]} />
						}

						const badgeContent = formatBadge(item.badge)

						return (
							<Pressable
								key={item.key}
								onPress={() => handleItemPress(item)}
								disabled={item.disabled}
								focusable={!item.disabled}
								accessibilityRole="menuitem"
								accessibilityLabel={`${item.label}${item.badge ? `, badge: ${item.badge}` : ''}`}
								accessibilityState={{ disabled: !!item.disabled }}
								style={({ hovered, pressed }) => [
									styles.menuItem,
									{
										backgroundColor: item.disabled ? 'transparent' : hovered ? colors.surfaceVariant || '#3A506B30' : pressed ? colors.primary + '15' : 'transparent'
									}
								]}
							>
								<View style={styles.itemLeft}>
									{item.icon && <Ionicons name={item.icon as any} size={18} color={finalColor} style={styles.itemIcon} />}
									<Text
										numberOfLines={1}
										style={[
											styles.itemText,
											{
												color: finalColor,
												opacity: item.disabled ? 0.5 : 1
											}
										]}
									>
										{item.label}
									</Text>
								</View>

								{/* Dynamic resizing Text/Numeric Badge */}
								{badgeContent !== '' && (
									<View
										style={[
											styles.badge,
											{
												backgroundColor: isDestructive ? colors.border || '#3A506B' : colors.notification || '#F43F5E'
											}
										]}
										accessibilityLabel={`Badge: ${item.badge}`}
									>
										<Text style={styles.badgeText} numberOfLines={1}>
											{badgeContent}
										</Text>
									</View>
								)}
							</Pressable>
						)
					})}
				</Animated.View>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'relative',
		zIndex: 1000
	},
	kebabButton: {
		width: 38,
		height: 38,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				cursor: 'pointer',
				outlineStyle: 'none',
				transition: 'background-color 0.2s ease'
			} as any
		})
	},
	backdrop: {
		zIndex: 999,
		backgroundColor: 'transparent',
		...Platform.select({
			web: {
				top: 0,
				left: 0,
				right: 0,
				bottom: 0
			}
		})
	},
	menuContainer: {
		position: 'absolute',
		top: 46,
		width: 190,
		borderRadius: 12,
		borderWidth: 1,
		paddingVertical: 6,
		zIndex: 1000,
		...Platform.select({
			ios: {
				shadowColor: '#000000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.2,
				shadowRadius: 5
			},
			android: {
				elevation: 5
			},
			web: {
				boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
				transition: 'transform 0.15s ease, opacity 0.15s ease'
			} as any
		})
	},
	menuItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 12,
		paddingVertical: 10,
		...Platform.select({
			web: {
				cursor: 'pointer',
				outlineStyle: 'none',
				userSelect: 'none'
			} as any
		})
	},
	itemLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 6
	},
	itemIcon: {
		marginRight: 10
	},
	itemText: {
		fontSize: 14,
		fontWeight: '500'
	},
	separator: {
		height: 1,
		marginVertical: 4,
		opacity: 0.5
	},
	badge: {
		minWidth: 16,
		height: 16,
		borderRadius: 8,
		paddingHorizontal: 5,
		justifyContent: 'center',
		alignItems: 'center'
	},
	badgeText: {
		color: '#FFFFFF',
		fontSize: 9,
		fontWeight: 'bold',
		includeFontPadding: false
	}
})
