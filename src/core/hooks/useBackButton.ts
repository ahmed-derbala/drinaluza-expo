import { useEffect } from 'react'
import { BackHandler, Platform } from 'react-native'
import { useRouter } from 'expo-router'

/**
 * Hook to handle the hardware back button on Android.
 * If a custom handler is provided, it will be used.
 * Otherwise, it will try to go back using router.back(),
 * then fallback to browser history on web,
 * and if not possible, it will navigate to a fallback route (defaulting to /home/feed).
 */
export const useBackButton = (handler?: () => boolean, fallback: string = '/(home)/feed') => {
	const router = useRouter()

	useEffect(() => {
		const onBackPress = () => {
			if (handler) {
				return handler()
			}

			if (router.canGoBack()) {
				router.back()
				return true
			}

			// On web, try browser history as a fallback
			if (Platform.OS === 'web' && typeof window !== 'undefined' && window.history?.length > 1) {
				window.history.back()
				return true
			}

			// If we can't go back, navigate to fallback to avoid exiting the app
			// in unexpected places (like after a router.replace)
			router.replace(fallback as any)
			return true
		}

		const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress)

		return () => backHandler.remove()
	}, [handler, fallback, router])
}
