import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { FeedItem, ProductFeedItem } from './feed.interface'
import ProductCard from '../products/products.card'
import { useTheme } from '../../contexts/ThemeContext'
import { MaterialIcons } from '@expo/vector-icons'

type FeedCardProps = {
	item: FeedItem
	addToBasket: (item: any, quantity: number) => void
}

export default function FeedCard({ item, addToBasket }: FeedCardProps) {
	const { colors } = useTheme()
	const cardType = item.card?.type || 'product'

	switch (cardType) {
		case 'product':
			return <ProductCard item={item as ProductFeedItem} addToBasket={addToBasket} />
		case 'shop':
			return (
				<View style={[styles.placeholderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={[styles.placeholderIcon, { backgroundColor: colors.primaryContainer }]}>
						<MaterialIcons name="store" size={32} color={colors.primary} />
					</View>
					<Text style={[styles.placeholderTitle, { color: colors.text }]}>{item.shop?.name?.en || 'Shop'}</Text>
					<Text style={[styles.placeholderSubtitle, { color: colors.textSecondary }]}>Shop Card</Text>
				</View>
			)
		case 'user':
			return (
				<View style={[styles.placeholderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={[styles.placeholderIcon, { backgroundColor: colors.primaryContainer }]}>
						<MaterialIcons name="person" size={32} color={colors.primary} />
					</View>
					<Text style={[styles.placeholderTitle, { color: colors.text }]}>User Card</Text>
					<Text style={[styles.placeholderSubtitle, { color: colors.textSecondary }]}>Coming soon</Text>
				</View>
			)
		default:
			return (
				<View style={[styles.placeholderCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={[styles.placeholderIcon, { backgroundColor: colors.surfaceVariant }]}>
						<MaterialIcons name="help-outline" size={32} color={colors.textSecondary} />
					</View>
					<Text style={[styles.placeholderTitle, { color: colors.text }]}>Unknown Card</Text>
					<Text style={[styles.placeholderSubtitle, { color: colors.textSecondary }]}>Type: {cardType}</Text>
				</View>
			)
	}
}

const styles = StyleSheet.create({
	placeholderCard: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 24,
		alignItems: 'center',
		justifyContent: 'center',
		minHeight: 200
	},
	placeholderIcon: {
		width: 64,
		height: 64,
		borderRadius: 16,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16
	},
	placeholderTitle: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 4
	},
	placeholderSubtitle: {
		fontSize: 14
	}
})
