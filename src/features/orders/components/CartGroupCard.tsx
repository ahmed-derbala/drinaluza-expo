import React, { useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'

import { useTheme, createShadow } from '@/core/theme'
import { useUser } from '@/core/contexts'
import SmartImage from '@/core/SmartImageViewer'
import { FeedItem } from '@/features/feed/feed.interface'

export type CartItem = FeedItem & { quantity: number }

export interface BusinessCartGroup {
	businessId: string
	businessName: string
	businessSlug: string
	items: CartItem[]
}

interface CartGroupCardProps {
	group: BusinessCartGroup
	onUpdateQuantity: (itemId: string, quantity: number) => void
	onRemove: (itemId: string) => void
	onCheckout: (group: BusinessCartGroup) => void
}

export const CartGroupCard = React.memo(function CartGroupCard({ group, onUpdateQuantity, onRemove, onCheckout }: CartGroupCardProps) {
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const router = useRouter()

	const groupTotal = useMemo(() => {
		return group.items.reduce((sum, item) => sum + (item.price?.total?.tnd || 0) * (item.quantity || 1), 0)
	}, [group.items])

	const handleRemove = (itemId: string) => {
		Alert.alert(translate('remove_item', 'Remove Item'), translate('remove_item_confirm', 'Do you want to remove this item from your cart?'), [
			{ text: translate('cancel', 'Cancel'), style: 'cancel' },
			{
				text: translate('confirm', 'Confirm'),
				style: 'destructive',
				onPress: () => onRemove(itemId)
			}
		])
	}

	return (
		<View style={styles.cardContainer}>
			<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<View style={styles.header}>
					<TouchableOpacity
						style={styles.headerLeft}
						disabled={!group.businessSlug}
						onPress={() => {
							if (group.businessSlug) {
								router.push(`/businesses/${group.businessSlug}` as any)
							}
						}}
					>
						<Ionicons name="storefront-outline" size={24} color={colors.primary} />
						<View style={styles.headerInfo}>
							<Text style={[styles.businessName, { color: colors.text }]} numberOfLines={1}>
								{group.businessName}
							</Text>
							<Text style={[styles.itemCount, { color: colors.textSecondary }]}>
								{group.items.length} {group.items.length === 1 ? translate('item', 'item') : translate('items', 'items')}
							</Text>
						</View>
					</TouchableOpacity>
					<View style={[styles.statusBadge, { backgroundColor: colors.primary + '15' }]}>
						<Text style={[styles.statusText, { color: colors.primary }]}>{translate('draft', 'DRAFT')}</Text>
					</View>
				</View>

				<View style={[styles.divider, { backgroundColor: colors.border }]} />

				<ScrollView style={styles.productList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
					{group.items.map((item) => {
						const price = item.price?.total?.tnd || 0
						const img = item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url
						return (
							<View key={item._id} style={styles.itemRow}>
								<TouchableOpacity
									onPress={() => {
										if (item.slug) {
											router.push(`/products/${item.slug}` as any)
										}
									}}
								>
									<SmartImage source={img} style={styles.productThumb} entityType="product" />
								</TouchableOpacity>
								<View style={styles.itemDetails}>
									<View style={styles.itemHeader}>
										<TouchableOpacity
											style={{ flex: 1, marginRight: 8 }}
											onPress={() => {
												if (item.slug) {
													router.push(`/products/${item.slug}` as any)
												}
											}}
										>
											<Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
												{localize(item.name)}
											</Text>
										</TouchableOpacity>
										<TouchableOpacity onPress={() => handleRemove(item._id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
											<Ionicons name="trash-outline" size={16} color={colors.error} />
										</TouchableOpacity>
									</View>

									<View style={styles.itemFooter}>
										<Text style={[styles.productPrice, { color: colors.primary }]}>{(price * item.quantity).toFixed(2)} TND</Text>

										<View style={[styles.qtyRow, { backgroundColor: colors.surfaceVariant }]}>
											<TouchableOpacity onPress={() => onUpdateQuantity(item._id, item.quantity - 1)} style={styles.qtyBtn}>
												<Ionicons name="remove" size={14} color={colors.text} />
											</TouchableOpacity>
											<Text style={[styles.qtyVal, { color: colors.text }]}>{item.quantity}</Text>
											<TouchableOpacity onPress={() => onUpdateQuantity(item._id, item.quantity + 1)} style={styles.qtyBtn}>
												<Ionicons name="add" size={14} color={colors.text} />
											</TouchableOpacity>
										</View>
									</View>
								</View>
							</View>
						)
					})}
				</ScrollView>

				<View style={[styles.divider, { backgroundColor: colors.border }]} />

				<View style={styles.cardFooter}>
					<View>
						<Text style={[styles.totalLabel, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>
						<Text style={[styles.totalPrice, { color: colors.primary }]}>{groupTotal.toFixed(2)} TND</Text>
					</View>
					<TouchableOpacity onPress={() => onCheckout(group)} activeOpacity={0.75} style={styles.checkoutBtn} accessibilityLabel="Place order" accessibilityRole="button">
						<Ionicons name="checkmark-circle" size={36} color={colors.success} />
					</TouchableOpacity>
				</View>
			</View>
		</View>
	)
})

const styles = StyleSheet.create({
	cardContainer: {
		width: '100%',
		marginBottom: 16
	},
	card: {
		borderRadius: 28,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.06)',
		padding: 22,
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
	productList: {
		maxHeight: 180,
		flexGrow: 0
	},
	itemRow: {
		flexDirection: 'row',
		gap: 14,
		marginBottom: 18,
		padding: 10,
		borderRadius: 16,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.04)',
		backgroundColor: 'rgba(255, 255, 255, 0.01)'
	},
	productThumb: {
		width: 56,
		height: 56,
		borderRadius: 14,
		borderWidth: 1,
		borderColor: '#FFFFFF08'
	},
	itemDetails: {
		flex: 1,
		minWidth: 0,
		justifyContent: 'space-between'
	},
	itemHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'flex-start'
	},
	productName: {
		fontSize: 15,
		fontWeight: '700',
		letterSpacing: -0.2
	},
	itemFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 4
	},
	productPrice: {
		fontSize: 15,
		fontWeight: '800',
		letterSpacing: -0.1
	},
	qtyRow: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 2,
		borderRadius: 10,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.06)'
	},
	qtyBtn: {
		width: 28,
		height: 28,
		borderRadius: 8,
		justifyContent: 'center',
		alignItems: 'center'
	},
	qtyVal: {
		fontSize: 12,
		fontWeight: '700',
		minWidth: 20,
		textAlign: 'center'
	},
	cardFooter: {
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
	},
	checkoutBtn: {
		justifyContent: 'center',
		alignItems: 'center'
	}
})
