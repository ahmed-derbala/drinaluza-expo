import React, { useMemo, useCallback, useState, useEffect } from 'react'
import { View, Text, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, themeColors } from '@/core/theme'
import { CARD } from '@/core/theme/constants'
import { useUser } from '@/core/contexts/UserContext'
import { SmartMediaView } from '@/core/smart-media'
import { ProductType } from '@/features/products/products.type'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { LinearGradient } from 'expo-linear-gradient'
import { AddToCartButton } from '@/core/ui/buttons/AddToCartButton'
import { QuantityStepperBlock } from '@/features/products/blocks/QuantityStepperBlock'
import { ProductSpecsBlock } from '@/features/products/specs/ProductSpecsBlock'
import { PriceBlock } from '@/features/products/blocks/PriceBlock'
import { getItem, setItem, getToken } from '@/core/storage'
import { toast } from '@/features/common/Toast'

export interface BusinessProductCardProps {
	product: ProductType
	addToCart?: (item: ProductType, quantity: number) => void
	style?: StyleProp<ViewStyle>
}

const STEPPER_BUTTON_SIZE = 28

const BusinessProductCard = React.memo(function BusinessProductCard({ product, addToCart: propAddToCart, style }: BusinessProductCardProps) {
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const router = useRouter()
	const { businessSlug } = useLocalSearchParams<{ businessSlug: string }>()

	const handlePress = useCallback(() => {
		if (product.slug && businessSlug) {
			router.push(`/businesses/${businessSlug}/products/${product.slug}` as any)
		}
	}, [product.slug, businessSlug, router])

	const imageUrl = useMemo(() => product.media?.thumbnail?.url || product.defaultProduct?.media?.thumbnail?.url || null, [product.media?.thumbnail?.url, product.defaultProduct?.media?.thumbnail?.url])
	const stockQty = product.stock?.quantity || 0
	const isOutOfStock = stockQty === 0
	const isActive = product.state ? product.state.code === 'active' : (product as any).isActive !== false
	const purchaseAllowed = (product as any).card?.purchase?.allowed !== false
	const cartDisabled = !purchaseAllowed || !isActive || isOutOfStock
	const canAddToCart = purchaseAllowed && isActive && !isOutOfStock
	const rating = product.rating?.average || 0

	const step = product.unit?.step || 1
	const minQuantity = product.unit?.min ? product.unit.min * step : step
	const maxQuantity = product.unit?.max ? product.unit.max * step : Infinity
	const [quantity, setQuantity] = useState(minQuantity)
	useEffect(() => {
		setQuantity(minQuantity)
	}, [product._id, minQuantity])

	const singlePiece = (product as any).unit?.singlePiece
	const singlePieceAvg = useMemo(() => {
		if (!singlePiece) return undefined
		if (singlePiece.avgWeightKg != null) return singlePiece.avgWeightKg
		if (singlePiece.minWeightKg != null && singlePiece.maxWeightKg != null) return (singlePiece.minWeightKg + singlePiece.maxWeightKg) / 2
		return undefined
	}, [singlePiece])

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

	const handleCartPress = useCallback(
		async (e: any) => {
			e.stopPropagation?.()
			if (cartDisabled) return
			if (propAddToCart) {
				propAddToCart(product, quantity)
				return
			}
			try {
				const token = await getToken()
				if (!token) {
					toast.show({ title: 'Info', content: 'Please log in to add items to cart', borderColor: themeColors.info })
					router.push('/auth' as any)
					return
				}
				const saved = (await getItem<any[]>('cart')) || []
				const existing = saved.findIndex((b) => b._id === product._id)
				const newCart = existing > -1 ? saved.map((b, i) => (i === existing ? { ...b, quantity: b.quantity + quantity } : b)) : [...saved, { ...product, quantity }]
				await setItem('cart', newCart)
				toast.show({ title: 'Success', content: 'Added to cart', borderColor: themeColors.success, screen: '/purchases?status=cart' })
			} catch {
				toast.show({ title: 'Error', content: 'Failed to add to cart', borderColor: themeColors.error })
			}
		},
		[cartDisabled, propAddToCart, product, quantity, router]
	)

	return (
		<BaseCard onPress={handlePress} style={[styles.card, style]} contentStyle={styles.cardContent} borderColor={colors.border} backgroundColor={colors.background}>
			<View style={[styles.bgImageContainer, { pointerEvents: 'none' as any }]}>
				<SmartMediaView media={imageUrl} style={StyleSheet.absoluteFill} contentFit="cover" />
			</View>
			<LinearGradient
				colors={[themeColors.background50, themeColors.background25, themeColors.background75]}
				start={{ x: 0, y: 0 }}
				end={{ x: 0, y: 1 }}
				style={[styles.bgOverlay, { pointerEvents: 'none' as any }]}
			/>
			{isOutOfStock && (
				<View style={[styles.outOfStockBadge, { backgroundColor: colors.error + '25', borderColor: colors.error + '40' }]}>
					<Text style={[styles.outOfStockText, { color: colors.error }]}>{translate('out_of_stock', 'Out of Stock')}</Text>
				</View>
			)}
			<View style={styles.info}>
				<View style={styles.topGroup}>
					<View style={styles.header}>
						<Text style={[styles.name, { color: themeColors.buttonText }]} numberOfLines={2}>
							{localize(product.name)}
						</Text>
					</View>
					<View style={styles.ratingRow}>
						{rating > 0 && (
							<>
								<Ionicons name="star" size={12} color={themeColors.warning} />
								<Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
							</>
						)}
					</View>
				</View>

				<ProductSpecsBlock specs={product.specs as any} singlePieceAvg={singlePieceAvg} variant="light" />

				<View style={styles.bottomSection}>
					<View style={styles.priceWrap}>
						<PriceBlock compact price={product.price as any} unit={product.unit as any} quantity={quantity} />
					</View>
					<View style={styles.cartColumn}>
						{canAddToCart && (
							<QuantityStepperBlock
								value={quantity}
								onIncrement={increment}
								onDecrement={decrement}
								decrementDisabled={quantity <= minQuantity}
								incrementDisabled={quantity >= maxQuantity}
								buttonSize={STEPPER_BUTTON_SIZE}
							/>
						)}
						<AddToCartButton disabled={cartDisabled} onPress={handleCartPress} accessibilityLabel="Add to cart" />
					</View>
				</View>
			</View>
		</BaseCard>
	)
})

