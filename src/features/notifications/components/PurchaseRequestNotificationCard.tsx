import React from 'react'
import { CustomerContactBlock } from '@/features/customers/components/CustomerContactBlock'
import { NotificationItem } from '../notifications.interface'
import { NotificationCard } from './NotificationCard'

interface PurchaseRequestNotificationCardProps {
	item: NotificationItem
	onPress: (item: NotificationItem) => void
}

export const PurchaseRequestNotificationCard = React.memo(function PurchaseRequestNotificationCard({ item, onPress }: PurchaseRequestNotificationCardProps) {
	return (
		<NotificationCard item={item} onPress={onPress}>
			{item.customer && <CustomerContactBlock customer={item.customer} contactButtonSize={32} />}
		</NotificationCard>
	)
})
