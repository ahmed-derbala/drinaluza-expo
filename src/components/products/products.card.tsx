import React, { useState } from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity, Dimensions } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { FeedItem } from '../feed/feed.interface'

type ProductCardProps = {
	item: FeedItem
	addToBasket: (item: FeedItem, quantity: number) => void
}

const { width } = Dimensions.get('window')
const CARD_WIDTH = width * 0.9

export default function ProductCard({ item, addToBasket }: ProductCardProps) {
	const minQuantity = item.price?.unit?.min || 1
	const [quantity, setQuantity] = useState(minQuantity)
	const pricePerUnit = item.price.value.tnd / item.price.unit.min

	const increment = () => setQuantity((prev) => prev + 1)
	const decrement = () => setQuantity((prev) => (prev > minQuantity ? prev - 1 : minQuantity))

	const calculateTotal = () => (pricePerUnit * quantity).toFixed(2)

	return (
		<View style={styles.card}>
			{/* Shop Header */}
			<View style={styles.shopHeader}>
				<View style={styles.shopInfo}>
					<Text style={styles.shopName}>{item.shop.name}</Text>
					<Text style={styles.shopLocation}>
						{item.shop.address.city}, {item.shop.address.country}
					</Text>
				</View>
				<MaterialIcons name="store" size={20} color="#666" />
			</View>

			{/* Product Photo */}
			<View style={styles.imageContainer}>
				{item.photos?.[0] ? (
					<Image source={{ uri: item.photos[0] }} style={styles.productImage} resizeMode="cover" />
				) : (
					<View style={styles.imagePlaceholder}>
						<MaterialIcons name="image-not-supported" size={40} color="#ccc" />
					</View>
				)}
			</View>

			{/* Product Info */}
			<View style={styles.productInfo}>
				<Text style={styles.productName}>{item.name}</Text>

				{/* Price and Unit */}
				<View style={styles.priceContainer}>
					<Text style={styles.priceText}>
						{pricePerUnit.toFixed(2)} TND / {item.price.unit.name}
					</Text>
					{item.stock.quantity <= 0 && <Text style={styles.outOfStock}>Out of Stock</Text>}
				</View>

				{/* Quantity Controls */}
				<View style={styles.quantityContainer}>
					<Text style={styles.quantityLabel}>Quantity:</Text>
					<View style={styles.quantityControls}>
						<TouchableOpacity onPress={decrement} style={styles.quantityButton}>
							<Text style={styles.quantityButtonText}>-</Text>
						</TouchableOpacity>
						<Text style={styles.quantityText}>
							{quantity} {item.price.unit.name}
						</Text>
						<TouchableOpacity onPress={increment} style={styles.quantityButton}>
							<Text style={styles.quantityButtonText}>+</Text>
						</TouchableOpacity>
					</View>
				</View>

				{/* Total Price */}
				<View style={styles.totalContainer}>
					<Text style={styles.totalLabel}>Total:</Text>
					<Text style={styles.totalPrice}>{calculateTotal()} TND</Text>
				</View>

				{/* Add to Cart Button */}
				<TouchableOpacity
					style={[styles.addToCartButton, item.stock.quantity <= 0 && styles.disabledButton]}
					onPress={() => item.stock.quantity > 0 && addToBasket(item, quantity)}
					disabled={item.stock.quantity <= 0}
				>
					<Text style={styles.addToCartText}>{item.stock.quantity > 0 ? 'Add to Cart' : 'Out of Stock'}</Text>
				</TouchableOpacity>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		backgroundColor: '#fff',
		borderRadius: 12,
		margin: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 3,
		width: CARD_WIDTH,
		alignSelf: 'center'
	},
	shopHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		padding: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0'
	},
	shopInfo: {
		flex: 1
	},
	shopName: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333'
	},
	shopLocation: {
		fontSize: 12,
		color: '#666',
		marginTop: 2
	},
	imageContainer: {
		width: '100%',
		height: CARD_WIDTH * 0.6,
		backgroundColor: '#f8f8f8',
		justifyContent: 'center',
		alignItems: 'center'
	},
	productImage: {
		width: '100%',
		height: '100%',
		borderRadius: 8
	},
	imagePlaceholder: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#f0f0f0'
	},
	productInfo: {
		padding: 16
	},
	productName: {
		fontSize: 18,
		fontWeight: '600',
		color: '#222',
		marginBottom: 8
	},
	priceContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16
	},
	priceText: {
		fontSize: 20,
		fontWeight: '700',
		color: '#2e7d32'
	},
	outOfStock: {
		color: '#d32f2f',
		fontWeight: '500',
		fontSize: 14
	},
	quantityContainer: {
		marginBottom: 16
	},
	quantityLabel: {
		fontSize: 14,
		color: '#555',
		marginBottom: 8
	},
	quantityControls: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	quantityButton: {
		width: 36,
		height: 36,
		borderRadius: 18,
		backgroundColor: '#f0f0f0',
		justifyContent: 'center',
		alignItems: 'center'
	},
	quantityButtonText: {
		fontSize: 18,
		fontWeight: '600',
		color: '#333'
	},
	quantityText: {
		marginHorizontal: 16,
		fontSize: 16,
		fontWeight: '500'
	},
	totalContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 16,
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0'
	},
	totalLabel: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333'
	},
	totalPrice: {
		fontSize: 18,
		fontWeight: '700',
		color: '#2e7d32'
	},
	addToCartButton: {
		backgroundColor: '#2e7d32',
		paddingVertical: 14,
		borderRadius: 8,
		alignItems: 'center',
		justifyContent: 'center'
	},
	disabledButton: {
		backgroundColor: '#9e9e9e'
	},
	addToCartText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600'
	}
})
