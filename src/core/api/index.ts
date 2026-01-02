import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { router } from 'expo-router'
import { secureGetItem, secureRemoveItem } from '../auth/storage'
import { API_TIMEOUT, API_URL, API_PREFIX } from '../../config'
import { logError } from '../../utils/errorHandler'
import { log } from '../log'

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
		const token = await secureGetItem('authToken')
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
		async (error: AxiosError) => {
			// Log error details in development mode
			const status = error.response?.status
			if (status !== 401 && status !== 404 && status !== 409) {
				logError(error, 'API Request')
			}

			// Handle 401 Unauthorized errors globally
			if (error.response?.status === 401) {
				const url = error.config?.url || ''
				const isAuthRequest = url.includes('/auth/') || url.includes('signin') || url.includes('signup')

				let isOnAuthPage = false
				// @ts-ignore - Check window for Web environment
				if (typeof window !== 'undefined' && window.location) {
					const path = (window.location.pathname + window.location.hash).toLowerCase()
					isOnAuthPage = path.includes('/auth') || path === '/' || path === '/' || path === '#/'
				}

				try {
					// Clear auth token from storage
					await secureRemoveItem('authToken')

					// Navigate to auth page if not already there
					if (!isOnAuthPage && !isAuthRequest) {
						router.replace('/auth' as any)
					}
				} catch (err: any) {
					log({
						level: 'error',
						label: 'api',
						message: 'Error handling 401',
						error: err
					})
				}
			}

			return Promise.reject(error)
		}
	)

	return client
}

// Default API client instance
// If EXPO_PUBLIC_BACKEND_URL is not set, this might fail or default to undefined which axios handles strictly?
// Axios defaults to current origin if baseURL is undefined. That might be okay for web, but not for mobile.
// For now, allow undefined, but user said "use EXPO_PUBLIC_BACKEND_URL".
const apiClient = createApiClient(API_URL || `http://192.168.1.11:5001${API_PREFIX}`)

// Function to get the current API client
export const getApiClient = (): AxiosInstance => apiClient

// Export the API client instance getter
export default getApiClient
