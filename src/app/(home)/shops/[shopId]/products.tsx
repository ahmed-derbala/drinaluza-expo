import React, { useEffect, useState, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, useWindowDimensions, TouchableOpacity, Platform } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { getShopProductsBySlug } from '@/components/shops/shops.api'
import { Product } from '@/components/shops/shops.interface'
import { useTheme } from '@/core/contexts/ThemeContext'
import { parseError } from '@/core/helpers/errorHandler'
import ErrorState from '@/components/common/ErrorState'
import ScreenHeader from '@/components/common/ScreenHeader'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { Ionicons } from '@expo/vector-icons'
import Toast from '@/components/common/Toast'
import { TextInput } from 'react-native'
import FeedCard from '@/components/feed/feed.card'
import { FeedItem } from '@/components/feed/feed.interface'
import { useUser } from '@/core/contexts/UserContext'

// Responsive breakpoints
const BREAKPOINTS = {
	mobile: 480,
	tablet: 768,
	desktop: 1024,
	wide: 1440
}

export default function ShopProductsScreen() {
	const { shopId: shopSlug } = useLocalSearchParams<{ shopId: string }>()
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const [headerTitle, setHeaderTitle] = useState(translate('shop_products', 'Products'))
	const { width, height } = useWindowDimensions()

	// Responsive calculations
	const isSmallMobile = width < BREAKPOINTS.mobile
	const isMobile = width < BREAKPOINTS.tablet
	const isTablet = width >= BREAKPOINTS.tablet && width < BREAKPOINTS.desktop
	const isDesktop = width >= BREAKPOINTS.desktop
	const isWide = width >= BREAKPOINTS.wide
	const isLandscape = width > height

	// Dynamic column count based on screen size
	const numColumns = useMemo(() => {
		if (isSmallMobile) return 1
		if (isMobile && !isLandscape) return 1
		if (isMobile && isLandscape) return 2
		if (isTablet) return 2
		if (isDesktop && !isWide) return 3
		return Math.min(4, Math.floor(width / 350))
	}, [width, height, isSmallMobile, isMobile, isTablet, isDesktop, isWide, isLandscape])

	// Dynamic max width for content container
	const contentMaxWidth = useMemo(() => {
		if (isWide) return 1400
		if (isDesktop) return 1200
		if (isTablet) return 900
		return width
	}, [width, isTablet, isDesktop, isWide])

	// Dynamic padding based on screen size
	const horizontalPadding = useMemo(() => {
		if (isDesktop) return 32
		if (isTablet) return 24
		return 16
	}, [isTablet, isDesktop])

	// Dynamic card gap
	const cardGap = useMemo(() => {
		if (isDesktop) return 20
		if (isTablet) return 16
		return 12
	}, [isTablet, isDesktop])

	const [products, setProducts] = useState<Product[]>([])
	const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
	const [basket, setBasket] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const [searchText, setSearchText] = useState('')
	const [showToast, setShowToast] = useState(false)
	const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('success')
	const [toastMessage, setToastMessage] = useState('')

	const loadBasket = async () => {
		try {
			const savedBasket = await AsyncStorage.getItem('basket')
			if (savedBasket) setBasket(JSON.parse(savedBasket))
		} catch (err) {
			console.error('Failed to load basket:', err)
		}
	}

	const loadProducts = async () => {
		if (!shopSlug) return

		try {
			if (!refreshing) setLoading(true)
			setError(null)
			const response = await getShopProductsBySlug(shopSlug)
			const fetchedProducts = response.data.docs || []
			setProducts(fetchedProducts)
			setFilteredProducts(fetchedProducts)

			// Update header title if shop info is available in products
			if (fetchedProducts.length > 0 && fetchedProducts[0].shop?.name) {
				setHeaderTitle(localize(fetchedProducts[0].shop.name))
			}
		} catch (err: any) {
			console.error('Failed to load products:', err)
			const errorInfo = parseError(err)
			setError({
				title: errorInfo.title,
				message: errorInfo.message,
				type: errorInfo.type
			})
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		loadBasket()
		loadProducts()
	}, [shopSlug])

	useEffect(() => {
		if (!searchText.trim()) {
			setFilteredProducts(products)
			return
		}
		const searchLower = searchText.toLowerCase()
		const filtered = products.filter((p) => localize(p.name).toLowerCase().includes(searchLower))
		setFilteredProducts(filtered)
	}, [searchText, products, localize])

	const addToBasket = async (item: FeedItem, quantity: number) => {
		try {
			const existingItemIndex = basket.findIndex((basketItem) => basketItem._id === item._id)
			let newBasket: any[]

			if (existingItemIndex > -1) {
				newBasket = basket.map((basketItem, index) => (index === existingItemIndex ? { ...basketItem, quantity: basketItem.quantity + quantity } : basketItem))
			} else {
				newBasket = [...basket, { ...item, quantity }]
			}

			setBasket(newBasket)
			await AsyncStorage.setItem('basket', JSON.stringify(newBasket))

			setToastType('success')
			setToastMessage(`${localize(item.name)} ${translate('basket_added_to_basket', 'added to basket')}`)
			setShowToast(true)
		} catch (err) {
			console.error('Failed to add to basket:', err)
			setToastType('error')
			setToastMessage(translate('basket_failed_to_add', 'Failed to add to basket'))
			setShowToast(true)
		}
	}

	const handleRefresh = () => {
		setRefreshing(true)
		loadProducts()
	}

	// Calculate card width based on columns and gap
	const getCardWidth = () => {
		if (numColumns === 1) return '100%'
		const totalGaps = (numColumns - 1) * cardGap
		const availableWidth = 100 // percentage
		return `${(availableWidth - (totalGaps / (contentMaxWidth - horizontalPadding * 2)) * 100) / numColumns}%`
	}

	const renderProductItem = ({ item, index }: { item: Product; index: number }) => {
		// Calculate width percentage for each card
		const cardWidthPercent = numColumns === 1 ? 100 : (100 - (numColumns - 1) * 2) / numColumns

		return (
			<View
				style={[
					styles.cardWrapper,
					{
						width: numColumns === 1 ? '100%' : `${cardWidthPercent}%`,
						marginBottom: cardGap,
						marginRight: numColumns > 1 && (index + 1) % numColumns !== 0 ? `${2}%` : 0
					}
				]}
			>
				<FeedCard item={item as unknown as FeedItem} addToBasket={addToBasket} />
			</View>
		)
	}

	// Create responsive styles
	const responsiveStyles = useMemo(
		() =>
			StyleSheet.create({
				searchContainer: {
					paddingHorizontal: horizontalPadding,
					paddingVertical: isDesktop ? 16 : 12,
					maxWidth: contentMaxWidth,
					alignSelf: 'center' as const,
					width: '100%'
				},
				searchInputWrapper: {
					flexDirection: 'row' as const,
					alignItems: 'center' as const,
					borderRadius: isDesktop ? 16 : 12,
					paddingHorizontal: isDesktop ? 16 : 12,
					height: isDesktop ? 56 : isTablet ? 52 : 48,
					borderWidth: 1,
					...Platform.select({
						web: {
							transition: 'all 0.2s ease'
						}
					})
				},
				searchInput: {
					flex: 1,
					fontSize: isDesktop ? 17 : 16,
					padding: 0
				},
				listContent: {
					paddingHorizontal: horizontalPadding,
					paddingTop: 8,
					paddingBottom: isDesktop ? 40 : 24,
					flexGrow: 1,
					maxWidth: contentMaxWidth,
					alignSelf: 'center' as const,
					width: '100%'
				},
				emptyContainer: {
					flex: 1,
					justifyContent: 'center' as const,
					alignItems: 'center' as const,
					padding: isDesktop ? 60 : 40,
					marginTop: isDesktop ? 60 : 40
				},
				emptyIcon: {
					marginBottom: isDesktop ? 20 : 12
				},
				emptyText: {
					fontSize: isDesktop ? 18 : 16,
					fontWeight: '600' as const,
					textAlign: 'center' as const,
					maxWidth: 400
				},
				resultsCount: {
					paddingHorizontal: horizontalPadding,
					paddingBottom: 8,
					maxWidth: contentMaxWidth,
					alignSelf: 'center' as const,
					width: '100%'
				}
			}),
		[horizontalPadding, contentMaxWidth, isDesktop, isTablet]
	)

	if (loading && !refreshing) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ScreenHeader title={headerTitle} showBack={true} />
				<View style={styles.loadingContainer}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader title={headerTitle} showBack={true} onRefresh={handleRefresh} isRefreshing={refreshing} />

			{/* Search Component */}
			{!error && (
				<View style={responsiveStyles.searchContainer}>
					<View style={[responsiveStyles.searchInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.inputBorder }]}>
						<Ionicons name="search-outline" size={isDesktop ? 22 : 20} color={colors.textSecondary} style={styles.searchIcon} />
						<TextInput
							style={[responsiveStyles.searchInput, { color: colors.text }]}
							placeholder={translate('shop_search_placeholder', 'Search in this shop...')}
							placeholderTextColor={colors.textTertiary}
							value={searchText}
							onChangeText={setSearchText}
							autoCorrect={false}
							autoCapitalize="none"
						/>
						{searchText.length > 0 && (
							<TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
								<Ionicons name="close-circle" size={isDesktop ? 22 : 20} color={colors.textSecondary} />
							</TouchableOpacity>
						)}
					</View>
				</View>
			)}

			{/* Results Count */}
			{!error && !loading && filteredProducts.length > 0 && (
				<View style={responsiveStyles.resultsCount}>
					<Text style={[styles.resultsText, { color: colors.textSecondary }]}>
						{filteredProducts.length} {filteredProducts.length === 1 ? translate('product', 'product') : translate('products', 'products')}
						{searchText ? ` ${translate('found', 'found')}` : ''}
					</Text>
				</View>
			)}

			{/* Products List */}
			<FlatList
				key={`flatlist-${numColumns}`} // Force re-render when columns change
				data={filteredProducts}
				renderItem={renderProductItem}
				keyExtractor={(item) => item._id}
				numColumns={numColumns}
				contentContainerStyle={responsiveStyles.listContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				columnWrapperStyle={numColumns > 1 ? styles.columnWrapper : undefined}
				showsVerticalScrollIndicator={false}
				ListEmptyComponent={
					error ? (
						<ErrorState
							title={error.title}
							message={error.message}
							onRetry={loadProducts}
							icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
						/>
					) : !loading && !refreshing ? (
						<View style={responsiveStyles.emptyContainer}>
							<Ionicons name={searchText ? 'search-outline' : 'cube-outline'} size={isDesktop ? 64 : 48} color={colors.textTertiary} style={responsiveStyles.emptyIcon} />
							<Text style={[responsiveStyles.emptyText, { color: colors.text }]}>
								{searchText ? translate('shop_no_results', 'No products match your search') : translate('shop_no_products', 'No products found for this shop.')}
							</Text>
							{searchText && (
								<TouchableOpacity style={[styles.clearSearchButton, { borderColor: colors.primary }]} onPress={() => setSearchText('')}>
									<Text style={[styles.clearSearchText, { color: colors.primary }]}>{translate('clear_search', 'Clear search')}</Text>
								</TouchableOpacity>
							)}
						</View>
					) : null
				}
			/>

			<Toast visible={showToast} message={toastMessage} type={toastType} onHide={() => setShowToast(false)} />
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
	columnWrapper: {
		justifyContent: 'flex-start'
	},
	cardWrapper: {
		// Width is set dynamically
	},
	searchIcon: {
		marginRight: 10
	},
	resultsText: {
		fontSize: 13,
		fontWeight: '500'
	},
	clearSearchButton: {
		marginTop: 20,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1
	},
	clearSearchText: {
		fontSize: 14,
		fontWeight: '600'
	}
})
