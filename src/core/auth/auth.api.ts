import apiClient from '../api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getToken, setToken, removeToken, secureSetItem, secureGetItem, secureRemoveItem, startSessionTimer, resetSessionTimer, isTokenExpired, defaultAuthSettings } from './authSettings'

// Session timer reference
let sessionTimer: ReturnType<typeof setTimeout> | null = null

interface AuthResponse {
	data: {
		token: string
		refreshToken?: string
		user: {
			_id: string
			slug: string
			email?: string
			name?: string
			[key: string]: any
		}
	}
	[key: string]: any
}

export const signIn = async (slug: string, password: string): Promise<AuthResponse> => {
	try {
		console.log('Calling signin API with:', { slug })
		const response = await apiClient.post<AuthResponse>('/auth/signin', {
			slug,
			password
		})

		console.log('Signin API response:', {
			status: response.status,
			hasToken: !!response.data?.data?.token,
			hasUser: !!response.data?.data?.user
		})

		if (!response.data?.data?.token) {
			console.error('No token in response:', response.data)
			throw new Error('No authentication token received from server')
		}

		// Store tokens securely
		await secureSetItem('authToken', response.data.data.token)
		console.log('Auth token stored successfully')

		if (response.data.data.refreshToken) {
			await secureSetItem('refreshToken', response.data.data.refreshToken)
			console.log('Refresh token stored successfully')
		}

		// Store user data
		if (response.data.data.user) {
			const userData = response.data.data.user
			await Promise.all([secureSetItem('userData', JSON.stringify(userData)), secureSetItem('user._id', userData._id), secureSetItem('user.slug', userData.slug)])
			console.log('User data stored successfully')

			// Start session timer if auto-signout is enabled
			if (defaultAuthSettings.enableAutoSignOut) {
				if (sessionTimer) {
					clearTimeout(sessionTimer)
					console.log('Cleared existing session timer')
				}
				console.log('Starting new session timer')
				sessionTimer = startSessionTimer(() => {
					console.log('Session timeout - signing out')
					signOut()
				}, defaultAuthSettings.sessionTimeout)
			}
		}

		return response.data
	} catch (error: any) {
		console.error('Sign in error details:', {
			message: error.message,
			response: error.response?.data,
			status: error.response?.status,
			code: error.code,
			config: {
				url: error.config?.url,
				method: error.config?.method,
				data: error.config?.data,
				headers: error.config?.headers
			}
		})
		throw error
	}
}

export const signUp = async (slug: string, password: string, userData: Partial<AuthResponse['data']['user']> = {}): Promise<AuthResponse> => {
	try {
		const response = await apiClient.post<AuthResponse>('/auth/signup', {
			slug,
			password,
			...userData
		})

		if (response.data?.data?.token) {
			// Store tokens securely
			await setToken(response.data.data.token)

			if (response.data.data.refreshToken) {
				await secureSetItem('refreshToken', response.data.data.refreshToken)
			}

			// Store user data
			if (response.data.data.user) {
				const user = response.data.data.user
				await secureSetItem('userData', JSON.stringify(user))
				await secureSetItem('user._id', user._id)
				await secureSetItem('user.slug', user.slug)

				// Start session timer if auto-signout is enabled
				if (defaultAuthSettings.enableAutoSignOut) {
					if (sessionTimer) clearTimeout(sessionTimer)
					sessionTimer = startSessionTimer(() => signOut(), defaultAuthSettings.sessionTimeout)
				}
			}
		}

		return response.data
	} catch (error) {
		console.error('Sign up error:', error)
		throw error
	}
}

export const signOut = async (): Promise<boolean> => {
	try {
		// Clear session timer
		if (sessionTimer) {
			clearTimeout(sessionTimer)
			sessionTimer = null
		}

		// Try to call the server signout endpoint if internet is available
		try {
			const token = await getToken()
			if (token) {
				await apiClient.post(
					'/auth/signout',
					{},
					{
						headers: { Authorization: `Bearer ${token}` }
					}
				)
			}
		} catch (error) {
			console.log('Server signout failed (offline mode):', error)
		}

		// Clear all auth-related data
		await Promise.all([
			removeToken(),
			secureRemoveItem('refreshToken'),
			secureRemoveItem('userData'),
			secureRemoveItem('user._id'),
			secureRemoveItem('user.slug'),
			// Clear any other auth-related data
			AsyncStorage.multiRemove(['authToken', 'userData', 'user._id', 'user.slug', 'lastActiveTime'])
		])

		return true
	} catch (error) {
		console.error('Error during sign out:', error)
		return false
	}
}

// Token refresh functionality
export const refreshAuthToken = async (): Promise<string | null> => {
	try {
		const refreshToken = await secureGetItem('refreshToken')
		if (!refreshToken) {
			throw new Error('No refresh token available')
		}

		const response = await apiClient.post<{ data: { token: string; refreshToken?: string } }>(defaultAuthSettings.refreshTokenEndpoint, { refreshToken })

		if (response.data?.data?.token) {
			await setToken(response.data.data.token)

			// If a new refresh token is provided, store it
			if (response.data.data.refreshToken) {
				await secureSetItem('refreshToken', response.data.data.refreshToken)
			}

			return response.data.data.token
		}

		return null
	} catch (error) {
		console.error('Error refreshing token:', error)
		// If refresh fails, sign out the user
		await signOut()
		return null
	}
}

// Check if user is authenticated
export const isAuthenticated = async (): Promise<boolean> => {
	try {
		const token = await getToken()
		if (!token) return false

		// Check if token is expired
		if (isTokenExpired(token)) {
			// Try to refresh the token
			const newToken = await refreshAuthToken()
			return !!newToken
		}

		return true
	} catch (error) {
		console.error('Authentication check failed:', error)
		return false
	}
}

// Get current user data
export const getCurrentUser = async (): Promise<any> => {
	try {
		const userData = await secureGetItem('userData')
		return userData ? JSON.parse(userData) : null
	} catch (error) {
		console.error('Error getting user data:', error)
		return null
	}
}
