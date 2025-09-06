import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '@/components/settings/settings.api'
import { getApiUrl, defaultConfig } from '@/core/config'

// Create a function to initialize the API client with dynamic base URL
const createApiClient = async () => {
	const baseURL = await getBaseUrl()

	const client = axios.create({
		baseURL,
		headers: {
			'Content-Type': 'application/json'
		},
		timeout: defaultConfig.server.timeout
	})

	client.interceptors.request.use(async (config) => {
		const token = await AsyncStorage.getItem('authToken')
		//console.log(token)
		if (token) {
			config.headers.Authorization = `Bearer ${token}`
		}
		return config
	})

	// Add response interceptor for better error handling
	client.interceptors.response.use(
		(response) => response,
		(error) => {
			console.error('API Error:', error.message)
			if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
				console.error('Network error - check server connection and settings')
			}
			return Promise.reject(error)
		}
	)

	return client
}

// Create the default API client
const apiClient = axios.create({
	baseURL: getApiUrl('local'), // Default fallback from config
	headers: {
		'Content-Type': 'application/json'
	},
	timeout: defaultConfig.server.timeout
})

apiClient.interceptors.request.use(async (config) => {
	const token = await AsyncStorage.getItem('authToken')
	//console.log(token)
	if (token) {
		config.headers.Authorization = `Bearer ${token}`
	}
	return config
})

// Add response interceptor for better error handling
apiClient.interceptors.response.use(
	(response) => response,
	(error) => {
		console.error('API Error:', error.message)
		if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
			console.error('Network error - check server connection and settings')
		}
		return Promise.reject(error)
	}
)

// Function to update the base URL dynamically
export const updateApiBaseUrl = async () => {
	const newBaseUrl = await getBaseUrl()
	apiClient.defaults.baseURL = newBaseUrl
}

// Initialize with the stored configuration
updateApiBaseUrl()

// Utility function to test server connectivity
export const testServerConnection = async (): Promise<{ success: boolean; error?: string }> => {
	try {
		const response = await apiClient.get('/', { timeout: 5000 })
		return { success: true }
	} catch (error: any) {
		if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
			return { success: false, error: 'Network connection failed. Check if server is running and accessible.' }
		}
		if (error.response?.status === 404) {
			return { success: false, error: 'Server is running but health endpoint not found.' }
		}
		return { success: false, error: error.message || 'Unknown error occurred.' }
	}
}

export default apiClient
export { createApiClient }
