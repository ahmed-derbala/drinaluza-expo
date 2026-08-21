import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, StyleSheet, RefreshControl, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getItem, setItem } from '@/core/storage'
import { useRouter, Tabs, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { getFeed } from '@/features/feed/feed.api'
import { FeedItem } from '@/features/feed/feed.interface'
import useFeed from '@/features/feed/useFeed'

import FeedProductCard from '@/features/feed/FeedProductCard'
import { enrichFeedContacts } from '@/features/feed/feed.helpers'
import ErrorBlock from '@/core/error/ErrorBlock'
import EmptyState from '@/features/common/EmptyState'
import { toast } from '@/features/common/Toast'
import { logError } from '@/core/error/errorHandler'
import { useUser } from '@/core/contexts'
import { useTheme } from '@/core/theme'
import { useResponsiveGrid } from '@/core/hooks/useResponsiveGrid'
import { getToken } from '@/core/storage'
import Spinner from '@/features/common/Spinner'
import ScannerModal from '@/features/scanner/ScannerModal'
import { log } from '@/core/log'
import { HeaderScannerButton, SmartHeader } from '@/core/smart-header'

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

	// ── Cart ──
	const loadCart = useCallback(async () => {
		try {
			const storedCart = await getItem<CartItem[]>('cart')
			if (storedCart) setCart(storedCart)
		} catch (err) {
			log({ level: 'error', label: 'FeedScreen', message: 'Failed to load cart', error: err })
		}
	}, [])

	const isProductCard = useCallback((item: FeedItem) => (item.card?.kind || 'product').startsWith('product'), [])

	// ── Sync cache-first page 1 items into local state and enrich contacts ──
	useEffect(() => {
		const products = feedItemsFromCache.filter(isProductCard)
		setFeedItems(products)
		setDisplayedItems(products)
		if (products.length > 0) {
			enrichFeedContacts(products, (enriched) => {
				setFeedItems(enriched)
				setDisplayedItems(enriched)
			})
		}
	}, [feedItemsFromCache, isProductCard])

	// ── Load more: append next page from network ──
	const fetchMoreFeed = useCallback(
		async (pageNum: number, filterType: string = selectedFilter) => {
			try {
				setIsLoadingMore(true)
				const apiFilter = filterType === 'all' ? undefined : filterType
				const response = await getFeed(pageNum, 10, apiFilter)
				const newItems = response.data.docs
				const productNewItems = newItems.filter(isProductCard)

				if (response.data.pagination) {
					setHasMore(response.data.pagination.hasNextPage)
				} else {
					setHasMore(newItems.length >= 10)
				}

				setFeedItems((prev) => {
					const updated = [...prev, ...productNewItems]
					enrichFeedContacts(updated, (enriched) => {
						setFeedItems(enriched)
						setDisplayedItems(enriched)
					})
					return updated
				})
				setDisplayedItems((prev) => [...prev, ...productNewItems])
			} catch (err) {
				logError(err, 'fetchMoreFeed')
				// Never clear cached feed because of a network failure.
			} finally {
				setIsLoadingMore(false)
			}
		},
		[selectedFilter, isProductCard]
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
					toast.show({ title: 'Info', content: 'Please log in to add items to cart', borderColor: '#3B82F6' })
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
				toast.show({ title: 'Success', content: `${localize(item.name)} added to cart`, borderColor: '#10B981', screen: user ? '/purchases?status=cart' : '/auth' })
			} catch (err) {
				log({ level: 'error', label: 'FeedScreen', message: 'Failed to add to cart', error: err })
				toast.show({ title: 'Error', content: 'Failed to add to cart', borderColor: '#EF4444' })
			}
		},
		[cart, localize, router]
	)

	// ═══════════════════════════════════════════════════════════════════════════════
	// ── Render helpers ──
	// ═══════════════════════════════════════════════════════════════════════════════

	const renderItem = useCallback(
		({ item }: { item: FeedItem }) => (
			<View style={[styles.cardWrap, { paddingHorizontal: numColumns > 1 ? gap / 2 : 0 }]}>
				<FeedProductCard item={item} addToCart={addToCart} />
			</View>
		),
		[numColumns, addToCart]
	)

	const renderEmpty = useCallback(() => {
		if (isOffline && displayedItems.length === 0) {
			return <ErrorBlock />
		}
		return <EmptyState style={styles.emptyWrap} />
	}, [isOffline, displayedItems.length])

	// ── Header Actions (reusable & zero layout shift) ──
	const headerOptions = useMemo(
		() => ({
			title: translate('feed', 'Feed'),
			showBackButton: false,
			headerActions: [
				...(!isWeb ? [<HeaderScannerButton key="scanner" onPress={() => setIsScannerVisible(true)} />] : []),
				<SmartHeader.SearchButton key="search" />,
				<SmartHeader.CartButton key="cart" />,
				<SmartHeader.RefreshButton key="refresh" onRefresh={refreshData} isRefreshing={isRefreshing} isOffline={isOffline} />
			]
		}),
		[translate, user, isWeb, refreshData, isRefreshing, isOffline]
	)

	// ═══════════════════════════════════════════════════════════════════════════════
	// ── Main render ──
	// ═══════════════════════════════════════════════════════════════════════════════
	return (
		<View style={[styles.root, { backgroundColor: colors.background }]}>
			<Tabs.Screen options={headerOptions as any} />

			{isInitialLoading || (isRefreshing && displayedItems.length === 0) ? (
				<Spinner />
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
					ListFooterComponent={isLoadingMore ? <Spinner size="small" expand={false} /> : null}
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
	}
})
