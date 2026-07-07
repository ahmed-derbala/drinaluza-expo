import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator, Animated, useWindowDimensions, Platform, ScrollView, Easing } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getItem, setItem } from '@/core/storage'
import { FlashList } from '@shopify/flash-list'
import { useRouter, Tabs, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { getFeed } from '@/features/feed/feed.api'
import { FeedItem } from '@/features/feed/feed.interface'

import FeedCard from '@/features/feed/feed.card'
import { enrichFeedContacts } from '@/features/feed/feed.helpers'
import { Ionicons } from '@expo/vector-icons'
import ErrorState from '@/features/common/ErrorState'
import { toast } from '@/features/common/Toast'
import { parseError, logError } from '@/core/helpers/errorHandler'
import { getGeoCoordinates } from '@/core/helpers/maps'
import { useUser } from '@/core/contexts'
import { useTheme } from '@/core/theme'
import { useResponsiveGrid } from '@/core/hooks/useResponsiveGrid'
import { getToken } from '@/core/storage'
import ScannerModal from '@/features/scanner/ScannerModal'
import { log } from '@/core/log'
import { SmartHeader } from '@/core/smart-header'

// Bypass type issues with FlashList generic components
const TypedFlashList = FlashList as any

// ─── Component ──────────────────────────────────────────────────────────────────
type CartItem = FeedItem & { quantity: number }

export default function FeedScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const insets = useSafeAreaInsets()

	// ── Data state ──
	const [feedItems, setFeedItems] = useState<FeedItem[]>([])
	const [displayedItems, setDisplayedItems] = useState<FeedItem[]>([])
	const [cart, setCart] = useState<CartItem[]>([])
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [isScannerVisible, setIsScannerVisible] = useState(false)

	// ── Layout ──
	const { numColumns, gap, padding, itemWidth } = useResponsiveGrid()

	// ── Routing / Pagination ──
	const isWeb = Platform.OS === 'web'
	const { page: queryPage, filter: queryFilter } = useLocalSearchParams<{ page?: string; filter?: string }>()
	const selectedFilter = queryFilter || 'all'

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
	const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null)

	// ── Context ──
	const { user, localize, translate } = useUser()

	// ── Skeleton pulse ──
	const shimmerAnim = useRef(new Animated.Value(0.35)).current

	useEffect(() => {
		const loop = Animated.loop(
			Animated.sequence([
				Animated.timing(shimmerAnim, { toValue: 0.65, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' }),
				Animated.timing(shimmerAnim, { toValue: 0.35, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: Platform.OS !== 'web' })
			])
		)
		loop.start()
		return () => loop.stop()
	}, [shimmerAnim])

	// ── Cart ──
	const loadCart = useCallback(async () => {
		try {
			const storedCart = await getItem<CartItem[]>('cart')
			if (storedCart) setCart(storedCart)
		} catch (err) {
			log({ level: 'error', label: 'FeedScreen', message: 'Failed to load cart', error: err })
		}
	}, [])

	// ── Feed fetch ──
	const fetchFeed = useCallback(
		async (pageNum: number = 1, shouldAppend: boolean = false, filterType: string = selectedFilter) => {
			try {
				if (pageNum === 1) setLoading(true)
				else setIsLoadingMore(true)

				const apiFilter = filterType === 'all' ? undefined : filterType
				const response = await getFeed(pageNum, 10, apiFilter)
				const newItems = response.data.docs

				if (response.data.pagination) {
					setPagination(response.data.pagination)
					setHasMore(response.data.pagination.hasNextPage)
				} else {
					setHasMore(newItems.length >= 10)
				}

				if (shouldAppend) {
					setFeedItems((prev) => {
						const updated = [...prev, ...newItems]
						enrichFeedContacts(updated, (enriched) => {
							setFeedItems(enriched)
							setDisplayedItems(enriched)
						})
						return updated
					})
					setDisplayedItems((prev) => [...prev, ...newItems])
				} else {
					setFeedItems(newItems)
					setDisplayedItems(newItems)
					enrichFeedContacts(newItems, (enriched) => {
						setFeedItems(enriched)
						setDisplayedItems(enriched)
					})
				}
				setError(null)
			} catch (err) {
				logError(err, 'fetchFeed')
				const errorInfo = parseError(err)
				setError({
					message: errorInfo.message,
					retry: errorInfo.canRetry ? () => fetchFeed(pageNum, shouldAppend, filterType) : undefined
				})
			} finally {
				setLoading(false)
				setIsLoadingMore(false)
			}
		},
		[selectedFilter]
	)

	// ── Effects ──
	useEffect(() => {
		loadCart()
		if (isWeb) {
			fetchFeed(urlPage, false, selectedFilter)
		} else {
			fetchFeed(1, false, selectedFilter)
		}
	}, [urlPage, selectedFilter, isWeb])

	useFocusEffect(
		useCallback(() => {
			loadCart()
		}, [])
	)

	// ── Refresh ──
	const refreshData = useCallback(async () => {
		setRefreshing(true)
		if (isWeb) {
			if (urlPage === 1) {
				await Promise.all([loadCart(), fetchFeed(1, false, selectedFilter)])
			} else {
				router.setParams({ page: '1' })
			}
		} else {
			setMobilePage(1)
			setHasMore(true)
			await Promise.all([loadCart(), fetchFeed(1, false, selectedFilter)])
		}
		setRefreshing(false)
	}, [isWeb, urlPage, selectedFilter])

	// ── Infinite scroll ──
	const handleLoadMore = useCallback(() => {
		if (isWeb) return
		if (hasMore && !loading && !isLoadingMore) {
			const nextPage = mobilePage + 1
			setMobilePage(nextPage)
			fetchFeed(nextPage, true, selectedFilter)
		}
	}, [hasMore, loading, isLoadingMore, mobilePage, isWeb, selectedFilter])

	// ── Add to cart ──
	const addToCart = useCallback(
		async (item: FeedItem, quantity: number) => {
			try {
				const token = await getToken()
				if (!token) {
					toast.show({ title: 'Info', message: 'Please log in to add items to cart', color: '#3B82F6' })
					router.push('/auth')
					return
				}

				const existingIdx = cart.findIndex((c) => c._id === item._id)
				let newCart: CartItem[]

				if (existingIdx > -1) {
					newCart = [...cart]
					newCart[existingIdx] = { ...newCart[existingIdx], quantity: (newCart[existingIdx].quantity || 0) + quantity }
				} else {
					newCart = [...cart, { ...item, quantity }]
				}

				setCart(newCart)
				await setItem('cart', newCart)
				toast.show({ title: 'Success', message: `${localize(item.name)} added to cart`, color: '#10B981', screen: '/purchases?status=cart' })
			} catch (err) {
				log({ level: 'error', label: 'FeedScreen', message: 'Failed to add to cart', error: err })
				toast.show({ title: 'Error', message: 'Failed to add to cart', color: '#EF4444' })
			}
		},
		[cart, localize, router]
	)

	// ── Pagination helpers ──
	const getPageNumbers = useCallback((current: number, total: number) => {
		const pages: (number | string)[] = []
		if (total <= 7) {
			for (let i = 1; i <= total; i++) pages.push(i)
		} else {
			pages.push(1)
			if (current > 3) pages.push('...')
			const start = Math.max(2, current - 1)
			const end = Math.min(total - 1, current + 1)
			for (let i = start; i <= end; i++) pages.push(i)
			if (current < total - 2) pages.push('...')
			pages.push(total)
		}
		return pages
	}, [])

	// ═══════════════════════════════════════════════════════════════════════════════
	// ── Render helpers ──
	// ═══════════════════════════════════════════════════════════════════════════════

	const renderSkeletons = useCallback(() => {
		const count = numColumns * 3
		return (
			<SmartHeader.ScrollView contentContainerStyle={[styles.skeletonWrap, { paddingHorizontal: padding, paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>
				{Array.from({ length: count }).map((_, i) => (
					<View key={`sk-${i}`} style={[styles.skeletonCard, { width: itemWidth, marginHorizontal: gap / 2, marginBottom: 16 }]}>
						<Animated.View style={[styles.skeletonImg, { opacity: shimmerAnim }]} />
						<View style={styles.skeletonBody}>
							<Animated.View style={[styles.skeletonLine, { width: '75%', opacity: shimmerAnim }]} />
							<Animated.View style={[styles.skeletonLine, { width: '50%', opacity: shimmerAnim }]} />
							<Animated.View style={[styles.skeletonLineLg, { opacity: shimmerAnim }]} />
						</View>
					</View>
				))}
			</SmartHeader.ScrollView>
		)
	}, [numColumns, itemWidth, shimmerAnim, padding, insets.bottom])

	const renderItem = useCallback(
		({ item }: { item: FeedItem }) => (
			<View style={[styles.cardWrap, { paddingHorizontal: numColumns > 1 ? gap / 2 : 0 }]}>
				<FeedCard item={item} addToCart={addToCart} />
			</View>
		),
		[numColumns, addToCart]
	)

	const renderEmpty = useCallback(() => {
		if (error) {
			return (
				<View style={{ paddingTop: 80 }}>
					<ErrorState title={error.message} onRetry={refreshData} icon="cloud-offline-outline" />
				</View>
			)
		}
		return (
			<View style={styles.emptyWrap}>
				<View style={styles.emptyIconWrap}>
					<Ionicons name="fish-outline" size={38} color="rgba(255, 255, 255, 0.2)" />
				</View>
				<Text style={styles.emptyTitle}>{translate('no_items', 'No items found')}</Text>
				<Text style={styles.emptySubtitle}>{translate('try_adjusting', 'Try adjusting your search or check back later!')}</Text>
			</View>
		)
	}, [error, refreshData, translate])

	const renderWebPagination = useCallback(() => {
		if (!isWeb || !pagination || pagination.totalPages <= 1) return null
		const { totalPages } = pagination
		const pages = getPageNumbers(activePage, totalPages)

		return (
			<View style={styles.paginationBar}>
				<TouchableOpacity style={[styles.pageBtn, activePage === 1 && styles.pageBtnDisabled]} disabled={activePage === 1} onPress={() => router.setParams({ page: (activePage - 1).toString() })}>
					<Ionicons name="chevron-back" size={16} color={activePage === 1 ? 'rgba(255, 255, 255, 0.2)' : '#0EA5E9'} />
				</TouchableOpacity>

				{pages.map((num, idx) => {
					if (num === '...') {
						return (
							<View key={`dots-${idx}`} style={styles.pageEllipsis}>
								<Text style={styles.pageEllipsisText}>…</Text>
							</View>
						)
					}
					const active = num === activePage
					return (
						<TouchableOpacity key={`p-${num}`} style={[styles.pageBtn, active && styles.pageBtnActive]} onPress={() => router.setParams({ page: num.toString() })}>
							<Text style={[styles.pageBtnText, active && styles.pageBtnTextActive]}>{num}</Text>
						</TouchableOpacity>
					)
				})}

				<TouchableOpacity
					style={[styles.pageBtn, activePage === totalPages && styles.pageBtnDisabled]}
					disabled={activePage === totalPages}
					onPress={() => router.setParams({ page: (activePage + 1).toString() })}
				>
					<Ionicons name="chevron-forward" size={16} color={activePage === totalPages ? 'rgba(255, 255, 255, 0.2)' : '#0EA5E9'} />
				</TouchableOpacity>
			</View>
		)
	}, [isWeb, pagination, activePage, getPageNumbers, router])

	// ── Header Actions (reusable & zero layout shift) ──
	const headerOptions = useMemo(
		() => ({
			title: translate('feed', 'Feed'),
			subtitle: `${translate('hello', 'Hello')}, ${user?.slug || 'Guest'}`,
			showBackButton: false,
			isLoading: loading && displayedItems.length === 0,
			headerActions: [
				...(!isWeb ? [<SmartHeader.ActionButton key="scanner" iconName="qr-code-scanner" iconType="material" onPress={() => setIsScannerVisible(true)} accessibilityLabel="Scan Barcode" />] : []),
				<SmartHeader.SearchButton key="search" />,
				<SmartHeader.CartButton key="cart" badgeCount={cart.length} />,
				<SmartHeader.RefreshButton key="refresh" onRefresh={refreshData} isRefreshing={refreshing} />
			]
		}),
		[translate, user, loading, displayedItems.length, isWeb, cart.length, refreshData, refreshing]
	)

	// ═══════════════════════════════════════════════════════════════════════════════
	// ── Main render ──
	// ═══════════════════════════════════════════════════════════════════════════════
	if (isWeb) {
		return (
			<View style={[styles.root, { backgroundColor: colors.background }]}>
				<Tabs.Screen options={headerOptions as any} />

				{loading && displayedItems.length === 0 ? (
					renderSkeletons()
				) : displayedItems.length === 0 ? (
					renderEmpty()
				) : (
					<SmartHeader.ScrollView
						style={[styles.root, { backgroundColor: colors.background }]}
						contentContainerStyle={[styles.listContent, { paddingHorizontal: padding, paddingBottom: 120 + insets.bottom }]}
						showsVerticalScrollIndicator={false}
						refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshData} colors={['#0EA5E9']} tintColor="#0EA5E9" />}
					>
						<View style={styles.webGridContainer}>
							{displayedItems.map((item) => (
								<View
									key={item.slug || item._id}
									style={[
										styles.webGridItem,
										{
											width: `${100 / numColumns}%`,
											paddingHorizontal: gap / 2,
											marginBottom: 16
										}
									]}
								>
									<FeedCard item={item} addToCart={addToCart} />
								</View>
							))}
						</View>
						{renderWebPagination()}
					</SmartHeader.ScrollView>
				)}
				<ScannerModal visible={isScannerVisible} onClose={() => setIsScannerVisible(false)} />
			</View>
		)
	}

	return (
		<View style={[styles.root, { backgroundColor: colors.background }]}>
			<Tabs.Screen options={headerOptions as any} />

			{loading && displayedItems.length === 0 ? (
				renderSkeletons()
			) : (
				<SmartHeader.FlashList
					style={{ backgroundColor: 'transparent' }}
					data={displayedItems}
					renderItem={renderItem}
					numColumns={numColumns}
					estimatedItemSize={260}
					keyExtractor={(item: FeedItem) => item.slug || item._id}
					contentContainerStyle={[styles.listContent, { paddingHorizontal: padding, paddingBottom: 120 + insets.bottom }]}
					ListEmptyComponent={renderEmpty}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshData} colors={['#0EA5E9']} tintColor="#0EA5E9" />}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.2}
					ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color="#0EA5E9" style={{ paddingVertical: 24 }} /> : null}
				/>
			)}

			<ScannerModal visible={isScannerVisible} onClose={() => setIsScannerVisible(false)} />
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1
	},
	// ── Grid Layouts ──
	listContent: {
		paddingTop: 12,
		paddingBottom: 120
	},
	cardWrap: {
		width: '100%',
		marginBottom: 16
	},
	webGridContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		width: '100%'
	},
	webGridItem: {
		boxSizing: 'border-box'
	} as any,
	// ── Empty state ──
	emptyWrap: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 120,
		paddingHorizontal: 40
	},
	emptyIconWrap: {
		width: 84,
		height: 84,
		borderRadius: 26,
		backgroundColor: 'rgba(255, 255, 255, 0.03)',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.06)',
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 24
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '700',
		color: '#F8FAFC',
		marginBottom: 10,
		letterSpacing: -0.3
	},
	emptySubtitle: {
		fontSize: 14,
		color: 'rgba(255, 255, 255, 0.45)',
		textAlign: 'center',
		lineHeight: 22
	},
	// ── Skeleton ──
	skeletonWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingTop: 12,
		paddingBottom: 120
	},
	skeletonCard: {
		borderRadius: 20,
		backgroundColor: 'rgba(255, 255, 255, 0.02)',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.04)',
		overflow: 'hidden'
	},
	skeletonImg: {
		width: '100%',
		aspectRatio: 1.35,
		backgroundColor: 'rgba(255, 255, 255, 0.03)'
	},
	skeletonBody: {
		padding: 14,
		gap: 12
	},
	skeletonLine: {
		height: 12,
		borderRadius: 6,
		backgroundColor: 'rgba(255, 255, 255, 0.04)'
	},
	skeletonLineLg: {
		height: 18,
		width: '40%',
		borderRadius: 6,
		backgroundColor: 'rgba(255, 255, 255, 0.05)',
		marginTop: 4
	},
	// ── Pagination ──
	paginationBar: {
		flexDirection: 'row',
		justifyContent: 'center',
		alignItems: 'center',
		paddingVertical: 20,
		paddingHorizontal: 16,
		gap: 8,
		marginTop: 10,
		marginBottom: 30
	},
	pageBtn: {
		minWidth: 40,
		height: 40,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: 'rgba(255, 255, 255, 0.03)',
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.06)',
		...Platform.select({
			web: { cursor: 'pointer', transition: 'all 0.15s ease' } as any
		})
	},
	pageBtnActive: {
		backgroundColor: '#0EA5E9',
		borderColor: '#0EA5E9'
	},
	pageBtnDisabled: {
		opacity: 0.3
	},
	pageBtnText: {
		fontSize: 14,
		fontWeight: '700',
		color: 'rgba(255, 255, 255, 0.5)'
	},
	pageBtnTextActive: {
		color: '#ffffff'
	},
	pageEllipsis: {
		paddingHorizontal: 4,
		justifyContent: 'center'
	},
	pageEllipsisText: {
		fontSize: 14,
		fontWeight: '700',
		color: 'rgba(255, 255, 255, 0.25)'
	}
})
