import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { FeedItem, ProductFeedItem } from './feed.interface'
import ProductCard from '../products/products.card'
import { useTheme } from '../../contexts/ThemeContext'

type FeedCardProps = {
	item: FeedItem
	addToBasket: (item: any, quantity: number) => void
}

export default function FeedCard({ item, addToBasket }: FeedCardProps) {
	const { colors, isDark } = useTheme()
	const cardType = item.card?.type || 'product'

	switch (cardType) {
		case 'product':
			return <ProductCard item={item as ProductFeedItem} addToBasket={addToBasket} />
		case 'shop':
			return (
				<View style={[styles.placeholderCard, { backgroundColor: isDark ? colors.card : '#fff', borderColor: colors.primary }]}>
					<Text style={{ color: colors.text }}>Shop Card Placeholder - {item.shop?.name?.en}</Text>
				</View>
			)
		case 'user':
			return (
				<View style={[styles.placeholderCard, { backgroundColor: isDark ? colors.card : '#fff', borderColor: colors.primary }]}>
					<Text style={{ color: colors.text }}>User Card Placeholder</Text>
				</View>
			)
		default:
			return (
				<View style={[styles.placeholderCard, { backgroundColor: isDark ? colors.card : '#fff', borderColor: colors.primary }]}>
					<Text style={{ color: colors.text }}>Unknown Card Type: {cardType}</Text>
				</View>
			)
	}
}

const styles = StyleSheet.create({
	placeholderCard: {
		height: 590, // Match the height of ProductCard for grid consistency
		borderRadius: 20,
		borderWidth: 2,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20
	}
})
