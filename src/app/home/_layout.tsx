import React from 'react'
import { Tabs } from 'expo-router'
import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { View, Platform } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { useTheme } from '@/contexts/ThemeContext'

export default function HomeLayout() {
	const { colors, isDark } = useTheme()
	const router = useRouter()
	const [ordersCount, setOrdersCount] = useState<number | undefined>(undefined)

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

	// Load ordersCount from AsyncStorage
	useEffect(() => {
		const loadOrdersCount = async () => {
			try {
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
			} catch (error) {
				console.error('Failed to load ordersCount:', error)
				setOrdersCount(0) // Fallback to 0 on error
			}
		}
		loadOrdersCount()
	}, [])

	return (
		<SafeAreaProvider>
			<SafeAreaView style={{ flex: 1, backgroundColor: colors.background }} edges={['top', 'right', 'left']}>
				<StatusBar translucent={false} style={isDark ? 'light' : 'dark'} />
				<Tabs
					screenOptions={{
						headerShown: false,
						tabBarStyle: {
							backgroundColor: colors.background,
							borderTopColor: colors.border,
							paddingBottom: 0,
							height: 50
						},
						tabBarActiveTintColor: colors.primary,
						tabBarInactiveTintColor: colors.textSecondary
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
					<Tabs.Screen name="shops" options={{ title: 'My Shops', tabBarActiveTintColor: colors.primary }} />
					<Tabs.Screen name="profile" options={{ title: 'Profile', tabBarActiveTintColor: colors.primary }} />
					<Tabs.Screen name="settings" options={{ title: 'Settings', tabBarActiveTintColor: colors.primary }} />
				</Tabs>
			</SafeAreaView>
		</SafeAreaProvider>
	)
}
