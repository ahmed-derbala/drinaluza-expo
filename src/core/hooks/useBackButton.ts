import { useEffect } from 'react'
import { BackHandler } from 'react-native'
import { useRouter } from 'expo-router'

/**
 * Hook to handle the hardware back button on Android.
 * If a custom handler is provided, it will be used.
 * Otherwise, it will try to go back using router.back(),
 * and if not possible, it will navigate to a fallback route (defaulting to /home/feed).
 */
export const useBackButton = (handler?: () => boolean, fallback: string = '/home/feed') => {
	const router = useRouter()

	useEffect(() => {
		const onBackPress = () => {
			if (handler) {
				return handler()
			}

			if (router.canGoBack()) {
				router.back()
				return true
			} else {
				// If we can't go back, navigate to fallback to avoid exiting the app
				// in unexpected places (like after a router.replace)
				router.replace(fallback as any)
				return true
			}
		}

		const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress)

		return () => backHandler.remove()
	}, [handler, fallback, router])
}
