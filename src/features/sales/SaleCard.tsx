import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme, themeColors } from '@/core/theme'
import { Sale } from './sales.api'
import { format } from 'date-fns'
import { useUser } from '@/core/contexts/UserContext'
import { updateSaleStatus } from './sales.api'
import { toast } from '@/features/common/Toast'
import { ORDER_STATUSES as statuses } from '@/features/orders/orders-statuses'
import { CancelButton } from '@/core/ui/buttons/CancelButton'
import { IconBaseButton } from '@/core/ui/buttons/IconBaseButton'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { CustomerContactBlock } from '@/features/customers/components/CustomerContactBlock'
import { OrderProductsCard } from '@/features/orders/components/OrderProductsCard'
import { useRouter } from 'expo-router'
import SaleIdBadge from './SaleIdBadge'
import SaleStatusBadge from './SaleStatusBadge'

// ─── Types ──────────────────────────────────────────────────────────────────
interface SaleCardProps {
	sale: Sale
	onStatusUpdate?: () => void
}

// ─── Component ──────────────────────────────────────────────────────────────
const SaleCard = ({ sale, onStatusUpdate }: SaleCardProps) => {
	const { colors } = useTheme()
	const { localize, formatPrice, translate } = useUser()
	const router = useRouter()
	const [updating, setUpdating] = React.useState(false)
	const [currentStatus, setCurrentStatus] = React.useState(sale.status)
	const isPending = currentStatus === statuses.PENDING_BUSINESS_CONFIRMATION

	const initialQuantities = React.useMemo(
		() =>
			sale.products.reduce(
				(acc, p) => {
					acc[p._id ?? p.product._id] = p.quantity
					return acc
				},
				{} as Record<string, number>
			),
		[sale.products]
	)
	const [quantities, setQuantities] = React.useState<Record<string, number>>(() => initialQuantities)
	React.useEffect(() => {
		setQuantities(initialQuantities)
	}, [initialQuantities])

	const hasQuantityChanges = React.useMemo(() => sale.products.some((p) => quantities[p._id ?? p.product._id] !== p.quantity), [sale.products, quantities])

	const getProductBounds = React.useCallback((p: Sale['products'][0]) => {
		const unit = p.product.unit
		return { min: unit?.min ?? 1, max: unit?.max ?? Infinity, step: unit?.step ?? 1 }
	}, [])

	const onIncrement = React.useCallback(
		(p: any) => {
			const id = p._id ?? p.product._id
			setQuantities((prev) => {
				const current = prev[id] ?? p.quantity
				const { step, max } = getProductBounds(p)
				const next = Math.round((current + step) * 100) / 100
				if (next > max) return prev
				return { ...prev, [id]: next }
			})
		},
		[getProductBounds]
	)

	const onDecrement = React.useCallback(
		(p: any) => {
			const id = p._id ?? p.product._id
			setQuantities((prev) => {
				const current = prev[id] ?? p.quantity
				const { step, min } = getProductBounds(p)
				const next = Math.round((current - step) * 100) / 100
				if (next < min) return { ...prev, [id]: min }
				return { ...prev, [id]: next }
			})
		},
		[getProductBounds]
	)

	const onRemove = React.useCallback((p: any) => {
		const id = p._id ?? p.product._id
		setQuantities((prev) => {
			const next = { ...prev }
			delete next[id]
			return next
		})
	}, [])

	const displayProducts = React.useMemo(() => {
		return sale.products.filter((p) => {
			const id = p._id ?? p.product._id
			const q = quantities[id]
			return q === undefined || q > 0
		})
	}, [sale.products, quantities])

	const computedTotalPrice = React.useMemo(() => {
		if (!hasQuantityChanges) return sale.price
		const total: any = {}
		sale.products.forEach((p) => {
			const q = quantities[p._id ?? p.product._id] ?? p.quantity
			if (q <= 0) return
			const unit: any = p.product.price?.total || {}
			if (unit.tnd != null) total.tnd = (total.tnd || 0) + unit.tnd * q
			if (unit.eur != null) total.eur = (total.eur || 0) + unit.eur * q
			if (unit.usd != null) total.usd = (total.usd || 0) + unit.usd * q
		})
		return { total }
	}, [hasQuantityChanges, quantities, sale.price, sale.products])

	const handleStatusUpdate = async (newStatus: string) => {
		try {
			setUpdating(true)
			let payloadStatus = newStatus
			let productsPayload: { _id: string; quantity: number }[] | undefined
			if (newStatus === statuses.CONFIRMED_BY_BUSINESS && hasQuantityChanges) {
				payloadStatus = statuses.PENDING_CUSTOMER_CONFIRMATION
				productsPayload = displayProducts.map((p) => ({
					_id: p._id ?? p.product._id,
					quantity: quantities[p._id ?? p.product._id] ?? p.quantity
				}))
			}
			if (newStatus === statuses.CANCELLED_BY_BUSINESS && displayProducts.length !== sale.products.length) {
				productsPayload = displayProducts.map((p) => ({
					_id: p._id ?? p.product._id,
					quantity: quantities[p._id ?? p.product._id] ?? p.quantity
				}))
			}
			await updateSaleStatus(sale._id, payloadStatus, productsPayload)
			setCurrentStatus(payloadStatus)
			toast.show({ title: translate('success', 'Success'), content: translate('status_updated', 'Status updated successfully'), borderColor: themeColors.success })
			if (onStatusUpdate) onStatusUpdate()
		} catch (err: any) {
			toast.show({ title: translate('error', 'Error'), content: err.message || translate('failed_to_update_status', 'Failed to update status'), borderColor: themeColors.error })
		} finally {
			setUpdating(false)
		}
	}

	const renderStatusActions = () => {
		const actions = []
		switch (currentStatus) {
			case statuses.PENDING_BUSINESS_CONFIRMATION:
				actions.push(
					{
						status: statuses.CONFIRMED_BY_BUSINESS,
						label: hasQuantityChanges ? translate('confirm_send', 'Confirm & Send') : translate('confirm', 'Confirm'),
						icon: 'checkmark-circle-outline',
						color: colors.success
					},
					{ status: statuses.CANCELLED_BY_BUSINESS, label: translate('cancel', 'Cancel'), icon: 'close-circle-outline', color: colors.error }
				)
				break
			case statuses.CONFIRMED_BY_BUSINESS:
				actions.push(
					{ status: statuses.RESERVED_BY_BUSINESS_FOR_PICKUP_BY_CUSTOMER, label: translate('ready_for_pickup', 'Ready'), icon: 'storefront-outline', color: colors.info },
					{ status: statuses.DELIVERING_TO_CUSTOMER, label: translate('start_delivery', 'Deliver'), icon: 'bicycle-outline', color: colors.info },
					{ status: statuses.CANCELLED_BY_BUSINESS, label: translate('cancel', 'Cancel'), icon: 'close-circle-outline', color: colors.error }
				)
				break
			case statuses.RESERVED_BY_BUSINESS_FOR_PICKUP_BY_CUSTOMER:
			case statuses.DELIVERING_TO_CUSTOMER:
				actions.push({ status: statuses.DELIVERED_TO_CUSTOMER, label: translate('mark_delivered', 'Delivered'), icon: 'checkmark-circle-outline', color: colors.success })
				break
		}
		if (actions.length === 0) return null
		const resolveVariant = (color: string) => {
			if (color === colors.success) return 'success'
			if (color === colors.info) return 'info'
			return 'primary'
		}
		return (
			<View style={[styles.actionsBar, { borderTopColor: colors.border }]}>
				{actions.map((action) =>
					action.status === statuses.CANCELLED_BY_BUSINESS ? (
						<CancelButton key={action.status} onPress={() => handleStatusUpdate(action.status)} disabled={updating} loading={updating} />
					) : (
						<IconBaseButton
							key={action.status}
							icon={action.icon as any}
							label={action.label}
							onPress={() => handleStatusUpdate(action.status)}
							disabled={updating}
							loading={updating}
							variant={resolveVariant(action.color) as any}
						/>
					)
				)}
			</View>
		)
	}

	const handleProductPress = (item: any) => {
		const slug = item.product?.slug
		if (slug) router.push(`/products/${slug}` as any)
	}

	return (
		<BaseCard style={styles.card} borderWidth={2} borderColor={colors.info} testID={`sale-card-${sale._id}`}>
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
						{localize(sale.business.name)}
					</Text>
					<Text style={[styles.dateText, { color: colors.textSecondary }]}>
						{new Date(sale.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
					</Text>
				</View>
				<View style={styles.headerRight}>
					<SaleStatusBadge sale={{ ...sale, status: currentStatus } as any} />
					<SaleIdBadge sale={sale} />
				</View>
			</View>
			<CustomerContactBlock customer={sale.customer} />
			<OrderProductsCard
				products={displayProducts as any}
				editable={isPending}
				disabled={updating}
				getQuantity={(item) => quantities[(item as any)._id ?? item.product._id] ?? item.quantity}
				onIncrement={onIncrement as any}
				onDecrement={onDecrement as any}
				onRemove={onRemove as any}
				onProductPress={handleProductPress}
				title={`${translate('products', 'Products')} (${displayProducts.length})`}
			/>
			<View style={[styles.footer, { borderTopColor: colors.border }]}>
				<Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>
				<Text style={[styles.totalPrice, { color: colors.primary }]}>{formatPrice(computedTotalPrice as any)}</Text>
			</View>
			{renderStatusActions()}
		</BaseCard>
	)
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	card: {
		marginBottom: 16,
		padding: 0
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		padding: 16,
		gap: 12
	},
	headerLeft: {
		flex: 1
	},
	headerRight: {
		alignItems: 'flex-end',
		gap: 6
	},
	businessName: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 4
	},
	dateText: {
		fontSize: 13
	},
	footer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 16,
		borderTopWidth: 1
	},
	totalLabel: {
		fontSize: 14,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	totalPrice: {
		fontSize: 22,
		fontWeight: '700'
	},
	actionsBar: {
		flexDirection: 'row',
		padding: 12,
		gap: 12,
		borderTopWidth: 1,
		backgroundColor: themeColors.background5
	}
})

export default React.memo(SaleCard)
