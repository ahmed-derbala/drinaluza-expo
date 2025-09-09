import { Redirect, useRouter } from 'expo-router'
import { useEffect, useState } from 'react'
import { View, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import BusinessDashboard from '../../components/business/BusinessDashboard'

export default function BusinessScreen() {
	const router = useRouter()
	const [isLoading, setIsLoading] = useState(true)
	const [isAuthorized, setIsAuthorized] = useState(false)

	useEffect(() => {
		const checkUserRole = async () => {
			try {
				const userData = await AsyncStorage.getItem('userData')
				if (userData) {
					const user = JSON.parse(userData)
					if (user.role === 'shop_owner') {
						setIsAuthorized(true)
					} else {
						router.replace('/')
					}
				} else {
					router.replace('/auth')
				}
			} catch (error) {
				console.error('Error checking user role:', error)
				router.replace('/')
			} finally {
				setIsLoading(false)
			}
		}

		checkUserRole()
	}, [])

	if (isLoading) {
		return (
			<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
				<ActivityIndicator size="large" />
			</View>
		)
	}

	if (!isAuthorized) {
		return <Redirect href="/" />
	}

	return <BusinessDashboard />
}
