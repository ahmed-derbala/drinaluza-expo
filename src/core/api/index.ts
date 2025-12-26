import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig, AxiosRequestConfig } from 'axios'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { secureGetItem, secureRemoveItem } from '../auth/auth.api'
import { API_TIMEOUT, API_URL, API_PREFIX } from '../../config'
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
				const token = await AsyncStorage.getItem('authToken')

				// Don't show modal if:
				// 1. We don't have a token (never logged in or manually cleared)
				// 2. We ARE the auth request itself
				// 3. We are already on the auth page
				const url = error.config?.url || ''
				const isAuthRequest = url.includes('/auth/') || url.includes('signin') || url.includes('signup')

				let isOnAuthPage = false
				// @ts-ignore - Check window for Web environment
				if (typeof window !== 'undefined' && window.location) {
					const path = (window.location.pathname + window.location.hash).toLowerCase()
					isOnAuthPage = path.includes('/auth') || path === '/' || path === '/#' || path === '#/'
				}

				if (!token || isAuthRequest || isOnAuthPage) {
					// If no token, just clear and reject without showing modal
					if (!token) await secureRemoveItem('authToken')
					return Promise.reject(error)
				}

				try {
					// Import the auth state manager dynamically to avoid circular dependencies
					const { authStateManager } = await import('../../stores/authStore')

					// Show the auth required modal
					authStateManager.showAuthModal('Your session has expired. Please sign in again to continue.')

					// Clear auth token from storage
					await secureRemoveItem('authToken')
				} catch (err) {
					console.error('Error handling 401:', err)
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
const apiClient = createApiClient(API_URL || `http://localhost:5001${API_PREFIX}`)

// Function to get the current API client
export const getApiClient = (): AxiosInstance => apiClient

// Export the API client instance getter
export default getApiClient
