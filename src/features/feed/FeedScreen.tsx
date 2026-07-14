import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator, Animated, Platform, Easing } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getItem, setItem } from '@/core/storage'
import { useRouter, Tabs, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { getFeed } from '@/features/feed/feed.api'
import { FeedItem } from '@/features/feed/feed.interface'

import FeedCard from '@/features/feed/feed.card'
import { enrichFeedContacts } from '@/features/feed/feed.helpers'
import { Ionicons } from '@expo/vector-icons'
import ErrorState from '@/features/common/ErrorState'
import { toast } from '@/features/common/Toast'
import { parseError, logError } from '@/core/helpers/errorHandler'
import { useUser } from '@/core/contexts'
import { useTheme } from '@/core/theme'
import { useResponsiveGrid } from '@/core/hooks/useResponsiveGrid'
import { getToken } from '@/core/storage'
import ScannerModal from '@/features/scanner/ScannerModal'
import { log } from '@/core/log'
import { SmartHeader } from '@/core/smart-header'

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
	const { filter: queryFilter } = useLocalSearchParams<{ filter?: string }>()
	const selectedFilter = queryFilter || 'all'

	const [page, setPage] = useState(1)

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
		setPage(1)
		setHasMore(true)
		fetchFeed(1, false, selectedFilter)
	}, [selectedFilter])

	useFocusEffect(
		useCallback(() => {
			loadCart()
		}, [])
	)

	// ── Refresh ──
	const refreshData = useCallback(async () => {
		setRefreshing(true)
		setPage(1)
		setHasMore(true)
		await Promise.all([loadCart(), fetchFeed(1, false, selectedFilter)])
		setRefreshing(false)
	}, [selectedFilter])

	// ── Infinite scroll ──
	const handleLoadMore = useCallback(() => {
		if (hasMore && !loading && !isLoadingMore) {
			const nextPage = page + 1
			setPage(nextPage)
			fetchFeed(nextPage, true, selectedFilter)
		}
	}, [hasMore, loading, isLoadingMore, page, selectedFilter])

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
