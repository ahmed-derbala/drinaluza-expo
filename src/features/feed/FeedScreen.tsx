import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator, Animated, useWindowDimensions, Platform, ScrollView, Easing } from 'react-native'
import { getItem, setItem } from '@/core/storage'
import { FlashList } from '@shopify/flash-list'
import { useRouter, Tabs, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { getFeed } from '@/features/feed/feed.api'
import { FeedItem } from '@/features/feed/feed.interface'

import FeedCard from '@/features/feed/feed.card'
import { Ionicons } from '@expo/vector-icons'
import ErrorState from '@/features/common/ErrorState'
import { toast } from '@/features/common/Toast'
import { parseError, logError } from '@/core/helpers/errorHandler'
import { useUser } from '@/core/contexts'
import { useTheme } from '@/core/theme'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { getToken } from '@/core/storage'
import ScannerModal from '@/features/scanner/ScannerModal'
import { log } from '@/core/log'
import { SmartScreenHeader } from '@/core/smart-screen-header'

// Bypass type issues with FlashList generic components
const TypedFlashList = FlashList as any

// ─── Contact enrichment cache ───────────────────────────────────────────────────
const businessContactCache = new Map<string, any>()

const enrichFeedContacts = async (items: FeedItem[], updateState: (items: FeedItem[]) => void) => {
	const localContacts = new Map<string, any>()
	const localLocations = new Map<string, any>()

	for (const item of items) {
		if (item.card?.kind === 'business') {
			const bSlug = item.business?.slug || item.slug
			if (bSlug) {
				if (item.contact) {
					localContacts.set(bSlug, item.contact)
					businessContactCache.set(bSlug, item.contact)
				}
				if (item.business?.location) {
					localLocations.set(bSlug, item.business.location)
					businessContactCache.set(`${bSlug}_location`, item.business.location)
				}
			}
		}
		if (item.card?.kind === 'user' && item.contact && item.role === 'business_owner') {
			const ownerSlug = item.slug
			if (ownerSlug) {
				localContacts.set(ownerSlug, item.contact)
				businessContactCache.set(ownerSlug, item.contact)
			}
		}
	}

	let hasUpdates = false
	const enriched = items.map((item) => {
		if (item.card?.kind === 'product' && item.business) {
			const bSlug = item.business.slug
			const ownerSlug = item.business.owner?.slug
			const contact = businessContactCache.get(bSlug) || localContacts.get(bSlug) || businessContactCache.get(ownerSlug) || localContacts.get(ownerSlug)
			const location = businessContactCache.get(`${bSlug}_location`) || localLocations.get(bSlug)

			const hasNewContact = contact && !item.business.contact
			const hasNewLocation = location && (!item.business.location || !item.business.location.coordinates)

			if (hasNewContact || hasNewLocation) {
				hasUpdates = true
				return {
					...item,
					business: {
						...item.business,
						...(hasNewContact ? { contact } : {}),
						...(hasNewLocation ? { location } : {})
					}
				}
			}
		}
		return item
	})

	if (hasUpdates) {
		updateState(enriched)
	}

	const missingSlugs = new Set<string>()
	for (const item of enriched) {
		if (item.card?.kind === 'product' && item.business && !item.business.contact) {
			const bSlug = item.business.slug
			if (bSlug && !businessContactCache.has(bSlug)) {
				missingSlugs.add(bSlug)
			}
		}
	}

	if (missingSlugs.size === 0) return

	try {
		const { getBusinessBySlug } = require('@/features/businesses/businesses.api')
		await Promise.all(
			Array.from(missingSlugs).map(async (slug) => {
				try {
					const res = await getBusinessBySlug(slug)
					if (res?.data) {
						if (res.data.contact) {
							businessContactCache.set(slug, res.data.contact)
						}
						if (res.data.location) {
							businessContactCache.set(`${slug}_location`, res.data.location)
						}
					}
				} catch (err) {
					console.warn(`[FeedScreen] Failed to fetch contact for business: ${slug}`, err)
				}
			})
		)

		const fullyEnriched = enriched.map((item) => {
			if (item.card?.kind === 'product' && item.business && !item.business.contact) {
				const bSlug = item.business.slug
				const ownerSlug = item.business.owner?.slug
				const contact = businessContactCache.get(bSlug) || businessContactCache.get(ownerSlug)
				const location = businessContactCache.get(`${bSlug}_location`)

				if (contact || location) {
					return {
						...item,
						business: {
							...item.business,
							...(contact ? { contact } : {}),
							...(location ? { location } : {})
						}
					}
				}
			}
			return item
		})

		updateState(fullyEnriched)
	} catch (e) {
		console.warn('[FeedScreen] Contact enrichment error:', e)
	}
}

// ─── Component ──────────────────────────────────────────────────────────────────
type CartItem = FeedItem & { quantity: number }

export default function FeedScreen() {
	const { colors } = useTheme()
	const router = useRouter()

	// ── Data state ──
	const [feedItems, setFeedItems] = useState<FeedItem[]>([])
	const [displayedItems, setDisplayedItems] = useState<FeedItem[]>([])
	const [cart, setCart] = useState<CartItem[]>([])
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [isScannerVisible, setIsScannerVisible] = useState(false)

	// ── Layout ──
	const { width } = useWindowDimensions()
	const numColumns = useMemo(() => {
		if (width < 500) return 1
		if (width < 800) return 2
		if (width < 1100) return 3
		if (width < 1440) return 4
		return 5
	}, [width])

	const gap = 16
	const padding = 16
	const itemWidth = useMemo(() => {
		return (width - padding * 2 - gap * (numColumns - 1)) / numColumns
	}, [width, padding, gap, numColumns])

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
	const { onScroll } = useScrollHandler()

	// ── Filter categories ──
	const categories = useMemo(
		() => [
			{ key: 'all', label: translate('all', 'All'), icon: 'apps-outline' },
			{ key: 'products', label: translate('products', 'Products'), icon: 'fish-outline' },
			{ key: 'businesses', label: translate('businesses', 'Businesses'), icon: 'storefront-outline' },
			{ key: 'users', label: translate('people', 'People'), icon: 'people-outline' }
		],
		[translate]
	)

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

	// ── Filter select ──
	const handleFilterSelect = useCallback(
		(filterKey: string) => {
			router.setParams({ filter: filterKey, page: '1' })
			if (!isWeb) {
				setMobilePage(1)
				setHasMore(true)
				fetchFeed(1, false, filterKey)
			}
		},
		[isWeb, router, fetchFeed]
	)

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
				toast.show({ title: 'Success', message: `${localize(item.name)} added to cart`, color: '#10B981', screen: '/profile/purchases?status=cart' })
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

	const renderFilterBar = useCallback(() => {
		return (
			<View style={styles.filterBar}>
				<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
					{categories.map((cat) => {
						const active = selectedFilter === cat.key
						return (
							<TouchableOpacity key={cat.key} style={[styles.filterPill, active && styles.filterPillActive]} onPress={() => handleFilterSelect(cat.key)} activeOpacity={0.75}>
								<Ionicons name={cat.icon as any} size={14} color={active ? '#fff' : 'rgba(255, 255, 255, 0.4)'} />
								<Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{cat.label}</Text>
							</TouchableOpacity>
						)
					})}
				</ScrollView>
			</View>
		)
	}, [categories, selectedFilter, handleFilterSelect])

	const renderSkeletons = useCallback(() => {
		const count = numColumns * 3
		return (
			<ScrollView contentContainerStyle={[styles.skeletonWrap, { paddingHorizontal: padding }]} showsVerticalScrollIndicator={false}>
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
			</ScrollView>
		)
	}, [numColumns, itemWidth, shimmerAnim])

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
				...(!isWeb
					? [<SmartScreenHeader.ActionButton key="scanner" iconName="qr-code-scanner" iconType="material" onPress={() => setIsScannerVisible(true)} accessibilityLabel="Scan Barcode" />]
					: []),
				<SmartScreenHeader.SearchButton key="search" />,
				<SmartScreenHeader.CartButton key="cart" badgeCount={cart.length} />,
				<SmartScreenHeader.RefreshButton key="refresh" onRefresh={refreshData} isRefreshing={refreshing} />
			]
		}),
		[translate, user, loading, displayedItems.length, isWeb, cart.length, refreshData, refreshing]
	)

	// ═══════════════════════════════════════════════════════════════════════════════
	// ── Main render ──
	// ═══════════════════════════════════════════════════════════════════════════════
	if (isWeb) {
		return (
			<View style={styles.root}>
				<Tabs.Screen options={headerOptions as any} />
				{renderFilterBar()}

				{loading && displayedItems.length === 0 ? (
					renderSkeletons()
				) : displayedItems.length === 0 ? (
					renderEmpty()
				) : (
					<ScrollView
						style={styles.root}
						contentContainerStyle={[styles.listContent, { paddingHorizontal: padding }]}
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
					</ScrollView>
				)}
				<ScannerModal visible={isScannerVisible} onClose={() => setIsScannerVisible(false)} />
			</View>
		)
	}

	return (
		<View style={styles.root}>
			<Tabs.Screen options={headerOptions as any} />
			{renderFilterBar()}

			{loading && displayedItems.length === 0 ? (
				renderSkeletons()
			) : (
				<TypedFlashList
					style={{ backgroundColor: 'transparent' }}
					data={displayedItems}
					renderItem={renderItem}
					numColumns={numColumns}
					estimatedItemSize={260}
					keyExtractor={(item: FeedItem) => item.slug || item._id}
					contentContainerStyle={[styles.listContent, { paddingHorizontal: padding }]}
					ListEmptyComponent={renderEmpty}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshData} colors={['#0EA5E9']} tintColor="#0EA5E9" />}
					showsVerticalScrollIndicator={false}
					keyboardShouldPersistTaps="handled"
					onScroll={onScroll}
					scrollEventThrottle={16}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.5}
					ListFooterComponent={isLoadingMore ? <ActivityIndicator size="small" color="#0EA5E9" style={{ paddingVertical: 24 }} /> : null}
				/>
			)}

			<ScannerModal visible={isScannerVisible} onClose={() => setIsScannerVisible(false)} />
		</View>
	)
}

const styles = StyleSheet.create({
	root: {
		flex: 1,
		backgroundColor: '#0A0E1A'
	},
	// ── Filter bar ──
	filterBar: {
		backgroundColor: 'rgba(10, 14, 26, 0.85)',
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: 'rgba(255, 255, 255, 0.08)'
	},
	filterScroll: {
		paddingHorizontal: 16,
		paddingTop: 10,
		paddingBottom: 12,
		gap: 8
	},
	filterPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		paddingHorizontal: 16,
		paddingVertical: 8,
		borderRadius: 22,
		borderWidth: 1,
		borderColor: 'rgba(255, 255, 255, 0.08)',
		backgroundColor: 'rgba(255, 255, 255, 0.02)'
	},
	filterPillActive: {
		backgroundColor: '#0EA5E9',
		borderColor: '#0EA5E9'
	},
	filterPillText: {
		fontSize: 13,
		fontWeight: '600',
		color: 'rgba(255, 255, 255, 0.5)'
	},
	filterPillTextActive: {
		color: '#ffffff',
		fontWeight: '700'
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
