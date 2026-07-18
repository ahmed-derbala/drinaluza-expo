import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, Animated, Platform, Easing } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getItem, setItem } from '@/core/storage'
import { useRouter, Tabs, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { getFeed } from '@/features/feed/feed.api'
import { FeedItem } from '@/features/feed/feed.interface'
import useFeed from '@/features/feed/useFeed'

import FeedCard from '@/features/feed/feed.card'
import { enrichFeedContacts } from '@/features/feed/feed.helpers'
import { Ionicons } from '@expo/vector-icons'
import ErrorState from '@/features/common/ErrorState'
import { toast } from '@/features/common/Toast'
import { logError } from '@/core/helpers/errorHandler'
import { useUser } from '@/core/contexts'
import { useTheme } from '@/core/theme'
import { useResponsiveGrid } from '@/core/hooks/useResponsiveGrid'
import { getToken } from '@/core/storage'
import ScannerModal from '@/features/scanner/ScannerModal'
import { log } from '@/core/log'
import { SmartHeader } from '@/core/smart-header'

// ─── Component ──────────────────────────────────────────────────────────────────
type CartItem = FeedItem & { quantity: number }

// Keep scroll offsets alive when the web route unmounts on navigation.
const savedScrollOffsets = new Map<string, number>()

export default function FeedScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const insets = useSafeAreaInsets()

	// ── Layout ──
	const { numColumns, gap, padding, itemWidth } = useResponsiveGrid()

	// ── Routing / Pagination ──
	const isWeb = Platform.OS === 'web'
	const { filter: queryFilter } = useLocalSearchParams<{ filter?: string }>()
	const selectedFilter = queryFilter || 'all'

	// ── Data state ──
	const [feedItems, setFeedItems] = useState<FeedItem[]>([])
	const [displayedItems, setDisplayedItems] = useState<FeedItem[]>([])
	const [cart, setCart] = useState<CartItem[]>([])
	const [isScannerVisible, setIsScannerVisible] = useState(false)
	const [restorePending, setRestorePending] = useState(false)

	// ── Cache-first feed ──
	const { items: feedItemsFromCache, isInitialLoading, isRefreshing, isOffline, refresh: refreshFeed } = useFeed({ filter: selectedFilter })

	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [isLoadingMore, setIsLoadingMore] = useState(false)

	// ── Context ──
	const { user, localize, translate } = useUser()

	// ── Skeleton pulse ──
	const shimmerAnim = useRef(new Animated.Value(0.35)).current

	// ── Scroll position restoration (especially for web where the screen remounts) ──
	const listRef = useRef<any>(null)
	const savedScrollOffsetRef = useRef(0)

	const handleListScroll = useCallback(
		(event: any) => {
			const offset = event.nativeEvent?.contentOffset?.y || 0
			savedScrollOffsetRef.current = offset
			savedScrollOffsets.set(selectedFilter, offset)
		},
		[selectedFilter]
	)

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

	// ── Sync cache-first page 1 items into local state and enrich contacts ──
	useEffect(() => {
		setFeedItems(feedItemsFromCache)
		setDisplayedItems(feedItemsFromCache)
		if (feedItemsFromCache.length > 0) {
			enrichFeedContacts(feedItemsFromCache, (enriched) => {
				setFeedItems(enriched)
				setDisplayedItems(enriched)
			})
		}
	}, [feedItemsFromCache])

	// ── Load more: append next page from network ──
	const fetchMoreFeed = useCallback(
		async (pageNum: number, filterType: string = selectedFilter) => {
			try {
				setIsLoadingMore(true)
				const apiFilter = filterType === 'all' ? undefined : filterType
				const response = await getFeed(pageNum, 10, apiFilter)
				const newItems = response.data.docs

				if (response.data.pagination) {
					setHasMore(response.data.pagination.hasNextPage)
				} else {
					setHasMore(newItems.length >= 10)
				}

				setFeedItems((prev) => {
					const updated = [...prev, ...newItems]
					enrichFeedContacts(updated, (enriched) => {
						setFeedItems(enriched)
						setDisplayedItems(enriched)
					})
					return updated
				})
				setDisplayedItems((prev) => [...prev, ...newItems])
			} catch (err) {
				logError(err, 'fetchMoreFeed')
				// Never clear cached feed because of a network failure.
			} finally {
				setIsLoadingMore(false)
			}
		},
		[selectedFilter]
	)

	// ── Effects ──
	useEffect(() => {
		savedScrollOffsetRef.current = savedScrollOffsets.get(selectedFilter) || 0
		loadCart()
		setPage(1)
		setHasMore(true)
	}, [selectedFilter])

	useFocusEffect(
		useCallback(() => {
			loadCart()
			setRestorePending(true)
		}, [])
	)

	useEffect(() => {
		if (!isInitialLoading && displayedItems.length > 0 && restorePending) {
			setRestorePending(false)
			const offset = savedScrollOffsets.get(selectedFilter) || 0
			if (offset > 0) {
				requestAnimationFrame(() => {
					if (listRef.current?.scrollToOffset) {
						listRef.current.scrollToOffset({ offset, animated: false })
					}
					if (Platform.OS === 'web' && typeof window !== 'undefined') {
						window.scrollTo({ top: offset, behavior: 'auto' })
					}
				})
			}
		}
	}, [isInitialLoading, displayedItems.length, selectedFilter, restorePending])

	// ── Refresh ──
	const refreshData = useCallback(async () => {
		setPage(1)
		setHasMore(true)
		await Promise.all([loadCart(), refreshFeed()])
	}, [refreshFeed])

	// ── Infinite scroll ──
	const handleLoadMore = useCallback(() => {
		if (hasMore && !isInitialLoading && !isRefreshing && !isLoadingMore) {
			const nextPage = page + 1
			setPage(nextPage)
			fetchMoreFeed(nextPage, selectedFilter)
		}
	}, [hasMore, isInitialLoading, isRefreshing, isLoadingMore, page, selectedFilter, fetchMoreFeed])

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
		if (isOffline && displayedItems.length === 0) {
			return (
				<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
					<ErrorState icon="cloud-offline-outline" iconOnly={true} />
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
	}, [isOffline, displayedItems.length, translate])

	// ── Header Actions (reusable & zero layout shift) ──
	const headerOptions = useMemo(
		() => ({
			title: translate('feed', 'Feed'),
			subtitle: `${translate('hello', 'Hello')}, ${user?.slug || 'Guest'}`,
			showBackButton: false,
			isLoading: isInitialLoading,
			headerActions: [
				...(!isWeb ? [<SmartHeader.ActionButton key="scanner" iconName="qr-code-scanner" iconType="material" onPress={() => setIsScannerVisible(true)} accessibilityLabel="Scan Barcode" />] : []),
				<SmartHeader.SearchButton key="search" />,
				<SmartHeader.CartButton key="cart" badgeCount={cart.length} />,
				<SmartHeader.RefreshButton key="refresh" onRefresh={refreshData} isRefreshing={isRefreshing} isOffline={isOffline} />
			]
		}),
		[translate, user, isInitialLoading, isWeb, cart.length, refreshData, isRefreshing, isOffline]
	)

	// ═══════════════════════════════════════════════════════════════════════════════
	// ── Main render ──
	// ═══════════════════════════════════════════════════════════════════════════════
	return (
		<View style={[styles.root, { backgroundColor: colors.background }]}>
			<Tabs.Screen options={headerOptions as any} />

			{isInitialLoading ? (
				renderSkeletons()
			) : (
				<SmartHeader.FlashList
					ref={listRef}
					style={{ backgroundColor: 'transparent' }}
					data={displayedItems}
					renderItem={renderItem}
					numColumns={numColumns}
					estimatedItemSize={260}
					keyExtractor={(item: FeedItem) => item.slug || item._id}
					contentContainerStyle={[styles.listContent, { paddingHorizontal: padding, paddingBottom: 120 + insets.bottom }, displayedItems.length === 0 && { flexGrow: 1, justifyContent: 'center' }]}
					ListEmptyComponent={renderEmpty}
					refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} colors={['#0EA5E9']} tintColor="#0EA5E9" />}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					onScroll={handleListScroll}
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
	}
})
