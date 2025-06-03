import AsyncStorage from '@react-native-async-storage/async-storage'
import axios from 'axios'

export const useSettings = () => {
	const handleSignOut = async () => {
		try {
			const token = await AsyncStorage.getItem('authToken')
			await axios.post(
				'http://192.168.1.15:5001/api/auth/signout',
				{},
				{
					headers: { Authorization: `Bearer ${token}` }
				}
			)
			await AsyncStorage.removeItem('authToken')
		} catch (error) {
			console.error('Sign-out error:', error)
			alert('Sign-out failed')
		}
	}

	return { handleSignOut }
}
