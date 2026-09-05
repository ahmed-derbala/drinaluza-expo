import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { useTheme } from '@theme'
import { BaseCard } from '@cards/BaseCard'
import { useUser } from '@contexts'
import { SmartMediaView } from '@smart-media'
import { CancelButton, IconBaseButton } from '@buttons'
import { OrderItem } from '@orders/orders.interface'
import { ORDER_STATUSES, orderStatusColors, orderStatusLabels } from '@orders/orders-statuses'
import { OrderStepTracker, OrderProductCard, OrderProductsCard } from '@orders/components'
// ─── Constants ────────────────────────────────────────────────────────────────
const ORDER_STEPS = ['Ordered', 'Confirmed', 'Transit', 'Delivered']

// ─── Types ──────────────────────────────────────────────────────────────────
interface PurchaseCardProps {
	item: OrderItem
	onCancel?: (id: string) => void
	onMarkReceived?: (id: string) => void
	onUpdateQuantity?: (productId: string, quantity: number) => void
	onRemoveProduct?: (productId: string) => void
}

// ─── Helpers ────────────────────────────────────────────────────────────────
function getStepIndex(status: string) {
	if (status === 'pending_business_confirmation' || status === 'pending_customer_confirmation') return 0
	if (status === 'confirmed_by_business') return 1
	if (status === 'reserved_by_business_for_pickup_by_customer' || status === 'delivering_to_customer') return 2
	if (status === 'delivered_to_customer' || status === 'received_by_customer') return 3
	return -1
}

export const PurchaseCard = React.memo(function PurchaseCard({ item, onCancel, onMarkReceived, onUpdateQuantity, onRemoveProduct }: PurchaseCardProps) {
	const { colors } = useTheme()
	const { localize, translate, formatPrice } = useUser()
	const router = useRouter()
	const statusColor = orderStatusColors[item.status] || colors.textSecondary
	const statusLabel = orderStatusLabels[item.status as keyof typeof orderStatusLabels] || item.status
	const stepIndex = getStepIndex(item.status)
	const businessImage = item.business.media?.thumbnail?.url
	const orderDate = new Date(item.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
	const isPending = item.status === ORDER_STATUSES.PENDING_BUSINESS_CONFIRMATION || item.status === ORDER_STATUSES.PENDING_CUSTOMER_CONFIRMATION
	const canCancel = item.status === 'pending_business_confirmation'
	const canMarkReceived = item.status === 'delivered_to_customer'

	const initialQuantities = React.useMemo(
		() =>
			item.products.reduce(
				(acc: Record<string, number>, p: any) => {
					acc[p.product._id] = p.quantity
					return acc
				},
				{} as Record<string, number>
			),
		[item.products]
	)
	const [quantities, setQuantities] = React.useState<Record<string, number>>(() => initialQuantities)
	React.useEffect(() => {
		setQuantities(initialQuantities)
	}, [initialQuantities])

	const getBounds = React.useCallback((p: any) => {
		const unit = p.product.unit
		return { min: unit?.min ?? 1, max: unit?.max ?? Infinity, step: unit?.step ?? 1 }
	}, [])

	const onIncrement = React.useCallback(
		(p: any) => {
			const id = p.product._id
			setQuantities((prev) => {
				const cur = prev[id] ?? p.quantity
				const { step, max } = getBounds(p)
				const next = Math.round((cur + step) * 100) / 100
				if (next > max) return prev
				if (onUpdateQuantity) onUpdateQuantity(id, next)
				return { ...prev, [id]: next }
			})
		},
		[getBounds, onUpdateQuantity]
	)

	const onDecrement = React.useCallback(
		(p: any) => {
			const id = p.product._id
			setQuantities((prev) => {
				const cur = prev[id] ?? p.quantity
				const { step, min } = getBounds(p)
				const next = Math.round((cur - step) * 100) / 100
				if (next < min) return prev
				if (onUpdateQuantity) onUpdateQuantity(id, next)
				return { ...prev, [id]: next }
			})
		},
		[getBounds, onUpdateQuantity]
	)

	const onRemove = React.useCallback(
		(p: any) => {
			const id = p.product._id
			setQuantities((prev) => {
				const next = { ...prev }
				delete next[id]
				return next
			})
			if (onRemoveProduct) onRemoveProduct(id)
		},
		[onRemoveProduct]
	)

	const displayProducts = React.useMemo(() => {
		return item.products.filter((p: any) => {
			const q = quantities[p.product._id]
			return q === undefined || q > 0
		})
	}, [item.products, quantities])

	const handleProductPress = (p: any) => {
		const slug = p.product?.slug
		if (slug) router.push(`/products/${slug}` as any)
	}

	return (
		<BaseCard style={styles.card}>
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<SmartMediaView media={businessImage} style={[styles.avatar, { borderColor: colors.border }]} />
					<View style={styles.headerInfo}>
						<Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
							{localize(item.business.name)}
						</Text>
						<Text style={[styles.orderDate, { color: colors.textSecondary }]}>{orderDate}</Text>
					</View>
				</View>
				<View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
					<Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
				</View>
			</View>
			<View style={[styles.divider, { backgroundColor: colors.border }]} />
			<OrderProductsCard
				products={displayProducts as any}
				editable={isPending}
				getQuantity={(it) => quantities[(it as any).product._id] ?? (it as any).quantity}
				onIncrement={onIncrement as any}
				onDecrement={onDecrement as any}
				onRemove={onRemove as any}
				onProductPress={handleProductPress}
				title={`${translate('products', 'Products')} (${displayProducts.length})`}
			/>
			<OrderStepTracker stepIndex={stepIndex} steps={ORDER_STEPS} />
			<View style={[styles.divider, { backgroundColor: colors.border }]} />
			<View style={styles.footer}>
				<View>
					<Text style={[styles.orderIdLabel, { color: colors.textSecondary }]}>{translate('order_id', 'Order ID')}</Text>
					<Text style={[styles.orderIdValue, { color: colors.textSecondary }]}>#{item._id.slice(-8)}</Text>
				</View>
				<View style={{ alignItems: 'flex-end' }}>
					<Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>
					<Text style={[styles.totalPrice, { color: colors.primary }]}>{formatPrice(item.price || ({ total: { tnd: 0 } } as any))}</Text>
				</View>
			</View>
			{(canCancel || canMarkReceived) && (
				<View style={styles.actionsRow}>
					{canCancel && <CancelButton onPress={() => onCancel?.(item._id)} />}
					{canMarkReceived && <IconBaseButton icon="checkmark-circle-outline" label={translate('mark_as_received', 'Mark Received')} onPress={() => onMarkReceived?.(item._id)} variant="success" />}
				</View>
			)}
		</BaseCard>
	)
})

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		padding: 12 * 1.8,
		marginBottom: 16,
		minHeight: 440,
		justifyContent: 'space-between'
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
		borderWidth: 1
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
	}
})
