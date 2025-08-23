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
	const response = await apiClient.post('/auth/signout')
	console.log(response)
	const t = await AsyncStorage.getItem('authToken')
	console.log(t)
	await AsyncStorage.removeItem('authToken')
}
