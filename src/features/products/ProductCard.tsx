import React, { useState, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, Pressable, useWindowDimensions, Platform, type StyleProp, type ViewStyle } from 'react-native'
import { SmartMediaCarousel } from '@/core/smart-media'
import type { MediaField } from '@/core/smart-media/types'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { CaliberChip } from '@/features/products/specs/CaliberChip'
import { HarvestChip } from '@/features/products/specs/HarvestChip'
import { GearChip } from '@/features/products/specs/GearChip'
import { OriginChip } from '@/features/products/specs/OriginChip'
import type { ProductFeedItem } from '@/features/feed/feed.interface'
import { useUser } from '@/core/contexts/UserContext'
import { useProductCardPress } from '@/features/products/useProductCardPress'
import { PhoneButton } from '@/core/ui/buttons/PhoneButton'
import { WhatsAppButton } from '@/core/ui/buttons/WhatsAppButton'
import { WebsiteButton } from '@/core/ui/buttons/WebsiteButton'
import { DirectionsButton } from '@/core/ui/buttons/DirectionsButton'
import { QuantityStepperBlock } from '@/features/products/blocks/QuantityStepperBlock'
import ProductNameWithThumbnailBlock from '@/features/products/blocks/ProductNameWithThumbnailBlock'
import { useTheme, themeColors } from '@/core/theme'
import { LinearGradient } from 'expo-linear-gradient'
import BusinessBlock from '@/features/businesses/BusinessBlock'
import { FeedFocusContext } from '@/features/feed/FeedVisibleContext'

type ProductCardProps = {
	item: ProductFeedItem
	addToCart: (item: ProductFeedItem, quantity: number) => void
	style?: StyleProp<ViewStyle>
}

