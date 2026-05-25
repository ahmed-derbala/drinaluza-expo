import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, useWindowDimensions, TouchableOpacity, Platform, TextInput, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter, usePathname } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { getBusinessProductsBySlug } from '@/features/businesses/businesses.api'
import { Product } from '@/features/businesses/businesses.interface'
import { useTheme } from '@/core/theme'
import { parseError } from '@/core/helpers/errorHandler'
import ErrorState from '@/features/common/ErrorState'
import { Stack } from 'expo-router'
import HeaderRefreshButton from '../common/HeaderRefreshButton'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { toast } from '@/features/common/Toast'
import SmartImage from '@/core/helpers/SmartImage'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'

// ─── Breakpoints ────────────────────────────────────────────────────────────
const BP = { mobile: 480, tablet: 768, desktop: 1024, wide: 1440 }

// ─── Product Card ────────────────────────────────────────────────────────────
type ProductCardProps = {
	item: Product
	colors: any
	localize: (obj: any) => string
	formatPrice: (p: any) => string
	currency: string
	translate: (k: string, d: string) => string
	onAddToCart: (item: Product, qty: number) => void
	isWide: boolean
	isDashboard: boolean
	businessSlug?: string
}

function ProductCard({ item, colors, localize, formatPrice, currency, translate, onAddToCart, isWide, isDashboard, businessSlug }: ProductCardProps) {
	const router = useRouter()
	const imageUrl = item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url || (item.photos && item.photos[0])
	const stockQty = item.stock?.quantity || 0
	const minThreshold = item.stock?.minThreshold || 5
	const isOutOfStock = stockQty === 0
	const isLowStock = stockQty > 0 && stockQty <= minThreshold
	const isActive = item.state?.code === 'active' || item.isActive !== false

	// @ts-ignore
	const unitPrice = item.price?.total?.[currency] || item.price?.total?.tnd || 0
	const minQty = item.unit?.min || 1
	const maxQuantity = item.unit?.max || Infinity
	const step = item.unit?.step || 1
	const [quantity, setQuantity] = useState(minQty)

	const increment = (e: any) => {
		e.stopPropagation?.()
		setQuantity((prev) => {
			const next = Math.round((prev + step) * 100) / 100
			return next <= maxQuantity && next <= stockQty ? next : prev
		})
	}

	const decrement = (e: any) => {
		e.stopPropagation?.()
		setQuantity((prev) => {
			const next = Math.round((prev - step) * 100) / 100
			return next >= minQty ? next : minQty
		})
	}

	const stockColor = isOutOfStock ? colors.error : isLowStock ? colors.warning : colors.success
	const stockLabel = isOutOfStock ? translate('out_of_stock', 'Out of Stock') : isLowStock ? translate('low_stock', 'Low Stock') : translate('in_stock', 'In Stock')
	const stockIcon: any = isOutOfStock ? 'remove-shopping-cart' : isLowStock ? 'warning-amber' : 'check-circle'

	return (
		<Pressable
			style={({ pressed }) => [cardStyles.card, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
			onPress={() => {
				if (!item.slug) return
				if (isDashboard && businessSlug) {
					router.push(`/dashboard/${businessSlug}/products/${item.slug}` as any)
				} else {
					router.push(`/businesses/${businessSlug || item.business?.slug}/products/${item.slug}` as any)
				}
			}}
		>
			{/* Image */}
			<View style={cardStyles.imageWrap}>
				<SmartImage source={imageUrl} style={cardStyles.image} resizeMode="cover" entityType="product" />
				{/* Stock badge overlay */}
				{(isOutOfStock || isLowStock) && (
					<View style={[cardStyles.stockOverlay, { backgroundColor: isOutOfStock ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.35)' }]}>
						<View style={[cardStyles.stockPill, { backgroundColor: stockColor + '22', borderColor: stockColor + '66' }]}>
							<MaterialIcons name={stockIcon} size={12} color={stockColor} />
							<Text style={[cardStyles.stockPillText, { color: stockColor }]}>{stockLabel}</Text>
						</View>
					</View>
				)}
				{/* Active stock badge top-left */}
				{!isOutOfStock && !isLowStock && (
					<View style={[cardStyles.inStockBadge, { backgroundColor: colors.success + '22', borderColor: colors.success + '44' }]}>
						<MaterialIcons name="check-circle" size={10} color={colors.success} />
						<Text style={[cardStyles.inStockText, { color: colors.success }]}>{stockLabel}</Text>
					</View>
				)}
			</View>

			{/* Body */}
			<View style={cardStyles.body}>
				<Text style={[cardStyles.name, { color: colors.text }]} numberOfLines={2}>
					{localize(item.name)}
				</Text>
				{item.name?.tn_latn && (
					<Text style={[cardStyles.nameAlt, { color: colors.textTertiary }]} numberOfLines={1}>
						{item.name.tn_latn}
					</Text>
				)}

				{/* Price row */}
				<View style={cardStyles.priceRow}>
					<Text style={[cardStyles.price, { color: colors.primary }]}>{formatPrice({ total: { [currency]: unitPrice * quantity } })}</Text>
					{quantity === 1 && <Text style={[cardStyles.unit, { color: colors.textSecondary }]}>/ {item.unit?.measure || translate('unit', 'unit')}</Text>}
				</View>

				{/* Quantity & Actions (Bottom of Price) */}
				{!isDashboard && isActive && !isOutOfStock && (
					<View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, zIndex: 10 }}>
						<View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surfaceVariant, borderRadius: 10, padding: 2 }}>
							<TouchableOpacity onPress={decrement} style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }} activeOpacity={0.7}>
								<MaterialIcons name="remove" size={16} color={colors.text} />
							</TouchableOpacity>
							<Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, minWidth: 24, textAlign: 'center' }}>{quantity}</Text>
							<TouchableOpacity onPress={increment} style={{ width: 28, height: 28, justifyContent: 'center', alignItems: 'center' }} activeOpacity={0.7}>
								<MaterialIcons name="add" size={16} color={colors.text} />
							</TouchableOpacity>
						</View>
						<TouchableOpacity
							style={[cardStyles.addBtn, { backgroundColor: colors.primary }]}
							onPress={(e) => {
								e.stopPropagation?.()
								onAddToCart(item, quantity)
							}}
							activeOpacity={0.8}
						>
							<MaterialIcons name="add-shopping-cart" size={16} color={colors.textOnPrimary || '#0F172A'} />
						</TouchableOpacity>
					</View>
				)}

				{/* Footer for extra info like stock */}
				<View style={cardStyles.footer}>
					<View style={[cardStyles.qtyBadge, { backgroundColor: colors.surfaceVariant }]}>
						<Ionicons name="cube-outline" size={12} color={colors.textSecondary} />
						<Text style={[cardStyles.qtyText, { color: colors.textSecondary }]}>{stockQty}</Text>
					</View>
				</View>
			</View>
		</Pressable>
	)
}

