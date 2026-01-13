import React, { useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ScrollView, Animated, useWindowDimensions, Linking, Dimensions } from 'react-native'
import SmartImage from '../common/SmartImage'
import { getSales } from '../orders/orders.api'
import { OrderItem as SaleItem, OrderResponse } from '../orders/orders.interface'
import { useFocusEffect } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import { orderStatusEnum, orderStatusColors, orderStatusLabels } from '../../constants/orderStatus'
import { useTheme } from '../../contexts/ThemeContext'
import { Ionicons, FontAwesome5 } from '@expo/vector-icons'
import ScreenHeader from '../common/ScreenHeader'
import { showAlert } from '../../utils/popup'

const FILTERS = [
	{ id: 'all', label: 'All' },
	{ id: orderStatusEnum.PENDING_SHOP_CONFIRMATION, label: 'Pending' },
	{ id: orderStatusEnum.CONFIRMED_BY_SHOP, label: 'Confirmed' },
	{ id: orderStatusEnum.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER, label: 'Ready' },
	{ id: orderStatusEnum.DELIVERING_TO_CUSTOMER, label: 'Delivering' },
	{ id: orderStatusEnum.DELIVERED_TO_CUSTOMER, label: 'Completed' },
	{ id: orderStatusEnum.CANCELLED_BY_SHOP, label: 'Cancelled' }
]

// Simple format functions
const formatMoney = (money: any) => {
	if (!money) return '0 TND'
	const amount = money.tnd || money || 0
	return `${amount.toFixed(2)} TND`
}

// Custom Product Swiper Component
const ProductSwiper = ({ products, responsiveConfig, colors, styles, getProductName }: any) => {
	const [currentIndex, setCurrentIndex] = useState(0)
	const scrollViewRef = useRef<ScrollView>(null)

	const handleScroll = (event: any) => {
		const contentOffset = event.nativeEvent.contentOffset
		const index = Math.round(contentOffset.x / responsiveConfig.productItemWidth)
		setCurrentIndex(index)
	}

	const scrollToIndex = (index: number) => {
		if (scrollViewRef.current) {
			scrollViewRef.current.scrollTo({
				x: index * responsiveConfig.productItemWidth,
				animated: true
			})
		}
	}

	const renderItem = (product: any, index: number) => (
		<View key={index} style={[styles.productSwiperItem, { width: responsiveConfig.productItemWidth }]}>
			{/* Product Header */}
			<View style={styles.productSwiperHeader}>
				{product.product?.media?.thumbnail?.url || product.product?.photos?.[0] ? (
					<SmartImage source={{ uri: product.product?.media?.thumbnail?.url || product.product?.photos?.[0] }} style={styles.productSwiperImage} resizeMode="cover" fallbackIcon="image" />
				) : (
					<View style={[styles.productSwiperImagePlaceholder, { backgroundColor: colors.background + '80' }]}>
						<Ionicons name="cube-outline" size={responsiveConfig.iconSizes.md} color={colors.textTertiary} />
					</View>
				)}
				<View style={styles.productSwiperBadge}>
					<Text style={[styles.productSwiperBadgeText, { color: colors.card }]}>
						{index + 1}/{products.length}
					</Text>
				</View>
			</View>

			{/* Product Details - Vertical Scroll */}
			<View style={styles.productSwiperDetailsContainer}>
				{/* Scroll Hint */}
				<View style={styles.scrollHint}>
					<Ionicons name="chevron-down" size={12} color={colors.textTertiary} />
					<Text style={[styles.scrollHintText, { color: colors.textTertiary }]}>Scroll for more details</Text>
					<Ionicons name="chevron-down" size={12} color={colors.textTertiary} />
				</View>

				<ScrollView showsVerticalScrollIndicator={true} indicatorStyle="default" style={styles.productSwiperDetailsScroll} contentContainerStyle={styles.productSwiperDetailsContent}>
					{/* Product Name */}
					<Text style={[styles.productSwiperName, { color: colors.text }]} numberOfLines={2}>
						{getProductName(product)}
					</Text>

					{/* Product ID and Type */}
					<View style={styles.productSwiperMetaInfo}>
						<Text style={[styles.productSwiperMetaText, { color: colors.textTertiary }]}>ID: {product.product?._id?.slice(-8) || 'N/A'}</Text>
						{product.product?.defaultProduct && <Text style={[styles.productSwiperMetaText, { color: colors.textTertiary }]}>Type: Default Product</Text>}
					</View>

					{/* Product Specifications */}
					<View style={styles.productSwiperSpecs}>
						<View style={styles.productSwiperSpecRow}>
							<Ionicons name="pricetag" size={12} color={colors.textSecondary} />
							<Text style={[styles.productSwiperSpecText, { color: colors.textSecondary }]}>{product.product?.unit?.measure ? `Sold per ${product.product.unit.measure}` : 'Sold per item'}</Text>
						</View>
						<View style={styles.productSwiperSpecRow}>
							<Ionicons name="scale" size={12} color={colors.textSecondary} />
							<Text style={[styles.productSwiperSpecText, { color: colors.textSecondary }]}>
								{product.quantity || 1} {product.product?.unit?.measure || 'units'}
							</Text>
						</View>
						{product.product?.unit?.min && product.product?.unit?.max && (
							<View style={styles.productSwiperSpecRow}>
								<Ionicons name="options" size={12} color={colors.textSecondary} />
								<Text style={[styles.productSwiperSpecText, { color: colors.textSecondary }]}>
									Min: {product.product.unit.min} - Max: {product.product.unit.max}
								</Text>
							</View>
						)}
						{product.product?.defaultProduct?.slug && (
							<View style={styles.productSwiperSpecRow}>
								<Ionicons name="link" size={12} color={colors.textSecondary} />
								<Text style={[styles.productSwiperSpecText, { color: colors.textSecondary }]}>Slug: {product.product.defaultProduct.slug}</Text>
							</View>
						)}
					</View>

					{/* Pricing Section */}
					<View style={styles.productSwiperPricing}>
						<View style={styles.productSwiperPriceCard}>
							<Text style={[styles.productSwiperPriceLabel, { color: colors.textSecondary }]}>Unit Price</Text>
							<Text style={[styles.productSwiperUnitPrice, { color: colors.text }]}>{formatMoney(product.product?.price?.total)}</Text>
							{product.product?.price?.total?.eur && <Text style={[styles.productSwiperSubPrice, { color: colors.textTertiary }]}>€{product.product.price.total.eur.toFixed(2)}</Text>}
							{product.product?.price?.total?.usd && <Text style={[styles.productSwiperSubPrice, { color: colors.textTertiary }]}>${product.product.price.total.usd.toFixed(2)}</Text>}
						</View>
						<View style={[styles.productSwiperPriceCard, styles.productSwiperTotalCard]}>
							<Text style={[styles.productSwiperPriceLabel, { color: colors.card }]}>Total Price</Text>
							<Text style={[styles.productSwiperTotalPrice, { color: colors.card }]}>{formatMoney(product.lineTotal)}</Text>
							{product.lineTotal?.eur && <Text style={[styles.productSwiperSubPrice, { color: colors.card }]}>€{product.lineTotal.eur.toFixed(2)}</Text>}
							{product.lineTotal?.usd && <Text style={[styles.productSwiperSubPrice, { color: colors.card }]}>${product.lineTotal.usd.toFixed(2)}</Text>}
						</View>
					</View>

					{/* Additional Details */}
					<View style={styles.productSwiperAdditionalInfo}>
						{product.product?.updatedAt && (
							<View style={styles.productSwiperInfoRow}>
								<Ionicons name="time" size={10} color={colors.textTertiary} />
								<Text style={[styles.productSwiperInfoText, { color: colors.textTertiary }]}>Updated: {new Date(product.product.updatedAt).toLocaleDateString()}</Text>
							</View>
						)}
						{product.lineTotal?.updatedAt && (
							<View style={styles.productSwiperInfoRow}>
								<Ionicons name="calculator" size={10} color={colors.textTertiary} />
								<Text style={[styles.productSwiperInfoText, { color: colors.textTertiary }]}>Price calculated: {new Date(product.lineTotal.updatedAt).toLocaleDateString()}</Text>
							</View>
						)}
					</View>

					{/* Product Footer */}
					<View style={styles.productSwiperFooter}>
						<Text style={[styles.productSwiperId, { color: colors.textTertiary }]}>{product.product?.defaultProduct?.slug || product.product?._id?.slice(-8) || 'N/A'}</Text>
						<View style={styles.productSwiperStatus}>
							<View style={[styles.productSwiperStatusDot, { backgroundColor: colors.success }]} />
							<Text style={[styles.productSwiperStatusText, { color: colors.success }]}>Available</Text>
						</View>
					</View>
				</ScrollView>
			</View>
		</View>
	)

	return (
		<View style={styles.productSwiper}>
			{/* Swiper Header */}
			<View style={styles.productSwiperHeaderBar}>
				<Text style={[styles.productSwiperTitle, { color: colors.text }]}>Products ({products.length})</Text>
				<View style={styles.productSwiperNavButtons}>
					<TouchableOpacity
						style={[styles.productSwiperNavButton, { opacity: currentIndex === 0 ? 0.5 : 1 }]}
						onPress={() => scrollToIndex(Math.max(0, currentIndex - 1))}
						disabled={currentIndex === 0}
					>
						<Ionicons name="chevron-back" size={16} color={colors.text} />
					</TouchableOpacity>
					<TouchableOpacity
						style={[styles.productSwiperNavButton, { opacity: currentIndex === products.length - 1 ? 0.5 : 1 }]}
						onPress={() => scrollToIndex(Math.min(products.length - 1, currentIndex + 1))}
						disabled={currentIndex === products.length - 1}
					>
						<Ionicons name="chevron-forward" size={16} color={colors.text} />
					</TouchableOpacity>
				</View>
			</View>

			{/* Swiper Content */}
			<ScrollView
				ref={scrollViewRef}
				horizontal
				showsHorizontalScrollIndicator={false}
				pagingEnabled={true}
				onScroll={handleScroll}
				scrollEventThrottle={16}
				style={[styles.productSwiperScroll, { height: responsiveConfig.productSliderHeight + 20 }]}
				contentContainerStyle={styles.productSwiperContainer}
			>
				{products.map((product: any, index: number) => renderItem(product, index))}
			</ScrollView>

			{/* Swiper Indicators */}
			{products.length > 1 && (
				<View style={styles.swiperIndicators}>
					{products.map((_: any, index: number) => (
						<TouchableOpacity
							key={index}
							style={[
								styles.swiperIndicator,
								{
									backgroundColor: index === currentIndex ? colors.primary : colors.textTertiary,
									width: index === currentIndex ? 24 : 8
								}
							]}
							onPress={() => scrollToIndex(index)}
						/>
					))}
				</View>
			)}
		</View>
	)
}

