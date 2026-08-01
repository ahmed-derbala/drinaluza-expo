import { colors as themeColors } from '@/core/theme'
import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, useWindowDimensions, ActivityIndicator } from 'react-native'
import { useTheme, createShadow } from '../../core/theme'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { Sale } from './sales.api'
import { format } from 'date-fns'
import { orderStatusColors, orderStatusLabels } from '../orders/orders-statuses'
import SmartImage from '@/core/SmartImageViewer'
import { useUser } from '../../core/contexts/UserContext'
import { updateSaleStatus } from './sales.api'
import { toast } from '@/features/common/Toast'
import { ORDER_STATUSES as statuses } from '../orders/orders-statuses'
import { PhoneButton } from '@/features/common/buttons/PhoneButton'
import { WhatsAppButton } from '@/features/common/buttons/WhatsAppButton'
import { EmailButton } from '@/features/common/buttons/EmailButton'
import { WebsiteButton } from '@/features/common/buttons/WebsiteButton'
import { DirectionsButton } from '@/features/common/buttons/DirectionsButton'
import { CancelButton } from '@/features/common/buttons/CancelButton'
import { IconButton } from '@/features/common/buttons/IconButton'

interface SaleCardProps {
	sale: Sale
	onStatusUpdate?: () => void
}

interface ProductItemProps {
	product: Sale['products'][0]
	quantity: number
	editable: boolean
	disabled?: boolean
	onIncrement: () => void
	onDecrement: () => void
}

const ProductItem = ({ product, quantity, editable, disabled, onIncrement, onDecrement }: ProductItemProps) => {
	const { colors } = useTheme()
	const { localize, formatPrice, translate } = useUser()

	const getImageUrl = () => {
		return product.product.media?.thumbnail?.url || product.product.defaultProduct?.media?.thumbnail?.url || null
	}

	const unitMeasure = product.product.unit?.measure || translate('unit', 'unit')

	const lineTotal = React.useMemo(() => {
		const unit: any = product.product.price?.total || {}
		const total: any = {}
		if (unit.tnd != null) total.tnd = unit.tnd * quantity
		if (unit.eur != null) total.eur = unit.eur * quantity
		if (unit.usd != null) total.usd = unit.usd * quantity
		return { total }
	}, [product.product.price?.total, quantity])

	return (
		<View style={[styles.productItem, { backgroundColor: colors.surface, borderColor: colors.info }]}>
			<SmartImage source={getImageUrl()} style={styles.productImage} entityType="product" />
			<View style={styles.productDetails}>
				<Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
					{localize(product.product.name)}
				</Text>
				<View style={styles.productMeta}>
					{!editable && (
						<Text style={[styles.productQuantity, { color: colors.textSecondary }]}>
							{quantity} {unitMeasure}
						</Text>
					)}
					<Text style={[styles.productUnitPrice, { color: colors.textTertiary }]}>
						@ {formatPrice(product.product.price)}/{unitMeasure}
					</Text>
				</View>
				{editable && (
					<View style={styles.stepperRow}>
						<TouchableOpacity onPress={onDecrement} disabled={disabled} activeOpacity={0.7} style={[styles.stepperBtn, { backgroundColor: colors.surfaceVariant, opacity: disabled ? 0.5 : 1 }]}>
							<MaterialIcons name="remove" size={16} color={colors.text} />
						</TouchableOpacity>
						<Text style={[styles.stepperValue, { color: colors.text }]}>{quantity}</Text>
						<TouchableOpacity onPress={onIncrement} disabled={disabled} activeOpacity={0.7} style={[styles.stepperBtn, { backgroundColor: colors.surfaceVariant, opacity: disabled ? 0.5 : 1 }]}>
							<MaterialIcons name="add" size={16} color={colors.text} />
						</TouchableOpacity>
					</View>
				)}
				<Text style={[styles.productTotal, { color: colors.primary }]}>{formatPrice(lineTotal)}</Text>
			</View>
		</View>
	)
}

