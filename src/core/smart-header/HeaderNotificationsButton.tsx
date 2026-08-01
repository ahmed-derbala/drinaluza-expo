import React from 'react'
import { useRouter } from 'expo-router'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { useNotification } from '@/features/notifications/NotificationContext'
import HeaderActionButton from './HeaderActionButton'

const HeaderNotificationsButton: React.FC = React.memo(() => {
	const router = useRouter()
	const { colors } = useTheme()
	const { notificationCount } = useNotification()

	return (
		<HeaderActionButton
			iconName="notifications-outline"
			badgeCount={notificationCount}
			onPress={() => router.push('/notifications')}
			accessibilityLabel={translate('notifications', 'Notifications')}
		/>
	)
})

HeaderNotificationsButton.displayName = 'HeaderNotificationsButton'

export default HeaderNotificationsButton
