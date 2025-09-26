import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig, AxiosRequestConfig } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../components/settings/settings.api'
import { getServerUrl, API_TIMEOUT } from '../../config'

// Create an API client with the given base URL
const createApiClient = (baseURL: string): AxiosInstance => {
	const client = axios.create({
		baseURL,
		headers: {
			'Content-Type': 'application/json'
		},
		timeout: API_TIMEOUT
	})

	client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
		const token = await AsyncStorage.getItem('authToken')
		if (token && config.headers) {
			// Set both Authorization and token headers for compatibility
			config.headers.Authorization = `Bearer ${token}`
			// @ts-ignore - Axios headers can be set directly
			config.headers.token = token
		}
		return config
	})

	// Add response interceptor for better error handling
	client.interceptors.response.use(
		(response: AxiosResponse) => response,
		(error: AxiosError) => {
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
				console.error('Response status:', error.response.status)
				console.error('Response data:', error.response.data)
			} else if (error.request) {
				console.error('No response received from server')
			}

			return Promise.reject(error)
		}
	)

	return client
}

// Default API client instance with a default URL
let apiClient = createApiClient('http://localhost:5001/api')

// Function to get the current API client
export const getApiClient = (): AxiosInstance => apiClient

// Function to update the API client with the latest configuration
export const updateApiBaseUrl = async (): Promise<AxiosInstance> => {
	try {
		const baseURL = await getBaseUrl()
		console.log('Updating API base URL to:', baseURL)
		apiClient = createApiClient(baseURL)
		return apiClient
	} catch (error) {
		console.error('Failed to update API base URL:', error)
		// Fallback to default URL if there's an error
		apiClient = createApiClient('http://localhost:5001/api')
		return apiClient
	}
}

// Initialize with the stored configuration
const initializeApiClient = async () => {
	try {
		await updateApiBaseUrl()
	} catch (error) {
		console.error('Failed to initialize API client:', error)
	}
}

// Initialize the API client when the module loads
initializeApiClient()

// Utility function to test server connectivity
export const testServerConnection = async (): Promise<{ success: boolean; error?: string }> => {
	const client = getApiClient()
	try {
		const response = await client.get('/', { timeout: 5000 })
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

// Export the API client instance
export { createApiClient }

export default getApiClient
