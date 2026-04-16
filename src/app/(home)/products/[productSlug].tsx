import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, useWindowDimensions } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '@/core/contexts/ThemeContext'
import { useUser } from '@/core/contexts/UserContext'
import { useLayout } from '@/core/contexts/LayoutContext'
import { getProductBySlug } from '@/components/products/products.api'
import { ProductType } from '@/components/products/products.type'
import { parseError } from '@/core/helpers/errorHandler'
import ErrorState from '@/components/common/ErrorState'
import ScreenHeader from '@/components/common/ScreenHeader'
import SmartImage from '@/core/helpers/SmartImage'
import { LinearGradient } from 'expo-linear-gradient'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import ReviewSection from '@/components/reviews/Reviews'

export default function ProductDetailScreen() {
	const { productSlug } = useLocalSearchParams<{ productSlug: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { localize, translate, currency, formatPrice } = useUser()
	const { onScroll } = useScrollHandler()
	const { setTabBarVisible } = useLayout()
	const { width } = useWindowDimensions()

	const [product, setProduct] = useState<ProductType | null>(null)
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)

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
	}

	const handleShopPress = () => {
		if (product?.shop?.slug) {
			router.push(`/shops/${product.shop.slug}` as any)
		}
	}

	const handleBusinessPress = () => {
		if (product?.shop?.owner?.business?.slug) {
			router.push(`/business/${product.shop.owner.business.slug}` as any)
		}
	}

	if (loading && !product) {
		return (
			<View key={productSlug} style={[styles.container, { backgroundColor: colors.background }]}>
				<ScreenHeader title={translate('product_details', 'Product Details')} showBack={true} />
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
				<ScreenHeader title={translate('product_details', 'Product Details')} showBack={true} />
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
				<ScreenHeader title={translate('product_details', 'Product Details')} showBack={true} />
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
			<ScreenHeader title={localize(product.name)} showBack={true} onRefresh={handleRefresh} isRefreshing={refreshing} />

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
				</View>

				{/* Shop Info Card */}
				<TouchableOpacity onPress={handleShopPress} style={[styles.shopCard, { backgroundColor: colors.card }]}>
					<View style={styles.sectionHeader}>
						<MaterialIcons name="store" size={20} color={colors.primary} />
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('shop', 'Shop')}</Text>
						<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
					</View>
					<Text style={[styles.shopName, { color: colors.text }]}>{localize(product.shop?.name)}</Text>
					{product.shop?.address && (
						<Text style={[styles.shopAddress, { color: colors.textSecondary }]}>
							{product.shop.address.city}, {product.shop.address.country}
						</Text>
					)}
				</TouchableOpacity>

				{/* Business Info Card */}
				{product.shop?.owner?.business && (
					<TouchableOpacity onPress={handleBusinessPress} style={[styles.shopCard, { backgroundColor: colors.card }]}>
						<View style={styles.sectionHeader}>
							<MaterialIcons name="business" size={20} color={colors.primary} />
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('business', 'Business')}</Text>
							<Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
						</View>
						<Text style={[styles.shopName, { color: colors.text }]}>{localize(product.shop.owner.business.name)}</Text>
						<Text style={[styles.shopAddress, { color: colors.textSecondary }]}>
							{translate('owner', 'Owner')}: {localize(product.shop.owner.name)}
						</Text>
					</TouchableOpacity>
				)}

				{/* Default Product Info */}
				{product.defaultProduct && (
					<View style={[styles.defaultProductCard, { backgroundColor: colors.card }]}>
						<View style={styles.sectionHeader}>
							<Ionicons name="fish-outline" size={20} color={colors.primary} />
							<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('default_product', 'Default Product')}</Text>
						</View>
						<Text style={[styles.shopName, { color: colors.text }]}>{localize(product.defaultProduct.name)}</Text>
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

				{/* Reviews Section */}
				{product._id && <ReviewSection targetResource="products" targetId={product._id} targetName={localize(product.name)} />}

				{/* Bottom Spacing */}
				<View style={styles.bottomSpacing} />
			</ScrollView>
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
	shopCard: {
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
	shopName: {
		fontSize: 16,
		fontWeight: '600'
	},
	shopAddress: {
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
