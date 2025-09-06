import apiClient from '@/core/api'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const signIn = async (username: string, password: string) => {
	const response = await apiClient.post('/auth/signin', { username, password })
	if (response.data.data.token) {
		await AsyncStorage.setItem('authToken', response.data.data.token)
	}
	if (response.data.data.user) {
		await AsyncStorage.setItem('user._id', response.data.data.user._id)
		await AsyncStorage.setItem('user.username', response.data.data.user.username)
	}
	return response.data
}

export const signUp = async (username: string, password: string) => {
	const response = await apiClient.post('/auth/signup', { username, password })
	if (response.data.data.token) {
		await AsyncStorage.setItem('authToken', response.data.data.token)
	}
	return response.data
}

export const signOut = async () => {
	try {
		// Try to call the server signout endpoint if internet is available
		const response = await apiClient.post('/auth/signout')
		console.log('Server signout successful:', response)
	} catch (error) {
		// If network request fails (no internet), just log it and continue
		console.log('Server signout failed (offline mode):', error)
	}

	// Always clear local storage data regardless of network status
	try {
		const t = await AsyncStorage.getItem('authToken')
		console.log('Clearing auth token:', t)
		await AsyncStorage.removeItem('authToken')
		await AsyncStorage.removeItem('user._id')
		await AsyncStorage.removeItem('user.username')
		console.log('Local storage cleared successfully')
	} catch (error) {
		console.error('Failed to clear local storage:', error)
		throw error // Re-throw if local storage clearing fails
	}
}
