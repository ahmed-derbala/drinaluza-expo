import axios from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../components/settings/settings.api'
import { getServerUrl, API_TIMEOUT } from '../../config'

// Create a function to initialize the API client with dynamic base URL
const createApiClient = async () => {
	const baseURL = await getBaseUrl()

	const client = axios.create({
		baseURL,
		headers: {
			'Content-Type': 'application/json'
		},
		timeout: API_TIMEOUT
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
			const requestUrl = error.config?.url || 'unknown'
			const baseUrl = error.config?.baseURL || 'unknown'
			const fullUrl = baseUrl && requestUrl ? `${baseUrl.replace(/\/+$/, '')}/${requestUrl.replace(/^\/+/, '')}` : 'unknown'

			console.error('API Error:', error.message)
			console.error('Request URL:', fullUrl)
			console.error('Method:', error.config?.method?.toUpperCase() || 'UNKNOWN')

			if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
				console.error('\n=== NETWORK ERROR DETECTED ===')
				console.error('Server URL in use:', baseUrl)
				console.error('Endpoint:', requestUrl)
				console.error('Full URL:', fullUrl)
				console.error('Make sure the server is running and accessible from this device')
				console.error('================================\n')
			}

			if (error.response) {
				// The request was made and the server responded with a status code
				// that falls out of the range of 2xx
				console.error('Response status:', error.response.status)
				console.error('Response data:', error.response.data)
			} else if (error.request) {
				// The request was made but no response was received
				console.error('No response received from server')
			}

			return Promise.reject(error)
		}
	)

	return client
}

// Create the default API client
const apiClient = axios.create({
	baseURL: getServerUrl('local'), // Default fallback from config
	headers: {
		'Content-Type': 'application/json'
	},
	timeout: API_TIMEOUT
})

apiClient.interceptors.request.use(async (config) => {
	const token = await AsyncStorage.getItem('authToken')
	if (token) {
		// Set both Authorization and token headers for compatibility
		config.headers.Authorization = `Bearer ${token}`
		config.headers.token = token // Add token in the 'token' header for routes that expect it
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

// Initialize with the stored configuration (only on native platforms)
if (typeof window === 'undefined') {
	updateApiBaseUrl()
}

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
