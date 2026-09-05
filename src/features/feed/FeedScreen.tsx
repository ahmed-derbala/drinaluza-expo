import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, StyleSheet, RefreshControl, AppState, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { isWeb, useIsLandscape } from '@platform'
import { getItem, setItem, getToken } from '@storage'
import { useRouter, Tabs, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { getFeed } from '@feed/feed.api'
import { FeedItem } from '@feed/feed.interface'
import useFeed from '@feed/useFeed'
import FeedProductCard from '@feed/FeedProductCard'
import { enrichFeedContacts } from '@feed/feed.helpers'
import { ErrorBlock, logError } from '@error'
import EmptyState from '@ui/states/EmptyState'
import { toast } from '@ui/toast/Toast'
import { useUser } from '@contexts'
import { useTheme, getResponsiveCardHeight } from '@theme'
import { useResponsiveGrid } from '@hooks/useResponsiveGrid'
import Spinner from '@ui/spinner/Spinner'
import ScannerModal from '@scanner/ScannerModal'
import { log } from '@log'
import { HeaderScannerButton, SmartHeader } from '@smart-header'
import { FeedFocusContext } from '@feed/FeedVisibleContext'
import { markFeedReady } from '@helpers/defer'

const FEED_CARD_HEIGHT = 440
const FEED_CARD_PADDING = 12
const FEED_CARD_GAP = 16
// Landscape guarantees so every card shows all components:
// - cards never narrower than the smallest portrait phone (~300px)
// - cards never shorter than the full content stack (~340px)
const MIN_LANDSCAPE_CARD_WIDTH = 300
const MIN_FULL_CARD_HEIGHT = 340

// ─── Types ────────────────────────────────────────────────────────────────────
type CartItem = FeedItem & { quantity: number }

// Keep scroll offsets alive when the web route unmounts on navigation.
const savedScrollOffsets = new Map<string, number>()

export default function FeedScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const insets = useSafeAreaInsets()
	const { height: windowHeight } = useWindowDimensions()
	const { numColumns: gridColumns, gap, padding, width: screenWidth } = useResponsiveGrid()
	const isLandscape = useIsLandscape()
	// In landscape, cap columns so cards stay wide enough for all rows
	// (specs + stepper side by side). Portrait keeps the grid default.
	const numColumns = useMemo(() => {
		if (!isLandscape) return gridColumns
		let cols = gridColumns
		while (cols > 1 && (screenWidth - padding * 2 - gap * (cols - 1)) / cols < MIN_LANDSCAPE_CARD_WIDTH) cols -= 1
		return cols
	}, [isLandscape, gridColumns, screenWidth, padding, gap])
	const cardHeight = useMemo(() => {
		if (!isLandscape) return FEED_CARD_HEIGHT
		// Floor (not ceiling): the card always fits top block + full body + thumb strip,
		// even if that exceeds the visible viewport — the list scrolls.
		return Math.max(getResponsiveCardHeight(windowHeight, 56 + 52, insets.top, insets.bottom), MIN_FULL_CARD_HEIGHT)
	}, [isLandscape, windowHeight, insets.top, insets.bottom])
	const { filter: queryFilter } = useLocalSearchParams<{ filter?: string }>()
	const selectedFilter = queryFilter || 'all'
	const selectedFilterRef = useRef(selectedFilter)
	useEffect(() => {
		selectedFilterRef.current = selectedFilter
	}, [selectedFilter])

	const [feedItems, setFeedItems] = useState<FeedItem[]>([])
	const [cart, setCart] = useState<CartItem[]>([])
	const [isScannerVisible, setIsScannerVisible] = useState(false)
	const [restorePending, setRestorePending] = useState(false)

	const { items: feedItemsFromCache, isInitialLoading, isRefreshing, isOffline, refresh: refreshFeed } = useFeed({ filter: selectedFilter })
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [isLoadingMore, setIsLoadingMore] = useState(false)

	const { user, localize, translate } = useUser()

	const [focusState, setFocusState] = useState({
		visibleIds: new Set<string>(),
		activeVideoId: null as string | null,
		focusedId: null as string | null
	})
	const hasUserInteractedRef = useRef(false)
	const feedItemsRef = useRef<FeedItem[]>([])
	const focusedIdRef = useRef<string | null>(null)
	const prevVisibleIdsRef = useRef<Set<string>>(new Set())
	useEffect(() => {
		feedItemsRef.current = feedItems
	}, [feedItems])
	useEffect(() => {
		focusedIdRef.current = focusState.focusedId
	}, [focusState.focusedId])

	const markUserInteracted = useCallback(() => {
		hasUserInteractedRef.current = true
	}, [])

	const setFocusedId = useCallback((id: string | null) => {
		if (id !== null) hasUserInteractedRef.current = true
		setFocusState((prev) => ({ ...prev, focusedId: id }))
	}, [])

	const setActiveVideoId = useCallback((id: string | null) => {
		if (id !== null) hasUserInteractedRef.current = true
		setFocusState((prev) => ({ ...prev, activeVideoId: id }))
	}, [])

	const setVisibleIds = useCallback((ids: Set<string>) => {
		setFocusState((prev) => ({ ...prev, visibleIds: ids }))
	}, [])

	const hasVideoMedia = useCallback((item: FeedItem): boolean => {
		const m: any = item.media
		return (
			m?.thumbnail?.resource_type === 'video' ||
			m?.thumbnail?.mimetype?.startsWith('video/') ||
			(Array.isArray(m?.gallery) && m.gallery.some((f: any) => f.resource_type === 'video' || f.mimetype?.startsWith('video/')))
		)
	}, [])

	const getItemId = useCallback((item: FeedItem): string => item._id || (item as any).slug || '', [])

	const onViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: Array<{ item: FeedItem; isViewable: boolean }> }) => {
			const viewable = viewableItems.filter((v) => v.isViewable)
			const ids = viewable.map((v) => getItemId(v.item))
			// Avoid recreating Set if ids are identical to previous — prevents all cards re-rendering via context
			const prev = prevVisibleIdsRef.current
			const sameSize = prev.size === ids.length
			const sameContent = sameSize && ids.every((id) => prev.has(id))
			if (!sameContent) {
				const next = new Set(ids)
				prevVisibleIdsRef.current = next
				setVisibleIds(next)
			}
			if (!hasUserInteractedRef.current) return
			let newFocusedId: string | null = null
			let newActiveVideoId: string | null = null
			if (viewable.length > 0) {
				const focusedItem = viewable[0].item
				newFocusedId = getItemId(focusedItem)
				if (hasVideoMedia(focusedItem)) newActiveVideoId = newFocusedId
			}
			setFocusedId(newFocusedId)
			setActiveVideoId(newActiveVideoId)
		},
		[hasVideoMedia, getItemId]
	)

	const viewabilityConfig = useMemo(() => ({ viewAreaCoveragePercentThreshold: 60, minimumViewTime: 300 }), [])

	const listRef = useRef<any>(null)
	const savedScrollOffsetRef = useRef(0)
	const handleListScroll = useCallback((event: any) => {
		hasUserInteractedRef.current = true
		const offset = event.nativeEvent?.contentOffset?.y ?? 0
		savedScrollOffsetRef.current = offset
		savedScrollOffsets.set(selectedFilterRef.current, offset)
	}, [])

	const loadCart = useCallback(async () => {
		try {
			const storedCart = await getItem<CartItem[]>('cart')
			if (storedCart) setCart(storedCart)
		} catch (err) {
			log({ level: 'error', label: 'FeedScreen', message: 'Failed to load cart', error: err })
		}
	}, [])

	const isProductCard = useCallback((item: FeedItem) => (item.card?.kind || 'product').startsWith('product'), [])

	// Sync cache-first page 1 items into local state and enrich contacts
	useEffect(() => {
		const products = feedItemsFromCache.filter(isProductCard)
		setFeedItems((prev) => {
			// Avoid setting identical array to prevent extra render
			if (prev.length === products.length && prev.every((p, i) => p._id === products[i]._id)) return prev
			return products
		})
		if (products.length > 0) {
			const nextVisible = new Set(products.slice(0, 3).map((p) => p._id || (p as any).slug))
			prevVisibleIdsRef.current = nextVisible
			setVisibleIds(nextVisible)
			const firstId = products[0]?._id || (products[0] as any)?.slug || null
			setFocusedId(firstId)
			setActiveVideoId(firstId && hasVideoMedia(products[0] as any) ? firstId : null)
			enrichFeedContacts(products, (enriched) => {
				setFeedItems((prev) => {
					// Only update if enriched actually changed
					if (prev.length !== enriched.length) return enriched
					const changed = enriched.some((e, i) => e.business?.contact !== prev[i]?.business?.contact)
					return changed ? enriched : prev
				})
			})
		}
	}, [feedItemsFromCache, isProductCard, hasVideoMedia])

	const fetchMoreFeed = useCallback(
		async (pageNum: number, filterType: string = selectedFilter) => {
			try {
				setIsLoadingMore(true)
				const apiFilter = filterType === 'all' ? undefined : filterType
				const response = await getFeed(pageNum, 10, apiFilter)
				const newItems = response.data.docs
				const productNewItems = newItems.filter(isProductCard)
				setHasMore(response.data.pagination ? response.data.pagination.hasNextPage : newItems.length >= 10)
				setFeedItems((prev) => {
					const updated = [...prev, ...productNewItems]
					enrichFeedContacts(updated, (enriched) => {
						setFeedItems((cur) => (cur.length === enriched.length && cur.every((c, i) => c.business?.contact === enriched[i]?.business?.contact) ? cur : enriched))
					})
					return updated
				})
			} catch (err) {
				logError(err, 'fetchMoreFeed')
			} finally {
				setIsLoadingMore(false)
			}
		},
		[selectedFilter, isProductCard]
	)

	useEffect(() => {
		if (!isInitialLoading) markFeedReady()
	}, [isInitialLoading])

	useEffect(() => {
		savedScrollOffsetRef.current = savedScrollOffsets.get(selectedFilter) || 0
		hasUserInteractedRef.current = false
		prevVisibleIdsRef.current = new Set()
		setFocusedId(null)
		setActiveVideoId(null)
		setVisibleIds(new Set())
		loadCart()
		setPage(1)
		setHasMore(true)
	}, [selectedFilter, loadCart])

	useFocusEffect(
		useCallback(() => {
			loadCart()
			setRestorePending(true)
			const items = feedItemsRef.current
			const currentFocused = focusedIdRef.current
			if (items.length > 0 && !currentFocused) {
				const firstId = items[0]?._id || (items[0] as any)?.slug || null
				if (firstId) {
					setFocusedId(firstId)
					if (hasVideoMedia(items[0] as any)) setActiveVideoId(firstId)
					const nextVisible = new Set(items.slice(0, 3).map((p) => p._id || (p as any).slug))
					prevVisibleIdsRef.current = nextVisible
					setVisibleIds(nextVisible)
				}
			}
			return () => {
				setFocusedId(null)
				setActiveVideoId(null)
				setVisibleIds(new Set())
				prevVisibleIdsRef.current = new Set()
				hasUserInteractedRef.current = false
			}
		}, [loadCart, hasVideoMedia])
	)

	useEffect(() => {
		const sub = AppState.addEventListener('change', (next) => {
			if (next !== 'active') {
				setFocusedId(null)
				setActiveVideoId(null)
				setVisibleIds(new Set())
				prevVisibleIdsRef.current = new Set()
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
					if (listRef.current?.scrollToOffset) listRef.current.scrollToOffset({ offset, animated: false })
					if (isWeb && typeof window !== 'undefined') window.scrollTo({ top: offset, behavior: 'auto' })
				})
			}
		}
	}, [isInitialLoading, feedItems.length, selectedFilter, restorePending])

	const refreshData = useCallback(async () => {
		setPage(1)
		setHasMore(true)
		await Promise.all([loadCart(), refreshFeed()])
	}, [refreshFeed, loadCart])

	const handleLoadMore = useCallback(() => {
		if (hasMore && !isInitialLoading && !isRefreshing && !isLoadingMore) {
			setPage((prev) => {
				const nextPage = prev + 1
				fetchMoreFeed(nextPage, selectedFilter)
				return nextPage
			})
		}
	}, [hasMore, isInitialLoading, isRefreshing, isLoadingMore, selectedFilter, fetchMoreFeed])

	// Web: FlashList onEndReached doesn't fire when window scrolls — add window listener
	useEffect(() => {
		if (!isWeb) return
		let ticking = false
		const onWebScroll = () => {
			if (ticking) return
			ticking = true
			requestAnimationFrame(() => {
				ticking = false
				const scrollY = window.scrollY ?? document.documentElement.scrollTop ?? 0
				const viewport = window.innerHeight
				const full = document.documentElement.scrollHeight
				if (full - (scrollY + viewport) < 800) handleLoadMore()
			})
		}
		window.addEventListener('scroll', onWebScroll, { passive: true, capture: true } as any)
		return () => window.removeEventListener('scroll', onWebScroll, { capture: true } as any)
	}, [isWeb, handleLoadMore])

	const addToCart = useCallback(
		async (item: FeedItem, quantity: number) => {
			try {
				const token = await getToken()
				if (!token) {
					toast.show({ title: 'Info', content: 'Please log in to add items to cart', borderColor: '#3B82F6' })
					router.push('/auth')
					return
				}
				// Use functional update to avoid cart dep and stale closure
				let newCartSnapshot: CartItem[] = []
				setCart((prev) => {
					const idx = prev.findIndex((c) => c._id === item._id)
					let next: CartItem[]
					if (idx > -1) {
						next = [...prev]
						next[idx] = { ...next[idx], quantity: (next[idx].quantity || 0) + quantity }
					} else {
						next = [...prev, { ...item, quantity }]
					}
					newCartSnapshot = next
					return next
				})
				// Defer storage write to next tick to avoid blocking UI
				setTimeout(async () => {
					try {
						// Use snapshot if available, otherwise read from state
						const toStore = newCartSnapshot.length ? newCartSnapshot : cart
						await setItem('cart', toStore)
					} catch {}
				}, 0)
				toast.show({ title: 'Success', content: `${localize(item.name)} added to cart`, borderColor: '#10B981', screen: user ? '/purchases?status=cart' : '/auth' })
			} catch (err) {
				log({ level: 'error', label: 'FeedScreen', message: 'Failed to add to cart', error: err })
				toast.show({ title: 'Error', content: 'Failed to add to cart', borderColor: '#EF4444' })
			}
		},
		[localize, router, user]
	)

	const renderItem = useCallback(
		({ item }: { item: FeedItem }) => (
			<View style={[styles.cardWrap, { height: cardHeight, paddingHorizontal: numColumns > 1 ? gap / 2 : 0 }]}>
				<FeedProductCard item={item} addToCart={addToCart} />
			</View>
		),
		[numColumns, gap, cardHeight, addToCart]
	)

	const renderEmpty = useCallback(() => {
		if (isOffline && feedItems.length === 0) return <ErrorBlock />
		return <EmptyState style={styles.emptyWrap} />
	}, [isOffline, feedItems.length])

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
		[translate, isWeb, refreshData, isRefreshing, isOffline]
	)

	const focusContextValue = useMemo(
		() => ({
			focusedId: focusState.focusedId,
			activeVideoId: focusState.activeVideoId,
			visibleIds: focusState.visibleIds,
			setFocusedId,
			setActiveVideoId
		}),
		[focusState.focusedId, focusState.activeVideoId, focusState.visibleIds, setFocusedId, setActiveVideoId]
	)

	return (
		<View style={[styles.root, { backgroundColor: colors.background }]}>
			<Tabs.Screen options={headerOptions as any} />
			{isInitialLoading && feedItems.length === 0 ? (
				<Spinner />
			) : (
				<FeedFocusContext.Provider value={focusContextValue}>
					<SmartHeader.FlashList
						ref={listRef}
						style={{ backgroundColor: 'transparent' }}
						data={feedItems}
						renderItem={renderItem}
						numColumns={numColumns}
						estimatedItemSize={cardHeight + FEED_CARD_GAP}
						removeClippedSubviews
						keyExtractor={(item: FeedItem) => (item as any)._id || (item as any).slug}
						contentContainerStyle={[styles.listContent, { paddingHorizontal: padding, paddingBottom: 120 + insets.bottom }, feedItems.length === 0 && { flexGrow: 1, justifyContent: 'center' }]}
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
				</FeedFocusContext.Provider>
			)}
			<ScannerModal visible={isScannerVisible} onClose={() => setIsScannerVisible(false)} />
		</View>
	)
}
const styles = StyleSheet.create({
	root: { flex: 1 },
	listContent: { paddingTop: FEED_CARD_PADDING, paddingBottom: 120 },
	cardWrap: { width: '100%', marginBottom: FEED_CARD_GAP },
	emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 120, paddingHorizontal: 40 }
})
