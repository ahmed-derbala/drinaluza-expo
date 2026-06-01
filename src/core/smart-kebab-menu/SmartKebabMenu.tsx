import React, { useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, Pressable, Modal, Platform, useWindowDimensions, ActivityIndicator } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useRouter, usePathname } from 'expo-router'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { useSmartKebabMenuContext } from './SmartKebabMenuProvider'
import { SmartKebabMenuItem } from './types'
import HeaderAction from '../smart-screen-header/HeaderAction'

const HEADER_HEIGHT = Platform.select({
	ios: 44,
	android: 56,
	default: 56
})

export const SmartKebabMenu: React.FC = () => {
	const { colors } = useTheme()
	const insets = useSafeAreaInsets()
	const router = useRouter()
	const pathname = usePathname()
	const { width: windowWidth } = useWindowDimensions()

	const { isOpen, setIsOpen, menuItems } = useSmartKebabMenuContext()

	// Automatically close the menu on Web when pressing Escape key
	useEffect(() => {
		if (Platform.OS !== 'web' || !isOpen) return

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				setIsOpen(false)
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => {
			window.removeEventListener('keydown', handleKeyDown)
		}
	}, [isOpen, setIsOpen])

	const defaultSettingsItem: SmartKebabMenuItem = {
		key: 'settings',
		label: translate('settings', 'Settings'),
		icon: 'settings-outline',
		onPress: () => router.push('/settings')
	}

	const defaultUpdatesItem: SmartKebabMenuItem = {
		key: 'updates',
		label: translate('updates', 'Updates'),
		icon: 'cloud-download-outline',
		onPress: () => router.push('/updates' as any)
	}

	// Filter out invisible dynamic items, and also filter out 'refresh' key if registered by the screen
	// (so that it doesn't get rendered twice, since we'll render it as a default item at the end of the list)
	const visibleDynamicItems = menuItems.filter((item) => item.visible !== false && item.key !== 'refresh')

	// Locate the screen-registered custom refresh handler
	const screenRefreshItem = menuItems.find((item) => item.key === 'refresh')

	const defaultRefreshItem: SmartKebabMenuItem = {
		key: 'refresh',
		label: translate('refresh', 'Refresh'),
		icon: 'refresh-outline',
		disabled: screenRefreshItem?.disabled,
		loading: screenRefreshItem?.loading,
		onPress: () => {
			if (screenRefreshItem) {
				screenRefreshItem.onPress()
			} else if (Platform.OS === 'web') {
				window.location.reload()
			}
		}
	}

	// Build default items, filtering out the current screen's route to prevent redundant self-navigation
	const defaultItems: SmartKebabMenuItem[] = [defaultRefreshItem]
	const activePathname = pathname || ''
	if (!activePathname.includes('/updates')) {
		defaultItems.push(defaultUpdatesItem)
	}
	if (!activePathname.includes('/settings')) {
		defaultItems.push(defaultSettingsItem)
	}

	// Combine dynamic items, separator (if applicable), and default items
	const allItems = [...visibleDynamicItems, ...(visibleDynamicItems.length > 0 && defaultItems.length > 0 ? [{ key: 'sep-default', type: 'separator' } as SmartKebabMenuItem] : []), ...defaultItems]

	// Hide the kebab menu button entirely if there are no items to display
	if (allItems.length === 0) {
		return null
	}

	// Dynamic absolute position matching the header bottom
	const topOffset = insets.top + HEADER_HEIGHT - 4

	const renderItem = (item: SmartKebabMenuItem) => {
		if (item.type === 'separator') {
			return <View key={item.key} style={[styles.separator, { backgroundColor: colors.borderLight || '#1E293B' }]} />
		}

		const isDestructive = item.destructive
		const isDisabled = item.disabled
		const labelColor = isDestructive ? colors.error || '#EF4444' : isDisabled ? colors.textSecondary || '#94A3B8' : colors.text || '#F8FAFC'
		const iconColor = isDestructive ? colors.error || '#EF4444' : colors.primary || '#0EA5E9'

		// Combine accessibility roles and dynamic states
		const isBtnDisabled = isDisabled || item.loading
		const accessibilityLabel = item.badge ? `${item.label}, ${item.badge}` : item.label

		return (
			<Pressable
				key={item.key}
				disabled={isBtnDisabled}
				onPress={() => {
					setIsOpen(false)
					item.onPress()
				}}
				accessibilityRole="button"
				accessibilityLabel={accessibilityLabel}
				accessibilityState={{ disabled: isBtnDisabled }}
				style={({ pressed, hovered }) => [
					styles.itemContainer,
					{
						backgroundColor: hovered && Platform.OS === 'web' ? colors.borderLight || 'rgba(255, 255, 255, 0.05)' : pressed ? colors.border || 'rgba(255, 255, 255, 0.1)' : 'transparent'
					}
				]}
			>
				<View style={styles.itemLeft}>
					{item.loading ? (
						<ActivityIndicator size="small" color={iconColor} style={styles.iconLoader} />
					) : item.icon ? (
						<Ionicons name={item.icon as any} size={18} color={iconColor} style={styles.icon} />
					) : null}
					<Text style={[styles.itemLabel, { color: labelColor }, isDestructive && styles.destructiveText]} numberOfLines={1} ellipsizeMode="tail">
						{item.label}
					</Text>
				</View>

				{item.badge !== undefined && item.badge !== null && item.badge !== '' && (
					<View
						style={[
							styles.badgeContainer,
							{
								backgroundColor: colors.primaryContainer || '#0EA5E920',
								borderColor: colors.primary || '#0EA5E9'
							}
						]}
					>
						<Text style={[styles.badgeText, { color: colors.primary || '#0EA5E9' }]} numberOfLines={1} ellipsizeMode="tail">
							{item.badge}
						</Text>
					</View>
				)}
			</Pressable>
		)
	}

	return (
		<View style={styles.kebabContainer}>
			<HeaderAction iconName="ellipsis-vertical" onPress={() => setIsOpen(!isOpen)} accessibilityLabel="Open settings and actions menu" iconColor={colors.text} />

			<Modal visible={isOpen} transparent animationType="fade" onRequestClose={() => setIsOpen(false)}>
				<Pressable style={styles.backdrop} onPress={() => setIsOpen(false)}>
					<View
						style={[
							styles.dropdownMenu,
							{
								top: topOffset,
								backgroundColor: colors.surface || '#1C2541',
								borderColor: colors.border || '#3A506B'
							}
						]}
					>
						{allItems.map(renderItem)}
					</View>
				</Pressable>
			</Modal>
		</View>
	)
}

