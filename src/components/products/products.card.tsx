import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform } from 'react-native'
import SmartImage from '../common/SmartImage'
import { MaterialIcons } from '@expo/vector-icons'
import { ProductFeedItem } from '../feed/feed.interface'
import { useTheme } from '../../contexts/ThemeContext'
import { useRouter } from 'expo-router'
import { useUser } from '../../contexts/UserContext'

type ProductCardProps = {
	item: ProductFeedItem
	addToBasket: (item: ProductFeedItem, quantity: number) => void
}

export default function ProductCard({ item, addToBasket }: ProductCardProps) {
	const { colors } = useTheme()
	const { localize, currency, formatPrice } = useUser()
	const router = useRouter()
	const { width } = useWindowDimensions()
	const styles = useMemo(() => createStyles(colors, width), [colors, width])

	const minQuantity = item.unit?.min || 1
	const maxQuantity = item.unit?.max || Infinity
	const [quantity, setQuantity] = useState(minQuantity)

	// @ts-ignore
	const unitPrice = item.price.total[currency] || item.price.total.tnd || 0
	const pricePerUnit = unitPrice / (item.unit?.min || 1)

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

	const isAvailable = item.stock.quantity > 0 && item.state.code === 'active'

	return (
		<View style={styles.card}>
			{/* Shop Header */}
			<TouchableOpacity onPress={handleShopPress} style={styles.shopHeader}>
				<View style={styles.shopInfo}>
					<Text style={styles.shopName} numberOfLines={1}>
						{localize(item.shop.name)}
					</Text>
					<Text style={styles.shopLocation} numberOfLines={1}>
						{item.shop.address?.city && item.shop.address?.country ? `${item.shop.address.city}, ${item.shop.address.country}` : 'Location not available'}
					</Text>
				</View>
				<View style={styles.shopIconContainer}>
					<MaterialIcons name="store" size={18} color={colors.primary} />
				</View>
			</TouchableOpacity>

			{/* Product Photo */}
			<View style={styles.imageContainer}>
				<SmartImage
					source={{ uri: item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url || item.photos?.[0] }}
					style={styles.productImage}
					resizeMode="cover"
					fallbackIcon="image-not-supported"
				/>
				{!isAvailable && (
					<View style={styles.unavailableOverlay}>
						<Text style={styles.unavailableText}>{item.state.code !== 'active' ? 'Unavailable' : 'Out of Stock'}</Text>
					</View>
				)}
			</View>

			{/* Product Info */}
			<View style={styles.productInfo}>
				{/* Product Name */}
				<View style={styles.productNameContainer}>
					<Text style={styles.productName} numberOfLines={2}>
						{localize(item.name)}
					</Text>
					{(item.name?.tn_latn || item.name?.tn_arab) && (
						<Text style={styles.productNameSecondary} numberOfLines={1}>
							{item.name?.tn_latn} {item.name?.tn_arab && `• ${item.name?.tn_arab}`}
						</Text>
					)}
				</View>

				{/* Price */}
				<View style={styles.priceContainer}>
					<Text style={styles.priceText} numberOfLines={1} adjustsFontSizeToFit>
						{formatPrice({ total: { [currency]: pricePerUnit } })}
					</Text>
					<Text style={styles.unitText}>/ {item.unit?.measure || 'unit'}</Text>
				</View>

				{/* Quantity Controls */}
				<View style={styles.quantityRow}>
					<View style={styles.quantityControls}>
						<TouchableOpacity onPress={decrement} style={styles.quantityButton} disabled={!isAvailable}>
							<MaterialIcons name="remove" size={20} color={isAvailable ? colors.text : colors.textDisabled} />
						</TouchableOpacity>
						<Text style={styles.quantityText}>
							{quantity} {item.unit?.measure || ''}
						</Text>
						<TouchableOpacity onPress={increment} style={styles.quantityButton} disabled={!isAvailable}>
							<MaterialIcons name="add" size={20} color={isAvailable ? colors.text : colors.textDisabled} />
						</TouchableOpacity>
					</View>
				</View>

				{/* Total & Add Button */}
				<View style={styles.footer}>
					<View style={styles.totalContainer}>
						<Text style={styles.totalLabel}>Total</Text>
						<Text style={styles.totalPrice}>{formatPrice({ total: { [currency]: pricePerUnit * quantity } })}</Text>
					</View>
					<TouchableOpacity style={[styles.addButton, !isAvailable && styles.addButtonDisabled]} onPress={() => isAvailable && addToBasket(item, quantity)} disabled={!isAvailable}>
						<MaterialIcons name={isAvailable ? 'add-shopping-cart' : 'remove-shopping-cart'} size={24} color="#fff" />
					</TouchableOpacity>
				</View>
			</View>
		</View>
	)
}