const ProductCard = React.memo(function ProductCard({ item, addToCart, style }: ProductCardProps) {
	const { localize, currency, formatPrice, translate } = useUser()
	const { colors } = useTheme()
	const { handleBusinessPress, handleProductPress } = useProductCardPress(item)
	const { width } = useWindowDimensions()
	const { focusedId, activeVideoId, visibleIds, setFocusedId, setActiveVideoId } = React.useContext(FeedFocusContext)

	const itemId = useMemo(() => item._id || (item as any).slug, [item._id, (item as any).slug])
	const isFocused = useMemo(() => focusedId === itemId, [focusedId, itemId])
	const isVisible = useMemo(() => visibleIds.has(itemId) || isFocused, [visibleIds, itemId, isFocused])

	const carouselMedia = useMemo<MediaField | null>(() => {
		const rawMedia = (item as any).media as MediaField | null | undefined
		const hasThumb = !!(rawMedia?.thumbnail && (rawMedia.thumbnail as any).url)
		const hasGallery = Array.isArray(rawMedia?.gallery) && rawMedia.gallery.length > 0
		if (hasThumb || hasGallery) return rawMedia as MediaField
		const fallbackThumb = (item as any).defaultProduct?.media?.thumbnail
		if (fallbackThumb?.url) return { thumbnail: fallbackThumb, gallery: [] } as MediaField
		return (rawMedia as MediaField) ?? null
	}, [item])

	const hasMultipleMedia = useMemo(() => {
		if (!carouselMedia) return false
		const thumbCount = carouselMedia.thumbnail ? 1 : 0
		const galleryCount = Array.isArray(carouselMedia.gallery) ? carouselMedia.gallery.length : 0
		return thumbCount + galleryCount > 1
	}, [carouselMedia])
	const hasVideo = useMemo(() => {
		if (!carouselMedia) return false
		const thumbIsVideo = (carouselMedia.thumbnail as any)?.resource_type === 'video' || (carouselMedia.thumbnail as any)?.mimetype?.startsWith('video/')
		const galleryHasVideo = Array.isArray(carouselMedia.gallery) && carouselMedia.gallery.some((f: any) => f.resource_type === 'video' || f.mimetype?.startsWith('video/'))
		return thumbIsVideo || galleryHasVideo
	}, [carouselMedia])
	const carouselAutoPlay = isFocused

	const step = item.unit?.step || 1
	const minQuantity = (item.unit?.min || 1) * step
	const maxQuantity = item.unit?.max ? item.unit.max * step : Infinity
	const [quantity, setQuantity] = useState(minQuantity)

	React.useEffect(() => {
		setQuantity(minQuantity)
	}, [item._id, minQuantity])

	const rating = item.rating?.average || 0
	const ratingCount = item.rating?.count || 0
	// @ts-ignore
	const unitPrice = item.price?.total?.[currency] || item.price?.total?.tnd || 0
	const pricePerUnit = unitPrice
	const singlePiece = item.unit?.singlePiece
	const singlePieceAvg = useMemo(() => {
		if (!singlePiece) return undefined
		if (singlePiece.avgWeightKg != null) return singlePiece.avgWeightKg
		if (singlePiece.minWeightKg != null && singlePiece.maxWeightKg != null) return (singlePiece.minWeightKg + singlePiece.maxWeightKg) / 2
		return undefined
	}, [singlePiece])

	const mainName = useMemo(() => localize(item.name), [item.name, localize])
	const isSmall = useMemo(() => width < 500, [width])

	const increment = useCallback(
		(e: any) => {
			e.stopPropagation?.()
			setQuantity((prev) => {
				const next = Math.round((prev + step) * 100) / 100
				return next <= maxQuantity ? next : prev
			})
		},
		[step, maxQuantity]
	)
	const decrement = useCallback(
		(e: any) => {
			e.stopPropagation?.()
			setQuantity((prev) => {
				const next = Math.round((prev - step) * 100) / 100
				return next >= minQuantity ? next : minQuantity
			})
		},
		[step, minQuantity]
	)

	const stockQty = item.stock?.quantity || 0
	const minThreshold = item.stock?.minThreshold || 5
	const isOutOfStock = stockQty === 0
	const isLowStock = stockQty > 0 && stockQty <= minThreshold
	const isActive = item.state ? item.state.code === 'active' : (item as any).isActive !== false
	const purchaseAllowed = item.card?.purchase?.allowed !== false
	const cartDisabled = !purchaseAllowed || !isActive || isOutOfStock
	const stockColor = isOutOfStock ? themeColors.error : isLowStock ? themeColors.warning : themeColors.success
	const stockLabel = useMemo(
		() => (isOutOfStock ? translate('out_of_stock', 'Out of Stock') : isLowStock ? translate('low_stock', 'Low Stock') : translate('in_stock', 'In Stock')),
		[isOutOfStock, isLowStock, translate]
	)
	const stockIcon: any = isOutOfStock ? 'remove-shopping-cart' : isLowStock ? 'warning-amber' : 'check-circle'
	const imageUrl = useMemo(() => item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url, [item.media?.thumbnail?.url, item.defaultProduct?.media?.thumbnail?.url])
	const hasContactButtons = useMemo(
		() => !!(item.business?.contact?.phone?.fullNumber || item.business?.contact?.whatsapp || item.business?.contact?.website || item.business?.location || item.business?.address),
		[item.business?.contact?.phone?.fullNumber, item.business?.contact?.whatsapp, item.business?.contact?.website, item.business?.location, item.business?.address]
	)

	const handleCartPress = useCallback(
		(e: any) => {
			e.stopPropagation?.()
			if (!cartDisabled) addToCart(item, quantity)
		},
		[cartDisabled, addToCart, item, quantity]
	)

	const handleFocusTrigger = useCallback(() => {
		if (focusedId !== itemId) setFocusedId(itemId)
		if (hasVideo && activeVideoId !== itemId) setActiveVideoId(itemId)
	}, [focusedId, itemId, setFocusedId, hasVideo, activeVideoId, setActiveVideoId])

	return (
		<View onPointerEnter={handleFocusTrigger as any} onTouchStart={handleFocusTrigger as any} style={[styles.focusWrapper, style]}>
			<View
				style={[
					styles.card,
					{
						backgroundColor: colors.background,
						borderColor: isFocused ? colors.focus : themeColors.primary,
						borderWidth: 1,
						borderRadius: 20,
						overflow: 'hidden' as any
					}
				]}
			>
				<View style={styles.cardContent}>
					{/* Background media */}
					<View style={[styles.bgImageContainer, { pointerEvents: 'none' as any }]}>
						<SmartMediaCarousel
							key={itemId}
							media={carouselMedia}
							style={StyleSheet.absoluteFill}
							previewStyle={StyleSheet.absoluteFill}
							contentFit="cover"
							overlayThumbnails={hasMultipleMedia}
							showThumbnails={hasMultipleMedia}
							thumbnailStyle={styles.carouselThumb}
							stripStyle={styles.carouselStrip}
							stripContentStyle={styles.carouselStripContent}
							controls={false}
							enableFullscreenPreview={false}
							autoPlay={carouselAutoPlay}
							isVisible={isVisible}
							onIndexChange={() => setActiveVideoId(itemId)}
						/>
					</View>
					<LinearGradient
						colors={[themeColors.background50, themeColors.background25, themeColors.background75]}
						start={{ x: 0, y: 0 }}
						end={{ x: 0, y: 1 }}
						style={[styles.bgOverlay, { pointerEvents: 'none' }]}
					/>
					{/* Top */}
					<View style={styles.topContent}>
						<BusinessBlock business={item.business} onPress={handleBusinessPress} />
					</View>

					{(isOutOfStock || isLowStock) && (
						<View style={[styles.stockOverlay, { backgroundColor: isOutOfStock ? themeColors.background50 : 'transparent', pointerEvents: 'none' }]}>
							<View style={[styles.stockChip, { backgroundColor: stockColor + '1F', borderColor: stockColor + '55' }]}>
								<MaterialIcons name={stockIcon} size={11} color={stockColor} />
								<Text style={[styles.stockChipText, { color: stockColor }]}>{stockLabel}</Text>
							</View>
						</View>
					)}

					{hasContactButtons && (
						<View style={styles.contactButtonsSide}>
							<View style={{ flexDirection: 'column', alignItems: 'center', gap: 6 }}>
								<PhoneButton phone={item.business?.contact?.phone} size={36} />
								<WhatsAppButton whatsapp={item.business?.contact?.whatsapp} size={36} />
								<WebsiteButton website={item.business?.contact?.website} size={36} />
								<DirectionsButton location={item.business?.location} address={item.business?.address} size={36} />
							</View>
						</View>
					)}

					<View style={[styles.bottomContent, styles.bottomContentWithThumbnails]}>
						<View style={[styles.body, isSmall ? styles.bodySmall : styles.bodyNormal]}>
							<View style={styles.bodyTop}>
								<ProductNameWithThumbnailBlock name={mainName} imageUrl={imageUrl} onPress={handleProductPress} />
								<View style={styles.ratingRow}>
									{rating > 0 ? (
										<>
											<MaterialIcons name="star" size={12} color={themeColors.warning} />
											<Text style={styles.ratingValue}>{rating.toFixed(1)}</Text>
											<Text style={styles.ratingCount}>({ratingCount})</Text>
										</>
									) : null}
								</View>
								<View style={styles.specsStepperRow}>
									<View style={styles.specsRowTop}>
										<View style={styles.specsIconRow}>
											{item.specs?.caliber ? <CaliberChip caliber={item.specs.caliber} variant="chip" /> : null}
											{singlePieceAvg != null && <Text style={[styles.weightChipText, { color: colors.primary }]}>~ {singlePieceAvg.toFixed(2)} kg/piece</Text>}
										</View>
										{purchaseAllowed && isActive && !isOutOfStock && (
											<QuantityStepperBlock value={quantity} onIncrement={increment} onDecrement={decrement} decrementDisabled={quantity <= minQuantity} incrementDisabled={quantity >= maxQuantity} />
										)}
									</View>
									{(item.specs?.harvest || item.specs?.origin?.city || item.specs?.gear) && (
										<View style={styles.specsRowBottom}>
											<HarvestChip harvest={item.specs?.harvest} size={14} />
											<GearChip gear={item.specs?.gear} size={14} />
											<OriginChip city={item.specs?.origin?.city} />
										</View>
									)}
								</View>
							</View>
							<View style={styles.bodyBottom}>
								<View style={styles.priceRow}>
									<Text style={[styles.price, isSmall ? styles.priceSmall : styles.priceNormal]} adjustsFontSizeToFit numberOfLines={1}>
										{formatPrice({ total: { [currency]: pricePerUnit * quantity } })}
									</Text>
									<Text style={styles.priceUnit} numberOfLines={1}>
										{quantity === 1 ? `/ ${item.unit?.measure || translate('unit', 'unit')}` : `${quantity} ${item.unit?.measure || translate('unit', 'unit')}`}
									</Text>
								</View>
								<Pressable
									style={({ pressed }) => [styles.cartBtn, cartDisabled && styles.cartBtnDisabled, { opacity: pressed && !cartDisabled ? 0.8 : 1 }]}
									onPress={handleCartPress}
									disabled={cartDisabled}
									accessibilityLabel={translate('add_to_cart', 'Add to cart')}
								>
									<MaterialIcons name="add-shopping-cart" size={18} color={themeColors.buttonText} />
								</Pressable>
							</View>
						</View>
					</View>
				</View>
			</View>
		</View>
	)
})