const styles = StyleSheet.create({
	kebabContainer: {
		position: 'relative'
	},
	backdrop: {
		flex: 1,
		backgroundColor: 'transparent',
		width: '100%',
		height: '100%'
	},
	dropdownMenu: {
		position: 'absolute',
		right: 16,
		width: 220,
		borderRadius: 12,
		borderWidth: 1,
		paddingVertical: 6,
		...Platform.select({
			ios: {
				shadowColor: '#000000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.35,
				shadowRadius: 8
			},
			android: {
				elevation: 8
			},
			web: {
				boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.4)' as any
			}
		})
	},
	itemContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 10,
		paddingHorizontal: 14,
		minHeight: 40,
		...Platform.select({
			web: {
				cursor: 'pointer' as any,
				transition: 'background-color 0.15s ease' as any
			}
		})
	},
	itemLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 8
	},
	icon: {
		width: 20,
		marginRight: 10,
		textAlign: 'center'
	},
	iconLoader: {
		marginRight: 10
	},
	itemLabel: {
		fontSize: 14,
		fontWeight: '500'
	},
	destructiveText: {
		fontWeight: '600'
	},
	separator: {
		height: 1,
		marginVertical: 6,
		marginHorizontal: 12,
		opacity: 0.5
	},
	badgeContainer: {
		paddingHorizontal: 6,
		paddingVertical: 2,
		borderRadius: 6,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center',
		minWidth: 20,
		maxWidth: 60
	},
	badgeText: {
		fontSize: 9,
		fontWeight: '700',
		textAlign: 'center'
	}
})
