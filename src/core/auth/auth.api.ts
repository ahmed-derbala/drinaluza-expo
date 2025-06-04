import apiClient from '@/core/api'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const signIn = async (username: string, password: string) => {
	const response = await apiClient.post('/auth/signin', { username, password })
	if (response.data.data.token) {
		await AsyncStorage.setItem('authToken', response.data.data.token)
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
	await apiClient.post('/auth/signout')
	await AsyncStorage.removeItem('authToken')
}