const cardStyles = StyleSheet.create({
	card: {
		borderRadius: 20,
		borderWidth: 1,
		overflow: 'hidden',
		...Platform.select({
			ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 12 },
			android: { elevation: 4 },
			web: { boxShadow: '0 4px 16px rgba(0,0,0,0.25)' } as any
		})
	},
	imageWrap: {
		width: '100%',
		aspectRatio: 1.35,
		position: 'relative',
		backgroundColor: '#1E293B'
	},
	image: { width: '100%', height: '100%' },
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
	body: { padding: 14, gap: 6 },
	name: { fontSize: 15, fontWeight: '700', lineHeight: 20, letterSpacing: -0.2 },
	nameAlt: { fontSize: 12, fontWeight: '500' },
	priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 3, marginTop: 2 },
	price: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
	unit: { fontSize: 12, fontWeight: '500' },
	footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4, flexWrap: 'wrap', rowGap: 8 },
	qtyBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8
	},
	qtyText: { fontSize: 12, fontWeight: '600' },
	addBtn: {
		width: 36,
		height: 36,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({ web: { boxShadow: '0 2px 8px rgba(56,189,248,0.35)' } as any })
	}
})

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function BusinessProductsScreen() {
	// FIX: read 'businessSlug' not 'businessId'
	const { businessSlug } = useLocalSearchParams<{ businessSlug: string }>()
	const { colors } = useTheme()
	const router = useRouter()
	const pathname = usePathname()
	const isDashboard = pathname.includes('/dashboard')
	const { localize, translate, currency, formatPrice } = useUser()
	const { width, height } = useWindowDimensions()
	const { onScroll } = useScrollHandler()

	// Responsive
	const isSmallMobile = width < BP.mobile
	const isMobile = width < BP.tablet
	const isTablet = width >= BP.tablet && width < BP.desktop
	const isDesktop = width >= BP.desktop
	const isWide = width >= BP.wide
	const isLandscape = width > height

	const numColumns = useMemo(() => {
		// Intelligently calculate columns to ensure cards have enough width for all UI elements
		const availableWidth = isWide ? 1400 : isDesktop ? 1200 : isTablet ? 900 : width
		const hPadding = isDesktop ? 32 : isTablet ? 24 : 16

		// 175px minimum width ensures UI elements aren't cramped.
		// On a 390px phone (iPhone 12), this gives 2 columns. On a 320px phone (SE), this gives 1 column.
		return Math.max(1, Math.floor((availableWidth - hPadding * 2) / 175))
	}, [width, isTablet, isDesktop, isWide])

	const contentMaxWidth = useMemo(() => {
		if (isWide) return 1400
		if (isDesktop) return 1200
		if (isTablet) return 900
		return width
	}, [width, isTablet, isDesktop, isWide])

	const horizontalPadding = useMemo(() => {
		if (isDesktop) return 32
		if (isTablet) return 24
		return 16
	}, [isTablet, isDesktop])

	const cardGap = useMemo(() => (isDesktop ? 18 : isTablet ? 14 : 10), [isTablet, isDesktop])

	// State
	const [businessName, setBusinessName] = useState('')
	const [products, setProducts] = useState<Product[]>([])
	const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
	const [cart, setCart] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const [searchText, setSearchText] = useState('')
	const [activeFilter, setActiveFilter] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all')

	// Load cart
	const loadCart = async () => {
		try {
			const saved = await AsyncStorage.getItem('cart')
			if (saved) setCart(JSON.parse(saved))
		} catch {}
	}

	// Load products
	const loadProducts = useCallback(async () => {
		if (!businessSlug) return
		try {
			setError(null)
			const response = await getBusinessProductsBySlug(businessSlug)
			const docs = response.data.docs || []
			setProducts(docs)
			setFilteredProducts(docs)
			if (docs.length > 0 && docs[0].business?.name) {
				setBusinessName(localize(docs[0].business.name))
			}
		} catch (err: any) {
			const errorInfo = parseError(err)
			setError({ title: errorInfo.title, message: errorInfo.message, type: errorInfo.type })
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [businessSlug, localize])

	useEffect(() => {
		loadCart()
		loadProducts()
	}, [loadProducts])

	// Search + filter
	useEffect(() => {
		let list = products
		if (searchText.trim()) {
			const q = searchText.toLowerCase()
			list = list.filter((p) => localize(p.name).toLowerCase().includes(q))
		}
		if (activeFilter === 'inStock') list = list.filter((p) => p.stock?.quantity > (p.stock?.minThreshold || 5))
		if (activeFilter === 'lowStock') {
			list = list.filter((p) => {
				const q = p.stock?.quantity || 0
				const t = p.stock?.minThreshold || 5
				return q > 0 && q <= t
			})
		}
		if (activeFilter === 'outOfStock') list = list.filter((p) => (p.stock?.quantity || 0) === 0)
		setFilteredProducts(list)
	}, [searchText, products, activeFilter, localize])

	// Add to cart
	const handleAddToCart = useCallback(
		async (item: Product, qty: number) => {
			try {
				const existing = cart.findIndex((b) => b._id === item._id)
				const newCart = existing > -1 ? cart.map((b, i) => (i === existing ? { ...b, quantity: b.quantity + qty } : b)) : [...cart, { ...item, quantity: qty }]
				setCart(newCart)
				await AsyncStorage.setItem('cart', JSON.stringify(newCart))
				toast.show({ title: 'Success', message: `${localize(item.name)} ${translate('cart_added_to_cart', 'added to cart')}`, color: '#10B981', screen: '/profile/purchases?status=cart' })
			} catch {
				toast.show({ title: 'Error', message: translate('cart_failed_to_add', 'Failed to add to cart'), color: '#EF4444' })
			}
		},
		[cart, localize, translate, router]
	)

	const handleRefresh = () => {
		setRefreshing(true)
		loadProducts()
	}

	// Filter counts
	const counts = useMemo(() => {
		const outOfStock = products.filter((p) => (p.stock?.quantity || 0) === 0).length
		const lowStock = products.filter((p) => {
			const q = p.stock?.quantity || 0
			const t = p.stock?.minThreshold || 5
			return q > 0 && q <= t
		}).length
		const inStock = products.length - outOfStock - lowStock
		return { all: products.length, inStock, lowStock, outOfStock }
	}, [products])

	const filters: { key: typeof activeFilter; label: string; color: string; count: number }[] = [
		{ key: 'all', label: translate('all', 'All'), color: colors.primary, count: counts.all },
		{ key: 'inStock', label: translate('in_stock', 'In Stock'), color: colors.success, count: counts.inStock },
		{ key: 'lowStock', label: translate('low_stock', 'Low Stock'), color: colors.warning, count: counts.lowStock },
		{ key: 'outOfStock', label: translate('out_of_stock', 'Out of Stock'), color: colors.error, count: counts.outOfStock }
	]

	// Render item
	const renderItem = useCallback(
		({ item, index }: { item: Product; index: number }) => {
			const pct = numColumns === 1 ? 100 : (100 - (numColumns - 1) * (cardGap / (contentMaxWidth - horizontalPadding * 2)) * 100) / numColumns
			return (
				<View
					style={{
						width: numColumns === 1 ? '100%' : `${(100 - (numColumns - 1) * 1.5) / numColumns}%`,
						marginBottom: cardGap
					}}
				>
					<ProductCard
						item={item}
						colors={colors}
						localize={localize}
						formatPrice={formatPrice}
						currency={currency}
						translate={translate}
						onAddToCart={handleAddToCart}
						isWide={isWide}
						isDashboard={isDashboard}
						businessSlug={businessSlug}
					/>
				</View>
			)
		},
		[numColumns, cardGap, colors, localize, formatPrice, currency, translate, handleAddToCart, isWide, contentMaxWidth, horizontalPadding]
	)

	// ─── Loading ──────────────────────────────────────────────────────────────
	if (loading && !refreshing) {
		return (
			<View style={[s.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: businessName || translate('business_products', 'Products') }} />
				<View style={s.centered}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			</View>
		)
	}

	const headerTitle = businessName || translate('business_products', 'Products')

	return (
		<View style={[s.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={{
					title: headerTitle,
					headerRight: () => (
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
							{isDashboard && (
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
										if (businessSlug) {
											router.push(`/dashboard/${businessSlug}/sales` as any)
										}
									}}
								>
									<Ionicons name="trending-up" size={20} color={colors.primary} />
								</TouchableOpacity>
							)}
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
						</View>
					)
				}}
			/>

			{/* Search bar */}
			{!error && (
				<View style={[s.searchWrap, { maxWidth: contentMaxWidth, paddingHorizontal: horizontalPadding }]}>
					<View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.inputBorder }]}>
						<Ionicons name="search-outline" size={18} color={colors.textSecondary} />
						<TextInput
							style={[s.searchInput, { color: colors.text }]}
							placeholder={translate('business_search_placeholder', 'Search products…')}
							placeholderTextColor={colors.textTertiary}
							value={searchText}
							onChangeText={setSearchText}
							autoCorrect={false}
							autoCapitalize="none"
						/>
						{searchText.length > 0 && (
							<TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
								<Ionicons name="close-circle" size={18} color={colors.textSecondary} />
							</TouchableOpacity>
						)}
					</View>
				</View>
			)}

			{/* Filter chips */}
			{!error && products.length > 0 && (
				<View style={s.filtersOuter}>
					<FlatList
						horizontal
						data={filters}
						keyExtractor={(f) => f.key}
						showsHorizontalScrollIndicator={false}
						contentContainerStyle={[s.filtersContent, { paddingHorizontal: horizontalPadding }]}
						renderItem={({ item: f }) => {
							const active = activeFilter === f.key
							return (
								<TouchableOpacity
									onPress={() => setActiveFilter(f.key)}
									style={[
										s.chip,
										{
											backgroundColor: active ? f.color + '22' : colors.surface,
											borderColor: active ? f.color : colors.border
										}
									]}
									activeOpacity={0.75}
								>
									<Text style={[s.chipText, { color: active ? f.color : colors.textSecondary }]}>{f.label}</Text>
									<View style={[s.chipCount, { backgroundColor: active ? f.color : colors.surfaceVariant }]}>
										<Text style={[s.chipCountText, { color: active ? '#0F172A' : colors.textSecondary }]}>{f.count}</Text>
									</View>
								</TouchableOpacity>
							)
						}}
					/>
				</View>
			)}

			{/* Results count */}
			{!error && !loading && filteredProducts.length > 0 && (
				<View style={{ paddingHorizontal: horizontalPadding, paddingBottom: 8, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
					<Text style={[s.resultsText, { color: colors.textTertiary }]}>
						{filteredProducts.length} {filteredProducts.length === 1 ? translate('product', 'product') : translate('products', 'products')}
						{searchText ? ` ${translate('found', 'found')}` : ''}
					</Text>
				</View>
			)}

			{/* Grid */}
			<FlatList
				key={`grid-${numColumns}`}
				data={filteredProducts}
				renderItem={renderItem}
				keyExtractor={(item) => item._id}
				numColumns={numColumns}
				contentContainerStyle={{
					paddingHorizontal: horizontalPadding,
					paddingTop: 8,
					paddingBottom: 40,
					maxWidth: contentMaxWidth,
					alignSelf: 'center',
					width: '100%'
				}}
				columnWrapperStyle={numColumns > 1 ? { gap: cardGap * 0.6, justifyContent: 'flex-start' } : undefined}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				showsVerticalScrollIndicator={false}
				onScroll={onScroll}
				scrollEventThrottle={16}
				ListEmptyComponent={
					error ? (
						<ErrorState
							title={error.title}
							message={error.message}
							onRetry={loadProducts}
							icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
						/>
					) : !loading ? (
						<View style={s.emptyWrap}>
							<LinearGradient colors={[colors.primary + '18', colors.primary + '06']} style={s.emptyIconWrap}>
								<Ionicons name={searchText || activeFilter !== 'all' ? 'search-outline' : 'cube-outline'} size={48} color={colors.primary} />
							</LinearGradient>
							<Text style={[s.emptyTitle, { color: colors.text }]}>
								{searchText
									? translate('business_no_results', 'No products match your search')
									: activeFilter !== 'all'
										? translate('no_products_this_filter', 'No products in this category')
										: translate('business_no_products', 'No products yet')}
							</Text>
							<Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>{translate('business_no_products_hint', 'Products from this business will appear here.')}</Text>
							{(searchText || activeFilter !== 'all') && (
								<TouchableOpacity
									style={[s.clearBtn, { borderColor: colors.primary }]}
									onPress={() => {
										setSearchText('')
										setActiveFilter('all')
									}}
								>
									<Text style={[s.clearBtnText, { color: colors.primary }]}>{translate('clear_filters', 'Clear filters')}</Text>
								</TouchableOpacity>
							)}
						</View>
					) : null
				}
			/>

			{isDashboard && (
				<TouchableOpacity style={[s.fab, { backgroundColor: colors.primary }]} onPress={() => router.push(`/dashboard/${businessSlug}/products/create` as any)}>
					<Ionicons name="add" size={28} color={colors.textOnPrimary || '#0F172A'} />
				</TouchableOpacity>
			)}
		</View>
	)
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
	container: { flex: 1 },
	centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
	searchWrap: {
		alignSelf: 'center',
		width: '100%',
		paddingTop: 12,
		paddingBottom: 8
	},
	searchBox: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 10,
		borderRadius: 14,
		paddingHorizontal: 14,
		height: 46,
		borderWidth: 1,
		...Platform.select({ web: { outlineWidth: 0 } as any })
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		padding: 0,
		...Platform.select({ web: { outlineStyle: 'none' } as any })
	},
	filtersOuter: { paddingTop: 4, paddingBottom: 10 },
	filtersContent: { gap: 8, paddingVertical: 2 },
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 12,
		paddingVertical: 7,
		borderRadius: 20,
		borderWidth: 1.5
	},
	chipText: { fontSize: 13, fontWeight: '600' },
	chipCount: {
		minWidth: 20,
		height: 20,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		paddingHorizontal: 4
	},
	chipCountText: { fontSize: 11, fontWeight: '700' },
	resultsText: { fontSize: 12, fontWeight: '500' },
	emptyWrap: {
		alignItems: 'center',
		paddingTop: 60,
		paddingHorizontal: 32,
		gap: 12
	},
	emptyIconWrap: {
		width: 96,
		height: 96,
		borderRadius: 48,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 8
	},
	emptyTitle: { fontSize: 18, fontWeight: '700', textAlign: 'center', letterSpacing: -0.3 },
	emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 300 },
	clearBtn: {
		marginTop: 8,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 10,
		borderWidth: 1
	},
	clearBtnText: { fontSize: 14, fontWeight: '600' },
	fab: {
		position: 'absolute',
		bottom: 24,
		right: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4 },
			android: { elevation: 6 },
			web: { boxShadow: '0 4px 12px rgba(0,0,0,0.3)' } as any
		})
	}
})
