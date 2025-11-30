import { getApiClient } from '../api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import * as Keychain from 'react-native-keychain'
import { Platform } from 'react-native'

// Default settings
const defaultAuthSettings = {
	tokenStorageKey: 'auth_token',
	refreshTokenStorageKey: 'refresh_token',
	enableAutoSignOut: false,
	sessionTimeout: 30 * 60 * 1000, // 30 minutes
	refreshTokenEndpoint: '/auth/refresh'
}

// Secure storage functions - using only AsyncStorage for now
const secureSetItem = async (key: string, value: string): Promise<boolean> => {
	try {
		await AsyncStorage.setItem(key, value)
		return true
	} catch (error) {
		console.error('Error storing item:', error)
		return false
	}
}

const secureGetItem = async (key: string): Promise<string | null> => {
	try {
		return await AsyncStorage.getItem(key)
	} catch (error) {
		console.error('Error getting item:', error)
		return null
	}
}

const secureRemoveItem = async (key: string): Promise<boolean> => {
	try {
		await AsyncStorage.removeItem(key)
		return true
	} catch (error) {
		console.error('Error removing item:', error)
		return false
	}
}

// Helper to set user data
const setUserData = async (user: any): Promise<boolean> => {
	try {
		await Promise.all([
			secureSetItem('userData', JSON.stringify(user)),
			secureSetItem('user._id', user._id),
			secureSetItem('user.slug', user.slug),
			...(user.settings ? [secureSetItem('user.settings', JSON.stringify(user.settings))] : [])
		])
		return true
	} catch (error) {
		console.error('Error storing user data:', error)
		return false
	}
}

// Token management
const getToken = async (): Promise<string | null> => {
	return await secureGetItem('authToken')
}

const setToken = async (token: string): Promise<boolean> => {
	return await secureSetItem('authToken', token)
}

const removeToken = async (): Promise<boolean> => {
	return await secureRemoveItem('authToken')
}

// Session timer functions
type Timer = ReturnType<typeof setTimeout>
let sessionTimer: Timer | null = null

const startSessionTimer = (callback: () => void, timeout: number): Timer => {
	if (sessionTimer) clearTimeout(sessionTimer)
	const timer = setTimeout(callback, timeout)
	sessionTimer = timer
	return timer
}

const resetSessionTimer = (callback: () => void, timeout: number): void => {
	if (sessionTimer) clearTimeout(sessionTimer)
	sessionTimer = startSessionTimer(callback, timeout)
}

// Token expiration check
const isTokenExpired = (token: string): boolean => {
	try {
		const payload = JSON.parse(atob(token.split('.')[1]))
		return payload.exp * 1000 < Date.now()
	} catch (error) {
		console.error('Error checking token expiration:', error)
		return true
	}
}

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

interface SignInResponse {
	status: number
	data: {
		token: string
		user: {
			_id: string
			slug: string
			name: string
			role: string
			settings?: {
				lang: string
				currency: string
			}
		}
	}
	req: {
		headers: Record<string, string>
	}
}

export const signIn = async (slug: string, password: string): Promise<SignInResponse> => {
	try {
		console.log('Calling signin API with:', { slug })

		const apiClient = getApiClient()
		const response = await apiClient.post<SignInResponse>('/auth/signin', { slug, password })

		console.log('Signin API response:', {
			status: response.status,
			hasToken: !!response.data?.data?.token,
			hasUser: !!response.data?.data?.user
		})

		if (!response.data?.data?.token) {
			console.error('No token in response:', response.data)
			throw new Error('No authentication token received from server')
		}

		const { token, user } = response.data.data

		// Store token and user data
		await Promise.all([setToken(token), setUserData(user)])

		console.log('Authentication data stored successfully')

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
		const apiClient = getApiClient()
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
				await getApiClient().post(
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
		const storedRefreshToken = await secureGetItem(defaultAuthSettings.refreshTokenStorageKey)

		if (!storedRefreshToken) {
			console.log('No refresh token found')
			return null
		}

		console.log('Refreshing auth token...')

		const apiClient = getApiClient()
		const response = await apiClient.post<{ token: string; refreshToken?: string }>(defaultAuthSettings.refreshTokenEndpoint, { refreshToken: storedRefreshToken })

		if (response.data?.token) {
			await setToken(response.data.token)

			// If a new refresh token is provided, store it
			if (response.data.refreshToken) {
				await secureSetItem(defaultAuthSettings.refreshTokenStorageKey, response.data.refreshToken)
				await secureSetItem('refreshToken', response.data.refreshToken)
			}

			return response.data.token
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

// Simple check if user is authenticated (token exists)
export const checkAuth = async (): Promise<boolean> => {
	const token = await getToken()
	return !!token
}
