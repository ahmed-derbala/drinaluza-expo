import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, Pressable } from 'react-native'
import SmartImage from '../../core/helpers/SmartImage'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { ProductFeedItem } from '../feed/feed.interface'
import { useTheme } from '../../core/theme'
import { useRouter, usePathname } from 'expo-router'
import { useUser } from '../../core/contexts/UserContext'

type ProductCardProps = {
	item: ProductFeedItem
	addToCart: (item: ProductFeedItem, quantity: number) => void
}

export default function ProductCard({ item, addToCart }: ProductCardProps) {
	const { colors } = useTheme()
	const { localize, currency, formatPrice, translate } = useUser()
	const router = useRouter()
	const pathname = usePathname()
	const { width, height: windowHeight } = useWindowDimensions()
	const styles = useMemo(() => createStyles(colors, width, windowHeight), [colors, width, windowHeight])

	const minQuantity = item.unit?.min || 1
	const maxQuantity = item.unit?.max || Infinity
	const [quantity, setQuantity] = useState(minQuantity)

	const step = item.unit?.step || 1

	const rating = item.rating?.average || 0
	const ratingCount = item.rating?.count || 0

	// @ts-ignore
	const unitPrice = item.price.total[currency] || item.price.total.tnd || 0
	const pricePerUnit = unitPrice / (item.unit?.min || 1)

	const mainName = localize(item.name)
	const secondaryNames = useMemo(() => {
		if (!item.name) return []
		const allNames = [item.name?.en, item.name?.tn_latn, item.name?.tn_arab].filter(Boolean) as string[]
		return Array.from(new Set(allNames)).filter((n) => n !== mainName)
	}, [item.name, mainName])

	const increment = (e: any) => {
		e.stopPropagation?.()
		setQuantity((prev) => {
			const next = Math.round((prev + step) * 100) / 100
			return next <= maxQuantity ? next : prev
		})
	}

	const decrement = (e: any) => {
		e.stopPropagation?.()
		setQuantity((prev) => {
			const next = Math.round((prev - step) * 100) / 100
			return next >= minQuantity ? next : minQuantity
		})
	}

	const handleBusinessPress = () => {
		if (item.business?.slug) {
			router.push(`/businesses/${item.business.slug}` as any)
		}
	}

	const handleProductPress = () => {
		if (item.slug) {
			if (pathname.startsWith('/products')) {
				router.push(`/products/${item.slug}` as any)
			} else if (item.business?.slug) {
				router.push(`/businesses/${item.business.slug}/products/${item.slug}` as any)
			}
		}
	}

	const stockQty = item.stock?.quantity || 0
	const minThreshold = item.stock?.minThreshold || 5
	const isOutOfStock = stockQty === 0
	const isLowStock = stockQty > 0 && stockQty <= minThreshold
	const isActive = item.state?.code === 'active' || item.isActive !== false
	const purchaseAllowed = item.card?.purchase?.allowed !== false

	const stockColor = isOutOfStock ? colors.error : isLowStock ? colors.warning : colors.success
	const stockLabel = isOutOfStock ? translate('out_of_stock', 'Out of Stock') : isLowStock ? translate('low_stock', 'Low Stock') : translate('in_stock', 'In Stock')
	const stockIcon: any = isOutOfStock ? 'remove-shopping-cart' : isLowStock ? 'warning-amber' : 'check-circle'

	const imageUrl = item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url || item.photos?.[0]

	const showBusinessHeader = windowHeight >= 450
	const showRatingRow = windowHeight >= 500 && rating > 0
	const showSecondaryNames = windowHeight >= 550 && secondaryNames.length > 0
	const showFooter = windowHeight >= 480

	return (
		<Pressable style={({ pressed }) => [styles.card, pressed && { opacity: 0.95, transform: [{ scale: 0.99 }] }]} onPress={handleProductPress}>
			{/* Business Header */}
			{showBusinessHeader && (
				<TouchableOpacity onPress={handleBusinessPress} style={styles.businessHeader} activeOpacity={0.8}>
					<View style={styles.businessInfoWithImage}>
						{item.business?.media?.thumbnail?.url ? (
							<SmartImage source={item.business.media.thumbnail.url} style={styles.businessImage} resizeMode="cover" entityType="business" />
						) : (
							<View style={styles.businessIconContainer}>
								<MaterialIcons name="store" size={16} color={colors.primary} />
							</View>
						)}
						<View style={styles.businessInfo}>
							<Text style={styles.businessName} numberOfLines={1}>
								{localize(item.business?.name)}
							</Text>
							{item.business?.address?.city && (
								<Text style={styles.businessLocation} numberOfLines={1}>
									{item.business.address.city}
								</Text>
							)}
						</View>
					</View>
				</TouchableOpacity>
			)}

			{/* Image */}
			<View style={styles.imageWrap}>
				<SmartImage source={imageUrl} style={styles.productImage} resizeMode="cover" entityType="product" />
				{/* Stock overlay */}
				{(isOutOfStock || isLowStock) && (
					<View style={[styles.stockOverlay, { backgroundColor: isOutOfStock ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)' }]}>
						<View style={[styles.stockPill, { backgroundColor: stockColor + '22', borderColor: stockColor + '66' }]}>
							<MaterialIcons name={stockIcon} size={12} color={stockColor} />
							<Text style={[styles.stockPillText, { color: stockColor }]}>{stockLabel}</Text>
						</View>
					</View>
				)}
				{/* Active stock badge top-left */}
				{!isOutOfStock && !isLowStock && (
					<View style={[styles.inStockBadge, { backgroundColor: colors.success + '22', borderColor: colors.success + '44' }]}>
						<MaterialIcons name="check-circle" size={10} color={colors.success} />
						<Text style={[styles.inStockText, { color: colors.success }]}>{stockLabel}</Text>
					</View>
				)}
			</View>

			{/* Body */}
			<View style={styles.body}>
				<Text style={[styles.name, { color: colors.text }]} numberOfLines={2}>
					{mainName}
				</Text>
				{showSecondaryNames && (
					<Text style={[styles.nameAlt, { color: colors.textTertiary }]} numberOfLines={1}>
						{secondaryNames.join(' • ')}
					</Text>
				)}
				{showRatingRow && (
					<View style={styles.ratingRow}>
						<MaterialIcons name="star" size={12} color="#F59E0B" />
						<Text style={[styles.ratingText, { color: colors.text }]}>{rating.toFixed(1)}</Text>
						<Text style={[styles.ratingCount, { color: colors.textSecondary }]}>({ratingCount})</Text>
					</View>
				)}

				<View style={styles.priceRow}>
					<Text style={[styles.price, { color: colors.primary }]} adjustsFontSizeToFit numberOfLines={1}>
						{formatPrice({ total: { [currency]: pricePerUnit * quantity } })}
					</Text>
					{quantity === 1 && <Text style={[styles.unit, { color: colors.textSecondary }]}>/ {item.unit?.measure || translate('unit', 'unit')}</Text>}
				</View>

				{/* Quantity & Actions (Bottom of Price) */}
				{purchaseAllowed && isActive && !isOutOfStock && (
					<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: windowHeight < 550 ? 4 : 8, zIndex: 10 }}>
						<View style={[styles.quantityControlOuter, { backgroundColor: colors.surfaceVariant }]}>
							<TouchableOpacity onPress={decrement} style={styles.quantityBtn} activeOpacity={0.7}>
								<MaterialIcons name="remove" size={16} color={colors.text} />
							</TouchableOpacity>
							<Text style={[styles.quantityValue, { color: colors.text }]}>{quantity}</Text>
							<TouchableOpacity onPress={increment} style={styles.quantityBtn} activeOpacity={0.7}>
								<MaterialIcons name="add" size={16} color={colors.text} />
							</TouchableOpacity>
						</View>
						<TouchableOpacity
							style={[styles.addBtn, { backgroundColor: colors.primary }]}
							onPress={(e) => {
								e.stopPropagation?.()
								addToCart(item, quantity)
							}}
							activeOpacity={0.8}
						>
							<MaterialIcons name="add-shopping-cart" size={16} color={colors.textOnPrimary || '#0F172A'} />
						</TouchableOpacity>
					</View>
				)}

				{/* Footer with wrapping */}
				{showFooter && (
					<View style={styles.footer}>
						<View style={[styles.qtyBadge, { backgroundColor: colors.surfaceVariant }]}>
							<Ionicons name="cube-outline" size={12} color={colors.textSecondary} />
							<Text style={[styles.qtyText, { color: colors.textSecondary }]}>{stockQty}</Text>
						</View>
					</View>
				)}
			</View>
		</Pressable>
	)
}

