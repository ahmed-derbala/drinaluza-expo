import { translate } from '@/core/translation'
import { log } from '@/core/log'

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
	// 1. Axios errors with response (Server was reached)
	if (error.response) {
		const status = error.response.status
		const data = error.response.data

		switch (status) {
			case 400:
				return {
					title: translate('invalid_request_title', 'Invalid Request'),
					message: data?.message || translate('invalid_request_message', 'The request was invalid. Please try again.'),
					type: 'client',
					statusCode: status,
					canRetry: false
				}
			case 401:
				return {
					title: translate('auth_required_title', 'Authentication Required'),
					message: translate('auth_required_message', 'Please log in to continue.'),
					type: 'client',
					statusCode: status,
					canRetry: false
				}
			case 403:
				return {
					title: translate('access_denied_title', 'Access Denied'),
					message: translate('access_denied_message', 'You do not have permission to access this resource.'),
					type: 'client',
					statusCode: status,
					canRetry: false
				}
			case 404:
				return {
					title: translate('not_found_title', 'Not Found'),
					message: translate('not_found_message', 'The requested resource was not found.'),
					type: 'client',
					statusCode: status,
					canRetry: false
				}
			case 408:
			case 499: {
				const isCloudinaryTimeout = data?.name === 'TimeoutError' || data?.message?.toLowerCase().includes('timeout')
				return {
					title: isCloudinaryTimeout ? translate('timeout_title', 'Connection Timeout') : translate('server_error_title', 'Server Error'),
					message: isCloudinaryTimeout
						? 'Media service is temporarily unavailable (Cloudinary free plan limit or timeout). Please try again in a few minutes or use a smaller image.'
						: data?.message || translate('timeout_message', 'The request took too long. Please check your internet connection and try again.'),
					type: 'timeout',
					statusCode: status,
					canRetry: true
				}
			}
			case 429:
				return {
					title: translate('rate_limit_title', 'Too Many Requests'),
					message: translate('rate_limit_message', 'Please wait a moment and try again.'),
					type: 'client',
					statusCode: status,
					canRetry: true
				}
			case 500:
			case 502:
			case 503:
			case 504:
				return {
					title: translate('server_error_title', 'Server Error'),
					message: data?.message || translate('server_error_message', 'The server encountered an error. Please try again later.'),
					type: 'server',
					statusCode: status,
					canRetry: true
				}
			default:
				return {
					title: status >= 500 ? translate('server_error_title', 'Server Error') : translate('error', 'Error'),
					message: data?.message || translate('unknown_error_message', 'An unexpected response was received.'),
					type: status >= 500 ? 'server' : 'client',
					statusCode: status,
					canRetry: status >= 500 || status === 499 || status === 408 || status === 429
				}
		}
	}

	// 2. Connection Timeout
	if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
		return {
			title: translate('timeout_title', 'Connection Timeout'),
			message: translate('timeout_message', 'The request took too long. Please check your internet connection and try again.'),
			type: 'timeout',
			canRetry: true
		}
	}

	// 3. Network Errors (No response received - server unreachable)
	if (error.request || error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
		// Distinguish Android dev build Network Error that is actually a 499/timeout where response was dropped
		const isLikelyCloudinaryTimeout = error.config?.url?.includes('/files/upload')
		return {
			title: translate('network_error_title', 'Network Error'),
			message: isLikelyCloudinaryTimeout
				? 'Media upload failed to reach the server (Cloudinary timeout). The free plan may be temporarily limited — try a smaller file or try again later.'
				: translate('network_error_message', 'Network connection failed. Please check your internet connection and try again.'),
			type: 'network',
			canRetry: true
		}
	}

	// 4. Something else happened
	return {
		title: translate('unknown_error_title', 'Error'),
		message: error.message || translate('unknown_error_message', 'An unexpected error occurred.'),
		type: 'unknown',
		canRetry: true
	}
}

/**
 * Log error details for debugging (only in development)
 */
export const logError = (error: any, context?: string) => {
	if (__DEV__) {
		const requestConfig = error.config
			? {
					url: error.config.url,
					method: error.config.method,
					baseURL: error.config.baseURL,
					timeout: error.config.timeout
				}
			: undefined

		const responseInfo = error.response
			? {
					status: error.response.status,
					data: error.response.data,
					headers: error.response.headers
				}
			: undefined

		const errorInfo = parseError(error)

		log({
			level: 'error',
			label: context || 'errorHandler',
			message: error.message || 'Error occurred',
			error,
			data: {
				requestConfig,
				responseInfo,
				parsedInfo: errorInfo
			}
		})
	}
}
