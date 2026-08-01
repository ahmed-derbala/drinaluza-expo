import React, { useState, useEffect, useMemo, useRef, useContext } from 'react'
import { StyleSheet, Text, View, Animated, Platform, Pressable, useWindowDimensions, Modal } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { IconButton } from '@/features/common/buttons/IconButton'
import { usePathname, useRouter, useNavigation } from 'expo-router'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { SmartKebabMenuContext } from './SmartKebabMenuProvider'
import { SmartKebabMenuItem } from './types'

import { useUpdates } from '@/features/updates/useUpdates'
import { isVersionGreater } from '@/features/updates/UpdatesContext'
import { config } from '@/config'

export const SmartKebabMenu: React.FC = () => {
	const { colors } = useTheme()
	const router = useRouter()
	const pathname = usePathname()
	const navigation = useNavigation()
	const { width, height } = useWindowDimensions()

	const context = useContext(SmartKebabMenuContext)
	const screenItems = context ? context.screenItems : []

	const { isDownloading, isPaused, downloadProgress, downloadedApks, latestRelease } = useUpdates()

	const [isOpen, setIsOpen] = useState(false)
	const [buttonLayout, setButtonLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null)
	const scaleAnim = useRef(new Animated.Value(0)).current
	const opacityAnim = useRef(new Animated.Value(0)).current
	const buttonRef = useRef<View>(null)

	// Toggle menu open/close
	const toggleMenu = () => {
		if (isOpen) {
			closeMenu()
		} else {
			buttonRef.current?.measureInWindow((x, y, w, h) => {
				setButtonLayout({ x, y, width: w, height: h })
			})
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

	// Re-measure the button on web resizes so the dropdown stays anchored
	useEffect(() => {
		if (!isOpen || Platform.OS !== 'web') return
		const handleResize = () => {
			buttonRef.current?.measureInWindow((x, y, w, h) => {
				setButtonLayout({ x, y, width: w, height: h })
			})
		}
		window.addEventListener('resize', handleResize)
		return () => {
			window.removeEventListener('resize', handleResize)
		}
	}, [isOpen])

	// Re-anchor the dropdown when the screen rotates/resizes while it is open
	useEffect(() => {
		if (!isOpen) return
		buttonRef.current?.measureInWindow((x, y, w, h) => {
			setButtonLayout({ x, y, width: w, height: h })
		})
	}, [width, height, isOpen])

	type UpdateStatus = { type: 'dot'; color: string } | { type: 'percent'; color: string; content: string }

	const updatesStatus = useMemo<UpdateStatus | undefined>(() => {
		if (isPaused) {
			return { type: 'percent', color: colors.warning, content: `${Math.round(downloadProgress * 100)}%` }
		}
		if (isDownloading) {
			return { type: 'percent', color: colors.info, content: `${Math.round(downloadProgress * 100)}%` }
		}
		const hasInstallable = downloadedApks.some((apk) => apk.isInstallable)
		if (hasInstallable) {
			return { type: 'dot', color: colors.success }
		}
		const hasDownloadable = latestRelease && isVersionGreater(latestRelease.latest_version, config.app.version)
		if (hasDownloadable) {
			return { type: 'dot', color: colors.info }
		}
		return undefined
	}, [isPaused, isDownloading, downloadProgress, downloadedApks, latestRelease, colors.success, colors.warning, colors.info])

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
				onPress: () => {
					router.push('/updates' as any)
				}
			}
		],
		[router]
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
			backgroundColor: colors.background,
			borderColor: colors.border || '#1E293B',
			opacity: opacityAnim,
			transform: [{ scale: scaleAnim }, { translateY: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [-10, 0] }) }]
		}
	]

	const positionStyle = useMemo(() => {
		const offset = isDesktop ? 20 : 16
		if (!buttonLayout) {
			return { top: 46, right: offset }
		}
		return {
			top: buttonLayout.y + buttonLayout.height + 8,
			right: width - (buttonLayout.x + buttonLayout.width) + offset
		}
	}, [buttonLayout, isDesktop, width])

	return (
		<View ref={buttonRef} style={styles.container}>
			{/* Kebab Icon Button */}
			<IconButton
				icon="ellipsis-vertical"
				label={translate('kebab_menu_button', 'Open menu')}
				onPress={toggleMenu}
				colors={colors}
				iconColor={colors.primary}
				size={40}
				style={{ backgroundColor: colors.primary + '15', borderColor: 'transparent' }}
			/>

			{/* Render the dropdown in a Modal so it is never clipped by header siblings or parent stacking contexts */}
			<Modal transparent visible={isOpen} animationType="none" onRequestClose={closeMenu}>
				<View style={styles.modalOverlay}>
					<Pressable style={styles.modalBackdrop} onPress={closeMenu} accessibilityLabel="Close menu backdrop" accessibilityRole="button" />
					<Animated.View style={[menuStyle, positionStyle]} accessibilityRole="menu">
						{allItems.map((item, idx) => {
							const isDestructive = item.destructive
							const finalColor = item.disabled ? colors.textTertiary || '#64748B' : isDestructive ? colors.error || '#EF4444' : colors.text || '#F8FAFC'

							const hasSeparator = item.type === 'separator'

							if (hasSeparator) {
								return <View key={`sep-${idx}`} style={[styles.separator, { backgroundColor: colors.border || '#1E293B' }]} />
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

									{/* Updates status: dot or percentage */}
									{item.key === 'updates' &&
										updatesStatus &&
										(updatesStatus.type === 'dot' ? (
											<View style={styles.badgeDot} accessibilityLabel="Updates status dot">
												<View style={[styles.badgeDotInner, { backgroundColor: updatesStatus.color }]} />
											</View>
										) : (
											<View style={[styles.badge, { backgroundColor: updatesStatus.color }]} accessibilityLabel={`Badge: ${updatesStatus.content}`}>
												<Text style={styles.badgeText} numberOfLines={1}>
													{updatesStatus.content}
												</Text>
											</View>
										))}
								</Pressable>
							)
						})}
					</Animated.View>
				</View>
			</Modal>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		position: 'relative',
		zIndex: 1000
	},
	modalOverlay: {
		flex: 1
	},
	modalBackdrop: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundColor: 'transparent'
	},
	menuContainer: {
		position: 'absolute',
		width: 190,
		borderRadius: 12,
		borderWidth: 1,
		paddingVertical: 6,
		zIndex: 1000
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
	},
	badgeDot: {
		minWidth: 16,
		height: 16,
		justifyContent: 'center',
		alignItems: 'center'
	},
	badgeDotInner: {
		width: 10,
		height: 10,
		borderRadius: 5
	}
})
