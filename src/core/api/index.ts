import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig, AxiosRequestConfig } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getBaseUrl } from '../../components/settings/settings.api'
import { getServerUrl, API_TIMEOUT } from '../../config'
import { logError } from '../../utils/errorHandler'

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
			// Log error details in development mode
			logError(error, 'API Request')
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

// Export the API client instance getter
export default getApiClient
