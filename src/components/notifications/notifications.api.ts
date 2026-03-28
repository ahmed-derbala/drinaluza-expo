import { getApiClient } from '../../core/api'
import { NotificationResponse } from './notifications.interface'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
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
	if (!Device.isDevice) return null

	const { status } = await Notifications.requestPermissionsAsync()
	if (status !== 'granted') return null

	const expoPushTokenData = await Notifications.getExpoPushTokenAsync()
	return expoPushTokenData.data
}

export const saveExpoPushTokenInSession = async (expoPushToken: string) => {
	const response = await getApiClient().post('/sessions/expo-push-token', {
		expoPushToken
	})
	return response.data
}
