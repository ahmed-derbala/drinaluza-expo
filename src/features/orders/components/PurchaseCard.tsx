import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { useTheme, createShadow } from '@/core/theme'
import { useUser } from '@/core/contexts'
import SmartImage from '@/core/SmartImageViewer'
import { OrderItem } from '@/features/orders/orders.interface'
import { orderStatusColors, orderStatusLabels } from '@/features/orders/orders-statuses'
import { OrderStepTracker } from './OrderStepTracker'

interface PurchaseCardProps {
	item: OrderItem
	onCancel?: (id: string) => void
	onMarkReceived?: (id: string) => void
}

const ORDER_STEPS = ['Ordered', 'Confirmed', 'Transit', 'Delivered']

function getStepIndex(status: string) {
	if (status === 'pending_business_confirmation') return 0
	if (status === 'confirmed_by_business') return 1
	if (status === 'reserved_by_business_for_pickup_by_customer' || status === 'delivering_to_customer') return 2
	if (status === 'delivered_to_customer' || status === 'received_by_customer') return 3
	return -1
}

export const PurchaseCard = React.memo(function PurchaseCard({ item, onCancel, onMarkReceived }: PurchaseCardProps) {
	const { colors } = useTheme()
	const { localize, translate, formatPrice } = useUser()
	const router = useRouter()

	const statusColor = orderStatusColors[item.status] || colors.textSecondary
	const statusLabel = orderStatusLabels[item.status as keyof typeof orderStatusLabels] || item.status
	const stepIndex = getStepIndex(item.status)

	const businessImage = item.business.media?.thumbnail?.url
	const total = item.price?.total?.tnd ?? 0
	const orderDate = new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })

	const canCancel = item.status === 'pending_business_confirmation'
	const canMarkReceived = item.status === 'delivered_to_customer'

	return (
		<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
			<View style={styles.header}>
				<TouchableOpacity
					style={styles.headerLeft}
					disabled={!item.business.slug}
					onPress={() => {
						if (item.business.slug) {
							router.push(`/businesses/${item.business.slug}` as any)
						}
					}}
				>
					<SmartImage source={businessImage} style={styles.avatar} entityType="business" />
					<View style={styles.headerInfo}>
						<Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
							{localize(item.business.name)}
						</Text>
						<Text style={[styles.orderDate, { color: colors.textSecondary }]}>{orderDate}</Text>
					</View>
				</TouchableOpacity>
				<View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
					<Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
				</View>
			</View>

			<View style={[styles.divider, { backgroundColor: colors.border }]} />

			<ScrollView style={styles.productList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
				{item.products.map((p, idx) => {
					const img = p.product.media?.thumbnail?.url || p.product.defaultProduct?.media?.thumbnail?.url
					return (
						<TouchableOpacity
							key={`${p.product._id}-${idx}`}
							style={styles.productRow}
							disabled={!p.product.slug}
							onPress={() => {
								if (p.product.slug) {
									router.push(`/products/${p.product.slug}` as any)
								}
							}}
						>
							<SmartImage source={img} style={styles.productThumb} entityType="product" />
							<View style={styles.productInfo}>
								<Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
									{localize(p.product.name)}
								</Text>
								<Text style={[styles.productQty, { color: colors.textSecondary }]}>
									{p.quantity} × {p.product.unit?.measure || translate('unit', 'unit')}
								</Text>
							</View>
							<Text style={[styles.productPrice, { color: colors.primary }]}>{formatPrice(p.lineTotal || { total: { tnd: 0 } })}</Text>
						</TouchableOpacity>
					)
				})}
			</ScrollView>

			<OrderStepTracker stepIndex={stepIndex} steps={ORDER_STEPS} />

			<View style={[styles.divider, { backgroundColor: colors.border }]} />

			<View style={styles.footer}>
				<View>
					<Text style={[styles.orderIdLabel, { color: colors.textSecondary }]}>{translate('order_id', 'Order ID')}</Text>
					<Text style={[styles.orderIdValue, { color: colors.textSecondary }]}>#{item._id.slice(-8)}</Text>
				</View>
				<View style={{ alignItems: 'flex-end' }}>
					<Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>
					<Text style={[styles.totalPrice, { color: colors.primary }]}>{formatPrice(item.price || { total: { tnd: 0 } })}</Text>
				</View>
			</View>

			{(canCancel || canMarkReceived) && (
				<View style={styles.actionsRow}>
					{canCancel && (
						<TouchableOpacity style={[styles.actionBtn, { borderColor: colors.error, backgroundColor: colors.error + '10' }]} onPress={() => onCancel?.(item._id)} activeOpacity={0.8}>
							<Ionicons name="close-circle-outline" size={18} color={colors.error} />
							<Text style={[styles.actionBtnText, { color: colors.error }]}>{translate('cancel', 'Cancel')}</Text>
						</TouchableOpacity>
					)}
					{canMarkReceived && (
						<TouchableOpacity style={[styles.actionBtn, { borderColor: colors.success, backgroundColor: colors.success + '10' }]} onPress={() => onMarkReceived?.(item._id)} activeOpacity={0.8}>
							<Ionicons name="checkmark-circle-outline" size={18} color={colors.success} />
							<Text style={[styles.actionBtnText, { color: colors.success }]}>{translate('mark_as_received', 'Mark Received')}</Text>
						</TouchableOpacity>
					)}
				</View>
			)}
		</View>
	)
})

const styles = StyleSheet.create({
	card: {
		borderRadius: 28,
		borderWidth: 1,
		padding: 22,
		marginBottom: 16,
		minHeight: 320,
		justifyContent: 'space-between',
		...createShadow({ offsetY: 12, opacity: 0.1, radius: 24, elevation: 4 })
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	headerLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		gap: 12
	},
	avatar: {
		width: 46,
		height: 46,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.08)'
	},
	headerInfo: {
		flex: 1,
		minWidth: 0
	},
	businessName: {
		fontSize: 16,
		fontWeight: '800',
		letterSpacing: -0.3
	},
	orderDate: {
		fontSize: 12,
		fontWeight: '500',
		marginTop: 2
	},
	statusBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12
	},
	statusText: {
		fontSize: 10,
		fontWeight: '800',
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	divider: {
		height: 1,
		marginVertical: 18,
		opacity: 0.4
	},
	productList: {
		maxHeight: 180,
		flexGrow: 0
	},
	productRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		marginBottom: 12
	},
	productThumb: {
		width: 56,
		height: 56,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#FFFFFF08'
	},
	productInfo: {
		flex: 1,
		minWidth: 0
	},
	productName: {
		fontSize: 15,
		fontWeight: '700',
		letterSpacing: -0.2
	},
	productQty: {
		fontSize: 12,
		fontWeight: '500',
		marginTop: 2
	},
	productPrice: {
		fontSize: 15,
		fontWeight: '800',
		letterSpacing: -0.1
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	orderIdLabel: {
		fontSize: 10,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	orderIdValue: {
		fontSize: 13,
		fontWeight: '600',
		marginTop: 2
	},
	totalLabel: {
		fontSize: 10,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	totalPrice: {
		fontSize: 22,
		fontWeight: '900',
		marginTop: 2,
		letterSpacing: -0.5
	},
	actionsRow: {
		flexDirection: 'row',
		gap: 10,
		marginTop: 16
	},
	actionBtn: {
		flex: 1,
		flexDirection: 'row',
		height: 46,
		borderRadius: 14,
		borderWidth: 1.5,
		justifyContent: 'center',
		alignItems: 'center',
		gap: 8
	},
	actionBtnText: {
		fontSize: 13,
		fontWeight: '700'
	}
})
