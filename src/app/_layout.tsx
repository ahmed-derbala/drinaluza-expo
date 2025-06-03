import { Stack } from 'expo-router'
import { ThemeProvider } from '@/core/theme'
import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'

export default function RootLayout() {
	const router = useRouter()

	useEffect(() => {
		const checkToken = async () => {
			const token = await AsyncStorage.getItem('authToken')
			if (token) {
				router.replace('/home')
			} else {
				router.replace('/auth')
			}
		}
		checkToken()
	}, [])

	return (
		<ThemeProvider>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="auth" />
				<Stack.Screen name="home" />
			</Stack>
		</ThemeProvider>
	)
}