export default ProductCard

const styles = StyleSheet.create({
	focusWrapper: {
		width: '100%'
	},
	card: {
		flex: 1,
		borderRadius: 20,
		overflow: 'hidden',
		minHeight: 340,
		padding: 0,
		// override BaseCard padding/minHeight
		borderWidth: 1
	},
	cardContent: {
		flex: 1,
		padding: 0
	},
	contactButtonsSide: {
		position: 'absolute',
		right: 8,
		top: 12,
		zIndex: 10
	},
	bgImageContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		overflow: 'hidden',
		borderRadius: 20,
		zIndex: 0,
		...Platform.select({
			web: {
				overflow: 'hidden',
				isolation: 'isolate' as any,
				transform: 'translateZ(0)' as any
			} as any
		})
	},
	bgOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0
	},
	topContent: {
		width: '100%',
		zIndex: 1
	},
	bottomContent: {
		width: '100%',
		justifyContent: 'flex-end',
		zIndex: 1,
		pointerEvents: 'none' as any,
		marginTop: 'auto'
	},
	bottomContentWithThumbnails: {
		paddingBottom: 56
	},
	stockOverlay: {
		...StyleSheet.absoluteFill,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 2
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
	body: {
		justifyContent: 'space-between',
		pointerEvents: 'auto' as any
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
	originChipText: {
		fontSize: 10,
		fontWeight: '600'
	},
	carouselThumb: {
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
	carouselStrip: {
		bottom: 8
	},
	carouselStripContent: {
		gap: 6,
		justifyContent: 'center',
		paddingHorizontal: 10
	}
})
