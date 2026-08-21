import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios'
import { router } from 'expo-router'
import { secureGetItem, secureRemoveItem } from '@/core/storage'
import { config } from '@/config'
import { logError } from '@/core/error/errorHandler'
import { log } from '@/core/log'
import { ConnectionService } from '@/core/connection'

// Create an API client with the given base URL
const createApiClient = (baseURL: string): AxiosInstance => {
	const client = axios.create({
		baseURL,
		headers: {
			'Content-Type': 'application/json'
		},
		timeout: config.api.timeout
	})

	client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
		// Skip token injection if skipAuth flag is set (for anonymous requests)
		// @ts-ignore - Custom header flag
		if (config.headers?.skipAuth) {
			// Remove the skipAuth header before sending the request
			// @ts-ignore
			delete config.headers.skipAuth
			return config
		}

		const token = await secureGetItem('authToken')
		if (token && config.headers) {
			// Set both Authorization and token headers for compatibility
			config.headers.Authorization = `Bearer ${token}`
			// @ts-ignore - Axios headers can be set directly
			config.headers.token = token
		}
		return config
	})

	// Add response interceptor for better error handling and backend health tracking
	client.interceptors.response.use(
		(response: AxiosResponse) => {
			ConnectionService.reportApiSuccess()
			return response
		},
		async (error: AxiosError) => {
			const status = error.response?.status
			const isNetworkError = !error.response
			const isRateLimited = status === 429

			// Report API success/failure appropriately
			if (error.response && !isRateLimited) {
				ConnectionService.reportApiSuccess()
			} else {
				// Network errors or rate limiting (429) should be reported as failures
				ConnectionService.reportApiFailure(error)
			}

			// Log error details in development mode, but avoid noise for expected
			// transient conditions (offline backend, timeouts).

			// Log 429 errors specifically for debugging rate limiting issues
			if (isRateLimited) {
				log({
					level: 'warn',
					label: 'api',
					message: `Rate limited (429) - URL: ${error.config?.url || 'unknown'}, Method: ${error.config?.method || 'unknown'}`,
					error: error
				})
			} else if (!isNetworkError && status !== 401 && status !== 404 && status !== 409) {
				logError(error, 'API Request')
			}

			// Handle 401 Unauthorized errors globally
			if (error.response?.status === 401) {
				const url = error.config?.url || ''
				const isAuthRequest = url.includes('/auth/') || url.includes('signin') || url.includes('signup')

				// Support skipping auth redirect (e.g. for quick-switch token checks on login screen)
				// Axios header names might be case-insensitive/normalized depending on config
				const headers = error.config?.headers
				const skipAuthRedirect = headers?.skipAuthRedirect === 'true' || headers?.skipauthredirect === 'true'

				let isOnAuthPage = false
				// @ts-ignore - Check window for Web environment
				if (typeof window !== 'undefined' && window.location) {
					const path = (window.location.pathname + window.location.hash).toLowerCase()
					isOnAuthPage = path.includes('/auth')
				}

				try {
					// Clear auth token from storage
					await secureRemoveItem('authToken')

					// Navigate to auth page if not already there
					if (!isOnAuthPage && !isAuthRequest && !skipAuthRedirect) {
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
const apiClient = createApiClient(config.api.url || `${config.backend.url}${config.api.prefix}`)

// Function to get the current API client
export const getApiClient = (): AxiosInstance => apiClient

// Export the API client instance getter
export default getApiClient
