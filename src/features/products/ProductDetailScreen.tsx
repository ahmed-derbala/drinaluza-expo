import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, useWindowDimensions, Platform } from 'react-native'
import HeaderUpdaterWidget from '@/features/appUpdater/HeaderUpdaterWidget'
import { useLocalSearchParams, useRouter, usePathname } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { useLayout } from '@/core/contexts/LayoutContext'
import { getProductBySlug } from '@/features/products/products.api'
import { ProductType } from '@/features/products/products.type'
import { parseError } from '@/core/helpers/errorHandler'
import ErrorState from '@/features/common/ErrorState'
import { Stack } from 'expo-router'
import HeaderRefreshButton from '../common/HeaderRefreshButton'
import SmartImage from '@/core/SmartImageViewer'
import { toast } from '@/features/common/Toast'
import { LinearGradient } from 'expo-linear-gradient'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import ReviewSection from '@/features/reviews/Reviews'
import QRCodeModal from '@/features/common/QRCodeModal'

export default function ProductDetailScreen() {
	const { productSlug, businessSlug } = useLocalSearchParams<{ productSlug: string; businessSlug?: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { localize, translate, currency, formatPrice } = useUser()
	const { onScroll } = useScrollHandler()
	const { setTabBarVisible } = useLayout()
	const { width } = useWindowDimensions()
	const pathname = usePathname()
	const isDashboard = pathname.includes('/dashboard')

	const [product, setProduct] = useState<ProductType | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const [cart, setCart] = useState<any[]>([])
	const [quantity, setQuantity] = useState(1)
	const [showQRCode, setShowQRCode] = useState(false)

	const displayTitle = product ? localize(product.name) : translate('loading', 'Loading...')

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
			await AsyncStorage.setItem('cart', JSON.stringify(newCart))
			toast.show({ title: 'Success', message: `${localize(product.name)} ${translate('cart_added_to_cart', 'added to cart')}`, color: '#10B981', screen: '/profile/purchases?status=cart' })
		} catch {
			toast.show({ title: 'Error', message: translate('cart_failed_to_add', 'Failed to add to cart'), color: '#EF4444' })
		}
	}

	const loadCart = async () => {
		try {
			const saved = await AsyncStorage.getItem('cart')
			if (saved) setCart(JSON.parse(saved))
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

	if (loading && !product) {
		return (
			<View key={productSlug} style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: displayTitle }} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
					<Text style={[styles.loadingText, { color: colors.textSecondary }]}>{translate('loading', 'Loading...')}</Text>
				</View>
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
		if (isOutOfStock) return { color: '#EF4444', bgColor: '#EF444415', label: translate('out_of_stock', 'Out of Stock'), icon: 'alert-circle' as const }
		if (isLowStock) return { color: '#F59E0B', bgColor: '#F59E0B15', label: translate('low_stock', 'Low Stock'), icon: 'warning' as const }
		return { color: '#10B981', bgColor: '#10B98115', label: translate('in_stock', 'In Stock'), icon: 'checkmark-circle' as const }
	}
	const stockStatus = getStockStatus()

	return (
		<View key={productSlug} style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={{
					title: displayTitle,
					headerLeft: () => {
						if (router.canGoBack()) return null
						const fallbackRoute = `/businesses/${businessSlug || product?.business?.slug || ''}`
						return (
							<TouchableOpacity
								style={{
									flexDirection: 'row',
									alignItems: 'center',
									marginLeft: Platform.OS === 'ios' ? 8 : 0,
									gap: 4
								}}
								onPress={() => {
									if (businessSlug || product?.business?.slug) {
										router.replace(fallbackRoute as any)
									} else {
										router.replace('/(home)/feed' as any)
									}
								}}
							>
								<Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={24} color={colors.primary} />
								{Platform.OS === 'ios' && <Text style={{ color: colors.primary, fontSize: 17 }}>{translate('back', 'Back')}</Text>}
							</TouchableOpacity>
						)
					},
					headerRight: () => (
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
							{isDashboard && (
								<>
									<TouchableOpacity
										style={{
											width: 40,
											height: 40,
											borderRadius: 10,
											backgroundColor: colors.surface,
											justifyContent: 'center',
											alignItems: 'center',
											borderWidth: 1,
											borderColor: colors.border || 'transparent'
										}}
										onPress={() => {
											const slug = businessSlug || product?.business?.slug
											if (slug) {
												router.push(`/dashboard/${slug}/sales?productSlug=${product?.slug || productSlug}` as any)
											}
										}}
									>
										<Ionicons name="trending-up" size={20} color={colors.primary} />
									</TouchableOpacity>
									<TouchableOpacity
										style={{
											width: 40,
											height: 40,
											borderRadius: 10,
											backgroundColor: colors.surface,
											justifyContent: 'center',
											alignItems: 'center',
											borderWidth: 1,
											borderColor: colors.border || 'transparent'
										}}
										onPress={() => router.push(`${pathname}/edit` as any)}
									>
										<Ionicons name="pencil" size={20} color={colors.primary} />
									</TouchableOpacity>
								</>
							)}
							<TouchableOpacity
								style={{
									width: 40,
									height: 40,
									borderRadius: 10,
									backgroundColor: colors.surface,
									justifyContent: 'center',
									alignItems: 'center',
									borderWidth: 1,
									borderColor: colors.border || 'transparent'
								}}
								onPress={() => setShowQRCode(true)}
								activeOpacity={0.7}
							>
								<Ionicons name="qr-code-outline" size={20} color={colors.primary} />
							</TouchableOpacity>
							{!isDashboard && (
								<TouchableOpacity
									style={{
										width: 40,
										height: 40,
										borderRadius: 10,
										backgroundColor: colors.surface,
										justifyContent: 'center',
										alignItems: 'center',
										borderWidth: 1,
										borderColor: colors.border || 'transparent'
									}}
									onPress={() => router.push('/profile/purchases?status=cart' as any)}
								>
									<Ionicons name="cart-outline" size={20} color={colors.primary} />
									{cart.length > 0 && (
										<View
											style={{
												position: 'absolute',
												top: -6,
												right: -6,
												backgroundColor: colors.error || '#ef4444',
												borderRadius: 10,
												minWidth: 20,
												height: 20,
												justifyContent: 'center',
												alignItems: 'center',
												paddingHorizontal: 4,
												borderWidth: 1.5,
												borderColor: colors.surface
											}}
										>
											<Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{cart.length}</Text>
										</View>
									)}
								</TouchableOpacity>
							)}
							<HeaderRefreshButton onRefresh={handleRefresh} isRefreshing={refreshing} />
							<HeaderUpdaterWidget />
						</View>
					)
				}}
			/>

			<ScrollView
				contentContainerStyle={[styles.scrollContent, width > 800 && { maxWidth: 800, alignSelf: 'center', width: '100%' }]}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
			>
				{/* Product Image */}
				<View style={styles.imageContainer}>
					<SmartImage source={imageUrl} style={styles.productImage} resizeMode="cover" entityType="product" />
					{!isAvailable && (
						<View style={styles.unavailableOverlay}>
							<Text style={styles.unavailableText}>{product.state?.code !== 'active' ? translate('unavailable', 'Unavailable') : translate('out_of_stock', 'Out of Stock')}</Text>
						</View>
					)}
					<LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.imageGradient}>
						<View style={styles.stockBadge}>
							<Ionicons name={stockStatus.icon} size={14} color={stockStatus.color} />
							<Text style={[styles.stockText, { color: stockStatus.color }]}>{stockStatus.label}</Text>
						</View>
					</LinearGradient>
				</View>

				{/* Product Info Card */}
				<View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]}>
					{/* Product Name */}
					<Text style={[styles.productName, { color: colors.text }]}>{localize(product.name)}</Text>
					{(product.name?.tn_latn || product.name?.tn_arab) && (
						<Text style={[styles.productNameSecondary, { color: colors.textSecondary }]}>
							{product.name?.tn_latn} {product.name?.tn_arab && `• ${product.name?.tn_arab}`}
						</Text>
					)}

					{/* Price */}
					<View style={styles.priceSection}>
						<Text style={[styles.priceLabel, { color: colors.textSecondary }]}>{translate('price', 'Price')}</Text>
						<View style={styles.priceContainer}>
							<Text style={[styles.priceValue, { color: colors.primary }]}>{formatPrice({ total: { [currency]: unitPrice } })}</Text>
							<Text style={[styles.priceUnit, { color: colors.textTertiary }]}>/ {product.unit?.measure || translate('unit', 'unit')}</Text>
						</View>
						<Text style={[styles.quantityRange, { color: colors.textSecondary }]}>
							{translate('min', 'Min')}: {product.unit?.min || 1} - {translate('max', 'Max')}: {product.unit?.max || '∞'} {product.unit?.measure || ''}
						</Text>
					</View>

					{/* Stock Info */}
					<View style={[styles.stockSection, { backgroundColor: colors.surface }]}>
						<View style={styles.stockRow}>
							<Ionicons name="cube-outline" size={20} color={colors.textSecondary} />
							<Text style={[styles.stockLabel, { color: colors.textSecondary }]}>{translate('stock_quantity', 'Stock Quantity')}</Text>
							<Text style={[styles.stockValue, { color: colors.text }]}>{stockQty}</Text>
						</View>
						<View style={styles.stockRow}>
							<Ionicons name="alert-circle-outline" size={20} color={colors.textSecondary} />
							<Text style={[styles.stockLabel, { color: colors.textSecondary }]}>{translate('min_threshold', 'Min Threshold')}</Text>
							<Text style={[styles.stockValue, { color: colors.text }]}>{minThreshold}</Text>
						</View>
					</View>

					{/* Status */}
					<View style={styles.statusRow}>
						<Text style={[styles.statusLabel, { color: colors.textSecondary }]}>{translate('status', 'Status')}</Text>
						<View style={[styles.statusBadge, { backgroundColor: isAvailable ? '#10B98120' : '#EF444420' }]}>
							<Text style={[styles.statusText, { color: isAvailable ? '#10B981' : '#EF4444' }]}>
								{product.state?.code === 'active' ? translate('active', 'Active') : translate('inactive', 'Inactive')}
							</Text>
						</View>
					</View>

					{/* Add to Cart Actions */}
					{isAvailable && !isDashboard && (
						<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' }}>
							<View>
								<Text style={{ fontSize: 12, fontWeight: '600', textTransform: 'uppercase', color: colors.textSecondary, marginBottom: 2 }}>{translate('total', 'Total')}</Text>
								<Text style={{ fontSize: 20, fontWeight: '800', color: colors.primary }}>{formatPrice({ total: { [currency]: unitPrice * quantity } })}</Text>
							</View>
							<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
								<View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceVariant, borderRadius: 10, padding: 2 }}>
									<TouchableOpacity onPress={decrement} style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }} activeOpacity={0.7}>
										<MaterialIcons name="remove" size={20} color={colors.text} />
									</TouchableOpacity>
									<Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, minWidth: 32, textAlign: 'center' }}>{quantity}</Text>
									<TouchableOpacity onPress={increment} style={{ width: 36, height: 36, justifyContent: 'center', alignItems: 'center' }} activeOpacity={0.7}>
										<MaterialIcons name="add" size={20} color={colors.text} />
									</TouchableOpacity>
								</View>

								<TouchableOpacity
									style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center' }}
									onPress={handleAddToCart}
									activeOpacity={0.8}
								>
									<MaterialIcons name="add-shopping-cart" size={22} color={colors.textOnPrimary || '#0F172A'} />
								</TouchableOpacity>
							</View>
						</View>
					)}
				</View>

				{/* Business Info Card */}
				<TouchableOpacity onPress={handleBusinessNavPress} style={[styles.businessCard, { backgroundColor: colors.card }]}>
					<View style={styles.sectionHeader}>
						<MaterialIcons name="store" size={20} color={colors.primary} />
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('business', 'Business')}</Text>
						<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
					</View>
					<Text style={[styles.businessName, { color: colors.text }]}>{localize(product.business?.name)}</Text>
					{product.business?.address && (
						<Text style={[styles.businessAddress, { color: colors.textSecondary }]}>
							{product.business.address.city}, {product.business.address.country}
						</Text>
					)}
				</TouchableOpacity>

				{/* Owner Info Card */}
				{product.business?.owner && (
					<TouchableOpacity onPress={handleOwnerPress} style={[styles.businessCard, { backgroundColor: colors.card }]}>
						<View style={styles.sectionHeader}>
							<MaterialIcons name="person" size={20} color={colors.primary} />
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('owner', 'Owner')}</Text>
							<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
						</View>
						<Text style={[styles.businessName, { color: colors.text }]}>{localize(product.business.owner.name)}</Text>
					</TouchableOpacity>
				)}

				{/* Default Product Info */}
				{product.defaultProduct && (
					<View style={[styles.defaultProductCard, { backgroundColor: colors.card }]}>
						<View style={styles.sectionHeader}>
							<Ionicons name="fish-outline" size={20} color={colors.primary} />
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('default_product', 'Default Product')}</Text>
						</View>
						<Text style={[styles.businessName, { color: colors.text }]}>{localize(product.defaultProduct.name)}</Text>
					</View>
				)}

				{/* Search Keywords */}
				{product.searchTerms && product.searchTerms.length > 0 && (
					<View style={[styles.keywordsCard, { backgroundColor: colors.card }]}>
						<Text style={[styles.keywordsTitle, { color: colors.text }]}>{translate('search_keywords', 'Search Keywords')}</Text>
						<View style={styles.keywordsContainer}>
							{product.searchTerms.map((keyword, index) => (
								<View key={index} style={[styles.keywordBadge, { backgroundColor: colors.surface }]}>
									<Text style={[styles.keywordText, { color: colors.textSecondary }]}>{keyword}</Text>
								</View>
							))}
						</View>
					</View>
				)}

				{/* Availability */}
				{product.availability && (
					<View style={[styles.availabilityCard, { backgroundColor: colors.card }]}>
						<View style={styles.sectionHeader}>
							<Ionicons name="calendar-outline" size={20} color={colors.primary} />
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('availability', 'Availability')}</Text>
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

				{/* Product Slug */}
				<View style={[styles.slugCard, { backgroundColor: colors.card }]}>
					<Text style={[styles.slugLabel, { color: colors.textSecondary }]}>{translate('product_slug', 'Product ID')}</Text>
					<Text style={[styles.slugValue, { color: colors.text }]}>{product.slug}</Text>
				</View>

				{product._id && <ReviewSection targetResource="products" targetId={product._id} targetName={localize(product.name)} />}

				{/* Bottom Spacing */}
				<View style={styles.bottomSpacing} />
			</ScrollView>

			{/* QR Code Viewer Modal */}
			{product && (
				<QRCodeModal
					visible={showQRCode}
					onClose={() => setShowQRCode(false)}
					value={`${process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://drinaluza.com'}/p/${product.slug}`}
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
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	loadingText: {
		marginTop: 16,
		fontSize: 16
	},
	scrollContent: {
		padding: 16
	},
	imageContainer: {
		width: '100%',
		height: 280,
		borderRadius: 20,
		overflow: 'hidden',
		position: 'relative',
		marginBottom: 16
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
		color: '#EF4444',
		fontSize: 20,
		fontWeight: '700',
		textTransform: 'uppercase'
	},
	imageGradient: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		height: 80,
		justifyContent: 'flex-end',
		padding: 16
	},
	stockBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: 'rgba(255,255,255,0.9)',
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 20,
		alignSelf: 'flex-start'
	},
	stockText: {
		fontSize: 12,
		fontWeight: '600',
		marginLeft: 6
	},
	infoCard: {
		borderRadius: 20,
		padding: 20,
		marginBottom: 16,
		borderWidth: 1.5
	},
	productName: {
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 4
	},
	productNameSecondary: {
		fontSize: 14,
		marginBottom: 16
	},
	priceSection: {
		marginBottom: 16,
		paddingBottom: 16,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.1)'
	},
	priceLabel: {
		fontSize: 12,
		textTransform: 'uppercase',
		fontWeight: '600',
		marginBottom: 4
	},
	priceContainer: {
		flexDirection: 'row',
		alignItems: 'baseline'
	},
	priceValue: {
		fontSize: 32,
		fontWeight: '800'
	},
	priceUnit: {
		fontSize: 16,
		marginLeft: 4
	},
	quantityRange: {
		fontSize: 13,
		marginTop: 4
	},
	stockSection: {
		borderRadius: 12,
		padding: 16,
		marginBottom: 16
	},
	stockRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8
	},
	stockLabel: {
		fontSize: 14,
		marginLeft: 8,
		flex: 1
	},
	stockValue: {
		fontSize: 16,
		fontWeight: '700'
	},
	statusRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	statusLabel: {
		fontSize: 14
	},
	statusBadge: {
		paddingHorizontal: 12,
		paddingVertical: 6,
		borderRadius: 12
	},
	statusText: {
		fontSize: 12,
		fontWeight: '600',
		textTransform: 'uppercase'
	},
	businessCard: {
		borderRadius: 16,
		padding: 16,
		marginBottom: 12
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8
	},
	sectionTitle: {
		fontSize: 14,
		fontWeight: '600',
		textTransform: 'uppercase',
		flex: 1,
		marginLeft: 8
	},
	businessName: {
		fontSize: 16,
		fontWeight: '600'
	},
	businessAddress: {
		fontSize: 13,
		marginTop: 2
	},
	defaultProductCard: {
		borderRadius: 16,
		padding: 16,
		marginBottom: 12
	},
	keywordsCard: {
		borderRadius: 16,
		padding: 16,
		marginBottom: 12
	},
	keywordsTitle: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 12
	},
	keywordsContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 8
	},
	keywordBadge: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8
	},
	keywordText: {
		fontSize: 12
	},
	availabilityCard: {
		borderRadius: 16,
		padding: 16,
		marginBottom: 12
	},
	availabilityText: {
		fontSize: 14,
		marginBottom: 4
	},
	slugCard: {
		borderRadius: 16,
		padding: 16,
		marginBottom: 12
	},
	slugLabel: {
		fontSize: 12,
		textTransform: 'uppercase',
		fontWeight: '600',
		marginBottom: 4
	},
	slugValue: {
		fontSize: 14,
		fontWeight: '500'
	},
	bottomSpacing: {
		height: 40
	}
})
