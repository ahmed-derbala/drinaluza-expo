import React from 'react'
import { Tabs } from 'expo-router'
import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { View, Platform } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useTheme } from '../../contexts/ThemeContext'

export default function HomeLayout() {
	const { colors, isDark } = useTheme()
	const router = useRouter()
	const [ordersCount, setOrdersCount] = useState<number | undefined>(undefined)
	const [userRole, setUserRole] = useState<string | null>(null)

	// Load auth token
	useEffect(() => {
		const checkAuth = async () => {
			const token = await AsyncStorage.getItem('authToken')
			if (!token) {
				router.replace('/auth')
			}
		}
		checkAuth()
	}, [])

	// Load ordersCount and userRole from AsyncStorage
	useEffect(() => {
		const loadData = async () => {
			try {
				// Load orders count
				const storedCount = await AsyncStorage.getItem('ordersCount')
				if (storedCount !== null) {
					setOrdersCount(parseInt(storedCount, 10))
				} else {
					// Optional: Fallback to basket length if ordersCount isn't set
					const storedBasket = await AsyncStorage.getItem('basket')
					if (storedBasket) {
						const basket = JSON.parse(storedBasket)
						setOrdersCount(basket.length)
					} else {
						setOrdersCount(0)
					}
				}

				// Load user role
				const storedUserData = await AsyncStorage.getItem('userData')
				if (storedUserData) {
					const userData = JSON.parse(storedUserData)
					setUserRole(userData.role || null)
				}
			} catch (error) {
				console.error('Failed to load data:', error)
				setOrdersCount(0) // Fallback to 0 on error
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
						// Platform-specific tab bar styling
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
							// Native-like shadows and borders
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
						// Platform-specific tab bar behavior
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
					<Tabs.Screen name="feed" options={{ title: 'Feed', tabBarActiveTintColor: colors.primary }} />
					<Tabs.Screen
						name="orders"
						options={{
							title: 'Orders',
							tabBarActiveTintColor: colors.primary,
							tabBarBadge: ordersCount !== undefined && ordersCount > 0 ? ordersCount : undefined
						}}
					/>
					<Tabs.Screen
						name="profile"
						options={{
							title: 'Profile',
							tabBarActiveTintColor: colors.primary
						}}
					/>
					<Tabs.Screen
						name="settings"
						options={{
							title: 'Settings',
							tabBarActiveTintColor: colors.primary
						}}
					/>
					<Tabs.Screen
						name="business/index"
						options={{
							title: 'Business',
							tabBarActiveTintColor: colors.primary,
							href: userRole === 'shop_owner' ? undefined : null
						}}
					/>
					<Tabs.Screen
						name="shops"
						options={{
							href: null
						}}
					/>
				</Tabs>
			</SafeAreaView>
		</SafeAreaProvider>
	)
}
