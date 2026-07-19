import { getApiClient } from '@/core/api'
import { Platform } from 'react-native'
import { secureSetItem, secureGetItem, secureRemoveItem, setToken, getToken, removeToken, multiRemove, clearStorageExceptSavedAuths, setCacheItem } from '@/core/storage'
import { log } from '@/core/log'
import { registerForExpoPush, saveExpoPushTokenInSession } from '@/features/notifications/notifications.api'

// Default settings
const defaultAuthSettings = {
	tokenStorageKey: 'authToken',
	refreshTokenStorageKey: 'refreshToken',
	enableAutoSignOut: false,
	sessionTimeout: 30 * 60 * 1000 // 30 minutes
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
		log({
			level: 'error',
			label: 'auth.api',
			message: 'Error storing user data',
			error
		})
		return false
	}
}

// Session timer
type Timer = ReturnType<typeof setTimeout>
let sessionTimer: Timer | null = null

// Saved authentications management
const SAVED_AUTHS_KEY = 'saved_authentications'

export interface SavedAuth {
	slug: string
	token: string
	lastSignIn: string
	name?: any // Can be object {en, tn_arab, etc} or string
	photoUrl?: string
	role?: string
	needPassword?: boolean
}

export const getSavedAuthentications = async (): Promise<SavedAuth[]> => {
	const saved = await secureGetItem(SAVED_AUTHS_KEY)
	return saved ? JSON.parse(saved) : []
}

export const saveAuthentication = async (slug: string, token: string, user?: any, needPassword?: boolean) => {
	const saved = await getSavedAuthentications()
	const filtered = saved.filter((a) => a.slug !== slug)

	const photoUrl = user?.media?.thumbnail?.url || user?.photoUrl || ''
	const displayName = user?.name || slug // Keep the full name object if present
	const role = user?.role || 'customer'

	const updated: SavedAuth[] = [
		{
			slug,
			token,
			lastSignIn: new Date().toISOString(),
			name: displayName,
			photoUrl,
			role,
			needPassword: !!needPassword
		},
		...filtered
	]
	await secureSetItem(SAVED_AUTHS_KEY, JSON.stringify(updated))
}

export const updateSavedAuthUser = async (slug: string, updates: { name?: any; photoUrl?: string; role?: string }) => {
	try {
		const saved = await getSavedAuthentications()
		let updated = false
		const nextSaved = saved.map((a) => {
			if (a.slug === slug) {
				updated = true
				return {
					...a,
					...updates
				}
			}
			return a
		})
		if (updated) {
			await secureSetItem(SAVED_AUTHS_KEY, JSON.stringify(nextSaved))
		}
	} catch (error) {
		log({ level: 'error', label: 'auth.api', message: 'Failed to update saved auth user details', error })
	}
}

export const deleteSavedAuthentication = async (slug: string) => {
	const saved = await getSavedAuthentications()
	const account = saved.find((a) => a.slug === slug)
	const token = account?.token

	if (token) {
		try {
			const apiClient = getApiClient()
			await apiClient.post(
				'/auth/signout',
				{},
				{
					headers: { Authorization: `Bearer ${token}` }
				}
			)
		} catch (error) {
			log({
				level: 'warn',
				label: 'auth.api',
				message: `Server signout failed for saved account @${slug}`,
				error
			})
		}
	}

	const updated = saved.filter((a) => a.slug !== slug)
	await secureSetItem(SAVED_AUTHS_KEY, JSON.stringify(updated))
}

const startSessionTimer = (callback: () => void, timeout: number): Timer => {
	if (sessionTimer) clearTimeout(sessionTimer)
	const timer = setTimeout(callback, timeout)
	sessionTimer = timer
	return timer
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
			name?: any
			role: string
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
			name: any
			role: string
			settings?: {
				lang: any
				currency: string
			}
		}
	}
	req?: {
		headers: Record<string, string>
	}
}

export const signIn = async (slug: string, password: string, saveAccount?: boolean, needPassword?: boolean): Promise<SignInResponse> => {
	try {
		log({
			level: 'info',
			label: 'auth.api',
			message: 'Calling signin API',
			data: { slug }
		})

		const apiClient = getApiClient()
		// Endpoint: /auth/signin
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
		await Promise.all([setToken(token), setUserData(user), ...(saveAccount ? [saveAuthentication(user.slug, token, user, needPassword)] : [])])

		log({
			level: 'info',
			label: 'auth.api',
			message: 'Authentication data stored successfully'
		})

		// Expo push notification
		try {
			const expoPushToken = await registerForExpoPush()
			log({
				level: 'info',
				label: 'auth.api',
				message: 'Expo push token',
				data: expoPushToken
			})
			if (expoPushToken) {
				await saveExpoPushTokenInSession(expoPushToken, token)
				await secureSetItem('expoPushToken', expoPushToken)
			}
		} catch (pushErr) {
			log({
				level: 'warn',
				label: 'auth.api',
				message: 'Failed to configure push notification during login',
				error: pushErr
			})
		}

		// Start session timer if auto-signout is enabled
		if (defaultAuthSettings.enableAutoSignOut) {
			if (sessionTimer) {
				clearTimeout(sessionTimer)
			}
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

export const signUp = async (slug: string, password: string, userData: Partial<AuthResponse['data']['user']> = {}, saveAccount?: boolean, needPassword?: boolean): Promise<AuthResponse> => {
	try {
		const apiClient = getApiClient()
		const response = await apiClient.post<AuthResponse>('/auth/signup', {
			slug,
			password,
			...userData
		})

		if (response.data?.data?.token) {
			const token = response.data.data.token
			await setToken(token)

			if (response.data.data.refreshToken) {
				await secureSetItem('refreshToken', response.data.data.refreshToken)
			}

			if (response.data.data.user) {
				const user = response.data.data.user
				await secureSetItem('userData', JSON.stringify(user))
				await secureSetItem('user._id', user._id)
				await secureSetItem('user.slug', user.slug)

				// Save account to saved authenticity list if requested
				if (saveAccount) {
					await saveAuthentication(user.slug, token, user, needPassword)
				}

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
		const profileResponse = await getMyProfile({
			headers: {
				skipAuthRedirect: 'true'
			}
		})

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
		if (sessionTimer) {
			clearTimeout(sessionTimer)
			sessionTimer = null
		}

		// Try to call the server signout endpoint if internet is available
		try {
			const token = await getToken()
			if (token) {
				const apiClient = getApiClient()
				// Endpoint: /auth/singout
				await apiClient.post(
					'/auth/singout',
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
			multiRemove(['authToken', 'userData', 'user._id', 'user.slug', 'lastActiveTime']),
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

		await clearStorageExceptSavedAuths()

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

// Get current cached user data
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
export const getMyProfile = async (config?: any) => {
	const response = await getApiClient().get('/users/my-profile', config)
	return response.data
}

// Update profile
export const updateMyProfile = async (data: any) => {
	const response = await getApiClient().patch('/users/my-profile', data)
	if (response.data?.data) {
		const user = response.data.data
		await setUserData(user)
		await setCacheItem('profile:me', user)
		if (user.slug) {
			await setCacheItem(`profile:${user.slug}`, user)
		}
		const photoUrl = user.media?.thumbnail?.url || user.photoUrl || ''
		const displayName = user.name || user.slug
		await updateSavedAuthUser(user.slug, {
			name: displayName,
			photoUrl,
			role: user.role
		})
	}
	return response.data
}