const createStyles = (colors: any, screenWidth: number) => {
	const isSmallScreen = screenWidth < 400
	const isMediumScreen = screenWidth >= 400 && screenWidth < 768
	const isLargeScreen = screenWidth >= 768

	return StyleSheet.create({
		card: {
			backgroundColor: colors.card,
			borderRadius: 16,
			overflow: 'hidden',
			borderWidth: 1,
			borderColor: colors.border,
			...Platform.select({
				ios: {
					shadowColor: colors.primary,
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.15,
					shadowRadius: 12
				},
				android: {
					elevation: 6
				},
				web: {
					boxShadow: `0 4px 12px ${colors.primary}15`
				}
			})
		},
		shopHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: colors.border
		},
		shopInfo: {
			flex: 1
		},
		shopName: {
			fontSize: isSmallScreen ? 14 : 15,
			fontWeight: '600',
			color: colors.text
		},
		shopLocation: {
			fontSize: isSmallScreen ? 11 : 12,
			color: colors.textSecondary,
			marginTop: 2
		},
		shopIconContainer: {
			width: 36,
			height: 36,
			borderRadius: 10,
			backgroundColor: colors.primaryContainer,
			justifyContent: 'center',
			alignItems: 'center'
		},
		imageContainer: {
			width: '100%',
			aspectRatio: isLargeScreen ? 1.8 : 1.5,
			backgroundColor: colors.surface,
			position: 'relative'
		},
		productImage: {
			width: '100%',
			height: '100%'
		},
		unavailableOverlay: {
			...StyleSheet.absoluteFillObject,
			backgroundColor: 'rgba(0,0,0,0.6)',
			justifyContent: 'center',
			alignItems: 'center'
		},
		unavailableText: {
			color: colors.error,
			fontSize: 16,
			fontWeight: '700',
			textTransform: 'uppercase'
		},
		productInfo: {
			padding: 16,
			gap: 12
		},
		productNameContainer: {
			minHeight: isSmallScreen ? 48 : 56
		},
		productName: {
			fontSize: isSmallScreen ? 18 : 20,
			fontWeight: '700',
			color: colors.text,
			lineHeight: isSmallScreen ? 24 : 26
		},
		productNameSecondary: {
			fontSize: isSmallScreen ? 12 : 13,
			color: colors.textSecondary,
			marginTop: 4
		},
		priceContainer: {
			flexDirection: 'row',
			alignItems: 'baseline',
			gap: 4
		},
		priceText: {
			fontSize: isSmallScreen ? 22 : 26,
			fontWeight: '800',
			color: colors.primary
		},
		unitText: {
			fontSize: isSmallScreen ? 13 : 14,
			color: colors.textSecondary,
			fontWeight: '500'
		},
		quantityRow: {
			paddingVertical: 8
		},
		quantityControls: {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: colors.surface,
			borderRadius: 12,
			padding: 4,
			alignSelf: 'flex-start',
			gap: 8
		},
		quantityButton: {
			width: 40,
			height: 40,
			borderRadius: 10,
			backgroundColor: colors.surfaceVariant,
			justifyContent: 'center',
			alignItems: 'center'
		},
		quantityText: {
			fontSize: 16,
			fontWeight: '600',
			color: colors.text,
			minWidth: 70,
			textAlign: 'center'
		},
		footer: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: colors.border
		},
		totalContainer: {
			flex: 1
		},
		totalLabel: {
			fontSize: 12,
			color: colors.textSecondary,
			fontWeight: '500'
		},
		totalPrice: {
			fontSize: isSmallScreen ? 18 : 20,
			fontWeight: '700',
			color: colors.text
		},
		addButton: {
			width: 56,
			height: 56,
			borderRadius: 14,
			backgroundColor: colors.primary,
			justifyContent: 'center',
			alignItems: 'center',
			...Platform.select({
				ios: {
					shadowColor: colors.primary,
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.4,
					shadowRadius: 8
				},
				android: {
					elevation: 6
				},
				web: {
					boxShadow: `0 4px 12px ${colors.primary}40`
				}
			})
		},
		addButtonDisabled: {
			backgroundColor: colors.surfaceVariant
		}
	})
}