export default function SalesTab() {
	const { colors, isDark } = useTheme()
	const router = useRouter()
	const [sales, setSales] = useState<SaleItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [activeFilter, setActiveFilter] = useState('all')

	const fadeAnim = useRef(new Animated.Value(0)).current
	const scaleAnimRefs = useRef<Record<string, Animated.Value>>({}).current
	const [totalDocs, setTotalDocs] = useState<number | null>(null)
	const [totalPages, setTotalPages] = useState<number | null>(null)
	const { width } = useWindowDimensions()

	const getResponsiveConfig = (width: number) => {
		const isSmallMobile = width < 400
		const isMobile = width >= 400 && width < 768
		const isTablet = width >= 768 && width < 1024
		const isDesktop = width >= 1024 && width < 1440
		const isLargeDesktop = width >= 1440

		// Calculate responsive values
		const baseSpacing = isSmallMobile ? 4 : isMobile ? 6 : isTablet ? 8 : isDesktop ? 10 : 12
		const baseFontSize = isSmallMobile ? 12 : isMobile ? 13 : isTablet ? 14 : isDesktop ? 15 : 16

		// Determine number of columns based on width thresholds
		const numColumns = isLargeDesktop ? 4 : isDesktop ? 3 : isTablet ? 2 : 1

		// Calculate card width so multiple columns fit nicely with container padding
		const horizontalPadding = isLargeDesktop ? 64 : isDesktop ? 48 : isTablet ? 32 : isSmallMobile ? 12 : 24
		const columnGap = Math.round(baseSpacing * 2)
		const maxCardWidth = isSmallMobile ? width - 24 : isMobile ? 380 : isTablet ? 360 : isDesktop ? 400 : 420
		const availableWidth = Math.max(300, width - horizontalPadding - (numColumns - 1) * columnGap)
		const cardWidth = Math.min(maxCardWidth, Math.floor(availableWidth / numColumns))

		// Calculate responsive card heights
		const cardMinHeight = isSmallMobile ? 320 : isMobile ? 360 : isTablet ? 400 : isDesktop ? 440 : isLargeDesktop ? 480 : 520
		const cardRightWidth = isSmallMobile
			? 70
			: isMobile
				? 80
				: isTablet
					? Math.max(85, Math.floor(cardWidth * 0.22))
					: isDesktop
						? Math.max(100, Math.floor(cardWidth * 0.25))
						: Math.max(90, Math.floor(cardWidth * 0.23))

		// Product slider dimensions - increased to show all details
		const productItemWidth = isSmallMobile ? 160 : isMobile ? 180 : isTablet ? 200 : isDesktop ? 220 : 240
		const productSliderHeight = isSmallMobile ? 240 : isMobile ? 260 : isTablet ? 280 : isDesktop ? 300 : 320

		return {
			// Layout
			numColumns,
			cardWidth,
			cardMinHeight,
			cardRightWidth,
			maxCardWidth,
			productItemWidth,
			productSliderHeight,

			// Typography
			fontSize: {
				header: baseFontSize + (isLargeDesktop ? 7 : isDesktop ? 6 : isTablet ? 4 : isMobile ? 2 : 1),
				customerName: baseFontSize + (isLargeDesktop ? 3 : isDesktop ? 2 : isTablet ? 1 : 0),
				customerDetails: baseFontSize - (isSmallMobile ? 1 : 0),
				productText: baseFontSize - (isSmallMobile ? 1 : 0),
				productPrice: baseFontSize + (isDesktop ? 1 : 0),
				actionButton: baseFontSize + (isDesktop ? 1 : 0),
				statusText: baseFontSize - (isSmallMobile ? 2 : 1),
				sectionTitle: baseFontSize + (isLargeDesktop ? 5 : isDesktop ? 4 : isTablet ? 2 : 1),
				orderId: baseFontSize - (isSmallMobile ? 1 : 0)
			},

			// Spacing system
			spacing: {
				xs: Math.max(2, Math.floor(baseSpacing / 2)),
				sm: baseSpacing,
				md: Math.round(baseSpacing * 1.5),
				lg: baseSpacing * 2,
				xl: baseSpacing * 3,
				xxl: baseSpacing * 4,
				card: isSmallMobile ? baseSpacing : Math.round(baseSpacing * 1.5),
				section: isSmallMobile ? baseSpacing * 2 : Math.round(baseSpacing * 2.5),
				container: isSmallMobile ? baseSpacing : isLargeDesktop ? baseSpacing * 3 : isDesktop ? baseSpacing * 2.5 : baseSpacing * 2,
				detail: Math.max(4, Math.round(baseSpacing * 0.8)),
				contact: Math.max(4, Math.round(baseSpacing * 1.2))
			},

			// Icon sizing
			iconSizes: {
				xs: isSmallMobile ? 8 : isMobile ? 10 : isTablet ? 12 : isDesktop ? 14 : 16,
				sm: isSmallMobile ? 12 : isMobile ? 14 : isTablet ? 16 : isDesktop ? 18 : 20,
				md: isSmallMobile ? 16 : isMobile ? 18 : isTablet ? 20 : isDesktop ? 22 : 24,
				lg: isSmallMobile ? 18 : isMobile ? 20 : isTablet ? 22 : isDesktop ? 26 : 28,
				xl: isSmallMobile ? 20 : isMobile ? 24 : isTablet ? 28 : isDesktop ? 32 : 36,
				customerPhoto: isSmallMobile ? 32 : isMobile ? 40 : isTablet ? 48 : isDesktop ? 56 : 64,
				productImage: isSmallMobile ? 40 : isMobile ? 48 : isTablet ? 64 : isDesktop ? 76 : 84,
				statusIcon: isSmallMobile ? 10 : isMobile ? 12 : isTablet ? 14 : isDesktop ? 16 : 18
			},

			// Border radius
			borderRadius: {
				sm: isSmallMobile ? 2 : 4,
				md: isSmallMobile ? 4 : 8,
				lg: isSmallMobile ? 6 : 12,
				xl: isSmallMobile ? 8 : 16,
				pill: isSmallMobile ? 12 : 20
			},

			// Shadows
			shadow: {
				sm: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 1 },
					shadowOpacity: 0.1,
					shadowRadius: 2,
					elevation: 2
				},
				md: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.15,
					shadowRadius: 6,
					elevation: 4
				},
				lg: {
					shadowColor: '#000',
					shadowOffset: { width: 0, height: 8 },
					shadowOpacity: 0.2,
					shadowRadius: 12,
					elevation: 6
				}
			},

			// Animation
			animation: {
				fast: 150,
				normal: 300,
				slow: 500
			}
		}
	}

	// Memoize responsive config to prevent recalculation
	const responsiveConfig = useMemo(() => getResponsiveConfig(width), [width])
	const { numColumns } = responsiveConfig
	const styles = useMemo(() => createStyles(colors, isDark, width, responsiveConfig), [colors, isDark, width, responsiveConfig])

	const loadSales = async (pageNum: number = 1, isRefresh: boolean = false, status: string = activeFilter) => {
		try {
			if (pageNum === 1 && !isRefresh) setLoading(true)

			const response = await getSales(pageNum, 10, status === 'all' ? undefined : status)

			// Normalize API response shapes so this UI works with different backends:
			// - { data: { docs: [...], pagination: {...} }, ... }
			// - { docs: [...], pagination: {...} }
			// - direct array of sales
			const apiWrapper = response ?? {}
			const levelObj = apiWrapper.data ? apiWrapper : apiWrapper
			const body = apiWrapper.data ? apiWrapper.data : apiWrapper
			const newSales = body?.docs || (Array.isArray(body) ? body : [])

			if (isRefresh || pageNum === 1) {
				setSales(newSales)
				Animated.timing(fadeAnim, {
					toValue: 1,
					duration: 400,
					useNativeDriver: true
				}).start()
			} else {
				setSales((prev) => [...prev, ...newSales])
			}

			setHasMore(body?.pagination?.hasNextPage)
			if (body?.pagination) {
				setTotalDocs(body.pagination.totalDocs ?? null)
				setTotalPages(body.pagination.totalPages ?? null)
			}
			setPage(pageNum)
		} catch (error: any) {
			console.error('Failed to load sales:', error)

			// Handle 401 Unauthorized - redirect to auth screen
			if (error.response?.status === 401) {
				showAlert('Session Expired', 'Please log in again to continue.')
				router.replace('/auth')
				return
			}

			const errorMessage = error.response?.data?.message || 'Failed to load sales data'
			showAlert('Error', errorMessage)
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useFocusEffect(
		useCallback(() => {
			loadSales(1, true, activeFilter)
		}, [activeFilter])
	)

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		loadSales(1, true, activeFilter)
	}, [activeFilter])

	const loadMore = () => {
		if (hasMore && !loading && !refreshing) {
			loadSales(page + 1, false, activeFilter)
		}
	}

	const handleFilterPress = (filterId: string) => {
		if (filterId === activeFilter) return
		setActiveFilter(filterId)
		setSales([])
		setLoading(true)
		fadeAnim.setValue(0)
	}

	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diffTime = Math.abs(now.getTime() - date.getTime())
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

		if (diffDays === 0) return 'Today'
		else if (diffDays === 1) return 'Yesterday'
		else if (diffDays < 7) return `${diffDays} days ago`
		else return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined })
	}

	// Format money objects returned by the API
	const formatMoney = (moneyObj: any) => {
		if (!moneyObj) return ''
		const amount = moneyObj.tnd ?? moneyObj.eur ?? moneyObj.usd ?? 0
		const currency = moneyObj.tnd !== undefined ? 'TND' : moneyObj.eur !== undefined ? 'EUR' : moneyObj.usd !== undefined ? 'USD' : 'TND'
		try {
			return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: 3 }).format(amount)
		} catch (e) {
			return `${amount.toFixed(3)} ${currency}`
		}
	}

	const getStatusIcon = (status: string) => {
		switch (status) {
			case orderStatusEnum.PENDING_SHOP_CONFIRMATION:
				return 'time-outline'
			case orderStatusEnum.CONFIRMED_BY_SHOP:
				return 'storefront-outline'
			case orderStatusEnum.RESERVED_BY_SHOP_FOR_PICKUP_BY_CUSTOMER:
				return 'bag-check-outline'
			case orderStatusEnum.DELIVERING_TO_CUSTOMER:
				return 'bicycle-outline'
			case orderStatusEnum.DELIVERED_TO_CUSTOMER:
				return 'checkmark-done-outline'
			case orderStatusEnum.CANCELLED_BY_SHOP:
				return 'close-circle-outline'
			default:
				return 'receipt-outline'
		}
	}

	const renderSaleItem = useCallback(
		({ item }: { item: SaleItem }) => {
			// Use the total price from the API response, or calculate from lineTotals as fallback
			const totalPrice = item.price?.total?.tnd || item.products.reduce((sum, p) => sum + (p.lineTotal?.tnd || 0), 0)
			const statusColor = orderStatusColors[item.status] || colors.textSecondary
			const statusLabel = orderStatusLabels[item.status] || item.status

			// Animation for card press (use per-item ref from map to avoid hook rules)
			const scaleAnim = scaleAnimRefs[item._id] ?? (scaleAnimRefs[item._id] = new Animated.Value(1))
			const handlePressIn = () => {
				Animated.spring(scaleAnim, {
					toValue: 0.98,
					useNativeDriver: true,
					friction: 8,
					tension: 100
				}).start()
			}

			const handlePressOut = () => {
				Animated.spring(scaleAnim, {
					toValue: 1,
					useNativeDriver: true,
					friction: 8,
					tension: 100
				}).start()
			}

			// Simple calculation (no hooks inside render function)
			const getCustomerName = () => {
				if (item.customer?.name) {
					return typeof item.customer.name === 'object' ? (item.customer.name as any).en || 'Customer' : item.customer.name
				}
				return item.customer?.slug || 'Unknown Customer'
			}

			const isGrid = responsiveConfig.numColumns > 1
			const layoutStyle = isGrid ? styles.cardHorizontal : styles.cardVertical
			const productImageUrl = item.products?.[0]?.product?.media?.thumbnail?.url || item.products?.[0]?.product?.photos?.[0] || ''

			// Money objects
			const computedSum = item.products?.reduce((sum, p) => sum + (p.lineTotal?.tnd ?? 0), 0)
			const totalMoney = item.price?.total ?? { tnd: computedSum }

			const getProductName = (p: any) => {
				// Handle LocalizedName object or string
				if (typeof p?.product?.name === 'object') {
					return p.product.name.en || p.product.name.tn_latn || p.product.name.tn_arab || 'Unknown Product'
				}
				return p?.product?.defaultProduct?.name?.en || p?.product?.name?.en || typeof p?.product?.name === 'string' ? p.product.name : 'Unknown Product'
			}

			return (
				<Animated.View
					style={[{ transform: [{ scale: scaleAnim }], width: responsiveConfig.numColumns > 1 ? responsiveConfig.cardWidth : '100%' }, isGrid && { maxWidth: responsiveConfig.maxCardWidth }]}
				>
					<View style={[styles.cardOutline, isGrid && { margin: responsiveConfig.spacing.xs, elevation: 2, maxWidth: responsiveConfig.maxCardWidth }]}>
						<TouchableOpacity
							style={[
								styles.card,
								layoutStyle,
								{
									backgroundColor: colors.card,
									borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
									shadowColor: isDark ? '#000' : '#888'
								}
							]}
							activeOpacity={0.95}
							onPressIn={handlePressIn}
							onPressOut={handlePressOut}
						>
							{isGrid && (
								<View style={styles.gridImageContainer}>
									<SmartImage source={{ uri: productImageUrl }} style={styles.gridImage} resizeMode="cover" fallbackIcon="image" />
								</View>
							)}

							<View style={{ flex: 1, flexDirection: isGrid ? 'row' : 'column' }}>
								<View style={{ flex: 1, paddingRight: isGrid ? responsiveConfig.spacing.md : 0 }}>
									{/* Card Header - Reorganized */}
									<View style={styles.cardHeader}>
										<View style={styles.headerLeft}>
											<View style={styles.headerInfo}>
												<Text style={styles.customerName} numberOfLines={1} ellipsizeMode="tail">
													{getCustomerName()}
												</Text>
												<View style={styles.orderIdContainer}>
													<Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
													<Text style={[styles.orderDate, { opacity: 0.6 }]}>• #{item._id.slice(-6).toUpperCase()}</Text>
												</View>
												{item.shop && (
													<View style={styles.shopLocation}>
														<Ionicons name="storefront-outline" size={responsiveConfig.iconSizes.sm} color={colors.textTertiary} />
														<View style={{ marginLeft: 8, flexShrink: 1 }}>
															<Text style={{ fontSize: responsiveConfig.fontSize.customerDetails, color: colors.text, fontWeight: '600' }} numberOfLines={1} ellipsizeMode="tail">
																{typeof item.shop.name === 'object' ? (item.shop.name as any).en || item.shop.slug : item.shop.name || item.shop.slug}
															</Text>
															{item.shop?.address && (
																<Text style={{ fontSize: responsiveConfig.fontSize.customerDetails - 1, color: colors.textTertiary }} numberOfLines={1} ellipsizeMode="tail">
																	{[item.shop.address.city, item.shop.address.country].filter(Boolean).join(', ')}
																</Text>
															)}
														</View>
													</View>
												)}
											</View>
										</View>
										{/* Status Badge, Total and Details in Header */}
										<View style={styles.headerRight}>
											<View style={[styles.statusBadge, { backgroundColor: statusColor + '18', borderColor: statusColor + '30' }]}>
												<Ionicons name={getStatusIcon(item.status) as any} size={responsiveConfig.iconSizes.sm} color={statusColor} />
												<Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
											</View>

											{/* Prominent total price */}
											<View style={styles.totalPill}>
												<Text style={styles.totalPillText}>{formatMoney(totalMoney)}</Text>
											</View>

											{/* Quick action - view details */}
											<TouchableOpacity style={styles.detailButton} onPress={() => router.push(`/home/business/sales/${item._id}` as any)}>
												<Text style={styles.detailButtonText}>Details</Text>
											</TouchableOpacity>
										</View>
									</View>

									{/* Card Body - Reorganized */}
									<View style={styles.cardBody}>
										{/* Customer Section - Simplified */}
										{item.customer && (
											<View style={styles.customerSection}>
												<View style={styles.customerHeader}>
													{item.customer?.media?.thumbnail?.url ? (
														<SmartImage source={{ uri: item.customer.media.thumbnail.url }} style={styles.customerPhoto} resizeMode="cover" fallbackIcon="person" />
													) : (
														<View style={[styles.customerPhotoPlaceholder, { backgroundColor: colors.primary + '15' }]}>
															<Ionicons name="person" size={32} color={colors.primary} />
														</View>
													)}
													<View style={styles.customerContactInfo}>
														<Text style={[styles.customerDetailValue, { color: colors.text, fontWeight: '600' }]}>
															{item.customer?.slug || (typeof item.customer?.name === 'object' ? (item.customer.name as any).en : item.customer?.name) || 'N/A'}
														</Text>
														{item.customer?.address && (
															<View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
																<Ionicons name="location" size={12} color={colors.info} />
																<Text style={[styles.customerDetailValue, { fontSize: 12, color: colors.textSecondary }]}>
																	{[item.customer.address.city, item.customer.address.country].filter(Boolean).join(', ')}
																</Text>
															</View>
														)}
													</View>
												</View>

												{/* Contact Actions */}
												<View style={styles.contactActions}>
													{item.customer?.contact?.phone && (
														<TouchableOpacity
															style={[styles.contactButton, { backgroundColor: colors.success + '15' }]}
															onPress={() => Linking.openURL(`tel:${item.customer.contact?.phone?.fullNumber || ''}`)}
														>
															<Ionicons name="call" size={16} color={colors.success} />
														</TouchableOpacity>
													)}
													{item.customer?.contact?.whatsapp && (
														<TouchableOpacity
															style={[styles.contactButton, { backgroundColor: '#25D36615' }]}
															onPress={() => Linking.openURL(`https://wa.me/${(item.customer.contact?.whatsapp || '').replace(/[^\d]/g, '')}`)}
														>
															<FontAwesome5 name="whatsapp" size={16} color="#25D366" />
														</TouchableOpacity>
													)}
													{item.customer?.contact?.email && (
														<TouchableOpacity style={[styles.contactButton, { backgroundColor: colors.info + '15' }]} onPress={() => Linking.openURL(`mailto:${item.customer.contact?.email || ''}`)}>
															<Ionicons name="mail" size={16} color={colors.info} />
														</TouchableOpacity>
													)}
													{/* Backup phones */}
													{item.customer?.contact?.backupPhones?.slice(0, 1).map((backupPhone, index) => (
														<TouchableOpacity
															key={index}
															style={[styles.contactButton, { backgroundColor: colors.warning + '15' }]}
															onPress={() => Linking.openURL(`tel:${backupPhone?.fullNumber || ''}`)}
														>
															<Ionicons name="call-outline" size={16} color={colors.warning} />
														</TouchableOpacity>
													))}
												</View>
											</View>
										)}

										{/* Products Section */}
										{item.products && item.products.length > 0 && (
											<View style={styles.productsSection}>
												<ProductSwiper products={item.products} responsiveConfig={responsiveConfig} colors={colors} styles={styles} getProductName={getProductName} />
											</View>
										)}
									</View>
								</View>

								{/* Right Side - Price Only */}
								{!isGrid && (
									<View style={styles.cardRight}>
										<View style={styles.totalPriceContainer}>
											<Text style={[styles.totalPriceLabel, { color: colors.textSecondary }]}>Total</Text>
											<Text style={[styles.totalPrice, { color: colors.primary }]}>{formatMoney(totalMoney)}</Text>
										</View>
									</View>
								)}
							</View>
						</TouchableOpacity>
					</View>
				</Animated.View>
			)
		},
		[colors, isDark, responsiveConfig, styles, scaleAnimRefs, getStatusIcon, formatDate, formatMoney, orderStatusColors, orderStatusLabels]
	)

	return (
		<View style={styles.container}>
			<View
				style={{
					marginBottom: responsiveConfig.spacing.sm,
					paddingHorizontal: responsiveConfig.spacing.container
				}}
			>
				<ScreenHeader title="Sales" showBack={false} />
				{totalDocs !== null && (
					<View style={{ marginTop: 6 }}>
						<Text style={{ color: colors.textTertiary, fontSize: responsiveConfig.fontSize.customerDetails }}>{`Showing ${sales.length} of ${totalDocs} sales`}</Text>
					</View>
				)}
			</View>

			{/* Filter Section */}
			<View style={styles.filterContainer}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScrollProps}>
					{FILTERS.map((filter) => (
						<TouchableOpacity
							key={filter.id}
							style={[
								styles.filterChip,
								activeFilter === filter.id && styles.filterChipActive,
								{
									marginRight: responsiveConfig.spacing.sm,
									marginBottom: responsiveConfig.spacing.xs
								}
							]}
							onPress={() => handleFilterPress(filter.id)}
							activeOpacity={0.8}
						>
							<Text style={[styles.filterText, activeFilter === filter.id && styles.filterTextActive]} numberOfLines={1}>
								{filter.label}
							</Text>
						</TouchableOpacity>
					))}
				</ScrollView>
			</View>

			{/* Sales List */}
			<FlatList
				key={`sales-list-${responsiveConfig.numColumns}`}
				data={sales}
				renderItem={renderSaleItem}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.listContent}
				columnWrapperStyle={
					responsiveConfig.numColumns > 1
						? {
								justifyContent: 'flex-start'
							}
						: null
				}
				numColumns={responsiveConfig.numColumns}
				showsVerticalScrollIndicator={false}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={onRefresh}
						tintColor={colors.primary}
						colors={[colors.primary]}
						progressBackgroundColor={colors.card}
						title="Refreshing sales..."
						titleColor={colors.textSecondary}
					/>
				}
				onEndReached={loadMore}
				onEndReachedThreshold={0.3}
				ListEmptyComponent={
					!loading && !refreshing ? (
						<View
							style={{
								flex: 1,
								justifyContent: 'center',
								alignItems: 'center',
								padding: responsiveConfig.spacing.xl,
								minHeight: 300
							}}
						>
							<Ionicons name="receipt-outline" size={48} color={colors.textSecondary} style={{ opacity: 0.5, marginBottom: responsiveConfig.spacing.md }} />
							<Text
								style={{
									color: colors.textSecondary,
									textAlign: 'center',
									fontSize: responsiveConfig.fontSize.sectionTitle,
									marginBottom: responsiveConfig.spacing.sm,
									fontWeight: '600'
								}}
							>
								No Sales Found
							</Text>
							<Text
								style={{
									color: colors.textTertiary,
									textAlign: 'center',
									fontSize: responsiveConfig.fontSize.customerDetails,
									maxWidth: 300
								}}
							>
								{activeFilter !== 'all' ? `No sales match the selected filter. Try changing the filter or check back later.` : 'You have no sales yet. New orders will appear here.'}
							</Text>
						</View>
					) : null
				}
				ListFooterComponent={
					loading && sales.length > 0 ? (
						<View style={{ padding: 20 }}>
							<Text style={{ color: colors.textSecondary, textAlign: 'center' }}>Loading...</Text>
						</View>
					) : null
				}
			/>
		</View>
	)
}