const SaleCard = ({ sale, onStatusUpdate }: SaleCardProps) => {
	const { colors } = useTheme()
	const { localize, formatPrice, translate } = useUser()
	const { width } = useWindowDimensions()
	const isWeb = Platform.OS === 'web'
	const isTablet = width >= 768
	const isDesktop = width >= 1024
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
		(p: Sale['products'][0]) => {
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
		(p: Sale['products'][0]) => {
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

	const computedTotalPrice = React.useMemo(() => {
		if (!hasQuantityChanges) return sale.price
		const total: any = {}
		sale.products.forEach((p) => {
			const q = quantities[p._id ?? p.product._id] ?? p.quantity
			const unit: any = p.product.price?.total || {}
			if (unit.tnd != null) total.tnd = (total.tnd || 0) + unit.tnd * q
			if (unit.eur != null) total.eur = (total.eur || 0) + unit.eur * q
			if (unit.usd != null) total.usd = (total.usd || 0) + unit.usd * q
		})
		return { total }
	}, [hasQuantityChanges, quantities, sale.price, sale.products])

	const statusColor = orderStatusColors[currentStatus as keyof typeof orderStatusColors] || colors.primary
	const statusLabel = orderStatusLabels[currentStatus as keyof typeof orderStatusLabels] || currentStatus

	const handleStatusUpdate = async (newStatus: string) => {
		try {
			setUpdating(true)
			let payloadStatus = newStatus
			let productsPayload: { _id: string; quantity: number }[] | undefined

			if (newStatus === statuses.CONFIRMED_BY_BUSINESS && hasQuantityChanges) {
				payloadStatus = statuses.PENDING_CUSTOMER_CONFIRMATION
				productsPayload = sale.products.map((p) => ({
					_id: p._id ?? p.product._id,
					quantity: quantities[p._id ?? p.product._id] ?? p.quantity
				}))
			}

			await updateSaleStatus(sale._id, payloadStatus, productsPayload)
			setCurrentStatus(payloadStatus)
			toast.show({ title: translate('success', 'Success'), message: translate('status_updated', 'Status updated successfully'), color: themeColors.success })
			if (onStatusUpdate) onStatusUpdate()
		} catch (err: any) {
			toast.show({ title: translate('error', 'Error'), message: err.message || translate('failed_to_update_status', 'Failed to update status'), color: themeColors.error })
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
						<IconButton
							key={action.status}
							icon={action.icon as any}
							label={action.label}
							onPress={() => handleStatusUpdate(action.status)}
							disabled={updating}
							loading={updating}
							variant={resolveVariant(action.color)}
							colors={colors}
						/>
					)
				)}
			</View>
		)
	}

	return (
		<View
			style={[
				styles.card,
				{
					backgroundColor: colors.background,
					borderColor: colors.info
				}
			]}
		>
			{/* Header Section */}
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
						{localize(sale.business.name)}
					</Text>
					<Text style={[styles.dateText, { color: colors.textSecondary }]}>{format(new Date(sale.createdAt), 'MMM d, yyyy • HH:mm')}</Text>
				</View>
				<View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
					<View style={[styles.statusDot, { backgroundColor: statusColor }]} />
					<Text style={[styles.statusText, { color: statusColor }]} numberOfLines={1}>
						{statusLabel}
					</Text>
				</View>
			</View>

			{/* Customer Section */}
			<View style={[styles.customerSection, { borderBottomColor: colors.border }]}>
				<View style={styles.customerInfo}>
					<SmartImage
						source={typeof sale.customer.media?.thumbnail === 'string' ? sale.customer.media.thumbnail : sale.customer.media?.thumbnail?.url}
						style={[styles.avatar, { borderColor: colors.border }]}
						entityType="user"
						containerStyle={[styles.avatarContainer, { backgroundColor: colors.surface }]}
					/>
					<View style={styles.customerDetails}>
						<Text style={[styles.customerName, { color: colors.text }]} numberOfLines={1}>
							{localize(sale.customer.name)}
						</Text>
						{sale.customer.address && (
							<Text style={[styles.customerAddress, { color: colors.textSecondary }]} numberOfLines={2}>
								{sale.customer.address.street}, {sale.customer.address.city}
							</Text>
						)}
					</View>
				</View>

				{/* Contact Buttons */}
				<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
					<PhoneButton phone={sale.customer.contact?.phone} size={36} />
					<WhatsAppButton whatsapp={sale.customer.contact?.whatsapp} size={36} />
					<EmailButton email={sale.customer.contact?.email} size={36} />
					<WebsiteButton website={sale.customer.contact?.website} size={36} />
					<DirectionsButton location={sale.customer.location} address={sale.customer.address} size={36} />
				</View>
			</View>

			{/* Products Section - Scrollable */}
			<View style={styles.productsContainer}>
				<Text style={[styles.productsTitle, { color: colors.textSecondary }]}>
					{translate('products', 'Products')} ({sale.products.length})
				</Text>
				<ScrollView horizontal showsHorizontalScrollIndicator={isWeb} contentContainerStyle={styles.productsScrollContent} style={styles.productsScroll}>
					{sale.products.map((product, index) => (
						<ProductItem
							key={`${product._id ?? product.product._id}_${index}`}
							product={product}
							quantity={quantities[product._id ?? product.product._id] ?? product.quantity}
							editable={isPending}
							disabled={updating}
							onIncrement={() => onIncrement(product)}
							onDecrement={() => onDecrement(product)}
						/>
					))}
				</ScrollView>
			</View>

			<View style={[styles.footer, { borderTopColor: colors.border }]}>
				<Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>
				<Text style={[styles.totalPrice, { color: colors.primary }]}>{formatPrice(computedTotalPrice)}</Text>
			</View>

			{renderStatusActions()}
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		borderRadius: 16,
		borderWidth: 2,
		marginBottom: 16,
		overflow: 'hidden',
		width: '100%',
		...createShadow({ offsetY: 2, opacity: 0.1, radius: 8, elevation: 3 })
	},
	header: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start',
		padding: 16,
		borderBottomWidth: 1,
		gap: 12
	},
	headerLeft: {
		flex: 1
	},
	businessName: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 4
	},
	dateText: {
		fontSize: 13
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		gap: 6
	},
	statusDot: {
		width: 8,
		height: 8,
		borderRadius: 4
	},
	statusText: {
		fontSize: 12,
		fontWeight: '600'
	},
	customerSection: {
		padding: 16,
		borderBottomWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		gap: 12
	},
	customerInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1
	},
	avatarContainer: {
		borderRadius: 20,
		overflow: 'hidden'
	},
	avatar: {
		width: 40,
		height: 40,
		borderRadius: 20,
		borderWidth: 1,
		marginRight: 12
	},
	customerDetails: {
		flex: 1
	},
	customerName: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2
	},
	customerAddress: {
		fontSize: 13
	},
	productsContainer: {
		paddingVertical: 12
	},
	productsTitle: {
		fontSize: 13,
		fontWeight: '600',
		paddingHorizontal: 16,
		marginBottom: 8,
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	productsScroll: {
		maxHeight: 140
	},
	productsScrollContent: {
		paddingHorizontal: 16,
		gap: 12
	},
	productItem: {
		flexDirection: 'row',
		width: 280,
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		gap: 12
	},
	productImage: {
		width: 60,
		height: 60,
		borderRadius: 8
	},
	productDetails: {
		flex: 1,
		justifyContent: 'space-between'
	},
	productName: {
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 4
	},
	productMeta: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginBottom: 4
	},
	productQuantity: {
		fontSize: 13
	},
	productUnitPrice: {
		fontSize: 12
	},
	productTotal: {
		fontSize: 16,
		fontWeight: '700'
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
	},
	actionBtn: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 12,
		borderWidth: 1.5,
		gap: 8
	},
	actionBtnText: {
		fontSize: 14,
		fontWeight: '700'
	},
	stepperRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 4
	},
	stepperBtn: {
		width: 26,
		height: 26,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center'
	},
	stepperValue: {
		fontSize: 14,
		fontWeight: '600',
		minWidth: 28,
		textAlign: 'center'
	}
})

export default React.memo(SaleCard)
