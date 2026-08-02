import React, { useState, useMemo, useRef, useEffect } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, Pressable } from 'react-native'
import SmartImage from '@/core/SmartImageViewer'
import { getCaliberLabel, getCaliberIconSize, getCaliberFontSize, getHarvestLabel, getHarvestIcon, getGearLabel } from '@/features/products/products.helpers'
import { GearIcon } from './common/GearIcons'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { ProductFeedItem } from '../feed/feed.interface'
import { useRouter, usePathname } from 'expo-router'
import { useUser } from '../../core/contexts/UserContext'
import { setCacheItem } from '@/core/cache'
import { PhoneButton } from '@/features/common/buttons/PhoneButton'
import { WhatsAppButton } from '@/features/common/buttons/WhatsAppButton'
import { WebsiteButton } from '@/features/common/buttons/WebsiteButton'
import { DirectionsButton } from '@/features/common/buttons/DirectionsButton'
import { useTheme, colors as themeColors } from '@/core/theme'
import { LinearGradient } from 'expo-linear-gradient'

type ProductCardProps = {
	item: ProductFeedItem
	addToCart: (item: ProductFeedItem, quantity: number) => void
}

const ProductCard = React.memo(function ProductCard({ item, addToCart }: ProductCardProps) {
	const { localize, currency, formatPrice, translate } = useUser()
	const { colors } = useTheme()
	const router = useRouter()
	const pathname = usePathname()
	const { width } = useWindowDimensions()
	const [activeImageIndex, setActiveImageIndex] = useState(0)
	const [autoplayEnabled, setAutoplayEnabled] = useState(true)

	const images = useMemo(() => {
		const list: string[] = []
		if (item.media?.thumbnail?.url) {
			list.push(item.media.thumbnail.url)
		} else if (item.defaultProduct?.media?.thumbnail?.url) {
			list.push(item.defaultProduct.media.thumbnail.url)
		}
		const gallery = (item as any).media?.gallery
		if (gallery && Array.isArray(gallery)) {
			gallery.forEach((g: any) => {
				if (g.url && !list.includes(g.url)) {
					list.push(g.url)
				}
			})
		}
		return list
	}, [item.media, item.defaultProduct])

	const autoplayTimerRef = useRef<any>(null)

	const startAutoplay = () => {
		stopAutoplay()
		if (!autoplayEnabled || images.length <= 1) return
		autoplayTimerRef.current = setInterval(() => {
			setActiveImageIndex((prevIndex) => (prevIndex + 1) % images.length)
		}, 4000)
	}

	const stopAutoplay = () => {
		if (autoplayTimerRef.current) {
			clearInterval(autoplayTimerRef.current)
			autoplayTimerRef.current = null
		}
	}

	const minQuantity = item.unit?.min || 1
	const maxQuantity = item.unit?.max || Infinity
	const [quantity, setQuantity] = useState(minQuantity)
	const step = item.unit?.step || 1

	useEffect(() => {
		startAutoplay()
		return () => stopAutoplay()
	}, [images.length, autoplayEnabled])

	useEffect(() => {
		setActiveImageIndex(0)
		setAutoplayEnabled(true)
	}, [images])

	useEffect(() => {
		setQuantity(minQuantity)
	}, [item._id, minQuantity])

	const handlePreviewPress = (e: any, index: number) => {
		e.stopPropagation?.()
		// User interacted (preview tap), stop autoplay permanently
		stopAutoplay()
		setAutoplayEnabled(false)
		setActiveImageIndex(index)
	}

	const rating = item.rating?.average || 0
	const ratingCount = item.rating?.count || 0

	// @ts-ignore
	const unitPrice = item.price?.total?.[currency] || item.price?.total?.tnd || 0
	const pricePerUnit = unitPrice / (item.unit?.min || 1)

	const singlePiece = item.unit?.singlePiece
	const singlePieceAvg = useMemo(() => {
		if (!singlePiece) return undefined
		if (singlePiece.avgWeightKg != null) return singlePiece.avgWeightKg
		if (singlePiece.minWeightKg != null && singlePiece.maxWeightKg != null) return (singlePiece.minWeightKg + singlePiece.maxWeightKg) / 2
		return undefined
	}, [singlePiece])

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
			// Seed the product detail cache with what we already have from the feed so
			// the detail screen can render instantly instead of waiting on a fresh fetch.
			setCacheItem(`product:${item.slug}`, { status: 200, data: item })

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
	const cartDisabled = !purchaseAllowed || !isActive || isOutOfStock

	const stockColor = isOutOfStock ? themeColors.error : isLowStock ? themeColors.warning : themeColors.success
	const stockLabel = isOutOfStock ? translate('out_of_stock', 'Out of Stock') : isLowStock ? translate('low_stock', 'Low Stock') : translate('in_stock', 'In Stock')
	const stockIcon: any = isOutOfStock ? 'remove-shopping-cart' : isLowStock ? 'warning-amber' : 'check-circle'

	const imageUrl = item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url

	const isSmall = width < 500

	// Build address line from structured address fields
	const addr = item.business?.address
	const addressLine = addr ? [addr.street, addr.city, addr.region].filter(Boolean).join(', ') : null

	return (
		<Pressable
			style={[styles.card, { backgroundColor: colors.background }]}
			onPress={handleProductPress}
			accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
			accessibilityLabel={mainName}
		>
			{/* Background image */}
			<View style={styles.bgImageContainer}>
				<SmartImage source={images.length > 1 ? images[activeImageIndex] : imageUrl} style={styles.bgImage} resizeMode="cover" entityType="product" />
			</View>

			{/* Gradient overlay for text readability */}
			<LinearGradient
				colors={[themeColors.background50, themeColors.background25, themeColors.background75]}
				start={{ x: 0, y: 0 }}
				end={{ x: 0, y: 1 }}
				style={[styles.bgOverlay, { pointerEvents: 'none' }]}
			/>

			{/* Top content */}
			<View style={styles.topContent}>
				{/* ── Business header ── */}
				<View style={styles.bizRow}>
					<TouchableOpacity onPress={handleBusinessPress} style={styles.bizLeft} activeOpacity={0.75}>
						{item.business?.media?.thumbnail?.url ? (
							<SmartImage source={item.business.media.thumbnail.url} style={styles.bizAvatar} resizeMode="cover" entityType="business" />
						) : (
							<View style={styles.bizAvatarFallback}>
								<MaterialIcons name="store" size={14} color={themeColors.primary} />
							</View>
						)}
						<View style={styles.bizInfo}>
							<Text style={styles.bizName} numberOfLines={2}>
								{localize(item.business?.name)}
							</Text>
							{item.business?.slug ? (
								<Text style={styles.bizSlug} numberOfLines={2}>
									{item.business.slug}
								</Text>
							) : null}
						</View>
					</TouchableOpacity>
				</View>

				{/* Address */}
				{addressLine ? (
					<View style={styles.addressRow}>
						<Ionicons name="location-outline" size={11} color={themeColors.buttonText40} />
						<Text style={styles.bizAddress} numberOfLines={1}>
							{addressLine}
						</Text>
					</View>
				) : null}
			</View>

			{/* Stock overlay */}
			{(isOutOfStock || isLowStock) && (
				<View style={[styles.stockOverlay, { backgroundColor: isOutOfStock ? themeColors.background50 : 'transparent', pointerEvents: 'none' }]}>
					<View style={[styles.stockChip, { backgroundColor: stockColor + '1F', borderColor: stockColor + '55' }]}>
						<MaterialIcons name={stockIcon} size={11} color={stockColor} />
						<Text style={[styles.stockChipText, { color: stockColor }]}>{stockLabel}</Text>
					</View>
				</View>
			)}

			{/* Contact buttons - right side */}
			{(item.business?.contact?.phone?.fullNumber || item.business?.contact?.whatsapp || item.business?.contact?.website || item.business?.location || item.business?.address) && (
				<View style={styles.contactButtonsSide}>
					<View style={{ flexDirection: 'column', alignItems: 'center', gap: 6 }}>
						<PhoneButton phone={item.business?.contact?.phone} size={36} />
						<WhatsAppButton whatsapp={item.business?.contact?.whatsapp} size={36} />
						<WebsiteButton website={item.business?.contact?.website} size={36} />
						<DirectionsButton location={item.business?.location} address={item.business?.address} size={36} />
					</View>
				</View>
			)}

			{/* Bottom content */}
			<View style={styles.bottomContent}>
				{/* ── Body ── */}
				<View style={[styles.body, isSmall ? styles.bodySmall : styles.bodyNormal]}>
					<View style={styles.bodyTop}>
						<Text style={styles.productName} numberOfLines={2}>
							{mainName}
						</Text>

						{/* Rating — always rendered for stable layout */}
						<View style={styles.ratingRow}>
							{rating > 0 ? (
								<>
									<MaterialIcons name="star" size={12} color={themeColors.warning} />
									<Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
									<Text style={styles.ratingCount}>({ratingCount})</Text>
								</>
							) : null}
						</View>

						{/* Specs row: caliber + weight, then harvest/gear/origin */}
						<View style={styles.specsStepperRow}>
							<View style={styles.specsRowTop}>
								<View style={styles.specsIconRow}>
									{item.specs?.caliber ? (
										<View style={{ justifyContent: 'center', alignItems: 'center' }}>
											<Ionicons name="fish" size={getCaliberIconSize(item.specs.caliber, 'chip')} color={colors.primary} />
											<Text
												style={{
													position: 'absolute',
													fontSize: getCaliberFontSize(item.specs.caliber, 'chip'),
													fontWeight: 'bold',
													color: themeColors.buttonText,
													textAlign: 'center',
													includeFontPadding: false,
													textAlignVertical: 'center'
												}}
											>
												{item.specs.caliber}
											</Text>
										</View>
									) : null}
									{singlePieceAvg != null && <Text style={[styles.weightChipText, { color: colors.primary }]}>~ {singlePieceAvg.toFixed(2)} kg/piece</Text>}
								</View>
								{purchaseAllowed && isActive && !isOutOfStock && (
									<View style={styles.qtyControl}>
										<TouchableOpacity onPress={decrement} style={styles.qtyBtn} activeOpacity={0.7}>
											<MaterialIcons name="remove" size={16} color={themeColors.buttonText} />
										</TouchableOpacity>
										<Text style={styles.qtyValue}>{quantity}</Text>
										<TouchableOpacity onPress={increment} style={styles.qtyBtn} activeOpacity={0.7}>
											<MaterialIcons name="add" size={16} color={themeColors.buttonText} />
										</TouchableOpacity>
									</View>
								)}
							</View>
							{(item.specs?.harvest || item.specs?.origin?.city || item.specs?.gear) && (
								<View style={styles.specsRowBottom}>
									{item.specs?.harvest ? <Ionicons name={getHarvestIcon(item.specs.harvest)} size={14} color={colors.success} /> : null}
									{item.specs?.gear ? <GearIcon type={item.specs.gear} size={14} color={colors.primary} /> : null}
									{item.specs?.origin?.city ? (
										<>
											<Ionicons name="location-outline" size={10} color={colors.textSecondary} />
											<Text style={[styles.originChipText, { color: colors.textSecondary }]}>{item.specs.origin.city}</Text>
										</>
									) : null}
								</View>
							)}
						</View>
					</View>

					<View style={styles.bodyBottom}>
						{/* Price bottom-left */}
						<View style={styles.priceRow}>
							<Text style={[styles.price, isSmall ? styles.priceSmall : styles.priceNormal]} adjustsFontSizeToFit numberOfLines={1}>
								{formatPrice({ total: { [currency]: pricePerUnit * quantity } })}
							</Text>
							<Text style={styles.priceUnit} numberOfLines={1}>
								{quantity === 1 ? `/ ${item.unit?.measure || translate('unit', 'unit')}` : `${quantity} ${item.unit?.measure || translate('unit', 'unit')}`}
							</Text>
						</View>

						<TouchableOpacity
							style={[styles.cartBtn, cartDisabled && styles.cartBtnDisabled]}
							onPress={(e) => {
								e.stopPropagation?.()
								if (!cartDisabled) {
									addToCart(item, quantity)
								}
							}}
							activeOpacity={cartDisabled ? 1 : 0.8}
							disabled={cartDisabled}
							accessibilityLabel={translate('add_to_cart', 'Add to cart')}
						>
							<MaterialIcons name="add-shopping-cart" size={18} color={themeColors.buttonText} />
						</TouchableOpacity>
					</View>
				</View>

				{/* Thumbnail previews */}
				{images.length > 1 && (
					<View style={styles.previewsContainer}>
						{images.map((url, index) => (
							<TouchableOpacity
								key={index}
								onPress={(e) => handlePreviewPress(e, index)}
								activeOpacity={0.8}
								style={[styles.previewThumb, { borderColor: index === activeImageIndex ? colors.primary : themeColors.buttonText30, opacity: index === activeImageIndex ? 1 : 0.6 }]}
							>
								<SmartImage source={url} style={styles.previewImg} resizeMode="cover" entityType="product" />
							</TouchableOpacity>
						))}
					</View>
				)}
			</View>
		</Pressable>
	)
})

