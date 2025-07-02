import { Tabs } from 'expo-router'
import { useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { StatusBar, View, Platform } from 'react-native'

export default function HomeLayout() {
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
			<SafeAreaView style={{ flex: 1, backgroundColor: '#1a1a1a' }} edges={['right', 'left']}>
				{/* View to set status bar background color on Android */}
				{Platform.OS === 'android' && (
					<View
						style={{
							height: StatusBar.currentHeight || 0,
							backgroundColor: '#1a1a1a'
						}}
					/>
				)}
				<StatusBar translucent={true} style="light" />
				<Tabs
					screenOptions={{
						headerShown: false,
						tabBarStyle: {
							backgroundColor: '#1a1a1a',
							borderTopColor: '#333',
							paddingBottom: 0,
							height: 50
						},
						tabBarActiveTintColor: '#fff',
						tabBarInactiveTintColor: '#aaa'
					}}
				>
					<Tabs.Screen name="feed" options={{ title: 'Feed', tabBarActiveTintColor: '#fff' }} />
					<Tabs.Screen
						name="orders"
						options={{
							title: 'Orders',
							tabBarActiveTintColor: '#fff',
							tabBarBadge: ordersCount !== undefined && ordersCount > 0 ? ordersCount : undefined
						}}
					/>
					<Tabs.Screen name="settings" options={{ title: 'Settings', tabBarActiveTintColor: '#fff' }} />
				</Tabs>
			</SafeAreaView>
		</SafeAreaProvider>
	)
}