const styles = StyleSheet.create({
	card: {
		...CARD,
		padding: 0,
		overflow: 'hidden'
	},
	cardContent: { flex: 1, padding: 0 },
	bgImageContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		overflow: 'hidden',
		borderRadius: CARD.borderRadius,
		...Platform.select({ web: { overflow: 'hidden', isolation: 'isolate' as any, transform: 'translateZ(0)' as any } as any })
	},
	bgOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
	info: { flex: 1, padding: CARD.padding, gap: 4, justifyContent: 'space-between', zIndex: 1 },
	topGroup: { gap: 3, alignSelf: 'stretch' },
	header: { alignSelf: 'stretch' },
	name: { fontSize: 14, fontWeight: '600', lineHeight: 18, height: 36, textAlign: 'left', alignSelf: 'flex-start' },
	ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 3, justifyContent: 'flex-start', height: 20 },
	ratingText: { fontSize: 12, fontWeight: '700', color: themeColors.warning },
	bottomSection: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, alignSelf: 'stretch', minHeight: 74 },
	priceWrap: { flex: 1, minWidth: 0, justifyContent: 'flex-end', alignSelf: 'flex-end' },
	cartColumn: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', gap: 6, flexShrink: 0, minHeight: 74 },
	outOfStockBadge: { position: 'absolute', top: 8, left: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, zIndex: 2 },
	outOfStockText: { fontSize: 9, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 }
})

export default BusinessProductCard
