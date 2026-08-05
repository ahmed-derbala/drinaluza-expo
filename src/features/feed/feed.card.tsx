import React, { memo } from 'react'
import { FeedItem, ProductFeedItem } from './feed.interface'
import ProductCard from '@/features/products/products.card'

type FeedCardProps = {
	item: FeedItem
	addToCart: (item: any, quantity: number) => void
}

function FeedCard({ item, addToCart }: FeedCardProps) {
	return <ProductCard item={item as ProductFeedItem} addToCart={addToCart} />
}

export default memo(FeedCard)
