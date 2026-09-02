import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, RefreshControl, useWindowDimensions, TouchableOpacity, TextInput, Pressable } from 'react-native'
import { useLocalSearchParams, useRouter, usePathname } from 'expo-router'
import { FlashList as ShopifyFlashList } from '@shopify/flash-list'
const FlashList = ShopifyFlashList as any
import { useBusinessProducts } from '@/features/businesses/useBusinessProducts'
import { Product } from '@/features/businesses/businesses.interface'
import { getCaliberLabel, getCaliberIconSize, getCaliberFontSize, getHarvestLabel, getHarvestIcon, getGearLabel } from '@/features/products/products.helpers'
import { GearIcon } from '@/features/products/common/GearIcons'
import { useTheme, themeColors } from '@/core/theme'
import ErrorBlock from '@/core/error/ErrorBlock'
import EmptyState from '@/features/common/EmptyState'
import { IconButton } from '@/features/common/buttons/IconButton'
import { Stack } from 'expo-router'
import { HeaderRefreshButton, HeaderSalesButton, SmartHeader } from '@/core/smart-header'
import { getItem, setItem } from '@/core/storage'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { toast } from '@/features/common/Toast'
import Spinner from '@/features/common/Spinner'
import { SmartMediaView } from '@/core/smart-media'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/scroll'
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
const ProductCard = React.memo(function ProductCard({ item, colors, localize, formatPrice, currency, translate, onAddToCart, isWide, isDashboard, businessSlug }: ProductCardProps) {
	const router = useRouter()
	const imageUrl = item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url
	const stockQty = item.stock?.quantity || 0
	const minThreshold = item.stock?.minThreshold || 5
	const isOutOfStock = stockQty === 0
	const isLowStock = stockQty > 0 && stockQty <= minThreshold
	const isActive = item.state ? item.state.code === 'active' : item.isActive !== false
	// @ts-ignore
	const unitPrice = item.price?.total?.[currency] || item.price?.total?.tnd || 0
	const minQty = item.unit?.min || 1
	const maxQuantity = item.unit?.max || Infinity
	const step = item.unit?.step || 1
	const [quantity, setQuantity] = useState(minQty)
	useEffect(() => {
		setQuantity(minQty)
	}, [minQty])
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
			style={({ pressed }) => [cardStyles.card, { backgroundColor: colors.background, borderColor: colors.info }, pressed && { opacity: 0.92, transform: [{ scale: 0.985 }] }]}
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
				<SmartMediaView media={imageUrl} style={cardStyles.image} resizeMode="cover" />
				{/* Stock badge overlay */}
				{(isOutOfStock || isLowStock) && (
					<View style={[cardStyles.stockOverlay, { backgroundColor: isOutOfStock ? themeColors.background50 : themeColors.background25 }]}>
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
				{/* Specifications (Caliber & Origin) */}
				{(item.specs?.caliber || item.specs?.origin?.city || item.specs?.harvest || item.specs?.gear) && (
					<View style={cardStyles.specsCardRow}>
						{item.specs?.caliber ? (
							<View style={[cardStyles.caliberChip, { backgroundColor: colors.primary + '15' }]}>
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
								<Text style={[cardStyles.caliberChipText, { color: colors.primary }]}>{getCaliberLabel(item.specs.caliber)}</Text>
							</View>
						) : null}
						{item.specs?.harvest ? (
							<View style={[cardStyles.harvestChip, { backgroundColor: colors.success + '15' }]}>
								<Ionicons name={getHarvestIcon(item.specs?.harvest)} size={12} color={colors.success} />
								<Text style={[cardStyles.harvestChipText, { color: colors.success }]}>{getHarvestLabel(item.specs.harvest)}</Text>
							</View>
						) : null}
						{item.specs?.gear ? (
							<View style={[cardStyles.harvestChip, { backgroundColor: colors.primary + '15' }]}>
								<GearIcon type={item.specs.gear} size={12} color={colors.primary} />
								<Text style={[cardStyles.harvestChipText, { color: colors.primary }]}>{getGearLabel(item.specs.gear)}</Text>
							</View>
						) : null}
						{item.specs?.origin?.city ? (
							<View style={[cardStyles.originChip, { backgroundColor: colors.surfaceVariant }]}>
								<Ionicons name="location-outline" size={10} color={colors.textSecondary} />
								<Text style={[cardStyles.originChipText, { color: colors.textSecondary }]}>{item.specs.origin.city}</Text>
							</View>
						) : null}
					</View>
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
							<IconButton icon="remove-outline" label={translate('decrease', 'Decrease')} onPress={decrement} iconColor={colors.text} />
							<Text style={{ fontSize: 13, fontWeight: '600', color: colors.text, minWidth: 24, textAlign: 'center' }}>{quantity}</Text>
							<IconButton icon="add-outline" label={translate('increase', 'Increase')} onPress={increment} iconColor={colors.text} />
						</View>
						<IconButton
							icon="cart-outline"
							label={translate('add_to_cart', 'Add to Cart')}
							onPress={(e) => {
								e.stopPropagation?.()
								onAddToCart(item, quantity)
							}}
							variant="primary"
						/>
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
})
const cardStyles = StyleSheet.create({
	card: {
		borderRadius: 20,
		borderWidth: 1,
		overflow: 'hidden'
	},
	imageWrap: {
		width: '100%',
		aspectRatio: 1.35,
		position: 'relative'
	},
	image: { width: '100%', height: '100%' },
	stockOverlay: {
		...StyleSheet.absoluteFill,
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
	const { localize, translate, currency, formatPrice, user } = useUser()
	const { width, height } = useWindowDimensions()
	const { onScroll } = useScrollHandler()
	// Responsive
	const isTablet = width >= BP.tablet && width < BP.desktop
	const isDesktop = width >= BP.desktop
	const isWide = width >= BP.wide
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
	const { data: response, isInitialLoading, isRefreshing, isOffline, refresh } = useBusinessProducts({ businessSlug })
	const products = response?.data?.docs || []
	const businessName = products.length > 0 && products[0].business?.name ? localize(products[0].business.name) : ''
	const [searchText, setSearchText] = useState('')
	const [activeFilter, setActiveFilter] = useState<'all' | 'inStock' | 'lowStock' | 'outOfStock'>('all')
	const [cart, setCart] = useState<any[]>([])
	useEffect(() => {
		const load = async () => {
			try {
				const saved = await getItem<any[]>('cart')
				if (saved) setCart(saved)
			} catch {}
		}
		load()
	}, [])
	// Derive filtered list via useMemo (avoid double render from useEffect+setState)
	const filteredProducts = useMemo(() => {
		let list = products
		if (searchText.trim()) {
			const q = searchText.toLowerCase()
			list = list.filter((p) => localize(p.name).toLowerCase().includes(q))
		}
		if (activeFilter === 'inStock') list = list.filter((p) => (p.stock?.quantity || 0) > (p.stock?.minThreshold || 5))
		if (activeFilter === 'lowStock') {
			list = list.filter((p) => {
				const q = p.stock?.quantity || 0
				const t = p.stock?.minThreshold || 5
				return q > 0 && q <= t
			})
		}
		if (activeFilter === 'outOfStock') list = list.filter((p) => (p.stock?.quantity || 0) === 0)
		return list
	}, [products, searchText, activeFilter, localize])
	// Add to cart — functional update to keep renderItem stable (avoid cart dep churn)
	const handleAddToCart = useCallback(
		async (item: Product, qty: number) => {
			try {
				let snapshot: any[] = []
				setCart((prev: any[]) => {
					const existing = prev.findIndex((b) => b._id === item._id)
					const next = existing > -1 ? prev.map((b, i) => (i === existing ? { ...b, quantity: b.quantity + qty } : b)) : [...prev, { ...item, quantity: qty }]
					snapshot = next
					return next
				})
				setTimeout(async () => {
					if (snapshot.length) await setItem('cart', snapshot)
				}, 0)
				toast.show({
					title: 'Success',
					content: `${localize(item.name)} ${translate('cart_added_to_cart', 'added to cart')}`,
					borderColor: themeColors.success,
					screen: user ? '/purchases?status=cart' : '/auth'
				})
			} catch {
				toast.show({ title: 'Error', content: translate('cart_failed_to_add', 'Failed to add to cart'), borderColor: themeColors.error })
			}
		},
		[localize, translate, user]
	)
	const handleRefresh = useCallback(() => {
		refresh()
	}, [refresh])
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
	const headerActions = useMemo(() => {
		const actions: any[] = []
		if (isDashboard) {
			actions.push(<HeaderSalesButton key="sales" businessSlug={businessSlug} label={translate('sales', 'Sales')} />)
			// Hide the default cart button on the owner dashboard
			actions.push(<React.Fragment key="cart" />)
		}
		actions.push(<HeaderRefreshButton key="refresh" onRefresh={handleRefresh} isRefreshing={isRefreshing} />)
		return actions
	}, [isDashboard, businessSlug, handleRefresh, isRefreshing, translate])
	const filters: { key: typeof activeFilter; label: string; color: string; count: number }[] = [
		{ key: 'all', label: translate('all', 'All'), color: colors.primary, count: counts.all },
		{ key: 'inStock', label: translate('in_stock', 'In Stock'), color: colors.success, count: counts.inStock },
		{ key: 'lowStock', label: translate('low_stock', 'Low Stock'), color: colors.warning, count: counts.lowStock },
		{ key: 'outOfStock', label: translate('out_of_stock', 'Out of Stock'), color: colors.error, count: counts.outOfStock }
	]
	const renderFilterChip = useCallback(
		({ item: f }: { item: any }) => {
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
						<Text style={[s.chipCountText, { color: active ? themeColors.surface : colors.textSecondary }]}>{f.count}</Text>
					</View>
				</TouchableOpacity>
			)
		},
		[activeFilter, colors, s, setActiveFilter]
	)
	// Render item
	const renderItem = useCallback(
		({ item }: { item: Product }) => {
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
	if (isInitialLoading && !isRefreshing) {
		return (
			<View style={[s.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: businessName || translate('business_products', 'Products') }} />
				<Spinner />
			</View>
		)
	}
	const headerTitle = businessName || translate('business_products', 'Products')
	return (
		<View style={[s.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: headerTitle,
						headerActions: headerActions
					} as any
				}
			/>
			{/* Search bar */}
			{
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
			}
			{/* Filter chips */}
			{products.length > 0 && (
				<View style={s.filtersOuter}>
					<FlashList
						horizontal
						data={filters}
						keyExtractor={(f: any) => f.key}
						showsHorizontalScrollIndicator={false}
						estimatedItemSize={96}
						contentContainerStyle={[s.filtersContent, { paddingHorizontal: horizontalPadding }]}
						renderItem={renderFilterChip}
					/>
				</View>
			)}
			{/* Results count */}
			{!isInitialLoading && filteredProducts.length > 0 && (
				<View style={{ paddingHorizontal: horizontalPadding, paddingBottom: 8, maxWidth: contentMaxWidth, alignSelf: 'center', width: '100%' }}>
					<Text style={[s.resultsText, { color: colors.textTertiary }]}>
						{filteredProducts.length} {filteredProducts.length === 1 ? translate('product', 'product') : translate('products', 'products')}
						{searchText ? ` ${translate('found', 'found')}` : ''}
					</Text>
				</View>
			)}
			{/* Grid */}
			<SmartHeader.FlashList
				key={`grid-${numColumns}`}
				data={filteredProducts}
				renderItem={renderItem}
				keyExtractor={(item: any) => item._id}
				estimatedItemSize={260}
				numColumns={numColumns}
				contentContainerStyle={{
					paddingHorizontal: horizontalPadding,
					paddingTop: 8,
					paddingBottom: 40,
					maxWidth: contentMaxWidth,
					alignSelf: 'center',
					width: '100%',
					...(products.length === 0 ? { flexGrow: 1, justifyContent: 'center' } : {})
				}}
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
				keyboardShouldPersistTaps="handled"
				ListEmptyComponent={
					isOffline ? (
						<ErrorBlock />
					) : !isInitialLoading ? (
						<EmptyState
							onActionPress={
								searchText || activeFilter !== 'all'
									? () => {
											setSearchText('')
											setActiveFilter('all')
										}
									: undefined
							}
						/>
					) : null
				}
			/>
			{isDashboard && (
				<TouchableOpacity style={[s.fab, { backgroundColor: colors.primary }]} onPress={() => router.push(`/dashboard/${businessSlug}/create-product` as any)}>
					<Ionicons name="add" size={28} color={colors.buttonText} />
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
		borderWidth: 1
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		padding: 0
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
	fab: {
		position: 'absolute',
		bottom: 24,
		right: 24,
		width: 56,
		height: 56,
		borderRadius: 28,
		justifyContent: 'center',
		alignItems: 'center'
	}
})
