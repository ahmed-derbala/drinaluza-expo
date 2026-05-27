import React, { useEffect } from 'react'
import { Tabs, usePathname } from 'expo-router'
import { View, Platform, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLayout, useUser } from '@/core/contexts'
import { useNotification } from '@/features/notifications/NotificationContext'
import { useTheme } from '@/core/theme'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useBackButton } from '@/core/hooks/useBackButton'

export default function HomeLayout() {
	const { colors } = useTheme()
	const { isTabBarVisible, setTabBarVisible } = useLayout()
	const { translate, user } = useUser()
	const pathname = usePathname()
	useBackButton()
	// Derive auth state from UserContext — single source of truth, no extra token read
	const isAuthenticated = !!user
	const { notificationCount } = useNotification()
	const insets = useSafeAreaInsets()

	useEffect(() => {
		setTabBarVisible(true)
	}, [pathname, setTabBarVisible])

	const iconSize = Platform.select({ ios: 20, android: 22, web: 20 })
	const isDashboardVisible = isAuthenticated && user?.role === 'business_owner'
	const isNotificationsVisible = isAuthenticated

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<StatusBar style="light" />
			<Tabs
				screenOptions={{
					headerStyle: {
						backgroundColor: colors.background
					},
					headerTintColor: colors.text,
					headerTitleStyle: {
						fontWeight: '600'
					},
					tabBarStyle: {
						position: 'absolute',
						bottom: 0,
						left: 0,
						right: 0,
						backgroundColor: colors.background,
						borderTopColor: colors.primary,
						borderTopWidth: 1.5,
						height: Platform.select({
							ios: 44 + insets.bottom,
							android: 36 + insets.bottom,
							web: 48
						}),
						paddingBottom: insets.bottom,
						paddingTop: Platform.select({
							ios: insets.bottom > 0 ? 2 : 0,
							android: 0,
							web: 0
						}),
						transform: [{ translateY: isTabBarVisible ? 0 : 120 }],
						opacity: isTabBarVisible ? 1 : 0,
						...Platform.select({
							ios: {
								shadowColor: colors.primary,
								shadowOffset: { width: 0, height: -3 },
								shadowOpacity: 0.12,
								shadowRadius: 6
							},
							android: {
								elevation: 8
							},
							web: {
								boxShadow: `0 -3px 10px ${colors.primary}18`
							}
						})
					},
					tabBarActiveTintColor: colors.primary,
					tabBarInactiveTintColor: colors.textTertiary,
					tabBarHideOnKeyboard: Platform.OS === 'android',
					tabBarShowLabel: false,
					tabBarIconStyle: {
						marginTop: Platform.select({
							ios: 0,
							android: 1,
							web: 0
						})
					}
				}}
			>
				<Tabs.Screen
					name="feed"
					options={{
						tabBarIcon: ({ color, focused }) => (
							<View style={focused ? styles.activeIconContainer : undefined}>
								<MaterialIcons name="home" size={iconSize} color={color} />
							</View>
						),
						tabBarAccessibilityLabel: translate('feed', 'Feed')
					}}
				/>
				<Tabs.Screen
					name="dashboard"
					options={{
						href: isDashboardVisible ? '/dashboard' : undefined,
						tabBarButton: isDashboardVisible ? undefined : () => null,
						tabBarItemStyle: isDashboardVisible ? undefined : { display: 'none' },
						tabBarIcon: ({ color, focused }) => (
							<View style={focused ? styles.activeIconContainer : undefined}>
								<MaterialIcons name="dashboard" size={iconSize} color={color} />
							</View>
						),
						tabBarAccessibilityLabel: translate('dashboard', 'Dashboard')
					}}
				/>
				<Tabs.Screen
					name="notifications"
					options={{
						href: isNotificationsVisible ? '/notifications' : undefined,
						tabBarButton: isNotificationsVisible ? undefined : () => null,
						tabBarItemStyle: isNotificationsVisible ? undefined : { display: 'none' },
						tabBarBadge: notificationCount > 0 ? notificationCount : undefined,
						tabBarBadgeStyle: {
							backgroundColor: colors.error,
							color: '#fff',
							fontSize: 10,
							minWidth: 18,
							height: 18,
							borderRadius: 9,
							lineHeight: 18
						},
						tabBarIcon: ({ color, focused }) => (
							<View style={focused ? styles.activeIconContainer : undefined}>
								<Ionicons name={focused ? 'notifications' : 'notifications-outline'} size={iconSize} color={color} />
							</View>
						),
						tabBarAccessibilityLabel: translate('notifications', 'Notifications')
					}}
				/>
				<Tabs.Screen
					name="profile"
					options={{
						tabBarIcon: ({ color, focused }) => (
							<View style={focused ? styles.activeIconContainer : undefined}>
								<MaterialIcons name={focused ? 'person' : 'person-outline'} size={iconSize} color={color} />
							</View>
						),
						tabBarAccessibilityLabel: translate('profile', 'Profile')
					}}
				/>
				<Tabs.Screen
					name="settings"
					options={{
						tabBarIcon: ({ color, focused }) => (
							<View style={focused ? styles.activeIconContainer : undefined}>
								<Ionicons name={focused ? 'settings' : 'settings-outline'} size={iconSize} color={color} />
							</View>
						),
						tabBarAccessibilityLabel: translate('settings', 'Settings')
					}}
				/>
			</Tabs>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	activeIconContainer: {
		width: 32,
		height: 32,
		borderRadius: 8,
		backgroundColor: 'rgba(56, 189, 248, 0.15)',
		justifyContent: 'center',
		alignItems: 'center'
	}
})
