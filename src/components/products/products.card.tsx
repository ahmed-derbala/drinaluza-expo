import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native'
import { MaterialIcons } from '@expo/vector-icons'
import { FeedItem } from '../feed/feed.interface'
import { useTheme } from '../../contexts/ThemeContext'

type ProductCardProps = {
	item: FeedItem
	addToBasket: (item: FeedItem, quantity: number) => void
}

export default function ProductCard({ item, addToBasket }: ProductCardProps) {
	const { colors, isDark } = useTheme()
	const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark])

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
					<Text style={styles.shopLocation}>{item.shop.address?.city && item.shop.address?.country ? `${item.shop.address.city}, ${item.shop.address.country}` : 'Location not available'}</Text>
				</View>
				<MaterialIcons name="store" size={20} color={isDark ? colors.textSecondary : '#666'} />
			</View>

			{/* Product Photo */}
			<View style={styles.imageContainer}>
				{item.DefaultProduct?.images?.thumbnail?.url || item.photos?.[0] ? (
					<Image source={{ uri: item.DefaultProduct?.images?.thumbnail?.url || item.photos[0] }} style={styles.productImage} resizeMode="cover" />
				) : (
					<View style={styles.imagePlaceholder}>
						<MaterialIcons name="image-not-supported" size={40} color={isDark ? colors.textTertiary : '#ccc'} />
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

const createStyles = (colors: any, isDark: boolean) =>
	StyleSheet.create({
		card: {
			backgroundColor: isDark ? colors.card : '#E3F2FD', // Dark Theme Card vs Sky Blue 50
			borderRadius: 16,
			shadowColor: isDark ? '#000' : '#0288D1',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: isDark ? 0.3 : 0.15,
			shadowRadius: 8,
			elevation: 5,
			width: '100%',
			borderWidth: 1,
			borderColor: isDark ? colors.border : '#B3E5FC'
		},
		shopHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			padding: 12,
			borderBottomWidth: 1,
			borderBottomColor: isDark ? colors.border : '#B3E5FC'
		},
		shopInfo: {
			flex: 1
		},
		shopName: {
			fontSize: 16,
			fontWeight: '700',
			color: isDark ? colors.text : '#01579B' // Text Color vs Light Blue 900
		},
		shopLocation: {
			fontSize: 12,
			color: isDark ? colors.textSecondary : '#0277BD', // Secondary Text vs Light Blue 800
			marginTop: 2
		},
		imageContainer: {
			width: '100%',
			aspectRatio: 1.6,
			backgroundColor: isDark ? '#2a2a2a' : '#E1F5FE',
			justifyContent: 'center',
			alignItems: 'center'
		},
		productImage: {
			width: '100%',
			height: '100%',
			borderRadius: 0
		},
		imagePlaceholder: {
			width: '100%',
			height: '100%',
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: isDark ? '#2a2a2a' : '#E1F5FE'
		},
		productInfo: {
			padding: 16
		},
		productName: {
			fontSize: 20,
			fontWeight: '700',
			color: isDark ? colors.text : '#01579B',
			marginBottom: 8
		},
		priceContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 16
		},
		priceText: {
			fontSize: 22,
			fontWeight: '800',
			color: isDark ? colors.primary : '#0288D1' // Primary vs Light Blue 700
		},
		outOfStock: {
			color: colors.error || '#D32F2F',
			fontWeight: '600',
			fontSize: 14
		},
		quantityContainer: {
			marginBottom: 16
		},
		quantityLabel: {
			fontSize: 14,
			color: isDark ? colors.textSecondary : '#0277BD',
			marginBottom: 8,
			fontWeight: '600'
		},
		quantityControls: {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#B3E5FC',
			borderRadius: 12,
			padding: 4,
			alignSelf: 'flex-start'
		},
		quantityButton: {
			width: 36,
			height: 36,
			borderRadius: 10,
			backgroundColor: isDark ? colors.card : '#fff',
			justifyContent: 'center',
			alignItems: 'center',
			shadowColor: isDark ? '#000' : '#0288D1',
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.2,
			shadowRadius: 2,
			elevation: 2
		},
		quantityButtonText: {
			fontSize: 20,
			fontWeight: '600',
			color: isDark ? colors.text : '#0277BD'
		},
		quantityText: {
			marginHorizontal: 20,
			fontSize: 16,
			fontWeight: '700',
			color: isDark ? colors.text : '#01579B'
		},
		totalContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 16,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: isDark ? colors.border : '#B3E5FC'
		},
		totalLabel: {
			fontSize: 16,
			fontWeight: '600',
			color: isDark ? colors.textSecondary : '#0277BD'
		},
		totalPrice: {
			fontSize: 20,
			fontWeight: '800',
			color: isDark ? colors.primary : '#01579B'
		},
		addToCartButton: {
			backgroundColor: isDark ? colors.primary : '#039BE5', // Primary vs Light Blue 600
			paddingVertical: 16,
			borderRadius: 12,
			alignItems: 'center',
			justifyContent: 'center',
			shadowColor: isDark ? colors.primary : '#039BE5',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 8,
			elevation: 6
		},
		disabledButton: {
			backgroundColor: isDark ? '#444' : '#B0BEC5'
		},
		addToCartText: {
			color: '#fff',
			fontSize: 18,
			fontWeight: '700',
			letterSpacing: 0.5
		}
	})
