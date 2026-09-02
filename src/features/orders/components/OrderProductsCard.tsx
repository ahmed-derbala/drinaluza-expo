import React from 'react'
import { StyleSheet, View, Text } from 'react-native'
import { useTheme } from '@/core/theme'
import { OrderProductCard, OrderProduct } from './OrderProductCard'
import { Scrollbar } from '@/core/scroll'

// ─── Types ──────────────────────────────────────────────────────────────────
export interface OrderProductsCardProps {
	products: OrderProduct[]
	editable?: boolean
	disabled?: boolean
	getQuantity?: (item: OrderProduct) => number
	onIncrement?: (item: OrderProduct) => void
	onDecrement?: (item: OrderProduct) => void
	onRemove?: (item: OrderProduct) => void
	onProductPress?: (item: OrderProduct) => void
	title?: string
}

// ─── Component ──────────────────────────────────────────────────────────────
export const OrderProductsCard = React.memo(function OrderProductsCard({
	products,
	editable = false,
	disabled = false,
	getQuantity,
	onIncrement,
	onDecrement,
	onRemove,
	onProductPress,
	title
}: OrderProductsCardProps) {
	const { colors } = useTheme()

	if (!products || products.length === 0) return null

	return (
		<View style={styles.container}>
			{title ? <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text> : null}
			<Scrollbar horizontal bounces={false} overScrollMode="never" contentContainerStyle={styles.content} style={styles.scroll} keyboardShouldPersistTaps="handled">
				{products.map((item, index) => {
					const key = (item._id || item.product._id || `idx-${index}`) as string
					const quantity = getQuantity ? getQuantity(item) : item.quantity
					return (
						<OrderProductCard
							key={`${key}_${index}`}
							item={{ ...item, quantity }}
							editable={editable}
							disabled={disabled}
							onIncrement={onIncrement ? () => onIncrement(item) : undefined}
							onDecrement={onDecrement ? () => onDecrement(item) : undefined}
							onRemove={onRemove ? () => onRemove(item) : undefined}
							onPress={onProductPress ? () => onProductPress(item) : undefined}
						/>
					)
				})}
			</Scrollbar>
		</View>
	)
})

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	container: {
		paddingVertical: 12
	},
	title: {
		fontSize: 13,
		fontWeight: '600',
		paddingHorizontal: 16,
		marginBottom: 8,
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	scroll: {
		maxHeight: 180
	},
	content: {
		paddingHorizontal: 16,
		gap: 12,
		flexDirection: 'row',
		alignItems: 'center'
	}
})
