import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, StyleSheet, RefreshControl, Platform, AppState } from 'react-native'
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
import { VisibleIdsContext, ActiveVideoIdContext, SetActiveVideoIdContext, FocusedIdContext, SetFocusedIdContext } from '@/features/feed/FeedVisibleContext'
import { markFeedReady } from '@/core/helpers/defer'
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
	// ── Viewability — only the in-focus card auto-advances (and only one video plays) to save CPU/battery
	const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
	const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
	const [focusedId, setFocusedId] = useState<string | null>(null)
	// Do not switch focused card before user interaction (scroll / tap / hover)
	const hasUserInteractedRef = useRef(false)
	const feedItemsRef = useRef<FeedItem[]>([])
	const focusedIdRef = useRef<string | null>(null)
	useEffect(() => {
		feedItemsRef.current = feedItems
	}, [feedItems])
	useEffect(() => {
		focusedIdRef.current = focusedId
	}, [focusedId])
	const markUserInteracted = useCallback(() => {
		hasUserInteractedRef.current = true
	}, [])
	const handleSetFocusedId = useCallback(
		(id: string | null) => {
			if (id !== null) markUserInteracted()
			setFocusedId(id)
		},
		[markUserInteracted]
	)
	const handleSetActiveVideoId = useCallback(
		(id: string | null) => {
			if (id !== null) markUserInteracted()
			setActiveVideoId(id)
		},
		[markUserInteracted]
	)
	// Helper function to check if item has video media - memoized to avoid recreation
	const hasVideoMedia = useCallback((item: FeedItem): boolean => {
		const m: any = item.media
		return (
			m?.thumbnail?.resource_type === 'video' ||
			m?.thumbnail?.mimetype?.startsWith('video/') ||
			(Array.isArray(m?.gallery) && m.gallery.some((f: any) => f.resource_type === 'video' || f.mimetype?.startsWith('video/')))
		)
	}, [])
	// Helper function to get item ID - memoized to avoid recreation
	const getItemId = useCallback((item: FeedItem): string => item._id || (item as any).slug, [])
	const onViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: Array<{ item: FeedItem; isViewable: boolean }> }) => {
			const viewable = viewableItems.filter((v) => v.isViewable)
			const ids = viewable.map((v) => getItemId(v.item))
			// Visible ids can update without interaction (for isVisible mounting),
			// but focused/active must not switch before user has scrolled/tapped.
			setVisibleIds(new Set(ids))
			if (!hasUserInteractedRef.current) return
			// Only the focused card should auto-play / auto-advance.
			// When a card loses focus, its carousel must stop and its video must pause
			// (handled by autoPlay:false → safePause in SmartVideoPlayer).
			let newFocusedId: string | null = null
			let newActiveVideoId: string | null = null
			if (viewable.length > 0) {
				const focusedItem = viewable[0].item
				newFocusedId = getItemId(focusedItem)
				if (hasVideoMedia(focusedItem)) {
					newActiveVideoId = newFocusedId
				}
			}
			setFocusedId(newFocusedId)
			setActiveVideoId(newActiveVideoId)
		},
		[hasVideoMedia, getItemId]
	)
	const viewabilityConfig = useMemo(() => ({ viewAreaCoveragePercentThreshold: 60, minimumViewTime: 300 }), [])
	// ── Scroll position restoration (especially for web where the screen remounts) ──
	const listRef = useRef<any>(null)
	const savedScrollOffsetRef = useRef(0)
	const handleListScroll = useCallback(
		(event: any) => {
			markUserInteracted()
			const offset = event.nativeEvent?.contentOffset?.y || 0
			savedScrollOffsetRef.current = offset
			savedScrollOffsets.set(selectedFilter, offset)
		},
		[selectedFilter, markUserInteracted]
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
		if (products.length > 0) {
			// Always have a focused card on open (first card), but do not switch before user interaction
			setVisibleIds(new Set(products.slice(0, 3).map((p) => p._id || (p as any).slug)))
			const firstId = products[0]?._id || (products[0] as any)?.slug || null
			setFocusedId(firstId)
			if (firstId && hasVideoMedia(products[0] as any)) {
				setActiveVideoId(firstId)
			} else {
				setActiveVideoId(null)
			}
			enrichFeedContacts(products, (enriched) => {
				setFeedItems(enriched)
			})
		}
	}, [feedItemsFromCache, isProductCard, hasVideoMedia])
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
					})
					return updated
				})
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
		// Signal that the feed's cache read has finished and the list (or
		// empty state) has painted. All startup work gated on this via
		// `deferAfterFeedReady`/`deferStartup` will now be released.
		if (!isInitialLoading) {
			markFeedReady()
		}
	}, [isInitialLoading])
	useEffect(() => {
		savedScrollOffsetRef.current = savedScrollOffsets.get(selectedFilter) || 0
		hasUserInteractedRef.current = false
		setFocusedId(null)
		setActiveVideoId(null)
		loadCart()
		setPage(1)
		setHasMore(true)
	}, [selectedFilter])
	useFocusEffect(
		useCallback(() => {
			loadCart()
			setRestorePending(true)
			// On focus, ensure a focused card exists (first card) without marking interaction
			const items = feedItemsRef.current
			const currentFocused = focusedIdRef.current
			if (items.length > 0) {
				const firstId = items[0]?._id || (items[0] as any)?.slug || null
				if (firstId && !currentFocused) {
					setFocusedId(firstId)
					if (hasVideoMedia(items[0] as any)) setActiveVideoId(firstId)
					setVisibleIds(new Set(items.slice(0, 3).map((p) => p._id || (p as any).slug)))
				}
			}
			return () => {
				// Screen blurred (navigated to other tab/screen) — pause all feed videos immediately
				// This unmounts SmartVideoPlayer (isVisible=false) and triggers safePause + delayed release
				setFocusedId(null)
				setActiveVideoId(null)
				setVisibleIds(new Set())
				hasUserInteractedRef.current = false
			}
		}, [])
	)
	useEffect(() => {
		const sub = AppState.addEventListener('change', (next) => {
			if (next !== 'active') {
				setFocusedId(null)
				setActiveVideoId(null)
				setVisibleIds(new Set())
				hasUserInteractedRef.current = false
			}
		})
		return () => sub.remove()
	}, [])

	useEffect(() => {
		if (!isInitialLoading && feedItems.length > 0 && restorePending) {
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
	}, [isInitialLoading, feedItems.length, selectedFilter, restorePending])
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
		if (isOffline && feedItems.length === 0) {
			return <ErrorBlock />
		}
		return <EmptyState style={styles.emptyWrap} />
	}, [isOffline, feedItems.length])
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
			{isInitialLoading || (isRefreshing && feedItems.length === 0) ? (
				<Spinner />
			) : (
				<VisibleIdsContext.Provider value={visibleIds}>
					<ActiveVideoIdContext.Provider value={activeVideoId}>
						<SetActiveVideoIdContext.Provider value={handleSetActiveVideoId}>
							<FocusedIdContext.Provider value={focusedId}>
								<SetFocusedIdContext.Provider value={handleSetFocusedId}>
									<SmartHeader.FlashList
										ref={listRef}
										style={{ backgroundColor: 'transparent' }}
										data={feedItems}
										renderItem={renderItem}
										numColumns={numColumns}
										estimatedItemSize={380}
										removeClippedSubviews={true}
										keyExtractor={(item: FeedItem) => item.slug || item._id}
										contentContainerStyle={[
											styles.listContent,
											{ paddingHorizontal: padding, paddingBottom: 120 + insets.bottom },
											feedItems.length === 0 && { flexGrow: 1, justifyContent: 'center' }
										]}
										ListEmptyComponent={renderEmpty}
										refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refreshData} colors={['#0EA5E9']} tintColor="#0EA5E9" />}
										showsVerticalScrollIndicator={false}
										keyboardShouldPersistTaps="handled"
										onScroll={handleListScroll}
										onEndReached={handleLoadMore}
										onEndReachedThreshold={0.2}
										onViewableItemsChanged={onViewableItemsChanged}
										viewabilityConfig={viewabilityConfig}
										ListFooterComponent={isLoadingMore ? <Spinner size="small" expand={false} /> : null}
									/>
								</SetFocusedIdContext.Provider>
							</FocusedIdContext.Provider>
						</SetActiveVideoIdContext.Provider>
					</ActiveVideoIdContext.Provider>
				</VisibleIdsContext.Provider>
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
