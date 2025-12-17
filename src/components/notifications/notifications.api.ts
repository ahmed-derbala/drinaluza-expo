import { getApiClient } from '../../core/api'
import { NotificationResponse } from './notifications.interface'

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
