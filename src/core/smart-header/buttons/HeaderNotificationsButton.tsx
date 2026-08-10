import React from 'react'
import { useRouter, usePathname } from 'expo-router'
import { useNotification } from '@/features/notifications/NotificationContext'
import { useHiddenOnRoutes } from './useHiddenOnRoutes'
import { HeaderIconButton } from './HeaderIconButton'

export interface HeaderNotificationsButtonProps {
	size?: number
	label?: string
}

const HIDDEN_ON_ROUTES = ['/notifications']

export function HeaderNotificationsButton({ size = 38, label = 'Notifications' }: HeaderNotificationsButtonProps) {
	const router = useRouter()
	const pathname = usePathname()
	const { notificationCount } = useNotification()

	const hidden = useHiddenOnRoutes(HIDDEN_ON_ROUTES)
	if (hidden) return null

	const handlePress = () => {
		if (pathname === '/notifications') return
		router.push('/notifications' as any)
	}

	return <HeaderIconButton icon="notifications-outline" label={label} onPress={handlePress} size={size} badgeCount={notificationCount} />
}
