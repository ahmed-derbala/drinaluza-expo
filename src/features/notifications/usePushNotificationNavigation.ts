import { useEffect } from 'react'
import { useRouter } from 'expo-router'
import { Platform } from 'react-native'
import { log } from '@/core/log'

const NAVIGATION_COOLDOWN_MS = 500

let lastNavigationAt = 0

export const usePushNotificationNavigation = () => {
	const router = useRouter()

	useEffect(() => {
		if (Platform.OS === 'web') {
			// Push notifications are not supported on web
			return
		}

		let isActive = true
		let subscription: any = null

		const navigateToScreen = (screen?: string) => {
			if (!screen) return
			const now = Date.now()
			if (now - lastNavigationAt < NAVIGATION_COOLDOWN_MS) return
			lastNavigationAt = now

			try {
				router.push(screen as any)
			} catch (error) {
				log({ level: 'error', label: 'PushNotification', message: 'Failed to navigate to screen', error, data: { screen } })
			}
		}

		const handleResponse = (response: any) => {
			const screen = response?.notification?.request?.content?.data?.screen
			if (typeof screen === 'string') {
				navigateToScreen(screen)
			}
		}

		const setup = async () => {
			try {
				const Notifications = require('expo-notifications')

				// Handle the notification that launched the app
				const lastResponse = await Notifications.getLastNotificationResponseAsync()
				if (isActive && lastResponse) {
					handleResponse(lastResponse)
				}

				// Handle future notification taps while the app is running
				subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
					handleResponse(response)
				})
			} catch (error) {
				log({ level: 'error', label: 'PushNotification', message: 'Failed to set up push notification navigation', error })
			}
		}

		setup()

		return () => {
			isActive = false
			if (subscription?.remove) {
				subscription.remove()
			}
		}
	}, [router])
}
