import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { CARD } from '@/core/theme/constants'
import { useUser } from '@/core/contexts'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { IconBaseButton } from '@/core/ui/buttons/IconBaseButton'
import { SmartMediaView } from '@/core/smart-media'
import { OrderProductsCard } from '@/features/orders/components/OrderProductsCard'
import { BusinessCartGroup } from '@/features/orders/components/CartGroupCard'

// ─── Types ──────────────────────────────────────────────────────────────────
interface CartCardProps {
	group: BusinessCartGroup
	onUpdateQuantity: (itemId: string, quantity: number) => void
	onRemove: (itemId: string) => void
	onCheckout: (group: BusinessCartGroup) => void
}

// ─── Component ──────────────────────────────────────────────────────────────
export const CartCard = React.memo(function CartCard({ group, onUpdateQuantity, onRemove, onCheckout }: CartCardProps) {
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const router = useRouter()

	const groupTotal = useMemo(() => {
		return group.items.reduce((sum, item) => sum + (item.price?.total?.tnd || 0) * (item.quantity || 1), 0)
	}, [group.items])

	const handleProductPress = (item: any) => {
		const slug = item.product?.slug || (item as any).slug
		if (slug) router.push(`/products/${slug}` as any)
	}

	return (
		<BaseCard style={styles.card}>
			<View style={styles.header}>
				<View style={styles.headerLeft}>
					<Ionicons name="storefront-outline" size={20} color={colors.primary} />
					<View style={styles.headerInfo}>
						<Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
							{group.businessName}
						</Text>
						<Text style={[styles.itemCount, { color: colors.textSecondary }]}>
							{group.items.length} {group.items.length === 1 ? translate('item', 'item') : translate('items', 'items')}
						</Text>
					</View>
				</View>
				<View style={[styles.statusBadge, { backgroundColor: colors.primary + '15' }]}>
					<Text style={[styles.statusText, { color: colors.primary }]}>{translate('draft', 'DRAFT')}</Text>
				</View>
			</View>

			<View style={[styles.divider, { backgroundColor: colors.border }]} />

			<OrderProductsCard
				products={group.items as any}
				editable
				onIncrement={(it: any) => onUpdateQuantity(it._id || it.product._id, (it.quantity || 1) + (it.product?.unit?.step || 1))}
				onDecrement={(it: any) => onUpdateQuantity(it._id || it.product._id, (it.quantity || 1) - (it.product?.unit?.step || 1))}
				onRemove={(it: any) => onRemove(it._id || it.product._id)}
				onProductPress={handleProductPress}
			/>

			<View style={[styles.divider, { backgroundColor: colors.border }]} />

			<View style={styles.footer}>
				<View>
					<Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>
					<Text style={[styles.totalPrice, { color: colors.primary }]}>{groupTotal.toFixed(2)} TND</Text>
				</View>
				<IconBaseButton icon="checkmark" label={translate('checkout', 'Checkout')} variant="primary" onPress={() => onCheckout(group)} />
			</View>
		</BaseCard>
	)
})

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	card: {
		borderRadius: CARD.borderRadius,
		padding: CARD.padding * 1.8,
		marginBottom: CARD.gap,
		minHeight: CARD.minHeight,
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
		gap: 12,
		flex: 1
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
	itemCount: {
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
	}
})
