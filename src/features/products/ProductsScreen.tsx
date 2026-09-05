import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { View, StyleSheet, RefreshControl, Platform, AppState } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { getItem, setItem, getToken } from '@storage'
import { useProducts } from '@products/useProducts'
import { getProducts } from '@products/products.api'
import { ProductFeedItem } from '@feed/feed.interface'
import ProductCard from '@products/ProductCard'
import { Stack } from 'expo-router'
import { HeaderRefreshButton, SmartHeader } from '@smart-header'
import ErrorBlock from '@error/ErrorBlock'
import EmptyState from '@ui/states/EmptyState'
import Spinner from '@ui/spinner/Spinner'
import { useUser } from '@contexts/UserContext'
import { useTheme, themeColors } from '@theme'
import { toast } from '@ui/toast/Toast'
import { useResponsiveGrid } from '@hooks/useResponsiveGrid'
import { FeedFocusContext } from '@feed/FeedVisibleContext'

export default function ProductsScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const { translate, user } = useUser()
	const { data: page1Response, isInitialLoading, isRefreshing, isOffline, refresh } = useProducts()
	const page1Products = (page1Response?.data?.docs ?? []) as unknown as ProductFeedItem[]
	const [extraProducts, setExtraProducts] = useState<ProductFeedItem[]>([])
	const products = useMemo(() => [...page1Products, ...extraProducts], [page1Products, extraProducts])
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [isLoadingMore, setIsLoadingMore] = useState(false)
	const [cart, setCart] = useState<any[]>([])
	const { numColumns, gap, padding } = useResponsiveGrid()

	// ── Focus / auto-play — always one focused card only, only focused auto-plays/advances (like FeedScreen)
	const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set())
	const [activeVideoId, setActiveVideoId] = useState<string | null>(null)
	const [focusedId, setFocusedId] = useState<string | null>(null)
	const hasUserInteractedRef = useRef(false)
	const productsRef = useRef<ProductFeedItem[]>([])
	const focusedIdRef = useRef<string | null>(null)
	useEffect(() => {
		productsRef.current = products
	}, [products])
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
	const hasVideoMedia = useCallback((item: ProductFeedItem): boolean => {
		const m: any = (item as any).media
		return (
			m?.thumbnail?.resource_type === 'video' ||
			m?.thumbnail?.mimetype?.startsWith('video/') ||
			(Array.isArray(m?.gallery) && m.gallery.some((f: any) => f.resource_type === 'video' || f.mimetype?.startsWith('video/')))
		)
	}, [])
	const getItemId = useCallback((item: ProductFeedItem): string => item._id || (item as any).slug, [])
	const onViewableItemsChanged = useCallback(
		({ viewableItems }: { viewableItems: Array<{ item: ProductFeedItem; isViewable: boolean }> }) => {
			const viewable = viewableItems.filter((v) => v.isViewable)
			const ids = viewable.map((v) => getItemId(v.item))
			setVisibleIds(new Set(ids))
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
	const handleListScroll = useCallback(() => {
		markUserInteracted()
	}, [markUserInteracted])

	// Reset appended pages whenever the cached page 1 refreshes
	useEffect(() => {
		setExtraProducts([])
		setPage(1)
		setHasMore(true)
	}, [page1Response])

	// Always have one focused card — first product on load
	useEffect(() => {
		if (products.length > 0) {
			setVisibleIds(new Set(products.slice(0, 3).map((p) => p._id || (p as any).slug)))
			const firstId = products[0]?._id || (products[0] as any)?.slug || null
			if (firstId && !hasUserInteractedRef.current) {
				setFocusedId(firstId)
				if (hasVideoMedia(products[0] as any)) setActiveVideoId(firstId)
				else setActiveVideoId(null)
			}
		}
	}, [products, hasVideoMedia])

	const loadCart = async () => {
		try {
			const saved = await getItem<any[]>('cart')
			if (saved) setCart(saved)
		} catch {}
	}
	useFocusEffect(
		useCallback(() => {
			loadCart()
			const items = productsRef.current
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
				setFocusedId(null)
				setActiveVideoId(null)
				setVisibleIds(new Set())
				hasUserInteractedRef.current = false
			}
		}, [hasVideoMedia])
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

	const loadMoreProducts = async (nextPage: number) => {
		try {
			setIsLoadingMore(true)
			const response = await getProducts(nextPage, 10)
			const newItems = response.data.docs as unknown as ProductFeedItem[]
			if (newItems.length < 10) setHasMore(false)
			else setHasMore(true)
			setExtraProducts((prev) => [...prev, ...newItems])
		} catch (err) {
			toast.show({ title: 'Error', content: 'Failed to load more products', borderColor: themeColors.error })
		} finally {
			setIsLoadingMore(false)
		}
	}
	const handleRefresh = useCallback(async () => {
		setPage(1)
		setHasMore(true)
		hasUserInteractedRef.current = false
		await loadCart()
		await refresh()
	}, [refresh])
	const handleLoadMore = () => {
		if (hasMore && !isInitialLoading && !isLoadingMore && !isRefreshing) {
			const next = page + 1
			setPage(next)
			loadMoreProducts(next)
		}
	}
	const handleAddToCart = useCallback(
		async (item: ProductFeedItem, qty: number) => {
			try {
				const token = await getToken()
				if (!token) {
					toast.show({ title: 'Info', content: 'Please log in to add items to cart', borderColor: themeColors.info })
					router.push('/auth' as any)
					return
				}
				let snapshot: any[] = []
				setCart((prev: any[]) => {
					const existing = prev.findIndex((b) => b._id === item._id)
					const next = existing > -1 ? prev.map((b, i) => (i === existing ? { ...b, quantity: b.quantity + qty } : b)) : [...prev, { ...item, quantity: qty }]
					snapshot = next
					return next
				})
				setTimeout(async () => {
					if (snapshot.length) await setItem('cart', snapshot)
				}, 0)
				toast.show({ title: 'Success', content: `Added to cart`, borderColor: themeColors.success, screen: user ? '/purchases?status=cart' : '/auth' })
			} catch {
				toast.show({ title: 'Error', content: 'Failed to add to cart', borderColor: themeColors.error })
			}
		},
		[router, user]
	)
	const renderItem = useCallback(
		({ item }: { item: ProductFeedItem }) => (
			<View style={{ width: '100%', paddingHorizontal: numColumns > 1 ? gap / 2 : 0, marginBottom: gap }}>
				<ProductCard item={item} addToCart={handleAddToCart} />
			</View>
		),
		[numColumns, handleAddToCart, gap]
	)
	const headerActions = useMemo(() => {
		return [<HeaderRefreshButton key="refresh" onRefresh={handleRefresh} isRefreshing={isRefreshing} />]
	}, [handleRefresh, isRefreshing])
	const renderEmpty = useCallback(() => {
		if (isInitialLoading) return null
		if (isOffline) {
			return (
				<View style={styles.emptyContainer}>
					<ErrorBlock />
				</View>
			)
		}
		return (
			<View style={styles.emptyContainer}>
				<EmptyState />
			</View>
		)
	}, [isInitialLoading, isOffline])
	const renderFooter = useCallback(() => {
		if (isLoadingMore) return <Spinner size="small" expand={false} />
		return <View style={{ height: 20 }} />
	}, [isLoadingMore])

	const focusContextValue = useMemo(
		() => ({
			focusedId,
			activeVideoId,
			visibleIds,
			setFocusedId: handleSetFocusedId,
			setActiveVideoId: handleSetActiveVideoId
		}),
		[focusedId, activeVideoId, visibleIds, handleSetFocusedId, handleSetActiveVideoId]
	)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: translate('products', 'Products'),
						headerActions: headerActions
					} as any
				}
			/>
			<FeedFocusContext.Provider value={focusContextValue}>
				<SmartHeader.FlashList
					ref={listRef}
					data={products}
					key={numColumns}
					numColumns={numColumns}
					keyExtractor={(item: ProductFeedItem) => item._id}
					renderItem={renderItem}
					estimatedItemSize={380}
					contentContainerStyle={{ paddingHorizontal: numColumns > 1 ? padding - gap / 2 : padding, paddingTop: padding, paddingBottom: 100 }}
					showsVerticalScrollIndicator={false}
					refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.5}
					onViewableItemsChanged={onViewableItemsChanged}
					viewabilityConfig={viewabilityConfig}
					onScroll={handleListScroll}
					scrollEventThrottle={16}
					ListEmptyComponent={renderEmpty}
					ListFooterComponent={renderFooter}
				/>
			</FeedFocusContext.Provider>
			{isInitialLoading && !isRefreshing && products.length === 0 && <Spinner style={styles.loadingOverlay} />}
		</View>
	)
}
const styles = StyleSheet.create({
	container: { flex: 1 },
	emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 120 },
	loadingOverlay: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', zIndex: 10 }
})
