import { getApiClient } from '../api'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Platform } from 'react-native'
import { secureSetItem, secureGetItem, secureRemoveItem, setToken, getToken, removeToken } from './storage'
import { log } from '../log'

// Default settings
const defaultAuthSettings = {
	tokenStorageKey: 'auth_token',
	refreshTokenStorageKey: 'refresh_token',
	enableAutoSignOut: false,
	sessionTimeout: 30 * 60 * 1000, // 30 minutes
	refreshTokenEndpoint: '/auth/refresh'
}

// Secure storage functions

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
		log({
			level: 'error',
			label: 'auth.api',
			message: 'Error storing user data',
			error
		})
		return false
	}
}

// Session timer functions
type Timer = ReturnType<typeof setTimeout>
let sessionTimer: Timer | null = null

// Saved authentications management
const SAVED_AUTHS_KEY = 'saved_authentications'

export interface SavedAuth {
	slug: string
	token: string
	lastSignIn: string
}

export const getSavedAuthentications = async (): Promise<SavedAuth[]> => {
	const saved = await secureGetItem(SAVED_AUTHS_KEY)
	return saved ? JSON.parse(saved) : []
}

export const saveAuthentication = async (slug: string, token: string) => {
	const saved = await getSavedAuthentications()
	const filtered = saved.filter((a) => a.slug !== slug)
	const updated = [
		{
			slug,
			token,
			lastSignIn: new Date().toISOString()
		},
		...filtered
	]
	await secureSetItem(SAVED_AUTHS_KEY, JSON.stringify(updated))
}

export const deleteSavedAuthentication = async (slug: string) => {
	const saved = await getSavedAuthentications()
	const updated = saved.filter((a) => a.slug !== slug)
	await secureSetItem(SAVED_AUTHS_KEY, JSON.stringify(updated))
}

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
		log({
			level: 'error',
			label: 'auth.api',
			message: 'Error checking token expiration',
			error
		})
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
		log({
			level: 'info',
			label: 'auth.api',
			message: 'Calling signin API',
			data: { slug }
		})

		const apiClient = getApiClient()
		const response = await apiClient.post<SignInResponse>('/auth/signin', { slug, password })

		log({
			level: 'debug',
			label: 'auth.api',
			message: 'Signin API response',
			data: {
				status: response.status,
				hasToken: !!response.data?.data?.token,
				hasUser: !!response.data?.data?.user
			}
		})

		if (!response.data?.data?.token) {
			log({
				level: 'error',
				label: 'auth.api',
				message: 'No token in response',
				data: response.data
			})
			throw new Error('No authentication token received from server')
		}

		const { token, user } = response.data.data

		// Store token and user data
		await Promise.all([setToken(token), setUserData(user), saveAuthentication(user.slug, token)])

		log({
			level: 'info',
			label: 'auth.api',
			message: 'Authentication data stored successfully'
		})

		// Start session timer if auto-signout is enabled
		if (defaultAuthSettings.enableAutoSignOut) {
			if (sessionTimer) {
				clearTimeout(sessionTimer)
				log({
					level: 'debug',
					label: 'auth.api',
					message: 'Cleared existing session timer'
				})
			}

			log({
				level: 'debug',
				label: 'auth.api',
				message: 'Starting new session timer'
			})
			sessionTimer = startSessionTimer(() => {
				log({
					level: 'info',
					label: 'auth.api',
					message: 'Session timeout - signing out'
				})
				signOut()
			}, defaultAuthSettings.sessionTimeout)
		}

		return response.data
	} catch (error: any) {
		const status = error.response?.status
		if (status !== 401 && status !== 404 && status !== 409) {
			log({
				level: 'error',
				label: 'auth.api',
				message: 'Sign in error details',
				error,
				data: {
					message: error.message,
					response: error.response?.data,
					status,
					code: error.code
				}
			})
		}
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
		log({
			level: 'error',
			label: 'auth.api',
			message: 'Sign up error',
			error
		})
		throw error
	}
}

