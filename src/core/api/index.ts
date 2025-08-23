import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'

const apiClient = axios.create({
	baseURL: 'http://192.168.1.149:5001/api',
	headers: {
		'Content-Type': 'application/json'
	}
})

apiClient.interceptors.request.use(async (config) => {
	const token = await AsyncStorage.getItem('authToken')
	//console.log(token)
	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}
	console.log('cccc')
	console.log(config)
	return config
})

export default apiClient
