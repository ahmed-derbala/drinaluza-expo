import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react'
import { getCurrentUser } from '../core/auth/auth.api'
import { UserData } from '../components/profile/profile.interface'
import { LocalizedName } from '../components/shops/shops.interface'
import { translate as translateHelper, setGlobalAppLang } from '../constants/translations'

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
	formatPrice: () => ''
})

export const useUser = () => useContext(UserContext)

interface UserProviderProps {
	children: ReactNode
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
	const [user, setUser] = useState<UserData | null>(null)
	const [loading, setLoading] = useState(true)

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

	// Derived settings
	const appLang = user?.settings?.lang?.app || DEFAULT_APP_LANG
	const contentLang = user?.settings?.lang?.content || DEFAULT_CONTENT_LANG
	const currency = user?.settings?.currency || DEFAULT_CURRENCY

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
				formatPrice
			}}
		>
			{children}
		</UserContext.Provider>
	)
}
