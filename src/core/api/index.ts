import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '@/components/settings/settings.api'

// Create a function to initialize the API client with dynamic base URL
const createApiClient = async () => {
	const baseURL = await getBaseUrl()

	const client = axios.create({
		baseURL,
		headers: {
			'Content-Type': 'application/json'
		}
	})

	client.interceptors.request.use(async (config) => {
		const token = await AsyncStorage.getItem('authToken')
		//console.log(token)
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	})

	return client
}

// Create the default API client
const apiClient = axios.create({
	baseURL: 'http://192.168.1.15:5001/api', // Default fallback
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
	return config
})

// Function to update the base URL dynamically
export const updateApiBaseUrl = async () => {
	const newBaseUrl = await getBaseUrl()
	apiClient.defaults.baseURL = newBaseUrl
}

// Initialize with the stored configuration
updateApiBaseUrl()

export default apiClient
export { createApiClient }