export default ProductCard

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	card: {
		flex: 1,
		borderRadius: 20,
		borderWidth: 1,
		borderColor: themeColors.primary,
		overflow: 'hidden',
		justifyContent: 'space-between',
		minHeight: 340
	},
	cardPressed: {
		opacity: 0.95,
		transform: [{ scale: 0.985 }]
	},
	// ── Business row ──
	bizRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingTop: 8,
		paddingBottom: 2
	},
	contactButtonsSide: {
		position: 'absolute',
		right: 8,
		top: 12,
		zIndex: 10
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
		backgroundColor: themeColors.buttonText5
	},
	bizAvatarFallback: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: themeColors.primaryContainer,
		justifyContent: 'center',
		alignItems: 'center'
	},
	bizName: {
		fontSize: 13,
		fontWeight: '700',
		color: themeColors.buttonText
	},
	bizSlug: {
		fontSize: 10,
		color: themeColors.buttonText40
	},
	addressRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingBottom: 4
	},
	bizAddress: {
		flex: 1,
		fontSize: 11,
		color: themeColors.buttonText40
	},
	// ── Background image ──
	bgImageContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0
	},
	bgImage: {
		width: '100%',
		height: '100%'
	},
	bgOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0
	},
	topContent: {
		width: '100%'
	},
	bottomContent: {
		width: '100%',
		justifyContent: 'flex-end'
	},
	productName: {
		fontSize: 15,
		fontWeight: '700',
		color: themeColors.buttonText,
		textAlign: 'left',
		height: 30,
		lineHeight: 15,
		includeFontPadding: false
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
		justifyContent: 'space-between'
	},
	bodyTop: {
		gap: 0
	},
	bodyBottom: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'space-between',
		gap: 8,
		marginTop: 4
	},
	bodyNormal: {
		padding: 10
	},
	bodySmall: {
		padding: 8
	},
	altName: {
		fontSize: 11,
		fontWeight: '500',
		color: themeColors.buttonText40
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		marginTop: 0,
		height: 12
	},
	ratingValue: {
		fontSize: 11,
		fontWeight: '700',
		color: themeColors.warning,
		marginLeft: 2,
		lineHeight: 12,
		includeFontPadding: false
	},
	ratingCount: {
		fontSize: 10,
		color: themeColors.buttonText40,
		lineHeight: 12,
		includeFontPadding: false
	},
	priceRow: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 3
	},
	price: {
		fontWeight: '800',
		color: themeColors.primary,
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
		color: themeColors.buttonText40
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
		backgroundColor: themeColors.background95,
		borderRadius: 14,
		borderWidth: 1.5,
		borderColor: themeColors.primary,
		padding: 3
	},
	qtyBtn: {
		width: 32,
		height: 32,
		borderRadius: 10,
		backgroundColor: themeColors.buttonText10,
		justifyContent: 'center',
		alignItems: 'center'
	},
	qtyValue: {
		fontSize: 15,
		fontWeight: '800',
		color: themeColors.buttonText,
		minWidth: 32,
		textAlign: 'center',
		marginHorizontal: 4
	},
	actionsColumn: {
		alignItems: 'flex-end',
		gap: 4
	},
	cartBtn: {
		width: 36,
		height: 36,
		borderRadius: 12,
		backgroundColor: themeColors.primary,
		justifyContent: 'center',
		alignItems: 'center'
	},
	cartBtnDisabled: {
		backgroundColor: themeColors.buttonText10
	},
	cartBtnText: {
		fontSize: 13,
		fontWeight: '700',
		color: themeColors.buttonText
	},
	specsStepperRow: {
		flexDirection: 'column',
		justifyContent: 'center',
		gap: 4,
		minHeight: 58,
		marginTop: 4,
		marginBottom: 6
	},
	specsRowTop: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8
	},
	specsRowBottom: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		flex: 1,
		overflow: 'hidden'
	},
	specsIconRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		flex: 1,
		overflow: 'hidden'
	},
	weightChipText: {
		fontSize: 11,
		fontWeight: '700'
	},
	specsCardRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
		marginTop: 4,
		alignItems: 'center'
	},
	caliberChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		gap: 3
	},
	caliberChipText: {
		fontSize: 10,
		fontWeight: '700'
	},
	originChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		gap: 3,
		borderWidth: 1,
		borderColor: themeColors.buttonText5
	},
	originChipText: {
		fontSize: 10,
		fontWeight: '600'
	},
	harvestChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		gap: 3
	},
	harvestChipText: {
		fontSize: 10,
		fontWeight: '700'
	},
	previewsContainer: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: 6,
		marginHorizontal: 10,
		marginTop: 8,
		marginBottom: 8
	},
	previewThumb: {
		width: 40,
		height: 40,
		borderRadius: 8,
		borderWidth: 2,
		overflow: 'hidden',
		backgroundColor: themeColors.background25,
		...Platform.select({
			web: {
				cursor: 'pointer'
			} as any
		})
	},
	previewImg: {
		width: '100%',
		height: '100%'
	}
})
