import { getApiClient } from '../../core/api'
import { NotificationResponse } from './notifications.interface'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'

export const getNotifications = async (page: number = 1, limit: number = 10): Promise<NotificationResponse> => {
	const response = await getApiClient().get<NotificationResponse>('/notifications', {
		params: {
			page,
			limit
		}
	})
	return response.data
}

// Helper to mark as seen
export const markNotificationSeen = async (notificationId: string): Promise<any> => {
	const response = await getApiClient().patch(`/notifications/${notificationId}`, {
		seenAt: new Date().toISOString()
	})
	return response.data
}

export async function registerForExpoPush() {
	try {
		// ❌ BLOCK WEB
		if (Platform.OS === 'web') {
			return null
		}

		// ❌ Expo Go on Android no longer supports remote push notifications (SDK 53+)
		// We use Constants.executionEnvironment to detect Expo Go
		const isExpoGo = Constants.executionEnvironment === 'storeClient'

		if (Platform.OS === 'android' && isExpoGo) {
			console.warn('[Push] Skipped: expo-notifications remote push is not supported in Expo Go on Android (SDK 53+). Use a development build instead.')
			return null
		}

		if (!Device.isDevice) {
			console.warn('[Push] Skipped: Must use a physical device for push notifications.')
			return null
		}

		// ✅ Use require() for true lazy loading to avoid Metro static analysis issues
		const Notifications = require('expo-notifications')

		const { status: existingStatus } = await Notifications.getPermissionsAsync()
		let finalStatus = existingStatus

		if (existingStatus !== 'granted') {
			const { status } = await Notifications.requestPermissionsAsync()
			finalStatus = status
		}

		if (finalStatus !== 'granted') {
			console.warn('[Push] Permission not granted for push notifications.')
			return null
		}

		const expoPushTokenData = await Notifications.getExpoPushTokenAsync({
			projectId: Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId
		})

		return expoPushTokenData.data
	} catch (error) {
		console.error('[Push] Error registering for push notifications:', error)
		return null
	}
}

export const saveExpoPushTokenInSession = async (expoPushToken: string, token: string) => {
	const response = await getApiClient().post('/sessions/expo-push-token', {
		expoPushToken,
		token
	})
	return response.data
}
