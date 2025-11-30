import { AxiosError } from 'axios'
import { Alert } from 'react-native'

export interface ErrorInfo {
	title: string
	message: string
	type: 'network' | 'server' | 'client' | 'timeout' | 'unknown'
	statusCode?: number
	canRetry: boolean
}

/**
 * Parse an error and return user-friendly error information
 */
export const parseError = (error: any): ErrorInfo => {
	// Network errors
	if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
		return {
			title: 'Connection Timeout',
			message: 'The request took too long. Please check your internet connection and try again.',
			type: 'timeout',
			canRetry: true
		}
	}

	if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
		return {
			title: 'Network Error',
			message: 'Unable to connect to the server. Please check your internet connection or server settings.',
			type: 'network',
			canRetry: true
		}
	}

	// Axios errors with response
	if (error.response) {
		const status = error.response.status
		const data = error.response.data

		switch (status) {
			case 400:
				return {
					title: 'Invalid Request',
					message: data?.message || 'The request was invalid. Please try again.',
					type: 'client',
					statusCode: status,
					canRetry: false
				}
			case 401:
				return {
					title: 'Authentication Required',
					message: 'Please log in to continue.',
					type: 'client',
					statusCode: status,
					canRetry: false
				}
			case 403:
				return {
					title: 'Access Denied',
					message: 'You do not have permission to access this resource.',
					type: 'client',
					statusCode: status,
					canRetry: false
				}
			case 404:
				return {
					title: 'Not Found',
					message: 'The requested resource was not found.',
					type: 'client',
					statusCode: status,
					canRetry: false
				}
			case 500:
			case 502:
			case 503:
			case 504:
				return {
					title: 'Server Error',
					message: 'The server encountered an error. Please try again later.',
					type: 'server',
					statusCode: status,
					canRetry: true
				}
			default:
				return {
					title: 'Error',
					message: data?.message || 'An unexpected error occurred.',
					type: 'unknown',
					statusCode: status,
					canRetry: true
				}
		}
	}

	// Request was made but no response
	if (error.request) {
		return {
			title: 'No Response',
			message: 'The server is not responding. Please check if the server is running.',
			type: 'network',
			canRetry: true
		}
	}

	// Something else happened
	return {
		title: 'Error',
		message: error.message || 'An unexpected error occurred.',
		type: 'unknown',
		canRetry: true
	}
}

/**
 * Show an alert dialog for an error
 */
export const showErrorAlert = (error: any, onRetry?: () => void) => {
	const errorInfo = parseError(error)

	const buttons =
		errorInfo.canRetry && onRetry
			? [
					{ text: 'Cancel', style: 'cancel' as const },
					{ text: 'Retry', onPress: onRetry }
				]
			: [{ text: 'OK' }]

	Alert.alert(errorInfo.title, errorInfo.message, buttons)
}

/**
 * Log error details for debugging (only in development)
 */
export const logError = (error: any, context?: string) => {
	if (__DEV__) {
		console.group(`🔴 Error${context ? ` in ${context}` : ''}`)
		console.error('Error object:', error)

		if (error.config) {
			console.log('Request config:', {
				url: error.config.url,
				method: error.config.method,
				baseURL: error.config.baseURL,
				timeout: error.config.timeout
			})
		}

		if (error.response) {
			console.log('Response:', {
				status: error.response.status,
				data: error.response.data,
				headers: error.response.headers
			})
		}

		const errorInfo = parseError(error)
		console.log('Parsed error info:', errorInfo)
		console.groupEnd()
	}
}