const createStyles = (colors: any, screenWidth: number, windowHeight: number) => {
	const isCompact = windowHeight < 550
	return StyleSheet.create({
		card: {
			flex: 1,
			borderRadius: 20,
			borderWidth: 1.5,
			backgroundColor: colors.card,
			borderColor: colors.info || '#3B82F6',
			overflow: 'hidden',
			maxHeight: Math.max(220, windowHeight - 140),
			...Platform.select({
				ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 8 },
				android: { elevation: 3 },
				web: { boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'transform 0.1s ease' } as any
			})
		},
		businessHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 12,
			paddingVertical: isCompact ? 6 : 10,
			borderBottomWidth: 1,
			borderBottomColor: colors.border
		},
		businessInfoWithImage: {
			flexDirection: 'row',
			alignItems: 'center',
			flex: 1,
			gap: 10
		},
		businessImage: {
			width: 28,
			height: 28,
			borderRadius: 8,
			backgroundColor: colors.surface
		},
		businessIconContainer: {
			width: 28,
			height: 28,
			borderRadius: 8,
			backgroundColor: colors.primaryContainer,
			justifyContent: 'center',
			alignItems: 'center'
		},
		businessInfo: { flex: 1 },
		businessName: { fontSize: 13, fontWeight: '700', color: colors.text },
		businessLocation: { fontSize: 10, color: colors.textSecondary, marginTop: 1 },
		imageWrap: {
			width: '100%',
			aspectRatio: 1.35,
			maxHeight: Math.min(180, windowHeight * 0.22),
			position: 'relative'
		},
		productImage: { width: '100%', height: '100%' },
		stockOverlay: {
			...StyleSheet.absoluteFillObject,
			justifyContent: 'center',
			alignItems: 'center'
		},
		stockPill: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4,
			paddingHorizontal: 10,
			paddingVertical: 5,
			borderRadius: 20,
			borderWidth: 1
		},
		stockPillText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
		inStockBadge: {
			position: 'absolute',
			top: 8,
			left: 8,
			flexDirection: 'row',
			alignItems: 'center',
			gap: 3,
			paddingHorizontal: 7,
			paddingVertical: 3,
			borderRadius: 10,
			borderWidth: 1
		},
		inStockText: { fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
		body: { padding: isCompact ? 8 : 14, gap: isCompact ? 3 : 6 },
		name: { fontSize: isCompact ? 13 : 15, fontWeight: '700', lineHeight: isCompact ? 17 : 20, letterSpacing: -0.2 },
		nameAlt: { fontSize: 12, fontWeight: '500' },
		ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
		ratingText: { fontSize: 12, fontWeight: '600' },
		ratingCount: { fontSize: 11 },
		priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 2 },
		price: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, flexShrink: 1 },
		unit: { fontSize: 12, fontWeight: '500' },
		footer: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			flexWrap: 'wrap',
			gap: 6,
			marginTop: 4
		},
		qtyBadge: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4,
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 8
		},
		qtyText: { fontSize: 12, fontWeight: '600' },
		actionRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6,
			zIndex: 10
		},
		quantityControlOuter: {
			flexDirection: 'row',
			alignItems: 'center',
			borderRadius: 10,
			padding: 2
		},
		quantityBtn: {
			width: 28,
			height: 28,
			justifyContent: 'center',
			alignItems: 'center'
		},
		quantityValue: {
			fontSize: 13,
			fontWeight: '600',
			minWidth: 24,
			textAlign: 'center'
		},
		addBtn: {
			width: 36,
			height: 36,
			borderRadius: 10,
			justifyContent: 'center',
			alignItems: 'center',
			...Platform.select({ web: { boxShadow: '0 2px 8px rgba(56,189,248,0.35)' } as any })
		}
	})
}
