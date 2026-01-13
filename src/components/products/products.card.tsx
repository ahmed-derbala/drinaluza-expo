import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import SmartImage from '../common/SmartImage'
import { MaterialIcons } from '@expo/vector-icons'
import { ProductFeedItem } from '../feed/feed.interface'
import { useTheme } from '../../contexts/ThemeContext'
import { useRouter } from 'expo-router'

type ProductCardProps = {
	item: ProductFeedItem
	addToBasket: (item: ProductFeedItem, quantity: number) => void
}

export default function ProductCard({ item, addToBasket }: ProductCardProps) {
	const { colors, isDark } = useTheme()
	const router = useRouter()
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

	const handleShopPress = () => {
		if (item.shop?.slug) {
			router.push(`/home/shops/${item.shop.slug}` as any)
		}
	}

	return (
		<View style={styles.card}>
			{/* Shop Header */}
			<View style={styles.shopHeader}>
				<View style={styles.shopInfo}>
					<TouchableOpacity onPress={handleShopPress}>
						<Text style={styles.shopName} numberOfLines={1}>
							{item.shop.name?.en}
						</Text>
					</TouchableOpacity>
					<Text style={styles.shopLocation} numberOfLines={1}>
						{item.shop.address?.city && item.shop.address?.country ? `${item.shop.address.city}, ${item.shop.address.country}` : 'Location not available'}
					</Text>
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
				<View>
					<View style={styles.productNameContainer}>
						<Text style={styles.productName} numberOfLines={2}>
							{item.name?.en}
						</Text>
						{(item.name?.tn_latn || item.name?.tn_arab) && (
							<Text style={styles.productNameSecondary} numberOfLines={1}>
								{item.name?.tn_latn} {item.name?.tn_arab && `• ${item.name?.tn_arab}`}
							</Text>
						)}
					</View>

					{/* Price and Unit */}
					<View style={styles.priceContainer}>
						<Text style={styles.priceText} numberOfLines={1} adjustsFontSizeToFit>
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
				</View>

				<View>
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
						<MaterialIcons name={item.stock.quantity <= 0 || item.state.code !== 'active' ? 'remove-shopping-cart' : 'add-shopping-cart'} size={24} color="#fff" />
					</TouchableOpacity>
				</View>
			</View>
		</View>
	)
}

const createStyles = (colors: any, isDark: boolean) =>
	StyleSheet.create({
		card: {
			backgroundColor: isDark ? colors.card : '#FFFFFF',
			borderRadius: 20,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 10 },
			shadowOpacity: isDark ? 0.4 : 0.1,
			shadowRadius: 20,
			elevation: 8,
			width: '100%',
			borderWidth: 2,
			borderColor: colors.primary, // Blue outline
			height: 590, // Balanced height for stability and space
			flex: 1,
			overflow: 'hidden'
		},
		shopHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: isDark ? 'rgba(255,255,255,0.1)' : colors.primary + '15', // Subtle blue divider
			height: 56 // More compact header
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
			paddingHorizontal: 16,
			paddingTop: 12,
			paddingBottom: 16,
			flex: 1,
			justifyContent: 'space-between'
		},
		productName: {
			fontSize: 22,
			fontWeight: '800',
			color: isDark ? colors.text : '#01579B',
			lineHeight: 28
		},
		productNameContainer: {
			marginBottom: 8,
			height: 60, // Optimized height
			justifyContent: 'center'
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
			marginBottom: 10
		},
		priceText: {
			fontSize: 24,
			fontWeight: '900',
			color: colors.primary,
			flex: 1,
			marginRight: 8
		},
		outOfStock: {
			color: colors.error || '#D32F2F',
			fontWeight: '600',
			fontSize: 14
		},
		quantityContainer: {
			marginBottom: 12
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
			marginBottom: 12,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : colors.primary + '15' // Subtle blue divider
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
			paddingVertical: 14, // Slightly balanced standard size
			borderRadius: 12,
			alignItems: 'center',
			justifyContent: 'center',
			shadowColor: isDark ? colors.primary : '#039BE5',
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 8,
			elevation: 6,
			minHeight: 48,
			minWidth: 48
		},
		disabledButton: {
			backgroundColor: isDark ? '#444' : '#B0BEC5'
		}
	})
