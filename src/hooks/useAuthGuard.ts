import { useEffect, useState } from 'react'
import { useRouter, type Href } from 'expo-router'
import { secureGetItem } from '../core/auth/storage'

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
						setUserRole(user.role || null)
					}
				}

				// Redirect if auth is required but not authenticated
				if (requireAuth && !isAuth) {
					router.replace(redirectTo)
					return
				}

				// Check role-based access
				if (isAuth && allowedRoles.length > 0 && userRole && !allowedRoles.includes(userRole)) {
					router.replace('/home/feed') // or a dedicated "access denied" page
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
