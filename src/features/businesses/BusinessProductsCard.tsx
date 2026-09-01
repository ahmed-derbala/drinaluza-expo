import React, { useCallback } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { FlashList as ShopifyFlashList } from '@shopify/flash-list'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { CARD } from '@/core/theme/constants'
import { useUser } from '@/core/contexts/UserContext'
import { ProductType } from '@/features/products/products.type'
import BusinessProductCard from './BusinessProductCard'
import { BaseCard } from '@/features/common/cards/BaseCard'

const FlashList = ShopifyFlashList as any

export interface BusinessProductsCardProps {
	products: ProductType[]
}

export function BusinessProductsCard({ products }: BusinessProductsCardProps) {
	const { colors } = useTheme()
	const { translate } = useUser()

	const renderProductCard = useCallback(
		({ item }: { item: ProductType }) => (
			<View style={{ width: CARD.width }}>
				<BusinessProductCard product={item} />
			</View>
		),
		[]
	)

	return (
		<BaseCard borderColor={colors.border} backgroundColor={colors.background} size={CARD.padding} contentStyle={styles.cardContent}>
			<View style={styles.header}>
				<View style={styles.titleRow}>
					<Ionicons name="fish-outline" size={20} color={colors.primary} />
					<Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
						{translate('business_products', 'Products')}
					</Text>
				</View>
				<View style={[styles.countBadge, { backgroundColor: colors.primary + '15' }]}>
					<Text style={[styles.countText, { color: colors.primary }]}>{products.length}</Text>
				</View>
			</View>
			{products.length > 0 ? (
				<FlashList
					horizontal
					showsHorizontalScrollIndicator={false}
					data={products}
					renderItem={renderProductCard}
					keyExtractor={(item: ProductType) => item._id}
					estimatedItemSize={CARD.width}
					ItemSeparatorComponent={() => <View style={{ width: CARD.gap }} />}
					contentContainerStyle={styles.listContent}
					style={styles.list}
				/>
			) : (
				<View style={styles.empty}>
					<Ionicons name="fish-outline" size={48} color={colors.textTertiary} />
					<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('no_products_available', 'No products available')}</Text>
				</View>
			)}
		</BaseCard>
	)
}

const styles = StyleSheet.create({
	cardContent: {
		padding: 0,
		gap: 0
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
		marginBottom: 10,
		gap: 8,
		alignSelf: 'stretch'
	},
	titleRow: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		minWidth: 0
	},
	title: {
		fontSize: 18,
		fontWeight: '700',
		flex: 1,
		textAlign: 'left'
	},
	countBadge: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12
	},
	countText: {
		fontSize: 14,
		fontWeight: '700'
	},
	list: {
		width: '100%'
	},
	listContent: {
		paddingRight: CARD.padding
	},
	empty: {
		alignItems: 'center',
		paddingVertical: 24,
		gap: 12
	},
	emptyText: {
		fontSize: 15,
		fontWeight: '500'
	}
})

export default BusinessProductsCard
