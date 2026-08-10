import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts'
import { Sale } from './sales.api'
import { ORDER_STATUSES, orderStatusColors, orderStatusIcons } from '@/features/orders/orders-statuses'

export interface SaleStatusBadgeProps {
	sale: Sale
	style?: StyleProp<ViewStyle>
}

export default function SaleStatusBadge({ sale, style }: SaleStatusBadgeProps) {
	const router = useRouter()
	const pathname = usePathname()
	const { colors } = useTheme()
	const { translate } = useUser()

	const saleStatusLabels = useMemo<Record<string, string>>(
		() => ({
			[ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION]: translate('sale_status_pending_my_confirmation', 'Pending My Confirmation'),
			[ORDER_STATUSES.PENDING_CUSTOMER_CONFIRMATION]: translate('sale_status_pending_customer_confirmation', 'Pending Customer Confirmation'),
			[ORDER_STATUSES.CONFIRMED_BY_BUSINESS]: translate('sale_status_confirmed', 'Confirmed'),
			[ORDER_STATUSES.RESERVED_BY_BUSINESS_FOR_PICKUP_BY_CUSTOMER]: translate('sale_status_ready_for_pickup', 'Ready for Pickup'),
			[ORDER_STATUSES.RESERVATION_EXPIRED]: translate('sale_status_reservation_expired', 'Reservation Expired'),
			[ORDER_STATUSES.DELIVERING_TO_CUSTOMER]: translate('sale_status_delivering', 'Delivering'),
			[ORDER_STATUSES.DELIVERED_TO_CUSTOMER]: translate('sale_status_delivered', 'Delivered'),
			[ORDER_STATUSES.RECEIVED_BY_CUSTOMER]: translate('sale_status_received', 'Received'),
			[ORDER_STATUSES.CANCELLED_BY_CUSTOMER]: translate('sale_status_cancelled_by_customer', 'Cancelled by Customer'),
			[ORDER_STATUSES.CANCELLED_BY_BUSINESS]: translate('sale_status_cancelled_by_me', 'Cancelled by Me')
		}),
		[translate]
	)

	const statusColor = orderStatusColors[sale.status as keyof typeof orderStatusColors] || colors.primary
	const statusIcon = orderStatusIcons[sale.status as keyof typeof orderStatusIcons] || 'help-circle-outline'
	const statusLabel = saleStatusLabels[sale.status as keyof typeof saleStatusLabels] || sale.status

	const handlePress = () => {
		const target = `/dashboard/${sale.business.slug}/sales/${sale._id}`
		if (pathname === target) return
		router.push(target as any)
	}

	return (
		<TouchableOpacity onPress={handlePress} activeOpacity={0.7} style={[styles.badge, { backgroundColor: `${statusColor}20` }, style]}>
			<Ionicons name={statusIcon as any} size={12} color={statusColor} />
			<Text style={[styles.text, { color: statusColor }]} numberOfLines={1}>
				{statusLabel}
			</Text>
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		gap: 6,
		alignSelf: 'flex-start'
	},
	text: {
		fontSize: 12,
		fontWeight: '600'
	}
})
