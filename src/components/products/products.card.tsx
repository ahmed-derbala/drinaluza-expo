import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import SmartImage from '../common/SmartImage'
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

	const minQuantity = item.unit?.min || 1
	const maxQuantity = item.unit?.max || Infinity
	const [quantity, setQuantity] = useState(minQuantity)
	const pricePerUnit = item.price.total.tnd / (item.unit?.min || 1)

	const isDecimal = ['kg', 'l', 'kilogram', 'liter'].includes(item.unit?.measure?.toLowerCase() || '')
	const step = isDecimal ? 0.1 : 1

	const increment = () =>
		setQuantity((prev) => {
			const next = Math.round((prev + step) * 100) / 100
			return next <= maxQuantity ? next : prev
		})
	const decrement = () =>
		setQuantity((prev) => {
			const next = Math.round((prev - step) * 100) / 100
			return next >= minQuantity ? next : minQuantity
		})

	const calculateTotal = () => (pricePerUnit * quantity).toFixed(2)

	return (
		<View style={styles.card}>
			{/* Shop Header */}
			<View style={styles.shopHeader}>
				<View style={styles.shopInfo}>
					<View style={styles.shopNameRow}>
						<Text style={styles.shopName}>{item.shop.name?.en}</Text>
						{item.shop.owner?.business?.name?.en && item.shop.owner.business.name.en !== item.shop.name?.en && <Text style={styles.businessName}> • {item.shop.owner.business.name.en}</Text>}
					</View>
					<Text style={styles.shopLocation}>{item.shop.address?.city && item.shop.address?.country ? `${item.shop.address.city}, ${item.shop.address.country}` : 'Location not available'}</Text>
				</View>
				<MaterialIcons name="store" size={20} color={isDark ? colors.textSecondary : '#666'} />
			</View>

			{/* Product Photo */}
			<View style={styles.imageContainer}>
				<SmartImage
					source={{ uri: item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url || item.photos?.[0] }}
					style={styles.productImage}
					resizeMode="cover"
					fallbackIcon="image-not-supported"
				/>
			</View>

			{/* Product Info */}
			<View style={styles.productInfo}>
				<View style={styles.productNameContainer}>
					<Text style={styles.productName}>{item.name?.en}</Text>
					{(item.name?.tn_latn || item.name?.tn_arab) && (
						<Text style={styles.productNameSecondary}>
							{item.name?.tn_latn} {item.name?.tn_arab && `• ${item.name?.tn_arab}`}
						</Text>
					)}
				</View>

				{/* Price and Unit */}
				<View style={styles.priceContainer}>
					<Text style={styles.priceText}>
						{pricePerUnit.toFixed(2)} TND / {item.unit?.measure || ''}
					</Text>
					{(item.stock.quantity <= 0 || item.state.code !== 'active') && <Text style={styles.outOfStock}>{item.state.code !== 'active' ? 'Unavailable' : 'Out of Stock'}</Text>}
				</View>

				{/* Quantity Controls */}
				<View style={styles.quantityContainer}>
					<Text style={styles.quantityLabel}>Quantity:</Text>
					<View style={styles.quantityControls}>
						<TouchableOpacity onPress={decrement} style={styles.quantityButton}>
							<Text style={styles.quantityButtonText}>-</Text>
						</TouchableOpacity>
						<Text style={styles.quantityText}>
							{quantity} {item.unit?.measure || ''}
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
					style={[styles.addToCartButton, (item.stock.quantity <= 0 || item.state.code !== 'active') && styles.disabledButton]}
					onPress={() => item.stock.quantity > 0 && item.state.code === 'active' && addToBasket(item, quantity)}
					disabled={item.stock.quantity <= 0 || item.state.code !== 'active'}
				>
					<Text style={styles.addToCartText}>{item.state.code !== 'active' ? 'Unavailable' : item.stock.quantity > 0 ? 'Add to Cart' : 'Out of Stock'}</Text>
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
		shopNameRow: {
			flexDirection: 'row',
			alignItems: 'center',
			flexWrap: 'wrap'
		},
		businessName: {
			fontSize: 13,
			fontWeight: '500',
			color: isDark ? colors.textSecondary : '#0288D1',
			marginLeft: 4
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
			color: isDark ? colors.text : '#01579B'
		},
		productNameContainer: {
			marginBottom: 8
		},
		productNameSecondary: {
			fontSize: 14,
			color: isDark ? colors.textSecondary : '#0288D1',
			marginTop: 2,
			fontWeight: '500'
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
