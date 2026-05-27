import HeaderTitle from '@/features/common/HeaderTitle'
import HeaderRefreshButton from '@/features/common/HeaderRefreshButton'
import HeaderActionButton from '@/features/common/HeaderActionButton'
import HeaderUpdaterWidget from '@/features/appUpdater/HeaderUpdaterWidget'
import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator, Animated, useWindowDimensions, Platform, ScrollView, Easing } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter, Tabs, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { getFeed } from '@/features/feed/feed.api'
import { FeedItem } from '@/features/feed/feed.interface'

import FeedCard from '@/features/feed/feed.card'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import ErrorState from '@/features/common/ErrorState'
import { toast } from '@/features/common/Toast'
import { getCurrentUser } from '@/features/auth/auth.api'
import { parseError, logError } from '@/core/helpers/errorHandler'
import { useUser } from '@/core/contexts'
import { useTheme } from '@/core/theme'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getToken } from '@/core/storage'
import ScannerModal from '@/features/scanner/ScannerModal'
import { log } from '@/core/log'

const createStyles = (colors: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background
		},
		headerContainer: {
			padding: 20,
			paddingTop: 10,
			backgroundColor: colors.background
		},
		headerTop: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 16
		},
		greeting: {
			fontSize: 14,
			color: colors.textSecondary,
			fontWeight: '500'
		},
		title: {
			fontSize: 26,
			fontWeight: '700',
			color: colors.text,
			marginTop: 2
		},
		refreshButton: {
			width: 48,
			height: 48,
			borderRadius: 14,
			backgroundColor: colors.surface,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1,
			borderColor: colors.border
		},
		refreshButtonSmall: {
			width: 40,
			height: 40,
			borderRadius: 10,
			backgroundColor: colors.surface,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1,
			borderColor: colors.border
		},
		emptyContainer: {
			alignItems: 'center',
			justifyContent: 'center',
			paddingTop: 60,
			paddingHorizontal: 40
		},
		emptyIcon: {
			width: 80,
			height: 80,
			borderRadius: 20,
			backgroundColor: colors.surface,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 20
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: '600',
			color: colors.text,
			marginBottom: 8
		},
		emptyText: {
			fontSize: 14,
			color: colors.textSecondary,
			textAlign: 'center'
		},
		loadingOverlay: {
			...StyleSheet.absoluteFillObject,
			backgroundColor: colors.background,
			justifyContent: 'center',
			alignItems: 'center',
			zIndex: 10
		},
		list: {
			paddingBottom: 90
		},
		cardWrapper: {
			marginBottom: 16
		},
		// Filter chip styles
		filterContainer: {
			paddingVertical: 8,
			paddingHorizontal: 16,
			backgroundColor: colors.background
		},
		filterChip: {
			width: 44,
			height: 44,
			borderRadius: 12,
			backgroundColor: colors.surface,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1,
			borderColor: colors.border,
			marginRight: 8
		},
		filterChipActive: {
			backgroundColor: colors.primaryContainer,
			borderColor: colors.primary
		},
		paginationContainer: {
			flexDirection: 'row',
			justifyContent: 'center',
			alignItems: 'center',
			paddingVertical: 24,
			gap: 8,
			backgroundColor: colors.background
		},
		pageButton: {
			minWidth: 40,
			height: 40,
			borderRadius: 10,
			backgroundColor: colors.surface,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1,
			borderColor: colors.border
		},
		pageButtonActive: {
			backgroundColor: colors.primary,
			borderColor: colors.primary
		},
		pageButtonText: {
			fontSize: 14,
			fontWeight: '600',
			color: colors.text
		},
		pageButtonTextActive: {
			color: '#ffffff'
		},
		pageButtonDisabled: {
			opacity: 0.5
		},
		pageDots: {
			paddingHorizontal: 4,
			justifyContent: 'center',
			alignItems: 'center'
		},
		pageDotsText: {
			fontSize: 14,
			color: colors.textSecondary,
			fontWeight: '600'
		}
	})

