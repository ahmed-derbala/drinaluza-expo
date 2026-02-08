import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { getCurrentUser } from '../auth/auth.api'
import { UserData } from '../../components/profile/profile.interface'
import { LocalizedName } from '../../components/shops/shops.interface'
import { translate as translateHelper, setGlobalAppLang } from '../../config/translations'

interface UserContextType {
	user: UserData | null
	loading: boolean
	refreshUser: () => Promise<void>
	appLang: string
	contentLang: string
	currency: string
	localize: (name?: LocalizedName) => string
	translate: (key: string, defaultText?: string) => string
	formatPrice: (price: any) => string
	setAppLang: (lang: string) => void
	setContentLang: (lang: string) => void
	setCurrency: (currency: string) => void
}

const DEFAULT_APP_LANG = 'en'
const DEFAULT_CONTENT_LANG = 'en'
const DEFAULT_CURRENCY = 'tnd'

const UserContext = createContext<UserContextType>({
	user: null,
	loading: true,
	refreshUser: async () => {},
	appLang: DEFAULT_APP_LANG,
	contentLang: DEFAULT_CONTENT_LANG,
	currency: DEFAULT_CURRENCY,
	localize: () => '',
	translate: (key: string, defaultText?: string) => defaultText || key,
	formatPrice: () => '',
	setAppLang: () => {},
	setContentLang: () => {},
	setCurrency: () => {}
})

export const useUser = () => useContext(UserContext)

interface UserProviderProps {
	children: ReactNode
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
	const [user, setUser] = useState<UserData | null>(null)
	const [loading, setLoading] = useState(true)
	const [guestSettings, setGuestSettings] = useState({
		appLang: DEFAULT_APP_LANG,
		contentLang: DEFAULT_CONTENT_LANG,
		currency: DEFAULT_CURRENCY
	})

	// Load guest settings from storage
	useEffect(() => {
		const loadSettings = async () => {
			try {
				const [savedAppLang, savedContentLang, savedCurrency] = await Promise.all([
					import('@react-native-async-storage/async-storage').then((m) => m.default.getItem('guest_appLang')),
					import('@react-native-async-storage/async-storage').then((m) => m.default.getItem('guest_contentLang')),
					import('@react-native-async-storage/async-storage').then((m) => m.default.getItem('guest_currency'))
				])

				setGuestSettings({
					appLang: savedAppLang || DEFAULT_APP_LANG,
					contentLang: savedContentLang || DEFAULT_CONTENT_LANG,
					currency: savedCurrency || DEFAULT_CURRENCY
				})
			} catch (e) {
				console.error('Failed to load guest settings', e)
			}
		}
		loadSettings()
	}, [])

	const setAppLang = useCallback(async (lang: string) => {
		setGuestSettings((prev) => ({ ...prev, appLang: lang }))
		const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
		await AsyncStorage.setItem('guest_appLang', lang)
	}, [])

	const setContentLang = useCallback(async (lang: string) => {
		setGuestSettings((prev) => ({ ...prev, contentLang: lang }))
		const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
		await AsyncStorage.setItem('guest_contentLang', lang)
	}, [])

	const setCurrency = useCallback(async (currency: string) => {
		setGuestSettings((prev) => ({ ...prev, currency: currency }))
		const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default
		await AsyncStorage.setItem('guest_currency', currency)
	}, [])

	const loadUser = useCallback(async () => {
		try {
			const userData = await getCurrentUser()
			setUser(userData)
		} catch (error) {
			console.error('Failed to load user:', error)
		} finally {
			setLoading(false)
		}
	}, [])

	useEffect(() => {
		loadUser()
	}, [loadUser])

	const refreshUser = async () => {
		await loadUser()
	}

	// Derived settings - prioritize user profile, then guest settings, then defaults
	const appLang = user?.settings?.lang?.app || guestSettings.appLang
	const contentLang = user?.settings?.lang?.content || guestSettings.contentLang
	const currency = user?.settings?.currency || guestSettings.currency

	// Sync global language for non-React components
	useEffect(() => {
		setGlobalAppLang(appLang)
	}, [appLang])

	const translate = useCallback(
		(key: string, defaultText?: string): string => {
			return translateHelper(key, defaultText, appLang)
		},
		[appLang]
	)

	const localize = useCallback(
		(name?: LocalizedName): string => {
			if (!name) return ''
			// @ts-ignore
			return name[contentLang] || name[DEFAULT_CONTENT_LANG] || name['en'] || ''
		},
		[contentLang]
	)

	const formatPrice = useCallback(
		(price?: any): string => {
			if (!price) return ''

			const total = price.total || price
			if (!total || typeof total !== 'object') return ''

			// @ts-ignore
			const amount = total[currency]

			if (amount === undefined || amount === null) {
				// Fallback to TND if selected currency is not available
				const defaultAmount = total[DEFAULT_CURRENCY]
				if (defaultAmount !== undefined && defaultAmount !== null) {
					return `${Number(defaultAmount).toFixed(2)} ${DEFAULT_CURRENCY.toUpperCase()}`
				}
				return ''
			}

			return `${Number(amount).toFixed(2)} ${currency.toUpperCase()}`
		},
		[currency]
	)

	return (
		<UserContext.Provider
			value={{
				user,
				loading,
				refreshUser,
				appLang,
				contentLang,
				currency,
				localize,
				translate,
				formatPrice,
				setAppLang,
				setContentLang,
				setCurrency
			}}
		>
			{children}
		</UserContext.Provider>
	)
}
