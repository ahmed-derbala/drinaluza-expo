import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator, Animated, useWindowDimensions, Platform, ScrollView, Easing } from 'react-native'
import { getItem, setItem } from '@/core/storage'
import { FlashList } from '@shopify/flash-list'
import { useRouter, Tabs, useFocusEffect, useLocalSearchParams } from 'expo-router'
import { getFeed } from '@/features/feed/feed.api'
import { FeedItem } from '@/features/feed/feed.interface'

import FeedCard from '@/features/feed/feed.card'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import ErrorState from '@/features/common/ErrorState'
import { toast } from '@/features/common/Toast'
import { parseError, logError } from '@/core/helpers/errorHandler'
import { useUser } from '@/core/contexts'
import { useTheme } from '@/core/theme'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getToken } from '@/core/storage'
import ScannerModal from '@/features/scanner/ScannerModal'
import { log } from '@/core/log'

const businessContactCache = new Map<string, any>()

// Enrich feed items with contact info from cache, other feed items, or via API
const enrichFeedContacts = async (items: FeedItem[], updateState: (items: FeedItem[]) => void) => {
	// 1. First, populate from items already present in the feed (cross-referencing)
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

	// Apply any cached contacts we already have
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

	// 2. Identify missing business contacts to fetch from the API
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

	// 3. Fetch missing contacts in parallel
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

		// 4. Update state with newly fetched contacts
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

const createStyles = (colors: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: '#000000'
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
			...StyleSheet.absoluteFill,
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

	// Error handling state
	const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null)

	const { user, localize, translate } = useUser()

	const { onScroll } = useScrollHandler()
	const insets = useSafeAreaInsets()
	const styles = useMemo(() => createStyles(colors), [colors])

	const loadCart = useCallback(async () => {
		try {
			const storedCart = await getItem<CartItem[]>('cart')
			if (storedCart) {
				setCart(storedCart)
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

	const addToCart = useCallback(
		async (item: FeedItem, quantity: number) => {
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

				await setItem('cart', newCart)
				toast.show({ title: 'Success', message: `${localize(item.name)} added to cart`, color: '#10B981', screen: '/profile/purchases?status=cart' })
			} catch (err) {
				log({ level: 'error', label: 'FeedScreen', message: 'Failed to add to cart', error: err })
				toast.show({ title: 'Error', message: 'Failed to add to cart', color: '#EF4444' })
			}
		},
		[cart, localize, router, translate]
	)

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

	const renderItem = useCallback(
		({ item }: { item: FeedItem }) => (
			<View style={{ width: '100%', paddingHorizontal: numColumns > 1 ? gap / 2 : 0, marginBottom: 16 }}>
				<FeedCard item={item} addToCart={addToCart} />
			</View>
		),
		[numColumns, addToCart, gap]
	)

	return (
		<View style={styles.container}>
			<Tabs.Screen
				options={
					{
						title: translate('feed', 'Feed'),
						subtitle: `${translate('hello', 'Hello')}, ${user?.slug || 'Guest'}`,
						showBackButton: false,
						headerActions: [
							...(!isWeb
								? [
										{
											key: 'scanner',
											iconName: 'qr-code-scanner',
											iconType: 'material' as const,
											onPress: () => setIsScannerVisible(true),
											accessibilityLabel: 'Scan Barcode'
										}
									]
								: []),
							{
								key: 'search',
								iconName: 'search-outline',
								onPress: () => router.push('/search'),
								accessibilityLabel: 'Search'
							},
							{
								key: 'cart',
								iconName: 'cart-outline',
								badgeCount: cart.length,
								onPress: () => router.push('/profile/purchases?status=cart'),
								accessibilityLabel: 'View Cart'
							},
							{
								key: 'refresh',
								onPress: refreshData,
								isRefreshing: refreshing
							}
						]
					} as any
				}
			/>

			<FlashList
				style={{ backgroundColor: colors.background }}
				key={numColumns}
				data={displayedItems}
				renderItem={renderItem}
				numColumns={numColumns}
				keyExtractor={(item) => item.slug || item._id}
				contentContainerStyle={[styles.list, { paddingHorizontal: numColumns > 1 ? padding - gap / 2 : padding }]}
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
