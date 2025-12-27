import React, { useEffect, useState, useCallback } from 'react'
import { Tabs, useFocusEffect } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { View, Platform } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useTheme } from '../../contexts/ThemeContext'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { useNotification } from '../../contexts/NotificationContext'
import { APP_VERSION } from '../../config'
import { secureGetItem } from '../../core/auth/auth.api'
import { useBackButton } from '../../hooks/useBackButton'

export default function HomeLayout() {
	const { colors, isDark } = useTheme()
	const router = useRouter()
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

	return (
		<SafeAreaProvider>
			<SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'right', 'left']}>
				<StatusBar style={isDark ? 'light' : 'dark'} />
				<Tabs
					screenOptions={{
						headerShown: false,
						tabBarStyle: {
							backgroundColor: colors.background,
							borderTopColor: colors.border,
							paddingBottom: Platform.select({
								ios: 0,
								android: 0,
								web: 10
							}),
							height: Platform.select({
								ios: 50,
								android: 60,
								web: 60
							}),
							...Platform.select({
								ios: {
									boxShadow: '0 -1px 4px rgba(0,0,0,0.1)'
								},
								android: {
									elevation: 8,
									borderTopWidth: 0
								},
								web: {
									borderTopWidth: 1,
									boxShadow: '0 -2px 8px rgba(0,0,0,0.1)'
								}
							})
						},
						tabBarActiveTintColor: colors.primary,
						tabBarInactiveTintColor: colors.textSecondary,
						tabBarHideOnKeyboard: Platform.OS === 'android',
						tabBarShowLabel: true,
						tabBarLabelStyle: {
							fontSize: Platform.select({
								ios: 10,
								android: 12,
								web: 12
							}),
							fontWeight: Platform.select({
								ios: '600',
								android: '500',
								web: '500'
							})
						}
					}}
				>
					<Tabs.Screen
						name="feed"
						options={{
							title: 'Feed',
							tabBarActiveTintColor: colors.primary,
							tabBarIcon: ({ color, size }: { color: string; size: number }) => <MaterialIcons name="home" size={size} color={color} />
						}}
					/>
					<Tabs.Screen
						name="dashboard"
						options={{
							title: 'Dashboard',
							href: isAuthenticated ? '/home/dashboard' : null,
							tabBarActiveTintColor: colors.primary,
							tabBarIcon: ({ color, size }: { color: string; size: number }) => <MaterialIcons name="dashboard" size={size} color={color} />
						}}
					/>

					<Tabs.Screen
						name="business"
						options={{
							title: 'Business',
							href: userRole === 'shop_owner' ? '/home/business' : null,
							tabBarActiveTintColor: colors.primary,
							tabBarIcon: ({ color, size }: { color: string; size: number }) => <MaterialIcons name="business-center" size={size} color={color} />
						}}
					/>
					<Tabs.Screen
						name="notifications"
						options={{
							title: 'Notifications',
							href: isAuthenticated ? '/home/notifications' : null,
							tabBarActiveTintColor: colors.primary,
							tabBarBadge: notificationCount > 0 ? notificationCount : undefined,
							tabBarBadgeStyle: { backgroundColor: colors.error, color: '#fff', fontSize: 10, minWidth: 16, height: 16, borderRadius: 8, lineHeight: 16 },
							tabBarIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="notifications" size={size} color={color} />
						}}
					/>
					<Tabs.Screen
						name="profile"
						options={{
							title: 'Profile',
							tabBarActiveTintColor: colors.primary,
							tabBarIcon: ({ color, size }: { color: string; size: number }) => <MaterialIcons name="person" size={size} color={color} />
						}}
					/>
					<Tabs.Screen
						name="settings"
						options={{
							href: null
						}}
					/>
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
				</Tabs>
			</SafeAreaView>
		</SafeAreaProvider>
	)
}
