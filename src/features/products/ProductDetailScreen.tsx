import { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, useWindowDimensions, Platform, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useLocalSearchParams, useRouter, usePathname, Stack } from 'expo-router'
import { getItem, setItem } from '@/core/storage'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme, createShadow } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { useLayout } from '@/core/contexts/LayoutContext'
import { getProductBySlug } from '@/features/products/products.api'
import { ProductType } from '@/features/products/products.type'
import ProductGallerySection from '@/features/products/common/ProductGallerySection'
import ProductSpecsSection from '@/features/products/common/ProductSpecsSection'
import { parseError } from '@/core/helpers/errorHandler'
import ErrorState from '@/features/common/ErrorState'
import LoadingState from '@/features/common/LoadingState'
import { SmartHeader } from '@/core/smart-header'
import SmartImage from '@/core/SmartImageViewer'
import { toast } from '@/features/common/Toast'
import { LinearGradient } from 'expo-linear-gradient'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import ReviewSection from '@/features/reviews/Reviews'
import QRCodeModal from '@/features/common/QRCodeModal'
import { config } from '@/config'

export default function ProductDetailScreen() {
	const { productSlug, businessSlug } = useLocalSearchParams<{ productSlug: string; businessSlug?: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { localize, translate, currency, formatPrice } = useUser()
	const { onScroll } = useScrollHandler()
	const { setTabBarVisible } = useLayout()
	const { width, height } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const pathname = usePathname()
	const isDashboard = pathname.includes('/dashboard')

	const [product, setProduct] = useState<ProductType | null>(null)
	const [activeImage, setActiveImage] = useState<string | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const [cart, setCart] = useState<any[]>([])
	const [quantity, setQuantity] = useState(1)
	const [showQRCode, setShowQRCode] = useState(false)

	const displayTitle = product ? localize(product.name) : translate('loading', 'Loading...')
	const isLandscape = width > height
	const isLargeScreen = width > 800 && height > 600
	const imageHeight = isLandscape ? (isLargeScreen ? 380 : 200) : 380

	// effect to initialize quantity once product loads
	useEffect(() => {
		if (product?.unit?.min) {
			setQuantity(product.unit.min)
		}
	}, [product])

	const increment = () => {
		if (!product) return
		const step = product.unit?.step || 1
		const maxQuantity = product.unit?.max || Infinity
		const stockQty = product.stock?.quantity || 0
		setQuantity((prev) => {
			const next = Math.round((prev + step) * 100) / 100
			return next <= maxQuantity && next <= stockQty ? next : prev
		})
	}

	const decrement = () => {
		if (!product) return
		const step = product.unit?.step || 1
		const minQty = product.unit?.min || 1
		setQuantity((prev) => {
			const next = Math.round((prev - step) * 100) / 100
			return next >= minQty ? next : minQty
		})
	}

	const handleAddToCart = async () => {
		if (!product) return
		try {
			const existing = cart.findIndex((b) => b._id === product._id)
			const newCart = existing > -1 ? cart.map((b, i) => (i === existing ? { ...b, quantity: b.quantity + quantity } : b)) : [...cart, { ...product, quantity }]
			setCart(newCart)
			await setItem('cart', newCart)
			toast.show({
				title: 'Success',
				message: `${localize(product.name)} ${translate('cart_added_to_cart', 'added to cart')}`,
				color: '#10B981',
				screen: '/purchases?status=cart'
			})
		} catch {
			toast.show({ title: 'Error', message: translate('cart_failed_to_add', 'Failed to add to cart'), color: '#EF4444' })
		}
	}

	const loadCart = async () => {
		try {
			const saved = await getItem<any[]>('cart')
			if (saved) setCart(saved)
		} catch {}
	}

	// Hide bottom tab bar when on product detail screen
	useEffect(() => {
		setTabBarVisible(false)
		return () => {
			setTabBarVisible(true)
		}
	}, [setTabBarVisible])

	const loadProduct = useCallback(
		async (isRefresh = false) => {
			if (!productSlug) return

			try {
				if (!isRefresh) setLoading(true)
				setError(null)

				const response = await getProductBySlug(productSlug)
				setProduct(response.data)
				setActiveImage(null)
			} catch (err) {
				const parsed = parseError(err)
				setError({
					title: parsed.title,
					message: parsed.message,
					type: parsed.type
				})
			} finally {
				setLoading(false)
				setRefreshing(false)
			}
		},
		[productSlug]
	)

	useEffect(() => {
		loadProduct()
	}, [loadProduct])

	const handleRefresh = () => {
		setRefreshing(true)
		loadProduct(true)
		loadCart()
	}

	useEffect(() => {
		loadCart()
	}, [])

	const handleBusinessNavPress = () => {
		if (product?.business?.slug) {
			router.push(`/businesses/${product.business.slug}` as any)
		}
	}

	const handleOwnerPress = () => {
		if (product?.business?.owner?.slug) {
			router.push(`/users/${product.business.owner.slug}` as any)
		}
	}

	const headerActions = useMemo(() => {
		const actions: any[] = []
		if (isDashboard) {
			const slug = businessSlug || product?.business?.slug
			if (slug) {
				actions.push({
					key: 'sales',
					iconName: 'trending-up',
					onPress: () => router.push(`/dashboard/${slug}/sales?productSlug=${product?.slug || productSlug}` as any),
					accessibilityLabel: 'Sales Stats'
				})
			}
			actions.push({
				key: 'edit',
				iconName: 'pencil',
				onPress: () => router.push(`${pathname}/edit` as any),
				accessibilityLabel: 'Edit Product'
			})
		}
		actions.push({
			key: 'qr-code',
			iconName: 'qr-code-outline',
			onPress: () => setShowQRCode(true),
			accessibilityLabel: 'QR Code'
		})
		if (!isDashboard) {
			actions.push({
				key: 'cart',
				iconName: 'cart-outline',
				badgeCount: cart.length,
				onPress: () => router.push('/purchases?status=cart' as any),
				accessibilityLabel: 'View Cart'
			})
		}
		actions.push({
			key: 'refresh',
			onPress: handleRefresh,
			isRefreshing: refreshing,
			accessibilityLabel: 'Refresh'
		})
		return actions
	}, [isDashboard, businessSlug, product, productSlug, pathname, cart.length, handleRefresh, refreshing, router])

	const resolvedFallbackRoute = useMemo(() => {
		const fallbackRoute = `/businesses/${businessSlug || product?.business?.slug || ''}`
		if (businessSlug || product?.business?.slug) {
			return fallbackRoute
		}
		return '/(home)/feed'
	}, [businessSlug, product])

	const combinedGallery = useMemo(() => {
		if (!product) return []
		const list: any[] = []
		const thumbUrl = product.media?.thumbnail?.url || product.defaultProduct?.media?.thumbnail?.url
		if (thumbUrl) {
			list.push({ _id: 'thumbnail', url: thumbUrl })
		}
		if (product.media?.gallery) {
			product.media.gallery.forEach((item) => {
				if (item.url !== thumbUrl) {
					list.push(item)
				}
			})
		}
		return list
	}, [product])

	if (loading && !product) {
		return (
			<View key={productSlug} style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: displayTitle }} />
				<LoadingState />
			</View>
		)
	}

	if (error && !product) {
		return (
			<View key={productSlug} style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: displayTitle }} />
				<ErrorState
					title={error.title}
					message={error.message}
					onRetry={() => loadProduct()}
					icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
				/>
			</View>
		)
	}

	if (!product) {
		return (
			<View key={productSlug} style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: displayTitle }} />
				<ErrorState
					title={translate('product_not_found', 'Product Not Found')}
					message={translate('product_not_found_desc', 'The product you are looking for could not be found.')}
					onRetry={() => loadProduct()}
					icon="fish-outline"
				/>
			</View>
		)
	}

	const imageUrl = product.media?.thumbnail?.url || product.defaultProduct?.media?.thumbnail?.url
	const priceTotal = product.price.total
	const unitPrice = (priceTotal[currency as keyof typeof priceTotal] as number | null | undefined) || priceTotal.tnd || 0
	const isAvailable = product.stock.quantity > 0 && product.state?.code === 'active'
	const stockQty = product.stock?.quantity || 0
	const minThreshold = product.stock?.minThreshold || 5
	const isLowStock = stockQty > 0 && stockQty <= minThreshold
	const isOutOfStock = stockQty === 0

	const getStockStatus = () => {
		if (isOutOfStock) return { color: colors.error, bgColor: colors.error + '12', label: translate('out_of_stock', 'Out of Stock'), icon: 'alert-circle' as const }
		if (isLowStock) return { color: colors.warning, bgColor: colors.warning + '12', label: translate('low_stock', 'Low Stock'), icon: 'warning' as const }
		return { color: colors.success, bgColor: colors.success + '12', label: translate('in_stock', 'In Stock'), icon: 'checkmark-circle' as const }
	}
	const stockStatus = getStockStatus()

	// ─── Render Components ─────────────────────────────────────────────────────────

	const renderHeroImage = () => {
		const currentUrl = activeImage || (combinedGallery.length > 0 ? combinedGallery[0].url : null)

		return (
			<View>
				<View style={[styles.imageContainer, { height: imageHeight }]}>
					<SmartImage source={currentUrl} style={styles.productImage} resizeMode="cover" entityType="product" />
					{!isAvailable && (
						<View style={styles.unavailableOverlay}>
							<Text style={styles.unavailableText}>{product.state?.code !== 'active' ? translate('unavailable', 'Unavailable') : translate('out_of_stock', 'Out of Stock')}</Text>
						</View>
					)}
					<LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.imageGradient}>
						<View style={[styles.stockBadge, { backgroundColor: stockStatus.bgColor, borderColor: stockStatus.color + '40' }]}>
							<View style={[styles.stockDot, { backgroundColor: stockStatus.color }]} />
							<Text style={[styles.stockText, { color: stockStatus.color }]}>{stockStatus.label}</Text>
						</View>
					</LinearGradient>
				</View>

				<ProductGallerySection editable={false} gallery={combinedGallery} colors={colors} translate={translate} activeImage={currentUrl} onThumbnailPress={(url) => setActiveImage(url)} />
			</View>
		)
	}

	const renderInfoSection = () => (
		<View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
			{/* Product Name */}
			<Text style={[styles.productName, { color: colors.text }]}>{localize(product.name)}</Text>
			{(product.name?.tn_latn || product.name?.tn_arab) && (
				<Text style={[styles.productNameSecondary, { color: colors.textSecondary }]}>
					{product.name?.tn_latn} {product.name?.tn_arab && `• ${product.name?.tn_arab}`}
				</Text>
			)}

			{/* Price Details */}
			<View style={[styles.priceSection, { borderBottomColor: colors.borderLight }]}>
				<Text style={[styles.priceLabel, { color: colors.textTertiary }]}>{translate('price', 'Price')}</Text>
				<View style={styles.priceContainer}>
					<Text style={[styles.priceValue, { color: colors.primary }]}>{formatPrice({ total: { [currency]: unitPrice } })}</Text>
					<Text style={[styles.priceUnit, { color: colors.textSecondary }]}>/ {product.unit?.measure || translate('unit', 'unit')}</Text>
				</View>
				<Text style={[styles.quantityRange, { color: colors.textSecondary }]}>
					{translate('min', 'Min')}: {product.unit?.min || 1} - {translate('max', 'Max')}: {product.unit?.max || '∞'} {product.unit?.measure || ''}
				</Text>
			</View>

			{/* Stock Details */}
			<View style={[styles.stockSection, { backgroundColor: colors.surfaceVariant }]}>
				<View style={styles.stockRow}>
					<Ionicons name="cube-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
					<Text style={[styles.stockLabel, { color: colors.textSecondary }]}>{translate('stock_quantity', 'Stock Quantity')}</Text>
					<Text style={[styles.stockValue, { color: colors.text }]}>{stockQty}</Text>
				</View>
				<View style={[styles.stockRow, { marginBottom: 0 }]}>
					<Ionicons name="alert-circle-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
					<Text style={[styles.stockLabel, { color: colors.textSecondary }]}>{translate('min_threshold', 'Min Threshold')}</Text>
					<Text style={[styles.stockValue, { color: colors.text }]}>{minThreshold}</Text>
				</View>
			</View>

			{/* Status */}
			<View style={[styles.statusRow, { borderBottomColor: colors.borderLight }]}>
				<Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{translate('state', 'State')}</Text>
				<View style={[styles.statusBadgeTouch, { backgroundColor: isAvailable ? colors.success + '15' : colors.error + '15' }]}>
					<Text style={[styles.statusText, { color: isAvailable ? colors.success : colors.error }]}>
						{product.state?.code === 'active' ? translate('active', 'Active') : translate('inactive', 'Inactive')}
					</Text>
				</View>
			</View>

			{/* Interactive Cart panel */}
			{isAvailable && !isDashboard && (
				<View style={[styles.checkoutPanel, { borderTopColor: colors.borderLight }]}>
					<View style={styles.checkoutTotalCol}>
						<Text style={[styles.checkoutTotalLabel, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>
						<Text style={[styles.checkoutTotalPrice, { color: colors.primary }]}>{formatPrice({ total: { [currency]: unitPrice * quantity } })}</Text>
					</View>

					<View style={styles.checkoutActionsCol}>
						<View style={[styles.stepperContainer, { backgroundColor: colors.surfaceVariant, borderColor: colors.borderLight }]}>
							<TouchableOpacity onPress={decrement} style={styles.stepperBtn} activeOpacity={0.6}>
								<MaterialIcons name="remove" size={18} color={colors.text} />
							</TouchableOpacity>
							<Text style={[styles.stepperText, { color: colors.text }]}>{quantity}</Text>
							<TouchableOpacity onPress={increment} style={styles.stepperBtn} activeOpacity={0.6}>
								<MaterialIcons name="add" size={18} color={colors.text} />
							</TouchableOpacity>
						</View>

						<TouchableOpacity style={[styles.cartSubmitBtn, { backgroundColor: colors.primary }]} onPress={handleAddToCart} activeOpacity={0.85}>
							<MaterialIcons name="add-shopping-cart" size={20} color={colors.textOnPrimary || '#FFFFFF'} />
						</TouchableOpacity>
					</View>
				</View>
			)}
		</View>
	)

	const renderMetadataSection = () => (
		<View style={styles.metadataContainer}>
			{/* Business store info */}
			<TouchableOpacity onPress={handleBusinessNavPress} style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.75}>
				<View style={styles.metaCardHeader}>
					<View style={styles.metaCardTitleWrap}>
						<View style={[styles.metaCardIconBg, { backgroundColor: colors.primary + '15' }]}>
							<MaterialIcons name="store" size={16} color={colors.primary} />
						</View>
						<Text style={[styles.metaCardTitle, { color: colors.textTertiary }]}>{translate('business', 'Business')}</Text>
					</View>
					<Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
				</View>
				<Text style={[styles.metaCardName, { color: colors.text }]}>{localize(product.business?.name)}</Text>
				{product.business?.address && (
					<Text style={[styles.metaCardSub, { color: colors.textSecondary }]}>
						{product.business.address.city}, {product.business.address.country}
					</Text>
				)}
			</TouchableOpacity>

			{/* Owner profile card */}
			{product.business?.owner && (
				<TouchableOpacity onPress={handleOwnerPress} style={[styles.metaCard, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.75}>
					<View style={styles.metaCardHeader}>
						<View style={styles.metaCardTitleWrap}>
							<View style={[styles.metaCardIconBg, { backgroundColor: colors.primary + '15' }]}>
								<MaterialIcons name="person" size={16} color={colors.primary} />
							</View>
							<Text style={[styles.metaCardTitle, { color: colors.textTertiary }]}>{translate('owner', 'Owner')}</Text>
						</View>
						<Ionicons name="chevron-forward" size={16} color={colors.textSecondary} />
					</View>
					<Text style={[styles.metaCardName, { color: colors.text }]}>{localize(product.business.owner.name)}</Text>
				</TouchableOpacity>
			)}

			{/* Default product profile */}
			{product.defaultProduct && (
				<View style={[styles.metaCardStatic, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.metaCardHeader}>
						<View style={styles.metaCardTitleWrap}>
							<View style={[styles.metaCardIconBg, { backgroundColor: colors.primary + '15' }]}>
								<Ionicons name="fish-outline" size={16} color={colors.primary} />
							</View>
							<Text style={[styles.metaCardTitle, { color: colors.textTertiary }]}>{translate('default_product', 'Default Product')}</Text>
						</View>
					</View>
					<Text style={[styles.metaCardName, { color: colors.text }]}>{localize(product.defaultProduct.name)}</Text>
				</View>
			)}

			{/* Search Terms / keywords */}
			{product.searchTerms && product.searchTerms.length > 0 && (
				<View style={[styles.metaCardStatic, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<Text style={[styles.metaCardTitleStatic, { color: colors.textTertiary }]}>{translate('search_keywords', 'Search Keywords')}</Text>
					<View style={styles.tagWrap}>
						{product.searchTerms.map((keyword, index) => (
							<View key={index} style={[styles.tagItem, { backgroundColor: colors.surfaceVariant }]}>
								<Text style={[styles.tagText, { color: colors.textSecondary }]}>{keyword}</Text>
							</View>
						))}
					</View>
				</View>
			)}

			{/* Availability scheduling */}
			{product.availability && (
				<View style={[styles.metaCardStatic, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.metaCardHeader}>
						<View style={styles.metaCardTitleWrap}>
							<View style={[styles.metaCardIconBg, { backgroundColor: colors.primary + '15' }]}>
								<Ionicons name="calendar-outline" size={16} color={colors.primary} />
							</View>
							<Text style={[styles.metaCardTitle, { color: colors.textTertiary }]}>{translate('availability', 'Availability')}</Text>
						</View>
					</View>
					<Text style={[styles.availabilityText, { color: colors.textSecondary }]}>
						{translate('available_from', 'Available from')}: {new Date(product.availability.startDate).toLocaleDateString()}
					</Text>
					{product.availability.endDate && (
						<Text style={[styles.availabilityText, { color: colors.textSecondary }]}>
							{translate('available_until', 'Available until')}: {new Date(product.availability.endDate).toLocaleDateString()}
						</Text>
					)}
				</View>
			)}

			<ProductSpecsSection editable={false} colors={colors} translate={translate} specs={product.specs} />

			{/* Product Identifier info */}
			<View style={[styles.metaCardStatic, { backgroundColor: colors.card, borderColor: colors.border }]}>
				<Text style={[styles.metaCardTitleStatic, { color: colors.textTertiary }]}>{translate('product_slug', 'Product ID')}</Text>
				<Text style={[styles.slugValue, { color: colors.text }]}>{product.slug}</Text>
			</View>
		</View>
	)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: displayTitle,
						fallbackRoute: resolvedFallbackRoute as any,
						headerActions: headerActions
					} as any
				}
			/>

			<SmartHeader.ScrollView
				style={styles.container}
				contentContainerStyle={[styles.scrollContent, { paddingTop: 16, paddingBottom: 40 + insets.bottom }]}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{isLargeScreen ? (
					/* ─── Desktop / Web Split Column layout ─── */
					<View style={styles.splitLayoutContainer}>
						{/* Left Column */}
						<View style={styles.leftColumn}>
							{renderHeroImage()}
							{renderMetadataSection()}
						</View>

						{/* Right Column */}
						<View style={styles.rightColumn}>
							{renderInfoSection()}
							{product._id && <ReviewSection targetResource="products" targetId={product._id} targetName={localize(product.name)} />}
						</View>
					</View>
				) : (
					/* ─── Mobile Stacked layout ─── */
					<View style={styles.mobileLayoutContainer}>
						{renderHeroImage()}
						{renderInfoSection()}
						{renderMetadataSection()}
						{product._id && <ReviewSection targetResource="products" targetId={product._id} targetName={localize(product.name)} />}
					</View>
				)}
			</SmartHeader.ScrollView>

			{/* QR Code Modal */}
			{product && (
				<QRCodeModal
					visible={showQRCode}
					onClose={() => setShowQRCode(false)}
					value={`${config.frontend.url}/p/${product.slug}`}
					title={localize(product.name)}
					subtitle={`${product.slug}`}
					filenamePrefix={`product_${product.slug}`}
				/>
			)}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		alignSelf: 'center',
		width: '100%',
		maxWidth: 1200,
		paddingHorizontal: 16
	},
	splitLayoutContainer: {
		flexDirection: 'row',
		width: '100%',
		gap: 24,
		marginTop: 8
	},
	leftColumn: {
		flex: 1.1,
		gap: 16
	},
	rightColumn: {
		flex: 0.9,
		gap: 16
	},
	mobileLayoutContainer: {
		width: '100%',
		gap: 16
	},
	imageContainer: {
		width: '100%',
		height: 380,
		borderRadius: 24,
		overflow: 'hidden',
		position: 'relative',
		...createShadow({ offsetY: 4, opacity: 0.2, radius: 12, elevation: 4 })
	},
	productImage: {
		width: '100%',
		height: '100%'
	},
	unavailableOverlay: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(0,0,0,0.7)',
		justifyContent: 'center',
		alignItems: 'center'
	},
	unavailableText: {
		color: '#EF4444',
		fontSize: 22,
		fontWeight: '800',
		textTransform: 'uppercase',
		letterSpacing: 1.5
	},
	imageGradient: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: 120,
		justifyContent: 'flex-end',
		padding: 20
	},
	stockBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		alignSelf: 'flex-start',
		borderWidth: 1
	},
	stockDot: {
		width: 8,
		height: 8,
		borderRadius: 4,
		marginRight: 6
	},
	stockText: {
		fontSize: 12,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	infoCard: {
		borderRadius: 24,
		padding: 24,
		borderWidth: 1,
		...createShadow({ offsetY: 2, opacity: 0.08, radius: 6, elevation: 2 })
	},
	productName: {
		fontSize: 28,
		fontWeight: '800',
		letterSpacing: -0.5,
		marginBottom: 6
	},
	productNameSecondary: {
		fontSize: 14,
		fontWeight: '500',
		marginBottom: 20
	},
	priceSection: {
		marginBottom: 20,
		paddingBottom: 20,
		borderBottomWidth: 1
	},
	priceLabel: {
		fontSize: 11,
		textTransform: 'uppercase',
		fontWeight: '700',
		letterSpacing: 1,
		marginBottom: 6
	},
	priceContainer: {
		flexDirection: 'row',
		alignItems: 'baseline'
	},
	priceValue: {
		fontSize: 36,
		fontWeight: '900',
		letterSpacing: -1
	},
	priceUnit: {
		fontSize: 16,
		fontWeight: '500',
		marginLeft: 6
	},
	quantityRange: {
		fontSize: 13,
		marginTop: 6,
		fontWeight: '500'
	},
	stockSection: {
		borderRadius: 16,
		padding: 16,
		marginBottom: 20,
		gap: 12
	},
	stockRow: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	stockLabel: {
		fontSize: 14,
		fontWeight: '500',
		flex: 1
	},
	stockValue: {
		fontSize: 15,
		fontWeight: '700'
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 16
	},
	statusLabel: {
		fontSize: 14,
		fontWeight: '500'
	},
	statusBadgeTouch: {
		paddingHorizontal: 12,
		paddingVertical: 5,
		borderRadius: 10
	},
	statusText: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	checkoutPanel: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 20,
		paddingTop: 20,
		borderTopWidth: 1
	},
	checkoutTotalCol: {
		flex: 1
	},
	checkoutTotalLabel: {
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 2
	},
	checkoutTotalPrice: {
		fontSize: 22,
		fontWeight: '900',
		letterSpacing: -0.5
	},
	checkoutActionsCol: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	stepperContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		padding: 3,
		borderWidth: 1
	},
	stepperBtn: {
		width: 36,
		height: 36,
		justifyContent: 'center',
		alignItems: 'center'
	},
	stepperText: {
		fontSize: 16,
		fontWeight: '800',
		minWidth: 32,
		textAlign: 'center'
	},
	cartSubmitBtn: {
		width: 46,
		height: 46,
		borderRadius: 14,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({ web: { boxShadow: '0 4px 12px rgba(14,165,233,0.35)' } as any })
	},
	metadataContainer: {
		gap: 12
	},
	metaCard: {
		borderRadius: 16,
		padding: 16,
		borderWidth: 1,
		...createShadow({ offsetY: 1, opacity: 0.05, radius: 4, elevation: 1 })
	},
	metaCardStatic: {
		borderRadius: 16,
		padding: 16,
		borderWidth: 1
	},
	metaCardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginBottom: 10
	},
	metaCardTitleWrap: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8
	},
	metaCardIconBg: {
		width: 24,
		height: 24,
		borderRadius: 6,
		justifyContent: 'center',
		alignItems: 'center'
	},
	metaCardTitle: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.8
	},
	metaCardTitleStatic: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 10
	},
	metaCardName: {
		fontSize: 16,
		fontWeight: '700'
	},
	metaCardSub: {
		fontSize: 13,
		marginTop: 3,
		fontWeight: '500'
	},
	tagWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8
	},
	tagItem: {
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 8
	},
	tagText: {
		fontSize: 12,
		fontWeight: '600'
	},
	availabilityText: {
		fontSize: 14,
		fontWeight: '500',
		marginBottom: 4
	},
	slugValue: {
		fontSize: 14,
		fontWeight: '600',
		fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace'
	},
	specsRow: {
		flexDirection: 'row',
		gap: 16,
		marginBottom: 12
	}
})
