import React, { useEffect, useState, useCallback } from 'react'
import { Tabs, useFocusEffect, usePathname } from 'expo-router'
import { useRouter } from 'expo-router'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { View, Platform, StyleSheet } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useUser, useLayout, useTheme, useNotification } from '@/core/contexts'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { secureGetItem } from '../../core/auth/storage'
import { useBackButton } from '../../core/hooks/useBackButton'

export default function HomeLayout() {
	const { colors } = useTheme()
	const { isTabBarVisible, setTabBarVisible } = useLayout()
	const { translate } = useUser()
	const router = useRouter()
	const pathname = usePathname()
	useBackButton()
	const [userRole, setUserRole] = useState<string | null>(null)
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false)
	const { notificationCount } = useNotification()

	// Load auth status and user data
	useEffect(() => {
		const loadAuthData = async () => {
			try {
				const token = await secureGetItem('authToken')
				setIsAuthenticated(!!token)

				const storedUserData = await secureGetItem('userData')
				if (storedUserData) {
					const userData = JSON.parse(storedUserData)
					setUserRole(userData.role || null)
				} else {
					setUserRole(null)
				}
			} catch (error) {
				console.error('Failed to load auth data:', error)
				setIsAuthenticated(false)
				setUserRole(null)
			}
		}
		loadAuthData()
	}, [])

	// Show tab bar when navigating to a new screen
	useEffect(() => {
		setTabBarVisible(true)
	}, [pathname, setTabBarVisible])

	const iconSize = Platform.select({ ios: 20, android: 22, web: 20 })

	return (
		<SafeAreaProvider>
			<SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top', 'right', 'left']}>
				<StatusBar style="light" />
				<Tabs
					screenOptions={{
						headerShown: false,
						tabBarStyle: {
							position: 'absolute',
							bottom: 0,
							left: 0,
							right: 0,
							backgroundColor: colors.background,
							borderTopColor: colors.primary,
							borderTopWidth: 1.5,
							paddingVertical: Platform.select({
								ios: 2,
								android: 4,
								web: 4
							}),
							height: Platform.select({
								ios: 40,
								android: 48,
								web: 48
							}),
							transform: [{ translateY: isTabBarVisible ? 0 : 100 }],
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
						// Icons only - no labels
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
							href: isAuthenticated ? '/dashboard' : null,
							tabBarIcon: ({ color, focused }) => (
								<View style={focused ? styles.activeIconContainer : undefined}>
									<MaterialIcons name="dashboard" size={iconSize} color={color} />
								</View>
							),
							tabBarAccessibilityLabel: translate('dashboard', 'Dashboard')
						}}
					/>
					<Tabs.Screen
						name="business"
						options={{
							href: userRole === 'shop_owner' ? '/business' : null,
							tabBarIcon: ({ color, focused }) => (
								<View style={focused ? styles.activeIconContainer : undefined}>
									<MaterialIcons name="business-center" size={iconSize} color={color} />
								</View>
							),
							tabBarAccessibilityLabel: translate('business', 'Business')
						}}
					/>
					<Tabs.Screen
						name="notifications"
						options={{
							href: isAuthenticated ? '/notifications' : null,
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
					{/* Hidden screens - not shown in tab bar */}
					<Tabs.Screen
						name="shops"
						options={{
							href: null
						}}
					/>
					<Tabs.Screen
						name="purchases"
						options={{
							href: null
						}}
					/>
					<Tabs.Screen
						name="products"
						options={{
							href: null
						}}
					/>
				</Tabs>
			</SafeAreaView>
		</SafeAreaProvider>
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
		backgroundColor: 'rgba(56, 189, 248, 0.15)', // primary with low opacity
		justifyContent: 'center',
		alignItems: 'center'
	}
})