const createStyles = (colors: any, isDark: boolean, width: number, config: any) => {
	const { fontSize, spacing, iconSizes, borderRadius, shadow } = config
	const isSmallMobile = width < 400
	const isMobile = width >= 400 && width < 768
	const isTablet = width >= 768 && width < 1024
	const isDesktop = width >= 1024 && width < 1440
	const isLargeDesktop = width >= 1440

	const cardMinHeight = isSmallMobile ? 180 : isMobile ? 200 : isTablet ? 220 : isDesktop ? 240 : isLargeDesktop ? 260 : 280
	const cardRightWidth = isSmallMobile
		? 70
		: isMobile
			? 80
			: isTablet
				? Math.max(85, Math.floor(config.cardWidth * 0.22))
				: isDesktop
					? Math.max(100, Math.floor(config.cardWidth * 0.25))
					: Math.max(90, Math.floor(config.cardWidth * 0.23))

	return StyleSheet.create({
		// Layout
		container: {
			flex: 1,
			backgroundColor: colors.background,
			paddingHorizontal: spacing.container,
			paddingTop: spacing.sm
		},

		// Filter Section
		filterContainer: {
			paddingVertical: spacing.sm,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderBottomColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
			backgroundColor: colors.card,
			...(isDesktop
				? {
						paddingHorizontal: spacing.lg,
						borderRadius: borderRadius.lg,
						margin: spacing.sm,
						...shadow.sm,
						borderWidth: 0
					}
				: {})
		},

		filterScrollProps: {
			paddingHorizontal: spacing.sm,
			gap: spacing.sm,
			paddingBottom: 2 // For shadow
		},

		filterChip: {
			paddingHorizontal: spacing.md,
			paddingVertical: spacing.xs,
			borderRadius: borderRadius.pill,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
			alignItems: 'center',
			justifyContent: 'center',
			minWidth: 72,
			backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)',
			...(isDesktop
				? {
						minWidth: 88,
						paddingVertical: spacing.sm,
						transitionProperty: 'all',
						transitionDuration: '200ms'
					}
				: {})
		},

		filterChipActive: {
			backgroundColor: colors.primary + '15',
			borderColor: colors.primary + '30'
		},

		filterText: {
			fontSize: fontSize.actionButton,
			fontWeight: '500',
			color: colors.text
		},

		filterTextActive: {
			color: colors.primary,
			fontWeight: '600'
		},

		// List & Grid
		list: {
			padding: spacing.sm,
			paddingTop: spacing.md
		},

		listContent: {
			paddingBottom: spacing.xxl,
			...(isDesktop
				? {
						justifyContent: 'center',
						maxWidth: 1600,
						alignSelf: 'center',
						width: '100%'
					}
				: {})
		},

		// Card Styles
		card: {
			borderRadius: borderRadius.lg,
			padding: isSmallMobile ? spacing.sm : spacing.md,
			marginBottom: spacing.md,
			borderWidth: StyleSheet.hairlineWidth,
			borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
			backgroundColor: colors.card,
			...shadow.sm,
			minHeight: cardMinHeight,
			justifyContent: 'space-between',
			width: '100%',
			alignSelf: 'stretch',
			...(isDesktop
				? {
						transitionProperty: 'transform, box-shadow',
						transitionDuration: '200ms'
					}
				: {})
		},

		// Horizontal card layout for grid (image/details side-by-side)
		cardHorizontal: {
			flexDirection: 'row',
			alignItems: 'flex-start',
			paddingVertical: isSmallMobile ? spacing.sm : spacing.md,
			paddingHorizontal: isSmallMobile ? spacing.sm : spacing.md,
			minHeight: cardMinHeight,
			gap: isSmallMobile ? spacing.sm : spacing.md
		},

		// Vertical card layout for single-column list
		cardVertical: {
			flexDirection: 'column',
			alignItems: 'stretch',
			gap: isSmallMobile ? spacing.sm : spacing.md
		},

		cardRight: {
			flexBasis: Math.min(cardRightWidth, 240),
			minWidth: 60,
			maxWidth: Math.max(cardRightWidth, 120),
			justifyContent: 'space-between',
			alignItems: 'flex-start',
			paddingLeft: spacing.sm,
			...(isTablet && { flexDirection: 'column', alignItems: 'flex-start' })
		},

		actionsPanel: {
			marginTop: isSmallMobile ? spacing.sm : spacing.md,
			justifyContent: 'flex-start',
			alignItems: 'center',
			flexDirection: isDesktop ? 'row' : 'column',
			gap: spacing.contact,
			...(isTablet && { flexDirection: 'row', flexWrap: 'wrap' })
		},

		// Card Header
		cardHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'flex-start',
			marginBottom: spacing.sm,
			position: 'relative'
		},

		headerLeft: {
			flexDirection: 'row',
			alignItems: 'center',
			flex: 1,
			marginRight: spacing.sm
		},

		iconContainer: {
			width: iconSizes.lg,
			height: iconSizes.lg,
			borderRadius: borderRadius.md,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: spacing.md,
			backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
		},

		headerInfo: {
			flex: 1,
			marginRight: spacing.sm
		},

		headerRight: {
			justifyContent: 'flex-start',
			alignItems: 'flex-end',
			minWidth: 80
		},

		orderIdContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: spacing.xs,
			marginTop: 2
		},

		customerName: {
			fontSize: fontSize.customerName,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 2,
			lineHeight: fontSize.customerName * 1.3
		},

		orderDate: {
			fontSize: fontSize.orderId,
			color: colors.textSecondary,
			opacity: 0.8
		},

		shopLocation: {
			fontSize: fontSize.customerDetails,
			color: colors.textSecondary,
			marginTop: spacing.xs,
			flexDirection: 'row',
			alignItems: 'center',
			gap: spacing.xs
		},

		// Status Badge
		statusBadge: {
			paddingHorizontal: spacing.sm,
			paddingVertical: spacing.xs,
			borderRadius: borderRadius.pill,
			alignSelf: 'flex-start',
			minWidth: 80,
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: 1,
			borderColor: 'transparent',
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.06,
			shadowRadius: 3,
			elevation: 2,
			...(isDesktop
				? {
						position: 'absolute',
						top: 0,
						right: 0
					}
				: {})
		},
		statusText: {
			fontSize: fontSize.statusText,
			fontWeight: '700',
			textTransform: 'uppercase',
			letterSpacing: 0.5
		},
		divider: {
			height: 1,
			backgroundColor: 'rgba(150,150,150,0.1)',
			marginVertical: spacing.detail
		},
		cardBody: {
			gap: spacing.detail
		},
		productsList: {
			marginBottom: 12
		},
		productItem: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: spacing.contact,
			marginBottom: 8
		},
		productImage: {
			width: iconSizes.productImage,
			height: iconSizes.productImage,
			borderRadius: borderRadius.md
		},
		productImagePlaceholder: {
			width: iconSizes.productImage,
			height: iconSizes.productImage,
			borderRadius: borderRadius.md,
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: colors.background + '50'
		},
		gridImageContainer: {
			width: iconSizes.productImage + 8,
			height: iconSizes.productImage + 8,
			marginRight: spacing.md,
			justifyContent: 'center',
			alignItems: 'center'
		},
		gridImage: {
			width: iconSizes.productImage,
			height: iconSizes.productImage,
			borderRadius: borderRadius.md
		},
		productText: {
			fontSize: fontSize.productText,
			fontWeight: '600',
			maxWidth: '85%'
		},
		moreItemsText: {
			fontSize: 12,
			fontStyle: 'italic',
			marginTop: 4,
			marginLeft: 52
		},
		totalRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginTop: 4,
			paddingTop: 8,
			borderTopWidth: 1,
			borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
		},
		totalLabelContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6
		},
		totalLabel: {
			fontSize: fontSize.productPrice,
			fontWeight: '500'
		},
		totalValue: {
			fontSize: 18,
			fontWeight: '800'
		},
		actionsContainer: {
			marginTop: 16,
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: spacing.contact,
			justifyContent: 'flex-end'
		},
		actionButtonText: {
			color: '#fff',
			fontSize: fontSize.actionButton,
			fontWeight: '600'
		},
		cancelButton: {},
		emptyContainer: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			paddingVertical: 60,
			paddingHorizontal: spacing.container
		},
		emptyIconContainer: {
			width: 120,
			height: 120,
			borderRadius: 60,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 24
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: '600',
			marginBottom: 8
		},
		emptySubtitle: {
			fontSize: 15,
			color: 'rgba(150,150,150,0.7)',
			textAlign: 'center'
		},

		contactButton: {
			width: 32,
			height: 32,
			borderRadius: 16,
			justifyContent: 'center',
			alignItems: 'center'
		},
		locationButton: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6,
			paddingHorizontal: 12,
			paddingVertical: 8,
			borderRadius: 8,
			marginTop: 8,
			alignSelf: 'flex-start'
		},
		locationButtonText: {
			fontSize: 13,
			fontWeight: '600'
		},
		customerSection: {
			backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
			borderRadius: 12,
			padding: 16,
			marginBottom: 12
		},
		customerHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			marginBottom: 12
		},
		customerSectionTitle: {
			fontSize: 16,
			fontWeight: '700',
			color: colors.text
		},
		customerDetails: {
			gap: spacing.detail
		},
		customerDetailRow: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingVertical: spacing.detail
		},
		customerDetailLabel: {
			fontSize: 13,
			fontWeight: '600',
			color: colors.textTertiary,
			minWidth: 60
		},
		customerDetailValue: {
			fontSize: 14,
			fontWeight: '500',
			color: colors.text,
			flex: 1,
			textAlign: 'right'
		},
		locationLink: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: spacing.contact,
			backgroundColor: 'transparent',
			paddingVertical: spacing.detail,
			paddingHorizontal: spacing.contact,
			borderRadius: 6
		},
		contactLink: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: spacing.contact,
			backgroundColor: 'transparent',
			paddingVertical: spacing.detail,
			paddingHorizontal: spacing.contact,
			borderRadius: 6
		},

		// Product styles
		productsSection: {
			marginTop: spacing.md
		},
		sectionTitle: {
			fontSize: fontSize.sectionTitle,
			fontWeight: '600',
			color: colors.textSecondary,
			marginBottom: spacing.sm
		},
		productRow: {
			flexDirection: 'row',
			alignItems: 'flex-start',
			gap: spacing.md,
			marginBottom: spacing.sm
		},
		productInfo: {
			flex: 1,
			justifyContent: 'space-between',
			minHeight: iconSizes.productImage
		},
		productName: {
			fontSize: fontSize.productText,
			fontWeight: '500',
			color: colors.text,
			flex: 1,
			lineHeight: 16
		},
		productMeta: {
			flexDirection: 'column',
			alignItems: 'flex-start',
			gap: spacing.xs,
			marginTop: spacing.xs
		},
		productQuantity: {
			fontSize: fontSize.productText,
			color: colors.textSecondary
		},
		productPrice: {
			fontSize: fontSize.productPrice,
			fontWeight: '600',
			color: colors.primary
		},
		moreProductsText: {
			fontSize: fontSize.customerDetails,
			color: colors.textTertiary,
			fontStyle: 'italic',
			marginTop: spacing.xs
		},

		// Status and price styles
		statusContainer: {
			alignItems: 'flex-start',
			marginBottom: spacing.sm
		},
		totalPriceContainer: {
			alignItems: 'flex-start',
			marginBottom: spacing.sm
		},
		totalPriceLabel: {
			fontSize: fontSize.customerDetails,
			color: colors.textSecondary,
			marginBottom: spacing.xs
		},
		totalPrice: {
			fontSize: fontSize.productPrice,
			fontWeight: '700',
			color: colors.primary
		},

		// Action buttons
		actionButton: {
			width: iconSizes.lg + spacing.sm,
			height: iconSizes.lg + spacing.sm,
			borderRadius: borderRadius.md,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: spacing.xs
		},
		customerPhoto: {
			width: iconSizes.customerPhoto,
			height: iconSizes.customerPhoto,
			borderRadius: iconSizes.customerPhoto / 2,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: spacing.sm,
			...(isTablet && { marginRight: 0, marginBottom: spacing.sm })
		},
		customerPhotoPlaceholder: {
			width: iconSizes.customerPhoto,
			height: iconSizes.customerPhoto,
			borderRadius: iconSizes.customerPhoto / 2,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: spacing.sm,
			...(isTablet && { marginRight: 0, marginBottom: spacing.sm })
		},
		customerContactInfo: {
			flex: 1,
			justifyContent: 'center'
		},
		contactActions: {
			flexDirection: 'row',
			gap: spacing.xs,
			marginTop: spacing.sm,
			justifyContent: 'flex-start',
			...(isTablet && { justifyContent: 'center', marginTop: spacing.md })
		},
		cardOutline: {
			borderWidth: 1.5,
			borderColor: colors.primary,
			borderRadius: borderRadius.lg,
			overflow: 'hidden',
			width: '100%',
			minHeight: cardMinHeight
		},
		totalPill: {
			paddingHorizontal: 10,
			paddingVertical: 6,
			borderRadius: 12,
			backgroundColor: colors.primary + '12',
			borderWidth: 1,
			borderColor: colors.primary + '28',
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: spacing.xs
		},
		totalPillText: {
			fontSize: 13,
			fontWeight: '800',
			color: colors.primary
		},
		detailButton: {
			marginTop: spacing.xs,
			paddingHorizontal: spacing.md,
			paddingVertical: spacing.xs,
			borderRadius: borderRadius.md,
			backgroundColor: 'transparent',
			borderWidth: 1,
			borderColor: 'rgba(0,0,0,0.06)'
		},
		detailButtonText: {
			fontSize: fontSize.actionButton,
			fontWeight: '600',
			color: colors.text
		},

		// Product Swiper Styles
		productSwiper: {
			marginBottom: spacing.sm,
			borderRadius: borderRadius.md,
			borderWidth: 1,
			borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
			backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
			overflow: 'hidden'
		},
		productSwiperHeaderBar: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingHorizontal: spacing.sm,
			paddingVertical: spacing.xs,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
		},
		productSwiperTitle: {
			fontSize: fontSize.productText,
			fontWeight: '600',
			color: colors.text
		},
		productSwiperNavButtons: {
			flexDirection: 'row',
			gap: spacing.xs
		},
		productSwiperNavButton: {
			width: 28,
			height: 28,
			borderRadius: 14,
			backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
			justifyContent: 'center',
			alignItems: 'center'
		},
		productSwiperScroll: {
			marginBottom: spacing.xs
		},
		productSwiperContainer: {
			paddingHorizontal: spacing.sm,
			paddingVertical: spacing.sm
		},
		productSwiperItem: {
			flexDirection: 'column',
			backgroundColor: colors.card,
			borderRadius: borderRadius.md,
			padding: spacing.sm,
			marginHorizontal: spacing.xs,
			borderWidth: 1,
			borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.15,
			shadowRadius: 4,
			elevation: 3,
			minHeight: config.productSliderHeight - 20
		},
		productSwiperHeader: {
			position: 'relative',
			marginBottom: spacing.sm
		},
		productSwiperImage: {
			width: 70,
			height: 70,
			borderRadius: borderRadius.sm,
			alignSelf: 'center'
		},
		productSwiperImagePlaceholder: {
			width: 70,
			height: 70,
			borderRadius: borderRadius.sm,
			alignSelf: 'center',
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: colors.background + '80'
		},
		productSwiperBadge: {
			position: 'absolute',
			top: spacing.xs,
			right: spacing.xs,
			backgroundColor: colors.primary,
			borderRadius: borderRadius.pill,
			paddingHorizontal: spacing.xs,
			paddingVertical: 2
		},
		productSwiperBadgeText: {
			fontSize: fontSize.productText - 3,
			fontWeight: '600',
			color: colors.card
		},
		productSwiperDetails: {
			flex: 1
		},
		productSwiperDetailsScroll: {
			flex: 1,
			maxHeight: config.productSliderHeight - 120, // Fixed height to ensure scrolling
			marginBottom: spacing.sm,
			borderWidth: 1,
			borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
			borderRadius: borderRadius.sm
		},
		productSwiperDetailsContainer: {
			paddingBottom: spacing.sm,
			gap: spacing.sm
		},
		productSwiperDetailsContent: {
			paddingBottom: spacing.sm,
			gap: spacing.sm
		},
		productSwiperMetaInfo: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: spacing.xs,
			paddingBottom: spacing.xs,
			borderBottomWidth: StyleSheet.hairlineWidth,
			borderBottomColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
		},
		productSwiperMetaText: {
			fontSize: fontSize.productText - 3,
			color: colors.textTertiary,
			fontFamily: 'monospace'
		},
		productSwiperName: {
			fontSize: fontSize.productText + 1,
			fontWeight: '700',
			color: colors.text,
			textAlign: 'center',
			marginBottom: spacing.xs,
			lineHeight: 18
		},
		productSwiperSpecs: {
			gap: spacing.xs
		},
		productSwiperSpecRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: spacing.xs
		},
		productSwiperSpecText: {
			fontSize: fontSize.productText - 1,
			color: colors.textSecondary,
			fontWeight: '500',
			flex: 1
		},
		productSwiperPricing: {
			flexDirection: 'row',
			gap: spacing.sm,
			marginBottom: spacing.sm
		},
		productSwiperPriceCard: {
			flex: 1,
			backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
			borderRadius: borderRadius.sm,
			padding: spacing.sm,
			alignItems: 'center'
		},
		productSwiperTotalCard: {
			backgroundColor: colors.primary + '15'
		},
		productSwiperPriceLabel: {
			fontSize: fontSize.productText - 2,
			fontWeight: '500',
			marginBottom: spacing.xs
		},
		productSwiperUnitPrice: {
			fontSize: fontSize.productText,
			fontWeight: '600',
			color: colors.text
		},
		productSwiperSubPrice: {
			fontSize: fontSize.productText - 3,
			color: colors.textTertiary,
			marginTop: 2
		},
		productSwiperTotalPrice: {
			fontSize: fontSize.productText + 1,
			fontWeight: '700',
			color: colors.primary
		},
		productSwiperAdditionalInfo: {
			marginBottom: spacing.sm,
			gap: spacing.xs
		},
		productSwiperInfoRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: spacing.xs
		},
		productSwiperInfoText: {
			fontSize: fontSize.productText - 3,
			color: colors.textTertiary,
			flex: 1
		},
		productSwiperFooter: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingTop: spacing.xs,
			borderTopWidth: StyleSheet.hairlineWidth,
			borderTopColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
		},
		productSwiperId: {
			fontSize: fontSize.productText - 3,
			color: colors.textTertiary,
			fontFamily: 'monospace',
			opacity: 0.7
		},
		productSwiperStatus: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: spacing.xs
		},
		productSwiperStatusDot: {
			width: 6,
			height: 6,
			borderRadius: 3
		},
		productSwiperStatusText: {
			fontSize: fontSize.productText - 2,
			fontWeight: '500'
		},
		swiperIndicators: {
			flexDirection: 'row',
			justifyContent: 'center',
			alignItems: 'center',
			paddingVertical: spacing.xs,
			gap: spacing.xs
		},
		swiperIndicator: {
			height: 6,
			width: 8,
			borderRadius: 3,
			marginHorizontal: 4,
			backgroundColor: colors.textTertiary,
			transitionDuration: '200ms'
		}
	})
}
