import { useRouter, usePathname } from 'expo-router'
import { useNotification } from '@/features/notifications/NotificationContext'
import { HeaderIconButton } from './HeaderIconButton'

export interface HeaderNotificationsButtonProps {
	size?: number
	label?: string
}

export function HeaderNotificationsButton({ size = 38, label = 'Notifications' }: HeaderNotificationsButtonProps) {
	const router = useRouter()
	const pathname = usePathname()
	let notificationCount = 0
	try {
		// eslint-disable-next-line react-hooks/rules-of-hooks
		const ctx = useNotification()
		notificationCount = ctx.notificationCount ?? 0
	} catch {
		notificationCount = 0
	}

	const handlePress = () => {
		if (pathname === '/notifications') return
		router.push('/notifications' as any)
	}

	return <HeaderIconButton icon="notifications-outline" label={label} onPress={handlePress} size={size} badgeCount={notificationCount} />
}
