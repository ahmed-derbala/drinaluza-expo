import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const apiClient = axios.create({
	baseURL: 'http://192.168.1.15:5001/api',
	headers: {
		'Content-Type': 'application/json'
	}
})

apiClient.interceptors.request.use(async (config) => {
	const token = await AsyncStorage.getItem('authToken')
	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}
	return config
})

export default apiClient