type CartItem = FeedItem & { quantity: number }

export default function FeedScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const [feedItems, setFeedItems] = useState<FeedItem[]>([])
	const [displayedItems, setDisplayedItems] = useState<FeedItem[]>([])
	const [cart, setCart] = useState<CartItem[]>([])
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [isScannerVisible, setIsScannerVisible] = useState(false)

	const { width } = useWindowDimensions()
	const isWide = width >= 1440
	const isDesktop = width >= 1024
	const isTablet = width >= 768

	const numColumns = useMemo(() => {
		// Intelligently scale column count based on device screen size
		if (width < 500) return 1 // Mobile phones -> 1 large, highly readable column
		if (width < 800) return 2 // Small tablets / Phablets -> 2 columns
		if (width < 1100) return 3 // Tablets / Small laptops -> 3 columns
		if (width < 1440) return 4 // Desktops -> 4 columns
		return 5 // Ultrawide monitors -> 5 columns
	}, [width])

	const gap = 14
	const padding = 16
	const itemWidth = (width - padding * 2 - gap * (numColumns - 1)) / numColumns

	// Pagination state
	const isWeb = Platform.OS === 'web'
	const { page: queryPage } = useLocalSearchParams<{ page?: string }>()
	const urlPage = useMemo(() => {
		if (!isWeb) return 1
		return queryPage ? Math.max(1, parseInt(queryPage, 10)) : 1
	}, [queryPage, isWeb])

	const [mobilePage, setMobilePage] = useState(1)
	const activePage = isWeb ? urlPage : mobilePage

	const [pagination, setPagination] = useState<{
		totalDocs: number
		totalPages: number
		page: number
		limit: number
		hasNextPage: boolean
		nextPage: number | null
		hasPrevPage: boolean
		prevPage: number | null
		returnedDocsCount: number
	} | null>(null)

	const [hasMore, setHasMore] = useState(true)
	const [isLoadingMore, setIsLoadingMore] = useState(false)

	// Animation state for search bar
	const scrollY = useRef(new Animated.Value(0)).current

	// Error handling state
	const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null)

	const { user, localize, translate } = useUser()

	const { onScroll } = useScrollHandler()
	const insets = useSafeAreaInsets()
	const styles = useMemo(() => createStyles(colors), [colors])

	const loadCart = useCallback(async () => {
		try {
			const storedCart = await AsyncStorage.getItem('cart')
			if (storedCart) {
				setCart(JSON.parse(storedCart))
			}
		} catch (error) {
			log({ level: 'error', label: 'FeedScreen', message: 'Failed to load cart', error })
		}
	}, [])

	const fetchFeed = useCallback(
		async (pageNum: number = 1, shouldAppend: boolean = false) => {
			try {
				if (pageNum === 1) setLoading(true)
				else setIsLoadingMore(true)

				const response = await getFeed(pageNum, 10)
				const newItems = response.data.docs

				if (response.data.pagination) {
					setPagination(response.data.pagination)
					setHasMore(response.data.pagination.hasNextPage)
				} else {
					if (newItems.length < 10) {
						setHasMore(false)
					} else {
						setHasMore(true)
					}
				}

				if (shouldAppend) {
					setFeedItems((prev) => [...prev, ...newItems])
					setDisplayedItems((prev) => [...prev, ...newItems])
				} else {
					setFeedItems(newItems)
					setDisplayedItems(newItems)
				}
				setError(null)
			} catch (err) {
				logError(err, 'fetchFeed')
				const errorInfo = parseError(err)
				setError({
					message: errorInfo.message,
					retry: errorInfo.canRetry ? () => fetchFeed(pageNum, shouldAppend) : undefined
				})
			} finally {
				setLoading(false)
				setIsLoadingMore(false)
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[]
	)

	// Trigger data load on page parameter changes on Web, or initial load on Mobile
	useEffect(() => {
		if (isWeb) {
			loadCart()
			fetchFeed(urlPage, false)
		} else {
			loadCart()
			fetchFeed(1, false)
		}
	}, [urlPage, isWeb])

	const refreshData = useCallback(async () => {
		setRefreshing(true)
		if (isWeb) {
			if (urlPage === 1) {
				await Promise.all([loadCart(), fetchFeed(1, false)])
			} else {
				router.setParams({ page: '1' })
			}
		} else {
			setMobilePage(1)
			setHasMore(true)
			await Promise.all([loadCart(), fetchFeed(1, false)])
		}
		setRefreshing(false)
	}, [isWeb, urlPage])

	const handleLoadMore = useCallback(() => {
		if (isWeb) return
		if (hasMore && !loading && !isLoadingMore) {
			const nextPage = mobilePage + 1
			setMobilePage(nextPage)
			fetchFeed(nextPage, true)
		}
	}, [hasMore, loading, isLoadingMore, mobilePage, isWeb])

	useFocusEffect(
		useCallback(() => {
			loadCart()
		}, [])
	)

	const addToCart = async (item: FeedItem, quantity: number) => {
		try {
			const token = await getToken()
			if (!token) {
				toast.show({ title: 'Info', message: 'Please log in to add items to cart', color: '#3B82F6' })
				router.push('/auth')
				return
			}

			const existingItemIndex = cart.findIndex((cartItem) => cartItem._id === item._id)
			let newCart: CartItem[]

			if (existingItemIndex > -1) {
				newCart = [...cart]
				newCart[existingItemIndex] = {
					...newCart[existingItemIndex],
					quantity: (newCart[existingItemIndex].quantity || 0) + quantity
				}
			} else {
				newCart = [...cart, { ...item, quantity }]
			}

			setCart(newCart)

			await AsyncStorage.setItem('cart', JSON.stringify(newCart))
			toast.show({ title: 'Success', message: `${localize(item.name)} added to cart`, color: '#10B981', screen: '/profile/purchases?status=cart' })
		} catch (err) {
			log({ level: 'error', label: 'FeedScreen', message: 'Failed to add to cart', error: err })
			toast.show({ title: 'Error', message: 'Failed to add to cart', color: '#EF4444' })
		}
	}

	const getPageNumbers = (current: number, total: number) => {
		const pages: (number | string)[] = []
		if (total <= 7) {
			for (let i = 1; i <= total; i++) pages.push(i)
		} else {
			pages.push(1)
			if (current > 3) {
				pages.push('...')
			}
			const start = Math.max(2, current - 1)
			const end = Math.min(total - 1, current + 1)
			for (let i = start; i <= end; i++) {
				pages.push(i)
			}
			if (current < total - 2) {
				pages.push('...')
			}
			pages.push(total)
		}
		return pages
	}

	const renderWebPagination = () => {
		if (!isWeb || !pagination || pagination.totalPages <= 1) return null

		const { totalPages } = pagination
		const pageNumbers = getPageNumbers(activePage, totalPages)

		return (
			<View style={styles.paginationContainer}>
				<TouchableOpacity
					style={[styles.pageButton, activePage === 1 && styles.pageButtonDisabled]}
					disabled={activePage === 1}
					onPress={() => router.setParams({ page: (activePage - 1).toString() })}
				>
					<Ionicons name="chevron-back" size={18} color={activePage === 1 ? colors.textSecondary : colors.primary} />
				</TouchableOpacity>

				{pageNumbers.map((num, idx) => {
					if (num === '...') {
						return (
							<View key={`dots-${idx}`} style={styles.pageDots}>
								<Text style={styles.pageDotsText}>...</Text>
							</View>
						)
					}

					const isPageActive = num === activePage
					return (
						<TouchableOpacity key={`page-${num}`} style={[styles.pageButton, isPageActive && styles.pageButtonActive]} onPress={() => router.setParams({ page: num.toString() })}>
							<Text style={[styles.pageButtonText, isPageActive && styles.pageButtonTextActive]}>{num}</Text>
						</TouchableOpacity>
					)
				})}

				<TouchableOpacity
					style={[styles.pageButton, activePage === totalPages && styles.pageButtonDisabled]}
					disabled={activePage === totalPages}
					onPress={() => router.setParams({ page: (activePage + 1).toString() })}
				>
					<Ionicons name="chevron-forward" size={18} color={activePage === totalPages ? colors.textSecondary : colors.primary} />
				</TouchableOpacity>
			</View>
		)
	}

	const renderFooter = () => {
		if (isWeb) {
			return renderWebPagination()
		}
		if (!isLoadingMore) return null
		return (
			<View style={{ paddingVertical: 20 }}>
				<ActivityIndicator size="small" color={colors.primary} />
			</View>
		)
	}

	const renderEmpty = () => {
		if (error) {
			return (
				<View style={{ paddingTop: 60 }}>
					<ErrorState title={error.message} onRetry={refreshData} icon="cloud-offline-outline" />
				</View>
			)
		}
		return (
			<View style={styles.emptyContainer}>
				<View style={styles.emptyIcon}>
					<Ionicons name="fish-outline" size={40} color={colors.textSecondary} />
				</View>
				<Text style={styles.emptyTitle}>{translate('no_products', 'No products found')}</Text>
				<Text style={styles.emptyText}>{translate('try_adjusting', 'Try adjusting your search or check back later for fresh catches!')}</Text>
			</View>
		)
	}

	const renderItem = ({ item }: { item: FeedItem }) => (
		<View style={[styles.cardWrapper, { width: numColumns > 1 ? `${(100 - (numColumns - 1) * 1.5) / numColumns}%` : '100%' }]}>
			<FeedCard item={item} addToCart={addToCart} />
		</View>
	)

	const headerRightActions = (
		<View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
			<HeaderUpdaterWidget />
			{!isWeb && (
				<HeaderActionButton iconName="qr-code-scanner" iconType="material" onPress={() => setIsScannerVisible(true)} backgroundColor={colors.surface} size={40} accessibilityLabel="Scan Barcode" />
			)}
			<HeaderActionButton iconName="search-outline" onPress={() => router.push('/search')} backgroundColor={colors.surface} size={40} accessibilityLabel="Search" />
			<HeaderActionButton
				iconName="cart-outline"
				onPress={() => router.push('/profile/purchases?status=cart')}
				badgeCount={cart.length}
				backgroundColor={colors.surface}
				size={40}
				accessibilityLabel="View Cart"
			/>
			<HeaderRefreshButton onRefresh={refreshData} isRefreshing={refreshing} size={20} style={[styles.refreshButtonSmall, { backgroundColor: colors.surface }]} />
		</View>
	)

	return (
		<View style={styles.container}>
			<Tabs.Screen
				options={{
					headerTitle: () => <HeaderTitle title={translate('feed', 'Feed')} subtitle={`${translate('hello', 'Hello')}, ${user?.slug || 'Guest'}`} />,
					headerLeft: () => null,
					headerRight: () => headerRightActions
				}}
			/>

			<Animated.FlatList
				key={numColumns}
				data={displayedItems}
				renderItem={renderItem}
				numColumns={numColumns}
				columnWrapperStyle={numColumns > 1 ? { gap, paddingHorizontal: padding, alignItems: 'stretch' } : undefined}
				keyExtractor={(item) => item.slug || item._id}
				contentContainerStyle={[styles.list, numColumns === 1 && { paddingHorizontal: padding }]}
				ListEmptyComponent={!loading ? renderEmpty : null}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshData} colors={[colors.primary]} tintColor={colors.primary} />}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				onScroll={onScroll}
				scrollEventThrottle={16}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.5}
				ListFooterComponent={renderFooter}
			/>

			{loading && (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			)}

			<ScannerModal visible={isScannerVisible} onClose={() => setIsScannerVisible(false)} />
		</View>
	)
}
