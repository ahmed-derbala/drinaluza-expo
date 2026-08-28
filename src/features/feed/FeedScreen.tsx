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
import { VisibleIdsContext, ActiveVideoIdContext, SetActiveVideoIdContext, FocusedIdContext, SetFocusedIdContext } from '@/features/feed/FeedVisibleContext'
import { performVideoCacheStartupCleanup } from '@/core/cache'

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

			// Batch state updates to prevent multiple re-renders
			let newFocusedId: string | null = null
			let newActiveVideoId: string | null = null

			// In-focus card is the first viewable item
			if (viewable.length > 0) {
				newFocusedId = getItemId(viewable[0].item)
				// Only the most visible video card gets video playback
				const firstVisibleWithMedia = viewable.find((v) => v.isViewable && hasVideoMedia(v.item))
				if (firstVisibleWithMedia) {
					newActiveVideoId = getItemId(firstVisibleWithMedia.item)
				}
			}

			// Check if previously active video is still visible
			if (ids.length > 0 && activeVideoId) {
				const stillVisible = viewable.some((v) => getItemId(v.item) === activeVideoId)
				if (!stillVisible && newActiveVideoId === null) {
					newActiveVideoId = null
				}
			}

			// Batch update all states at once
			setVisibleIds(new Set(ids))
			setFocusedId(newFocusedId)
			setActiveVideoId(newActiveVideoId)
		},
		[activeVideoId, hasVideoMedia, getItemId]
	)
	const viewabilityConfig = useMemo(() => ({ viewAreaCoveragePercentThreshold: 60, minimumViewTime: 300 }), [])

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
		if (products.length > 0) {
			// Mark first 3 items as visible by default so their videos autoplay without waiting for onViewableItemsChanged
			setVisibleIds(new Set(products.slice(0, 3).map((p) => p._id || (p as any).slug)))
			setFocusedId(products[0]?._id || (products[0] as any)?.slug || null)
			const firstWithVideo = products.slice(0, 3).find((p: any) => {
				const m = p.media
				return (
					m?.thumbnail?.resource_type === 'video' ||
					m?.thumbnail?.mimetype?.startsWith('video/') ||
					(Array.isArray(m?.gallery) && m.gallery.some((f: any) => f.resource_type === 'video' || f.mimetype?.startsWith('video/')))
				)
			})
			if (firstWithVideo) setActiveVideoId((firstWithVideo as any)._id || (firstWithVideo as any).slug)
			enrichFeedContacts(products, (enriched) => {
				setFeedItems(enriched)
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
		performVideoCacheStartupCleanup().catch(() => {})
	}, [])

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
						<SetActiveVideoIdContext.Provider value={setActiveVideoId}>
							<FocusedIdContext.Provider value={focusedId}>
								<SetFocusedIdContext.Provider value={setFocusedId}>
									<SmartHeader.FlashList
										ref={listRef}
										style={{ backgroundColor: 'transparent' }}
										data={feedItems}
										renderItem={renderItem}
										numColumns={numColumns}
										estimatedItemSize={380}
										removeClippedSubviews={false}
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
