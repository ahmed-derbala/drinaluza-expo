import { Tabs } from 'expo-router'
import { useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'

export default function HomeLayout() {
	const router = useRouter()

	useEffect(() => {
		const checkAuth = async () => {
			const token = await AsyncStorage.getItem('authToken')
			if (!token) {
				router.replace('/auth')
			}
		}
		checkAuth()
	}, [])

	return (
		<Tabs screenOptions={{ headerShown: false, tabBarStyle: { backgroundColor: '#1a1a1a' } }}>
			<Tabs.Screen name="feed" options={{ title: 'Feed', tabBarActiveTintColor: '#fff' }} />
			<Tabs.Screen name="settings" options={{ title: 'Settings', tabBarActiveTintColor: '#fff' }} />
		</Tabs>
	)
}
