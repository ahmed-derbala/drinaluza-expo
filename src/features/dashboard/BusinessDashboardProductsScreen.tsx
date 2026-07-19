import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, useWindowDimensions, Platform, TextInput, Pressable, ActivityIndicator, Switch, ScrollView, RefreshControl } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useTheme, createShadow } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { toast } from '@/features/common/Toast'
import { showConfirm } from '@/core/helpers/popup'
import QRCodeModal from '@/features/common/QRCodeModal'
import { SmartHeader } from '@/core/smart-header'
import SmartImage from '@/core/SmartImageViewer'
import { useBusinessProducts } from '@/features/businesses/useBusinessProducts'
import { updateProduct } from '@/features/products/products.api'
import { Product } from '@/features/businesses/businesses.interface'
import { LinearGradient } from 'expo-linear-gradient'
import { getCaliberLabel, getCaliberIconSize, getCaliberFontSize, getHarvestLabel, getHarvestIcon, getGearLabel } from '@/features/products/products.helpers'
import { GearIcon } from '@/features/products/common/GearIcons'

// Breakpoints for responsive grid layout
const BP = { mobile: 480, tablet: 768, desktop: 1024, wide: 1440 }

export default function BusinessDashboardProductsScreen() {
	const { businessSlug } = useLocalSearchParams<{ businessSlug: string }>()
	const { colors } = useTheme()
	const router = useRouter()
	const { localize, translate, currency, formatPrice } = useUser()
	const { width, height } = useWindowDimensions()
	const { onScroll } = useScrollHandler()

	// State
	const { data: response, isInitialLoading, isRefreshing, isOffline, refresh, updateCache } = useBusinessProducts({ businessSlug })
	const products = response?.data?.docs || []
	const businessName = products.length > 0 && products[0].business?.name ? localize(products[0].business.name) : ''
	const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
	const [searchText, setSearchText] = useState('')
	const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive' | 'lowStock' | 'outOfStock'>('all')

	// Actions states
	const [updatingSlugs, setUpdatingSlugs] = useState<Record<string, boolean>>({})
	const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null)

	// Responsive Columns Calculation
	const isMobile = width < BP.tablet
	const isTablet = width >= BP.tablet && width < BP.desktop
	const isDesktop = width >= BP.desktop
	const isWide = width >= BP.wide

	const numColumns = useMemo(() => {
		const availableWidth = isWide ? 1400 : isDesktop ? 1200 : isTablet ? 900 : width
		const hPadding = isDesktop ? 32 : isTablet ? 24 : 16
		return Math.max(1, Math.floor((availableWidth - hPadding * 2) / 320))
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

	const cardGap = 16

	const handleRefresh = () => {
		refresh()
	}

	// Filter metrics count
	const counts = useMemo(() => {
		const total = products.length
		const active = products.filter((p) => (p.state ? p.state.code === 'active' : p.isActive !== false)).length
		const inactive = total - active
		const outOfStock = products.filter((p) => (p.stock?.quantity || 0) === 0).length
		const lowStock = products.filter((p) => {
			const q = p.stock?.quantity || 0
			const t = p.stock?.minThreshold || 5
			return q > 0 && q <= t
		}).length
		return { total, active, inactive, outOfStock, lowStock }
	}, [products])

	// Filter & Search logic
	useEffect(() => {
		let list = products
		if (searchText.trim()) {
			const q = searchText.toLowerCase()
			list = list.filter((p) => localize(p.name).toLowerCase().includes(q))
		}
		if (activeFilter === 'active') {
			list = list.filter((p) => (p.state ? p.state.code === 'active' : p.isActive !== false))
		} else if (activeFilter === 'inactive') {
			list = list.filter((p) => (p.state ? p.state.code !== 'active' : p.isActive === false))
		} else if (activeFilter === 'lowStock') {
			list = list.filter((p) => {
				const q = p.stock?.quantity || 0
				const t = p.stock?.minThreshold || 5
				return q > 0 && q <= t
			})
		} else if (activeFilter === 'outOfStock') {
			list = list.filter((p) => (p.stock?.quantity || 0) === 0)
		}
		setFilteredProducts(list)
	}, [searchText, products, activeFilter, localize])

	// Toggle active/inactive state handler
	const handleToggleActive = async (product: Product, currentActive: boolean) => {
		const newActive = !currentActive
		const productSlugVal = product.slug

		// Set updating state
		setUpdatingSlugs((prev) => ({ ...prev, [productSlugVal]: true }))

		try {
			await updateProduct(productSlugVal, {
				state: { code: newActive ? 'active' : 'suspended' }
			})

			// Locally update cache
			if (response) {
				const updatedDocs = response.data.docs.map((p) => (p.slug === productSlugVal ? { ...p, state: { ...p.state, code: newActive ? 'active' : 'suspended' }, isActive: newActive } : p))
				updateCache({ ...response, data: { ...response.data, docs: updatedDocs } })
			}

			toast.show({
				title: translate('success', 'Success'),
				message: `${localize(product.name)} ${newActive ? translate('activated', 'activated') : translate('deactivated', 'deactivated')}`,
				color: '#10B981'
			})
		} catch (err: any) {
			toast.show({
				title: translate('error', 'Error'),
				message: err.message || translate('failed_to_update_status', 'Failed to update status'),
				color: '#EF4444'
			})
		} finally {
			setUpdatingSlugs((prev) => ({ ...prev, [productSlugVal]: false }))
		}
	}

	// ─── Render Card Component ──────────────────────────────────────────────────
	const renderProductCard = ({ item }: { item: Product }) => {
		const isCurrentlyActive = item.state ? item.state.code === 'active' : item.isActive !== false
		const stockQty = item.stock?.quantity || 0
		const minThreshold = item.stock?.minThreshold || 5
		const isOutOfStock = stockQty === 0
		const isLowStock = stockQty > 0 && stockQty <= minThreshold

		const stockColor = isOutOfStock ? colors.error : isLowStock ? colors.warning : colors.success
		const stockTextLabel = isOutOfStock ? translate('out_of_stock', 'Out of Stock') : isLowStock ? translate('low_stock', 'Low Stock') : translate('in_stock', 'In Stock')

		const imageUrl = item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url
		// @ts-ignore
		const unitPrice = item.price?.total?.[currency] || item.price?.total?.tnd || 0
		const isUpdating = updatingSlugs[item.slug] || false

		return (
			<TouchableOpacity
				style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}
				onPress={() => router.push(`/dashboard/${businessSlug}/products/${item.slug}` as any)}
				activeOpacity={0.85}
			>
				{isUpdating && (
					<View style={cardStyles.updatingOverlay}>
						<ActivityIndicator size="small" color={colors.primary} />
					</View>
				)}

				<View style={cardStyles.mainRow}>
					{/* Thumbnail */}
					<View style={cardStyles.imageContainer}>
						<SmartImage source={imageUrl} style={cardStyles.image} resizeMode="cover" entityType="product" />
					</View>

					{/* Center info */}
					<View style={cardStyles.details}>
						<Text style={[cardStyles.name, { color: colors.text }]} numberOfLines={2}>
							{localize(item.name)}
						</Text>

						<View style={cardStyles.priceRow}>
							<Text style={[cardStyles.price, { color: colors.primary }]}>{formatPrice({ total: { [currency]: unitPrice } })}</Text>
							<Text style={[cardStyles.unit, { color: colors.textSecondary }]}>/ {item.unit?.measure || translate('unit', 'unit')}</Text>
						</View>

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
													color: '#ffffff',
													textAlign: 'center',
													includeFontPadding: false,
													textAlignVertical: 'center'
												}}
											>
												{item.specs.caliber}
											</Text>
										</View>
										<Text style={[cardStyles.caliberChipText, { color: colors.primary }]}>{getCaliberLabel(item.specs.caliber as any)}</Text>
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
									<View style={[cardStyles.originChip, { backgroundColor: colors.surfaceVariant || 'rgba(255,255,255,0.05)', borderColor: colors.borderLight }]}>
										<Ionicons name="location-outline" size={10} color={colors.textSecondary} />
										<Text style={[cardStyles.originChipText, { color: colors.textSecondary }]}>{item.specs.origin.city}</Text>
									</View>
								) : null}
							</View>
						)}

						{/* Stock status pill */}
						<View style={[cardStyles.stockPill, { backgroundColor: stockColor + '15', borderColor: stockColor + '30' }]}>
							<View style={[cardStyles.stockDot, { backgroundColor: stockColor }]} />
							<Text style={[cardStyles.stockLabel, { color: stockColor }]}>
								{stockTextLabel} ({stockQty})
							</Text>
						</View>
					</View>

					{/* Right section: Switch at top, Sales/QR icons at bottom */}
					<View style={cardStyles.rightColumn}>
						<View style={cardStyles.switchWrapper}>
							<Switch
								value={isCurrentlyActive}
								onValueChange={() => handleToggleActive(item, isCurrentlyActive)}
								disabled={isUpdating}
								trackColor={{ false: colors.borderLight, true: colors.primary + '50' }}
								thumbColor={isCurrentlyActive ? colors.primary : colors.textTertiary}
							/>
						</View>
						<View style={cardStyles.iconActionsRow}>
							<TouchableOpacity
								style={[cardStyles.iconActionBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
								onPress={() => router.push(`/dashboard/${businessSlug}/sales?productSlug=${item.slug}` as any)}
								activeOpacity={0.7}
								accessibilityLabel={translate('sales_reports', 'Sales')}
							>
								<Ionicons name="trending-up-outline" size={16} color={colors.textSecondary} />
							</TouchableOpacity>

							<TouchableOpacity
								style={[cardStyles.iconActionBtn, { backgroundColor: colors.surface, borderColor: colors.borderLight }]}
								onPress={() => setSelectedProductForQR(item)}
								activeOpacity={0.7}
								accessibilityLabel={translate('qr_code', 'QR Code')}
							>
								<Ionicons name="qr-code-outline" size={16} color={colors.textSecondary} />
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</TouchableOpacity>
		)
	}

	// ─── Render Skeleton Loader Component ─────────────────────────────────────────
	const renderSkeleton = () => {
		return (
			<View style={[cardStyles.card, { backgroundColor: colors.card, borderColor: colors.borderLight }]}>
				<View style={cardStyles.mainRow}>
					<View style={[cardStyles.imageContainer, { backgroundColor: '#3A506B40' }]} />
					<View style={[cardStyles.details, { gap: 8 }]}>
						<View style={{ width: '80%', height: 16, backgroundColor: '#3A506B40', borderRadius: 4 }} />
						<View style={{ width: '40%', height: 12, backgroundColor: '#3A506B40', borderRadius: 4 }} />
						<View style={{ width: '60%', height: 20, backgroundColor: '#3A506B40', borderRadius: 10 }} />
					</View>
					<View style={cardStyles.rightColumn}>
						<View style={{ width: 48, height: 24, backgroundColor: '#3A506B40', borderRadius: 12 }} />
						<View style={{ flexDirection: 'row', gap: 8 }}>
							<View style={{ width: 32, height: 32, backgroundColor: '#3A506B40', borderRadius: 8 }} />
							<View style={{ width: 32, height: 32, backgroundColor: '#3A506B40', borderRadius: 8 }} />
						</View>
					</View>
				</View>
			</View>
		)
	}

	// Dynamic Header actions
	const headerActionsConfig = useMemo(
		() => [
			'refresh',
			{
				key: 'sales',
				iconName: 'trending-up',
				iconType: 'ionicons' as const,
				onPress: () => router.push(`/dashboard/${businessSlug}/sales` as any),
				accessibilityLabel: 'View Sales'
			},
			{
				key: 'create-product',
				iconName: 'add',
				iconType: 'material' as const,
				onPress: () => router.push(`/dashboard/${businessSlug}/create-product` as any),
				accessibilityLabel: 'Create Product'
			}
		],
		[businessSlug]
	)

	return (
		<View style={[s.container, { backgroundColor: colors.background }]}>
			<SmartHeader
				title={businessName ? `${businessName} Dashboard` : translate('dashboard_title', 'Dashboard')}
				subtitle={translate('manage_inventory', 'Manage Products & Stock')}
				fallbackRoute={`/dashboard?businessSlug=${businessSlug}` as any}
				headerActions={headerActionsConfig}
				onBackPress={() => router.replace(`/dashboard?businessSlug=${businessSlug}` as any)}
				isLoading={isInitialLoading && !isRefreshing}
			/>

			<SmartHeader.ScrollView
				style={s.scrollView}
				contentContainerStyle={s.scrollContent}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
			>
				{/* Top stats summary banner */}
				{!isInitialLoading && (
					<View style={[s.statsContainer, { maxWidth: contentMaxWidth }]}>
						<LinearGradient colors={[colors.primary + '15', colors.primary + '05']} style={[s.statsBanner, { borderColor: colors.borderLight }]}>
							<View style={s.statsGrid}>
								<View style={s.statBox}>
									<Text style={[s.statVal, { color: colors.primary }]}>{counts.total}</Text>
									<Text style={[s.statLabel, { color: colors.textSecondary }]}>{translate('total_products', 'Total')}</Text>
								</View>
								<View style={s.statDivider} />
								<View style={s.statBox}>
									<Text style={[s.statVal, { color: colors.success }]}>{counts.active}</Text>
									<Text style={[s.statLabel, { color: colors.textSecondary }]}>{translate('active_status', 'Active')}</Text>
								</View>
								<View style={s.statDivider} />
								<View style={s.statBox}>
									<Text style={[s.statVal, { color: colors.warning }]}>{counts.lowStock}</Text>
									<Text style={[s.statLabel, { color: colors.textSecondary }]}>{translate('low_stock', 'Low')}</Text>
								</View>
								<View style={s.statDivider} />
								<View style={s.statBox}>
									<Text style={[s.statVal, { color: colors.error }]}>{counts.outOfStock}</Text>
									<Text style={[s.statLabel, { color: colors.textSecondary }]}>{translate('out_of_stock', 'Out')}</Text>
								</View>
							</View>
						</LinearGradient>
					</View>
				)}

				{/* Search Wrap */}
				{!isInitialLoading && (
					<View style={[s.searchWrap, { maxWidth: contentMaxWidth }]}>
						<View style={[s.searchBox, { backgroundColor: colors.surface, borderColor: colors.inputBorder }]}>
							<Ionicons name="search-outline" size={18} color={colors.textSecondary} />
							<TextInput
								style={[s.searchInput, { color: colors.text }]}
								placeholder={translate('search_products_placeholder', 'Search products…')}
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

				{/* Filter Row */}
				{!isInitialLoading && products.length > 0 && (
					<View style={[s.filtersWrap, { maxWidth: contentMaxWidth }]}>
						<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.filtersScroll}>
							<TouchableOpacity
								onPress={() => setActiveFilter('all')}
								style={[s.filterChip, { backgroundColor: activeFilter === 'all' ? colors.primary + '18' : colors.card, borderColor: activeFilter === 'all' ? colors.primary : colors.borderLight }]}
							>
								<Text style={[s.filterChipText, { color: activeFilter === 'all' ? colors.primary : colors.textSecondary }]}>
									{translate('all', 'All')} ({counts.total})
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								onPress={() => setActiveFilter('active')}
								style={[
									s.filterChip,
									{ backgroundColor: activeFilter === 'active' ? colors.success + '18' : colors.card, borderColor: activeFilter === 'active' ? colors.success : colors.borderLight }
								]}
							>
								<Text style={[s.filterChipText, { color: activeFilter === 'active' ? colors.success : colors.textSecondary }]}>
									{translate('active_status', 'Active')} ({counts.active})
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								onPress={() => setActiveFilter('inactive')}
								style={[
									s.filterChip,
									{ backgroundColor: activeFilter === 'inactive' ? colors.borderLight + '80' : colors.card, borderColor: activeFilter === 'inactive' ? colors.textTertiary : colors.borderLight }
								]}
							>
								<Text style={[s.filterChipText, { color: activeFilter === 'inactive' ? colors.textSecondary : colors.textSecondary }]}>
									{translate('inactive_status', 'Hidden')} ({counts.inactive})
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								onPress={() => setActiveFilter('lowStock')}
								style={[
									s.filterChip,
									{ backgroundColor: activeFilter === 'lowStock' ? colors.warning + '18' : colors.card, borderColor: activeFilter === 'lowStock' ? colors.warning : colors.borderLight }
								]}
							>
								<Text style={[s.filterChipText, { color: activeFilter === 'lowStock' ? colors.warning : colors.textSecondary }]}>
									{translate('low_stock', 'Low Stock')} ({counts.lowStock})
								</Text>
							</TouchableOpacity>

							<TouchableOpacity
								onPress={() => setActiveFilter('outOfStock')}
								style={[
									s.filterChip,
									{ backgroundColor: activeFilter === 'outOfStock' ? colors.error + '18' : colors.card, borderColor: activeFilter === 'outOfStock' ? colors.error : colors.borderLight }
								]}
							>
								<Text style={[s.filterChipText, { color: activeFilter === 'outOfStock' ? colors.error : colors.textSecondary }]}>
									{translate('out_of_stock', 'Out of Stock')} ({counts.outOfStock})
								</Text>
							</TouchableOpacity>
						</ScrollView>
					</View>
				)}

				{/* FlashList view container */}
				<View style={[s.listContainer, { maxWidth: contentMaxWidth }]}>
					{isInitialLoading && !isRefreshing ? (
						<View style={s.grid}>
							{Array.from({ length: 4 }).map((_, i) => (
								<View key={i} style={{ width: numColumns === 1 ? '100%' : `${100 / numColumns - 1}%`, marginBottom: cardGap }}>
									{renderSkeleton()}
								</View>
							))}
						</View>
					) : filteredProducts.length === 0 ? (
						<View style={s.emptyWrap}>
							<Ionicons name="cube-outline" size={64} color={colors.textTertiary} />
							<Text style={[s.emptyTitle, { color: colors.text }]}>{searchText ? translate('no_search_results', 'No matches found') : translate('no_products', 'No products found')}</Text>
							<Text style={[s.emptySubtitle, { color: colors.textSecondary }]}>
								{searchText
									? translate('try_another_query', 'Try searching for a different keyword.')
									: translate('start_by_adding_product', 'Tap the + button to add products to your business catalog.')}
							</Text>
						</View>
					) : (
						<FlashList data={filteredProducts} renderItem={renderProductCard} numColumns={numColumns} keyExtractor={(item) => item._id} contentContainerStyle={s.listScrollContent} />
					)}
				</View>
			</SmartHeader.ScrollView>

			{/* QR Modal integration */}
			{selectedProductForQR && (
				<QRCodeModal
					visible={!!selectedProductForQR}
					onClose={() => setSelectedProductForQR(null)}
					value={`${process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://drinaluza.com'}/p/${selectedProductForQR.slug}`}
					title={localize(selectedProductForQR.name)}
					subtitle={selectedProductForQR.slug}
					filenamePrefix={`product_${selectedProductForQR.slug}`}
				/>
			)}
		</View>
	)
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
	container: { flex: 1 },
	scrollView: { flex: 1 },
	scrollContent: {
		paddingBottom: 40,
		alignItems: 'center',
		width: '100%'
	},
	statsContainer: {
		width: '100%',
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: 8
	},
	statsBanner: {
		borderRadius: 16,
		borderWidth: 1.5,
		overflow: 'hidden',
		paddingVertical: 14,
		paddingHorizontal: 16
	},
	statsGrid: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	statBox: {
		flex: 1,
		alignItems: 'center'
	},
	statVal: {
		fontSize: 20,
		fontWeight: '800'
	},
	statLabel: {
		fontSize: 11,
		fontWeight: '600',
		marginTop: 2,
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	statDivider: {
		width: 1,
		height: 32,
		backgroundColor: 'rgba(255, 255, 255, 0.1)'
	},
	searchWrap: {
		width: '100%',
		paddingHorizontal: 16,
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
	filtersWrap: {
		width: '100%',
		paddingVertical: 6
	},
	filtersScroll: {
		paddingHorizontal: 16,
		gap: 8,
		paddingVertical: 4
	},
	filterChip: {
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1.5
	},
	filterChipText: {
		fontSize: 12,
		fontWeight: '600'
	},
	listContainer: {
		width: '100%',
		paddingHorizontal: 16,
		paddingTop: 8,
		flex: 1
	},
	listScrollContent: {
		paddingBottom: 20
	},
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		justifyContent: 'space-between'
	},
	emptyWrap: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 80,
		paddingHorizontal: 32,
		gap: 14
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '700',
		textAlign: 'center',
		letterSpacing: -0.3
	},
	emptySubtitle: {
		fontSize: 14,
		textAlign: 'center',
		lineHeight: 22,
		maxWidth: 300
	}
})

