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

// Secure storage functions
export const secureSetItem = async (key: string, value: string): Promise<boolean> => {
	try {
		if (Platform.OS === 'web') {
			await AsyncStorage.setItem(key, value)
		} else {
			try {
				await SecureStore.setItemAsync(key, value)
			} catch (e) {
				// Fallback to AsyncStorage if SecureStore fails
				await AsyncStorage.setItem(key, value)
			}
		}
		return true
	} catch (error) {
		console.error('Error storing item:', error)
		return false
	}
}

export const secureGetItem = async (key: string): Promise<string | null> => {
	try {
		if (Platform.OS === 'web') {
			return await AsyncStorage.getItem(key)
		} else {
			try {
				const value = await SecureStore.getItemAsync(key)
				if (value !== null) return value
				return await AsyncStorage.getItem(key)
			} catch (e) {
				return await AsyncStorage.getItem(key)
			}
		}
	} catch (error) {
		console.error('Error getting item:', error)
		return null
	}
}

export const secureRemoveItem = async (key: string): Promise<boolean> => {
	try {
		if (Platform.OS === 'web') {
			await AsyncStorage.removeItem(key)
		} else {
			try {
				await SecureStore.deleteItemAsync(key)
				await AsyncStorage.removeItem(key)
			} catch (e) {
				await AsyncStorage.removeItem(key)
			}
		}
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
		await Promise.all([setToken(token), setUserData(user), saveAuthentication(user.slug, token)])

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
		const status = error.response?.status
		if (status !== 401 && status !== 404 && status !== 409) {
			console.error('Sign in error details:', {
				message: error.message,
				response: error.response?.data,
				status,
				code: error.code
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
		console.error('Sign up error:', error)
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
		console.error('Sign in with token failed:', error)
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
			AsyncStorage.multiRemove(['authToken', 'userData', 'user._id', 'user.slug', 'lastActiveTime']),
			secureRemoveItem('authToken'),
			secureRemoveItem('userData'),
			secureRemoveItem('user._id'),
			secureRemoveItem('user.slug')
		])

		return true
	} catch (error) {
		console.error('Error during sign out:', error)
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
		console.error('Error during switch user:', error)
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
