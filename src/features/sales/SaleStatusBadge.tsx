import { useMemo } from 'react'
import { Text, StyleSheet, TouchableOpacity, StyleProp, ViewStyle } from 'react-native'
import { useRouter, usePathname } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@theme'
import { useUser } from '@contexts'
import { Sale } from './sales.api'
import { ORDER_STATUSES, orderStatusColors, orderStatusIcons } from '@orders/orders-statuses'
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
			[ORDER_STATUSES.PENDING]: translate('sale_status_pending', 'Pending'),
			[ORDER_STATUSES.ACTION_REQUIRED]: translate('sale_status_action_required', 'Action Required'),
			[ORDER_STATUSES.ACCEPTED]: translate('sale_status_accepted', 'Accepted'),
			[ORDER_STATUSES.PREPARING]: translate('sale_status_preparing', 'Preparing'),
			[ORDER_STATUSES.READY_FOR_PICKUP]: translate('sale_status_ready_for_pickup', 'Ready for Pickup'),
			[ORDER_STATUSES.FINDING_COURIER]: translate('sale_status_finding_courier', 'Finding Courier'),
			[ORDER_STATUSES.COURIER_ASSIGNED]: translate('sale_status_courier_assigned', 'Courier Assigned'),
			[ORDER_STATUSES.DELIVERING]: translate('sale_status_delivering', 'Delivering'),
			[ORDER_STATUSES.DELIVERED]: translate('sale_status_delivered', 'Delivered'),
			[ORDER_STATUSES.CANCELLED]: translate('sale_status_cancelled', 'Cancelled')
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
