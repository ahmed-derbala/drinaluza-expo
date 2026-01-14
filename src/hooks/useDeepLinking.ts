import { useEffect } from 'react'
import { Linking, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { DEEP_LINKING_CONFIG } from '../config/deepLinks'

export function useDeepLinking() {
	const router = useRouter()

	useEffect(() => {
		const handleDeepLink = (url: string) => {
			try {
				// Extract the path from the URL
				const parsedUrl = new URL(url)
				let path = parsedUrl.pathname

				// Handle scheme URLs (drinaluza://path)
				if (parsedUrl.protocol.includes('drinaluza')) {
					path = parsedUrl.host + parsedUrl.pathname
				}

				// Find matching route configuration
				const matchingRoute = Object.values(DEEP_LINKING_CONFIG.paths).find((config) => {
					if (config.exact) {
						return config.path === path
					}
					return path.startsWith(config.path)
				})

				if (matchingRoute) {
					// Convert path parameters to Expo Router format
					let routerPath = path

					// Replace :param with actual values for dynamic routes
					if (path.includes(':')) {
						// For dynamic routes, we need to handle them differently
						// This is a simplified version - you might want to enhance this
						const segments = path.split('/')
						routerPath = segments
							.map((segment) => {
								if (segment.startsWith(':')) {
									return segment.replace(':', '')
								}
								return segment
							})
							.join('/')
					}

					router.replace(routerPath as any)
				} else {
					Alert.alert('Invalid Link', 'This link is not supported in the app.')
				}
			} catch (error) {
				console.error('Deep link handling error:', error)
				Alert.alert('Error', 'Failed to open this link.')
			}
		}

		// Handle deep link when app is opened
		const subscription = Linking.addEventListener('url', ({ url }) => {
			handleDeepLink(url)
		})

		// Handle deep link when app is already open
		Linking.getInitialURL().then((url) => {
			if (url) {
				handleDeepLink(url)
			}
		})

		return () => {
			subscription.remove()
		}
	}, [router])
}
