import React, { useState } from 'react'
import { View, Text, Button, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { ProductType } from './products.type'

type ProductCardProps = {
	item: ProductType
	addToBasket: (item: ProductType, quantity: number) => void
}

export default function ProductCard({ item, addToBasket }: { item: ProductType; addToBasket?: (item: ProductType, quantity: number) => void }) {
	const minQuantity = item.price?.unit?.min || 1
	const [quantity, setQuantity] = useState(minQuantity)

	const increment = () => setQuantity((prev) => prev + 1)
	const decrement = () => setQuantity((prev) => (prev > minQuantity ? prev - 1 : prev))

	return (
		<View style={styles.card}>
			{/* Product Photo */}
			{item.photos?.[0]?.url && <Image source={{ uri: item.photos[0].url }} style={styles.image} />}

			{/* Name and Shop */}
			<Text style={styles.cardTitle}>{item.name}</Text>
			<Text style={styles.cardText}>Shop: {item.shop?.name}</Text>

			{/* Price and Unit */}
			<Text style={styles.cardText}>
				{item.price?.value?.tnd || 0} TND / {item.price?.unit?.name || item.unit?.name || 'PIECE'}
			</Text>

			{/* Quantity Controls */}
			<View style={styles.quantityContainer}>
				<TouchableOpacity onPress={decrement} style={styles.quantityButton}>
					<Text style={styles.quantityButtonText}>-</Text>
				</TouchableOpacity>

				<Text style={styles.quantityText}>{quantity}</Text>

				<TouchableOpacity onPress={increment} style={styles.quantityButton}>
					<Text style={styles.quantityButtonText}>+</Text>
				</TouchableOpacity>
			</View>

			{/* Order Button */}
			<Button title="Order" onPress={() => addToBasket?.(item, quantity)} color="#007AFF" />
		</View>
	)
}

const styles = StyleSheet.create({
	card: {
		padding: 16,
		marginBottom: 12,
		borderRadius: 8,
		backgroundColor: '#fff',
		boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
	},
	image: {
		width: '100%',
		height: 150,
		borderRadius: 8,
		marginBottom: 8
	},
	cardTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		marginBottom: 4
	},
	cardText: {
		fontSize: 14,
		marginBottom: 4
	},
	quantityContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		width: 120,
		marginVertical: 10
	},
	quantityButton: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: '#ddd',
		alignItems: 'center',
		justifyContent: 'center'
	},
	quantityButtonText: {
		fontSize: 18,
		fontWeight: 'bold'
	},
	quantityText: {
		fontSize: 16,
		fontWeight: 'bold'
	}
})
