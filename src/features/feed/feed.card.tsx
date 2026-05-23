import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { FeedItem, ProductFeedItem, BusinessFeedItem, UserFeedItem } from './feed.interface'
import ProductCard from '../products/products.card'
import BusinessCard from './businesses.card'
import UserCard from './users.card'
import { useTheme } from '../../core/theme'
import { MaterialIcons } from '@expo/vector-icons'
import { useUser } from '../../core/contexts/UserContext'

type FeedCardProps = {
	item: FeedItem
	addToCart: (item: any, quantity: number) => void
}

export default function FeedCard({ item, addToCart }: FeedCardProps) {
	const { translate } = useUser()
	const { colors } = useTheme()
	const cardType = item.card?.kind || 'product'

	switch (cardType) {
		case 'product':
			return <ProductCard item={item as ProductFeedItem} addToCart={addToCart} />
		case 'business':
			return <BusinessCard item={item as BusinessFeedItem} />
		case 'user':
			return <UserCard item={item as UserFeedItem} />
		default:
			return (
				<View style={[styles.placeholderCard, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]}>
					<View style={[styles.placeholderIcon, { backgroundColor: colors.surfaceVariant }]}>
						<MaterialIcons name="help-outline" size={32} color={colors.textSecondary} />
					</View>
					<Text style={[styles.placeholderTitle, { color: colors.text }]}>{translate('unknown_card', 'Unknown Card')}</Text>
					<Text style={[styles.placeholderSubtitle, { color: colors.textSecondary }]}>
						{translate('type', 'Type')}: {cardType}
					</Text>
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
