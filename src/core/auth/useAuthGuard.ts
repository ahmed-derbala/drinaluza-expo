import { useEffect, useState } from 'react'
import { useRouter, type Href } from 'expo-router'
import { secureGetItem } from './storage'

interface AuthGuardOptions {
	requireAuth?: boolean
	allowedRoles?: string[]
	redirectTo?: Href
}

export function useAuthGuard(options: AuthGuardOptions = {}) {
	const { requireAuth = true, allowedRoles = [], redirectTo = '/auth' } = options
	const router = useRouter()
	const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
	const [userRole, setUserRole] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(true)

	useEffect(() => {
		const checkAuth = async () => {
			try {
				const token = await secureGetItem('authToken')
				const isAuth = !!token
				setIsAuthenticated(isAuth)

				if (isAuth) {
					const userData = await secureGetItem('userData')
					if (userData) {
						const user = JSON.parse(userData)
						const currentRole = user.role || null
						setUserRole(currentRole)

						// Check role-based access immediately with the fetched role
						if (allowedRoles.length > 0 && currentRole && !allowedRoles.includes(currentRole)) {
							router.replace('/(home)/feed') // or a dedicated "access denied" page
							return
						}
					}
				}

				// Redirect if auth is required but not authenticated
				if (requireAuth && !isAuth) {
					router.replace(redirectTo)
					return
				}
			} catch (error) {
				console.error('Auth check failed:', error)
				if (requireAuth) {
					router.replace(redirectTo)
				}
			} finally {
				setIsLoading(false)
			}
		}

		checkAuth()
	}, [requireAuth, allowedRoles, redirectTo, router])

	return { isAuthenticated, userRole, isLoading }
}
