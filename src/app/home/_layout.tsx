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

export default function HomeLayout() {
	const { colors, isDark } = useTheme()
	const router = useRouter()
	const [userRole, setUserRole] = useState<string | null>(null)
	const { notificationCount } = useNotification()

	// Load auth token
	useEffect(() => {
		const checkAuth = async () => {
			const token = await AsyncStorage.getItem('authToken')
			if (!token) {
				// router.replace('/auth')
			}
		}
		checkAuth()
	}, [])

	// Load user data
	useEffect(() => {
		const loadData = async () => {
			try {
				const storedUserData = await AsyncStorage.getItem('userData')
				if (storedUserData) {
					const userData = JSON.parse(storedUserData)
					setUserRole(userData.role || null)
				}
			} catch (error) {
				console.error('Failed to load user data:', error)
				setUserRole(null)
			}
		}
		loadData()
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
							tabBarIcon: ({ color, size }) => <MaterialIcons name="home" size={size} color={color} />
						}}
					/>
					<Tabs.Screen
						name="customer-dashboard"
						options={{
							title: 'Dashboard',
							tabBarActiveTintColor: colors.primary,
							tabBarIcon: ({ color, size }) => <MaterialIcons name="dashboard" size={size} color={color} />
						}}
					/>
					<Tabs.Screen
						name="business"
						options={{
							title: 'Business',
							href: userRole === 'shop_owner' ? '/home/business' : null,
							tabBarActiveTintColor: colors.primary,
							tabBarIcon: ({ color, size }) => <MaterialIcons name="business-center" size={size} color={color} />
						}}
					/>
					<Tabs.Screen
						name="notifications"
						options={{
							title: 'Notifications',
							tabBarActiveTintColor: colors.primary,
							tabBarBadge: notificationCount > 0 ? notificationCount : undefined,
							tabBarBadgeStyle: { backgroundColor: colors.error, color: '#fff', fontSize: 10, minWidth: 16, height: 16, borderRadius: 8, lineHeight: 16 },
							tabBarIcon: ({ color, size }) => <Ionicons name="notifications" size={size} color={color} />
						}}
					/>
					<Tabs.Screen
						name="profile"
						options={{
							title: 'Profile',
							tabBarActiveTintColor: colors.primary,
							tabBarIcon: ({ color, size }) => <MaterialIcons name="person" size={size} color={color} />
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