export const signInWithToken = async (token: string): Promise<boolean> => {
	try {
		await setToken(token)
		const profileResponse = await getMyProfile()

		if (profileResponse && profileResponse.data) {
			await setUserData(profileResponse.data)
			return true
		}
		return false
	} catch (error) {
		log({
			level: 'error',
			label: 'auth.api',
			message: 'Sign in with token failed',
			error
		})
		await removeToken()
		return false
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
			log({
				level: 'warn',
				label: 'auth.api',
				message: 'Server signout failed (offline mode)',
				error
			})
		}

		// Clear all auth-related data
		await Promise.all([
			removeToken(),
			secureRemoveItem('refreshToken'),
			secureRemoveItem('userData'),
			secureRemoveItem('user._id'),
			secureRemoveItem('user.slug'),
			// Clear any other auth-related data
			AsyncStorage.multiRemove(['authToken', 'userData', 'user._id', 'user.slug', 'lastActiveTime']),
			secureRemoveItem('authToken'),
			secureRemoveItem('userData'),
			secureRemoveItem('user._id'),
			secureRemoveItem('user.slug')
		])

		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'auth.api',
			message: 'Error during sign out',
			error
		})
		return false
	}
}

export const switchUser = async (): Promise<boolean> => {
	try {
		if (sessionTimer) {
			clearTimeout(sessionTimer)
			sessionTimer = null
		}

		if (Platform.OS === 'web') {
			// On web, SecureStorage is actually AsyncStorage.
			// We must be surgical to keep the saved_authentications.
			const allKeys = await AsyncStorage.getAllKeys()
			const keysToRemove = allKeys.filter((key) => key !== SAVED_AUTHS_KEY)
			await AsyncStorage.multiRemove(keysToRemove)
		} else {
			// On mobile, they are separate. We can clear AsyncStorage completely.
			await AsyncStorage.clear()
			// And remove specific session keys from SecureStore
			await Promise.all([removeToken(), secureRemoveItem('refreshToken'), secureRemoveItem('userData'), secureRemoveItem('user._id'), secureRemoveItem('user.slug')])
		}

		return true
	} catch (error) {
		log({
			level: 'error',
			label: 'auth.api',
			message: 'Error during switch user',
			error
		})
		return false
	}
}

// Token refresh functionality
export const refreshAuthToken = async (): Promise<string | null> => {
	try {
		const storedRefreshToken = await secureGetItem(defaultAuthSettings.refreshTokenStorageKey)

		if (!storedRefreshToken) {
			log({
				level: 'debug',
				label: 'auth.api',
				message: 'No refresh token found during refresh'
			})
			return null
		}

		log({
			level: 'debug',
			label: 'auth.api',
			message: 'Refreshing auth token...'
		})

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
		log({
			level: 'error',
			label: 'auth.api',
			message: 'Error refreshing token',
			error
		})
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
		log({
			level: 'error',
			label: 'auth.api',
			message: 'Authentication check failed',
			error
		})
		return false
	}
}

// Get current user data
export const getCurrentUser = async (): Promise<any> => {
	try {
		const userData = await secureGetItem('userData')
		return userData ? JSON.parse(userData) : null
	} catch (error) {
		log({
			level: 'error',
			label: 'auth.api',
			message: 'Error getting user data',
			error
		})
		return null
	}
}

// Simple check if user is authenticated (token exists)
export const checkAuth = async (): Promise<boolean> => {
	const token = await getToken()
	return !!token
}

// Get current full profile from API
export const getMyProfile = async () => {
	const response = await getApiClient().get('/users/my-profile')
	return response.data
}

// Update profile
export const updateMyProfile = async (data: any) => {
	const response = await getApiClient().patch('/users/my-profile', data)
	if (response.data?.data) {
		await setUserData(response.data.data)
	}
	return response.data
}
