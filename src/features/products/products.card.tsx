import React, { useState, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, Pressable } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import SmartImage from '@/core/SmartImageViewer'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { ProductFeedItem } from '../feed/feed.interface'
import { useRouter, usePathname } from 'expo-router'
import { useUser } from '../../core/contexts/UserContext'
import ContactButtons from '@/features/common/ContactButtons'

type ProductCardProps = {
	item: ProductFeedItem
	addToCart: (item: ProductFeedItem, quantity: number) => void
}

export default function ProductCard({ item, addToCart }: ProductCardProps) {
	const { localize, currency, formatPrice, translate } = useUser()
	const router = useRouter()
	const pathname = usePathname()
	const { width } = useWindowDimensions()

	const minQuantity = item.unit?.min || 1
	const maxQuantity = item.unit?.max || Infinity
	const [quantity, setQuantity] = useState(minQuantity)
	const step = item.unit?.step || 1

	const rating = item.rating?.average || 0
	const ratingCount = item.rating?.count || 0

	// @ts-ignore
	const unitPrice = item.price?.total?.[currency] || item.price?.total?.tnd || 0
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

	const handleBusinessPress = (e?: any) => {
		e?.stopPropagation?.()
		if (item.business?.slug) {
			router.push(`/businesses/${item.business.slug}` as any)
		}
	}

	const handleProductPress = () => {
		if (item.slug) {
			if (pathname.startsWith('/products') || pathname.includes('/feed') || pathname === '/') {
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
	const isActive = item.state ? item.state.code === 'active' : item.isActive !== false
	const purchaseAllowed = item.card?.purchase?.allowed !== false

	const stockColor = isOutOfStock ? '#EF4444' : isLowStock ? '#F59E0B' : '#10B981'
	const stockLabel = isOutOfStock ? translate('out_of_stock', 'Out of Stock') : isLowStock ? translate('low_stock', 'Low Stock') : translate('in_stock', 'In Stock')
	const stockIcon: any = isOutOfStock ? 'remove-shopping-cart' : isLowStock ? 'warning-amber' : 'check-circle'

	const imageUrl = item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url || item.photos?.[0]

	const isSmall = width < 500

	// Build address line from structured address fields
	const addr = item.business?.address
	const addressLine = addr ? [addr.street, addr.city, addr.region].filter(Boolean).join(', ') : null

	return (
		<Pressable
			style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
			onPress={handleProductPress}
			accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
			accessibilityLabel={mainName}
		>
			{/* ── Business header ── */}
			<View style={styles.bizRow}>
				<TouchableOpacity onPress={handleBusinessPress} style={styles.bizLeft} activeOpacity={0.75}>
					{item.business?.media?.thumbnail?.url ? (
						<SmartImage source={item.business.media.thumbnail.url} style={styles.bizAvatar} resizeMode="cover" entityType="business" />
					) : (
						<View style={styles.bizAvatarFallback}>
							<MaterialIcons name="store" size={14} color="#0EA5E9" />
						</View>
					)}
					<View style={styles.bizInfo}>
						<Text style={styles.bizName} numberOfLines={2}>
							{localize(item.business?.name)}
						</Text>
						{item.business?.slug ? (
							<Text style={styles.bizSlug} numberOfLines={2}>
								@{item.business.slug}
							</Text>
						) : null}
					</View>
				</TouchableOpacity>
			</View>

			{/* Contact buttons row below name/slug */}
			{(item.business?.contact?.phone?.fullNumber || item.business?.contact?.whatsapp || item.business?.contact?.email || item.business?.location || item.business?.address) && (
				<View style={styles.bizContactRow}>
					<ContactButtons contact={item.business?.contact} location={item.business?.location} address={item.business?.address} />
				</View>
			)}

			{/* Address */}
			{addressLine ? (
				<View style={styles.addressRow}>
					<Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.35)" />
					<Text style={styles.bizAddress} numberOfLines={1}>
						{addressLine}
					</Text>
				</View>
			) : null}

			{/* ── Product image ── */}
			<View style={styles.imgWrap}>
				<SmartImage source={imageUrl} style={styles.img} resizeMode="cover" entityType="product" />

				<LinearGradient colors={['transparent', 'rgba(5,10,25,0.90)']} locations={[0.3, 1]} style={styles.imgOverlayBottom}>
					<Text style={styles.productNameOver} numberOfLines={2}>
						{mainName}
					</Text>
				</LinearGradient>

				{/* Stock overlay for out-of-stock / low-stock */}
				{(isOutOfStock || isLowStock) && (
					<View style={[styles.stockOverlay, { backgroundColor: isOutOfStock ? 'rgba(0,0,0,0.6)' : 'transparent' }]}>
						<View style={[styles.stockChip, { backgroundColor: stockColor + '1F', borderColor: stockColor + '55' }]}>
							<MaterialIcons name={stockIcon} size={11} color={stockColor} />
							<Text style={[styles.stockChipText, { color: stockColor }]}>{stockLabel}</Text>
						</View>
					</View>
				)}
			</View>

			{/* ── Body ── */}
			<View style={[styles.body, isSmall ? styles.bodySmall : styles.bodyNormal]}>
				{secondaryNames.length > 0 && (
					<Text style={styles.altName} numberOfLines={2}>
						{secondaryNames.join(' · ')}
					</Text>
				)}

				{/* Rating */}
				{rating > 0 && (
					<View style={styles.ratingRow}>
						{[1, 2, 3, 4, 5].map((star) => (
							<MaterialIcons key={star} name={star <= Math.round(rating) ? 'star' : 'star-border'} size={12} color="#FBBF24" />
						))}
						<Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
						<Text style={styles.ratingCount}>({ratingCount})</Text>
					</View>
				)}

				{/* Price */}
				<View style={styles.priceRow}>
					<Text style={[styles.price, isSmall ? styles.priceSmall : styles.priceNormal]} adjustsFontSizeToFit numberOfLines={1}>
						{formatPrice({ total: { [currency]: pricePerUnit * quantity } })}
					</Text>
					{quantity === 1 && <Text style={styles.priceUnit}>/ {item.unit?.measure || translate('unit', 'unit')}</Text>}
				</View>

				{/* Quantity + Cart action */}
				{purchaseAllowed && isActive && !isOutOfStock && (
					<View style={styles.actionRow}>
						<View style={styles.qtyControl}>
							<TouchableOpacity onPress={decrement} style={styles.qtyBtn} activeOpacity={0.7}>
								<MaterialIcons name="remove" size={14} color="rgba(255,255,255,0.7)" />
							</TouchableOpacity>
							<Text style={styles.qtyValue}>{quantity}</Text>
							<TouchableOpacity onPress={increment} style={styles.qtyBtn} activeOpacity={0.7}>
								<MaterialIcons name="add" size={14} color="rgba(255,255,255,0.7)" />
							</TouchableOpacity>
						</View>
						<TouchableOpacity
							style={styles.cartBtn}
							onPress={(e) => {
								e.stopPropagation?.()
								addToCart(item, quantity)
							}}
							activeOpacity={0.8}
						>
							<MaterialIcons name="add-shopping-cart" size={16} color="#ffffff" />
						</TouchableOpacity>
					</View>
				)}
			</View>
		</Pressable>
	)
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	card: {
		flex: 1,
		borderRadius: 20,
		backgroundColor: 'rgba(15, 23, 42, 0.65)',
		borderWidth: 1,
		borderColor: '#0EA5E9',
		overflow: 'hidden',
		...Platform.select({
			web: {
				transition: 'transform 0.15s ease, box-shadow 0.15s ease',
				backdropFilter: 'blur(20px)',
				WebkitBackdropFilter: 'blur(20px)'
			} as any
		})
	},
	cardPressed: {
		opacity: 0.95,
		transform: [{ scale: 0.985 }]
	},
	// ── Business row ──
	bizRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingTop: 12,
		paddingBottom: 4
	},
	bizContactRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		paddingHorizontal: 12,
		paddingBottom: 8,
		marginTop: -4
	},
	bizLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flex: 1,
		minWidth: 0
	},
	bizInfo: {
		flex: 1,
		minWidth: 0
	},
	bizAvatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(255, 255, 255, 0.05)'
	},
	bizAvatarFallback: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(14, 165, 233, 0.12)',
		justifyContent: 'center',
		alignItems: 'center'
	},
	bizName: {
		fontSize: 13,
		fontWeight: '700',
		color: '#FFF'
	},
	bizSlug: {
		fontSize: 10,
		color: 'rgba(255, 255, 255, 0.4)'
	},
	addressRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 12,
		paddingBottom: 8
	},
	bizAddress: {
		flex: 1,
		fontSize: 11,
		color: 'rgba(255, 255, 255, 0.35)'
	},
	// ── Image ──
	imgWrap: {
		width: '100%',
		aspectRatio: 1.35,
		position: 'relative',
		backgroundColor: 'rgba(255, 255, 255, 0.02)'
	},
	img: {
		width: '100%',
		height: '100%'
	},
	imgOverlayBottom: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		paddingHorizontal: 10,
		paddingBottom: 10,
		paddingTop: 32
	},
	productNameOver: {
		fontSize: 16,
		fontWeight: '800',
		color: '#FFF',
		...Platform.select({
			web: {
				textShadow: '0px 1px 2px rgba(0,0,0,0.5)'
			} as any,
			default: {
				textShadowColor: 'rgba(0,0,0,0.5)',
				textShadowOffset: { width: 0, height: 1 },
				textShadowRadius: 2
			}
		})
	},
	stockOverlay: {
		...StyleSheet.absoluteFill,
		justifyContent: 'center',
		alignItems: 'center'
	},
	stockChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		borderWidth: 1
	},
	stockChipText: {
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	// ── Body ──
	body: {
		gap: 6
	},
	bodyNormal: {
		padding: 14
	},
	bodySmall: {
		padding: 12
	},
	altName: {
		fontSize: 11,
		fontWeight: '500',
		color: 'rgba(255, 255, 255, 0.35)'
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		marginTop: 2
	},
	ratingValue: {
		fontSize: 11,
		fontWeight: '700',
		color: '#FBBF24',
		marginLeft: 2
	},
	ratingCount: {
		fontSize: 10,
		color: 'rgba(255, 255, 255, 0.35)'
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 3,
		marginTop: 4
	},
	price: {
		fontWeight: '800',
		color: '#0EA5E9',
		letterSpacing: -0.5,
		flexShrink: 1
	},
	priceNormal: {
		fontSize: 20
	},
	priceSmall: {
		fontSize: 18
	},
	priceUnit: {
		fontSize: 11,
		fontWeight: '500',
		color: 'rgba(255, 255, 255, 0.35)'
	},
	// ── Quantity + Cart ──
	actionRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 8
	},
	qtyControl: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.03)',
		borderRadius: 12,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.06)',
		padding: 2
	},
	qtyBtn: {
		width: 28,
		height: 28,
		justifyContent: 'center',
		alignItems: 'center'
	},
	qtyValue: {
		fontSize: 13,
		fontWeight: '700',
		color: '#F8FAFC',
		minWidth: 26,
		textAlign: 'center'
	},
	cartBtn: {
		width: 36,
		height: 36,
		borderRadius: 12,
		backgroundColor: '#0EA5E9',
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				boxShadow: '0 2px 10px rgba(14, 165, 233, 0.35)',
				transition: 'transform 0.12s ease'
			} as any
		})
	}
})
