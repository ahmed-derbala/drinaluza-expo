import React from 'react'
import { useRouter } from 'expo-router'
import { useNotification } from '@/features/notifications/NotificationContext'
import { HeaderIconButton } from './HeaderIconButton'

export interface HeaderNotificationsButtonProps {
	size?: number
	label?: string
}

export function HeaderNotificationsButton({ size = 38, label = 'Notifications' }: HeaderNotificationsButtonProps) {
	const router = useRouter()
	const { notificationCount } = useNotification()

	return <HeaderIconButton icon="notifications-outline" label={label} onPress={() => router.push('/notifications' as any)} size={size} badgeCount={notificationCount} />
}
