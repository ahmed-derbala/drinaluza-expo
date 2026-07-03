import React, { useEffect } from 'react'
import { Tabs, usePathname } from 'expo-router'
import { View, Platform, StyleSheet, useWindowDimensions } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

const TabsComponent = Tabs as any
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLayout, useUser } from '@/core/contexts'
import { useNotification } from '@/features/notifications/NotificationContext'
import { useTheme } from '@/core/theme'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useBackButton } from '@/core/hooks/useBackButton'
import { SmartHeader } from '@/core/smart-header'

export default function HomeLayout() {
	const { colors } = useTheme()
	const { isTabBarVisible, setTabBarVisible } = useLayout()
	const { translate, user } = useUser()
	const pathname = usePathname()
	useBackButton()
	// Derive auth state from UserContext — single source of truth, no extra token read
	const isAuthenticated = !!user
	const { notificationCount } = useNotification()
	const isDashboardVisible = isAuthenticated && user?.role === 'business_owner'
	const isNotificationsVisible = isAuthenticated
	const activeTabsCount = 2 + (isDashboardVisible ? 1 : 0) + (isNotificationsVisible ? 1 : 0)
	const barWidth = activeTabsCount * 48
	const { width: screenWidth } = useWindowDimensions()
	const insets = useSafeAreaInsets()

	useEffect(() => {
		setTabBarVisible(true)
	}, [pathname, setTabBarVisible])

	const renderTabBarIcon = (focusedIcon: string, unfocusedIcon: string, iconType: 'material' | 'ionicons', color: any, focused: boolean) => {
		const iconColor = focused ? colors.primary : colors.textTertiary
		return iconType === 'material' ? (
			<MaterialIcons name={(focused ? focusedIcon : unfocusedIcon) as any} size={20} color={iconColor} />
		) : (
			<Ionicons name={(focused ? focusedIcon : unfocusedIcon) as any} size={20} color={iconColor} />
		)
	}

	return (
		<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
			<TabsComponent
				sceneContainerStyle={{
					backgroundColor: colors.background
				}}
				screenOptions={{
					headerShown: true,
					header: (props: any) => <SmartHeader {...props} />,
					tabBarStyle: {
						position: 'absolute',
						bottom: Platform.select({
							ios: insets.bottom > 0 ? insets.bottom + 6 : 10,
							android: 10,
							web: 14
						}),
						left: 0,
						right: 0,
						height: 44,
						backgroundColor: 'transparent',
						borderTopWidth: 0,
						borderTopColor: 'transparent',
						paddingBottom: 0,
						paddingTop: 0,
						paddingHorizontal: (screenWidth - barWidth) / 2,
						transform: [{ translateY: isTabBarVisible ? 0 : 120 }],
						opacity: isTabBarVisible ? 1 : 0,
						elevation: 0,
						shadowColor: 'transparent'
					},
					tabBarBackground: () => (
						<View
							style={{
								position: 'absolute',
								left: (screenWidth - barWidth) / 2,
								width: barWidth,
								height: '100%',
								backgroundColor: 'rgba(15, 23, 42, 0.6)',
								borderRadius: 22,
								...Platform.select({
									ios: {
										shadowColor: 'rgba(0, 0, 0, 0.5)',
										shadowOffset: { width: 0, height: 4 },
										shadowOpacity: 1,
										shadowRadius: 16
									},
									android: {
										elevation: 12
									},
									web: {
										boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)'
									}
								})
							}}
						/>
					),
					tabBarActiveTintColor: colors.primary,
					tabBarInactiveTintColor: colors.textTertiary,
					tabBarHideOnKeyboard: Platform.OS === 'android',
					tabBarShowLabel: false,
					tabBarItemStyle: {
						flex: 1,
						justifyContent: 'center',
						alignItems: 'center',
						height: '100%',
						padding: 0,
						margin: 0
					},
					tabBarIconStyle: {
						justifyContent: 'center',
						alignItems: 'center',
						marginTop: 0,
						marginBottom: 0
					}
				}}
			>
				<Tabs.Screen
					name="feed"
					options={{
						tabBarIcon: ({ color, focused }) => renderTabBarIcon('home', 'home-outline', 'ionicons', color, focused),
						tabBarAccessibilityLabel: translate('feed', 'Feed')
					}}
				/>
				<Tabs.Screen
					name="dashboard"
					options={{
						href: isDashboardVisible ? '/dashboard' : null,
						tabBarIcon: ({ color, focused }) => renderTabBarIcon('grid', 'grid-outline', 'ionicons', color, focused),
						tabBarAccessibilityLabel: translate('dashboard', 'Dashboard')
					}}
				/>
				<Tabs.Screen
					name="notifications"
					options={{
						href: isNotificationsVisible ? '/notifications' : null,
						tabBarBadge: notificationCount > 0 ? notificationCount : undefined,
						tabBarBadgeStyle: {
							backgroundColor: colors.error,
							color: '#fff',
							fontSize: 9,
							minWidth: 16,
							height: 16,
							borderRadius: 8,
							lineHeight: 16
						},
						tabBarIcon: ({ color, focused }) => renderTabBarIcon('notifications', 'notifications-outline', 'ionicons', color, focused),
						tabBarAccessibilityLabel: translate('notifications', 'Notifications')
					}}
				/>
				<Tabs.Screen
					name="profile"
					options={{
						tabBarIcon: ({ color, focused }) => renderTabBarIcon('person', 'person-outline', 'ionicons', color, focused),
						tabBarAccessibilityLabel: translate('profile', 'Profile')
					}}
				/>
				<Tabs.Screen
					name="settings"
					options={{
						href: null,
						tabBarIcon: ({ color, focused }) => renderTabBarIcon('settings', 'settings-outline', 'ionicons', color, focused),
						tabBarAccessibilityLabel: translate('settings', 'Settings')
					}}
				/>
			</TabsComponent>
		</SafeAreaView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	}
})