const cardStyles = StyleSheet.create({
	card: {
		borderRadius: 18,
		borderWidth: 1.5,
		padding: 16,
		marginBottom: 16,
		position: 'relative',
		overflow: 'hidden',
		...createShadow({ offsetY: 2, opacity: 0.05, radius: 8, elevation: 2 })
	},
	updatingOverlay: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(0, 0, 0, 0.4)',
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 10
	},
	mainRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	imageContainer: {
		width: 68,
		height: 68,
		borderRadius: 12,
		overflow: 'hidden'
	},
	image: {
		width: '100%',
		height: '100%'
	},
	details: {
		flex: 1,
		justifyContent: 'center',
		gap: 2
	},
	name: {
		fontSize: 15,
		fontWeight: '700',
		lineHeight: 19
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginTop: 2
	},
	price: {
		fontSize: 16,
		fontWeight: '800'
	},
	unit: {
		fontSize: 12
	},
	stockPill: {
		flexDirection: 'row',
		alignItems: 'center',
		alignSelf: 'flex-start',
		borderRadius: 12,
		borderWidth: 1,
		paddingHorizontal: 8,
		paddingVertical: 3,
		marginTop: 4,
		gap: 4
	},
	stockDot: {
		width: 6,
		height: 6,
		borderRadius: 3
	},
	stockLabel: {
		fontSize: 10,
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
		borderColor: 'rgba(255,255,255,0.05)'
	},
	originChipText: {
		fontSize: 10,
		fontWeight: '600'
	},
	harvestChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		gap: 3
	},
	harvestChipText: {
		fontSize: 10,
		fontWeight: '700'
	},
	rightColumn: {
		alignItems: 'flex-end',
		justifyContent: 'center',
		gap: 12
	},
	switchWrapper: {
		alignSelf: 'flex-end'
	},
	iconActionsRow: {
		flexDirection: 'row',
		gap: 8,
		alignItems: 'center'
	},
	iconActionBtn: {
		width: 32,
		height: 32,
		borderRadius: 8,
		borderWidth: 1,
		justifyContent: 'center',
		alignItems: 'center'
	}
})
