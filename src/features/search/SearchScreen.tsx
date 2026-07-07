import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions, Platform, Animated, Easing, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'

const TypedFlashList = FlashList as any

import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'
import { useUser } from '@/core/contexts/UserContext'
import { getItem, setItem, getToken } from '@/core/storage'
import { toast } from '@/features/common/Toast'
import { log } from '@/core/log'
import { logError, parseError } from '@/core/helpers/errorHandler'
import { useResponsiveGrid } from '@/core/hooks/useResponsiveGrid'
import { SmartHeader } from '@/core/smart-header'
import { useLayout } from '@/core/contexts/LayoutContext'
import FeedCard from '@/features/feed/feed.card'
import { enrichFeedContacts } from '@/features/feed/feed.helpers'
import { FeedItem } from '@/features/feed/feed.interface'
import { searchApi } from './search.api'

type CartItem = FeedItem & { quantity: number }

export default function SearchScreen() {
	const { colors } = useTheme()
	const { headerHeight } = useLayout()
	const router = useRouter()
	const { localize } = useUser()
	const insets = useSafeAreaInsets()

	// Layout responsiveness
	const { numColumns, gap, padding, itemWidth, isWeb } = useResponsiveGrid()

	// Search states
	const [query, setQuery] = useState('')
	const [scopes, setScopes] = useState<string[]>(['products', 'users'])
	const [results, setResults] = useState<any[]>([])
	const [loading, setLoading] = useState(false)
	const [loadingMore, setLoadingMore] = useState(false)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)

	// Pagination states
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)

	// UI toggles
	const [showFilters, setShowFilters] = useState(false)
	const [showHistory, setShowHistory] = useState(false)
	const [history, setHistory] = useState<string[]>([])

	// Cart state
	const [cart, setCart] = useState<CartItem[]>([])

	// Animation refs
	const shimmerAnim = useRef(new Animated.Value(0.35)).current
	const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
	const inputRef = useRef<TextInput | null>(null)

	// Shimmer pulsing animation loop for loading skeletons
	useEffect(() => {
		const animation = Animated.loop(
			Animated.sequence([
				Animated.timing(shimmerAnim, {
					toValue: 0.65,
					duration: 800,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true
				}),
				Animated.timing(shimmerAnim, {
					toValue: 0.35,
					duration: 800,
					easing: Easing.inOut(Easing.ease),
					useNativeDriver: true
				})
			])
		)
		animation.start()
		return () => animation.stop()
	}, [shimmerAnim])

	// Load search history and cart on mount
	useEffect(() => {
		const loadInitialData = async () => {
			try {
				const savedHistory = await getItem<string[]>('search_history')
				if (savedHistory && Array.isArray(savedHistory)) {
					setHistory(savedHistory)
				}
				const savedCart = await getItem<CartItem[]>('cart')
				if (savedCart && Array.isArray(savedCart)) {
					setCart(savedCart)
				}
			} catch (err) {
				log({ level: 'error', label: 'SearchScreen', message: 'Failed to load initial storage data', error: err })
			}
		}
		loadInitialData()
	}, [])

	// Determine kind of card based on item attributes (robust parsing helper)
	const getCardKind = (item: any) => {
		if (item.card?.kind) return item.card.kind
		if (item.role || item.contact || item.role === 'customer' || item.role === 'business_owner') return 'user'
		if (item.price || item.unit || item.stock || item.business) return 'product'
		return 'product'
	}

	// Search execution logic
	const executeSearch = useCallback(
		async (searchQuery: string, currentScopes: string[], pageNum: number = 1, shouldAppend: boolean = false) => {
			if (!searchQuery.trim()) {
				setResults([])
				setLoading(false)
				setLoadingMore(false)
				setRefreshing(false)
				return
			}

			try {
				if (pageNum === 1 && !refreshing) {
					setLoading(true)
				} else if (pageNum > 1) {
					setLoadingMore(true)
				}
				setError(null)

				const response = await searchApi(searchQuery, currentScopes, pageNum, 10)

				// Extract docs based on various possible API designs
				let fetchedDocs: any[] = []
				if (response?.data) {
					const data = response.data
					if (Array.isArray(data.docs)) {
						fetchedDocs = data.docs
					} else {
						// Grouped response formats parsing
						let combined: any[] = []
						if (data.products) {
							const pDocs = Array.isArray(data.products) ? data.products : Array.isArray(data.products.docs) ? data.products.docs : []
							combined = [...combined, ...pDocs]
						}
						if (data.users) {
							const uDocs = Array.isArray(data.users) ? data.users : Array.isArray(data.users.docs) ? data.users.docs : []
							combined = [...combined, ...uDocs]
						}
						fetchedDocs = combined
					}
				}

				// Map them to format expected by FeedCard
				const mappedDocs = fetchedDocs.map((item) => ({
					...item,
					card: item.card || { kind: getCardKind(item) }
				}))

				if (mappedDocs.length < 10) {
					setHasMore(false)
				} else {
					setHasMore(true)
				}

				if (shouldAppend) {
					setResults((prev) => {
						const updated = [...prev, ...mappedDocs]
						enrichFeedContacts(updated, setResults)
						return updated
					})
				} else {
					setResults(mappedDocs)
					enrichFeedContacts(mappedDocs, setResults)
				}

				// Add successful search query to history
				if (searchQuery.trim().length > 0) {
					setHistory((prev) => {
						const cleaned = prev.filter((h) => h.toLowerCase() !== searchQuery.toLowerCase())
						const newHistory = [searchQuery, ...cleaned].slice(0, 10)
						setItem('search_history', newHistory)
						return newHistory
					})
				}
			} catch (err) {
				logError(err, 'executeSearch')
				const parsed = parseError(err)
				setError({ title: parsed.title, message: parsed.message, type: parsed.type })
			} finally {
				setLoading(false)
				setLoadingMore(false)
				setRefreshing(false)
			}
		},
		[refreshing]
	)

	// Watch query changes & trigger search after 1 second debounce
	useEffect(() => {
		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current)
		}

		if (!query.trim()) {
			setResults([])
			setPage(1)
			setHasMore(false)
			return
		}

		debounceTimer.current = setTimeout(() => {
			setPage(1)
			setHasMore(true)
			executeSearch(query, scopes, 1, false)
		}, 1000)

		return () => {
			if (debounceTimer.current) {
				clearTimeout(debounceTimer.current)
			}
		}
	}, [query, scopes, executeSearch])

	// Submit search immediately (triggered by keyboard or history item click)
	const triggerImmediateSearch = (targetQuery: string, targetScopes: string[] = scopes) => {
		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current)
		}
		setPage(1)
		setHasMore(true)
		executeSearch(targetQuery, targetScopes, 1, false)
	}

	const handleRefresh = () => {
		setRefreshing(true)
		setPage(1)
		setHasMore(true)
		executeSearch(query, scopes, 1, false)
	}

	const handleLoadMore = () => {
		if (hasMore && !loading && !loadingMore && !refreshing && query.trim()) {
			const nextPage = page + 1
			setPage(nextPage)
			executeSearch(query, scopes, nextPage, true)
		}
	}

	// Toggle scope selection
	const toggleScope = (scope: string) => {
		let newScopes = [...scopes]
		if (newScopes.includes(scope)) {
			// Require at least one scope to be active
			if (newScopes.length > 1) {
				newScopes = newScopes.filter((s) => s !== scope)
			} else {
				toast.show({ title: 'Info', message: 'At least one scope must be selected', color: colors.warning })
				return
			}
		} else {
			newScopes.push(scope)
		}
		setScopes(newScopes)
	}

	// Clear search query
	const clearSearch = () => {
		setQuery('')
		setResults([])
		setPage(1)
		setHasMore(false)
		setError(null)
		if (debounceTimer.current) {
			clearTimeout(debounceTimer.current)
		}
		inputRef.current?.focus()
	}

	// Clear whole search history
	const clearHistory = async () => {
		setHistory([])
		await setItem('search_history', [])
		toast.show({ title: 'Success', message: translate('clear_history', 'Search history cleared'), color: colors.success })
	}

	// Handle adding to cart
	const handleAddToCart = useCallback(
		async (item: any, qty: number) => {
			try {
				const token = await getToken()
				if (!token) {
					toast.show({ title: 'Info', message: 'Please log in to add items to cart', color: colors.info || '#3B82F6' })
					router.push('/auth')
					return
				}

				const existingIdx = cart.findIndex((c) => c._id === item._id)
				let newCart: CartItem[]

				if (existingIdx > -1) {
					newCart = [...cart]
					newCart[existingIdx] = {
						...newCart[existingIdx],
						quantity: newCart[existingIdx].quantity + qty
					}
				} else {
					newCart = [...cart, { ...item, quantity: qty }]
				}

				setCart(newCart)
				await setItem('cart', newCart)
				toast.show({
					title: 'Success',
					message: `${localize(item.name) || 'Product'} added to cart`,
					color: colors.success,
					screen: '/purchases?status=cart'
				})
			} catch (err) {
				log({ level: 'error', label: 'SearchScreen', message: 'Failed to add to cart', error: err })
				toast.show({ title: 'Error', message: 'Failed to add to cart', color: colors.error })
			}
		},
		[cart, localize, router, colors]
	)

	// List renderers
	const renderItem = useCallback(
		({ item }: { item: any }) => (
			<View style={{ width: '100%', paddingHorizontal: numColumns > 1 ? gap / 2 : 0, marginBottom: gap }}>
				<FeedCard item={item} addToCart={handleAddToCart} />
			</View>
		),
		[numColumns, handleAddToCart]
	)

	const renderEmpty = useCallback(() => {
		if (error) {
			return (
				<View style={styles.centerContainer}>
					<View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceVariant }]}>
						<Ionicons name="cloud-offline-outline" size={32} color={colors.error} />
					</View>
					<Text style={[styles.emptyTitle, { color: colors.text }]}>{error.title || 'Error'}</Text>
					<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{error.message}</Text>
					<TouchableOpacity style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={handleRefresh}>
						<Text style={[styles.retryBtnText, { color: colors.buttonText }]}>{translate('retry', 'Retry')}</Text>
					</TouchableOpacity>
				</View>
			)
		}

		if (!query.trim()) {
			return (
				<View style={styles.centerContainer}>
					<View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceVariant }]}>
						<Ionicons name="search-outline" size={32} color={colors.textTertiary} />
					</View>
					<Text style={[styles.emptyTitle, { color: colors.text }]}>{translate('search_title', 'Search')}</Text>
					<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{translate('search_start_typing', 'Search for products or user profiles')}</Text>
				</View>
			)
		}

		return (
			<View style={styles.centerContainer}>
				<View style={[styles.emptyIconWrap, { backgroundColor: colors.surfaceVariant }]}>
					<Ionicons name="warning-outline" size={32} color={colors.textTertiary} />
				</View>
				<Text style={[styles.emptyTitle, { color: colors.text }]}>{translate('search_no_results', 'No search results found')}</Text>
				<Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>{translate('try_adjusting', 'Try adjusting your search or check back later.')}</Text>
			</View>
		)
	}, [error, query, colors, translate])

	const renderSkeletons = useCallback(() => {
		const count = numColumns * 3
		return (
			<ScrollView contentContainerStyle={styles.skeletonWrap} showsVerticalScrollIndicator={false}>
				{Array.from({ length: count }).map((_, i) => (
					<View key={`sk-${i}`} style={[styles.skeletonCard, { width: itemWidth, marginHorizontal: numColumns > 1 ? gap / 2 : 0, marginBottom: 16 }]}>
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

	return (
		<View style={[styles.container, { backgroundColor: colors.background, paddingTop: headerHeight }]}>
			<SmartHeader title={translate('search_title', 'Search')} fallbackRoute="/(home)/feed" />

			{/* Search input container */}
			<View style={[styles.searchBarContainer, { borderBottomColor: colors.borderLight }]}>
				<View style={[styles.inputWrapper, { backgroundColor: colors.surface, borderColor: colors.inputBorder }]}>
					<Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
					<TextInput
						ref={inputRef}
						value={query}
						onChangeText={setQuery}
						placeholder={translate('search_placeholder', 'Search products or users...')}
						placeholderTextColor={colors.textTertiary}
						style={[styles.input, { color: colors.text }]}
						autoFocus={true}
						returnKeyType="search"
						onSubmitEditing={() => triggerImmediateSearch(query)}
						accessibilityRole="search"
						accessibilityLabel="Search Input"
					/>
					{query.length > 0 && (
						<TouchableOpacity onPress={clearSearch} style={styles.actionBtn}>
							<Ionicons name="close-circle" size={18} color={colors.textTertiary} />
						</TouchableOpacity>
					)}
					<TouchableOpacity
						onPress={() => {
							setShowHistory(false)
							setShowFilters(!showFilters)
						}}
						style={styles.actionBtn}
					>
						<Ionicons name={showFilters ? 'funnel' : 'funnel-outline'} size={18} color={showFilters ? colors.primary : colors.textSecondary} />
					</TouchableOpacity>
					<TouchableOpacity
						onPress={() => {
							setShowFilters(false)
							setShowHistory(!showHistory)
						}}
						style={styles.actionBtn}
					>
						<Ionicons name={showHistory ? 'time' : 'time-outline'} size={20} color={showHistory ? colors.primary : colors.textSecondary} />
					</TouchableOpacity>
				</View>
			</View>

			{/* Collapsible Filter Panel */}
			{showFilters && (
				<View style={[styles.panel, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
					<Text style={[styles.panelTitle, { color: colors.textSecondary }]}>{translate('filters', 'Filters')}</Text>
					<View style={styles.scopesRow}>
						<TouchableOpacity
							style={[
								styles.chip,
								{ backgroundColor: colors.surfaceVariant, borderColor: colors.border },
								scopes.includes('products') && [styles.chipActive, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]
							]}
							onPress={() => toggleScope('products')}
						>
							<Ionicons name="cube-outline" size={14} color={scopes.includes('products') ? colors.primary : colors.textSecondary} />
							<Text style={[styles.chipText, { color: colors.textSecondary }, scopes.includes('products') && [styles.chipTextActive, { color: colors.primary }]]}>
								{translate('products', 'Products')}
							</Text>
						</TouchableOpacity>

						<TouchableOpacity
							style={[
								styles.chip,
								{ backgroundColor: colors.surfaceVariant, borderColor: colors.border },
								scopes.includes('users') && [styles.chipActive, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]
							]}
							onPress={() => toggleScope('users')}
						>
							<Ionicons name="people-outline" size={14} color={scopes.includes('users') ? colors.primary : colors.textSecondary} />
							<Text style={[styles.chipText, { color: colors.textSecondary }, scopes.includes('users') && [styles.chipTextActive, { color: colors.primary }]]}>{translate('users', 'Users')}</Text>
						</TouchableOpacity>
					</View>
				</View>
			)}

			{/* Collapsible History Panel */}
			{showHistory && (
				<View style={[styles.panel, { backgroundColor: colors.card, borderBottomColor: colors.borderLight }]}>
					<View style={styles.panelHeader}>
						<Text style={[styles.panelTitle, { color: colors.textSecondary }]}>{translate('search_history', 'Search History')}</Text>
						{history.length > 0 && (
							<TouchableOpacity onPress={clearHistory}>
								<Text style={[styles.clearHistoryBtn, { color: colors.primary }]}>{translate('clear_history', 'Clear History')}</Text>
							</TouchableOpacity>
						)}
					</View>
					{history.length === 0 ? (
						<Text style={[styles.emptyHistoryText, { color: colors.textTertiary }]}>No recent searches</Text>
					) : (
						<ScrollView style={styles.historyList} keyboardShouldPersistTaps="handled">
							{history.map((term, index) => (
								<TouchableOpacity
									key={`${term}-${index}`}
									style={[styles.historyItem, { borderBottomColor: colors.borderLight }]}
									onPress={() => {
										setQuery(term)
										setShowHistory(false)
										triggerImmediateSearch(term)
									}}
								>
									<Ionicons name="time-outline" size={16} color={colors.textTertiary} />
									<Text style={[styles.historyItemText, { color: colors.text }]}>{term}</Text>
									<Ionicons name="arrow-forward" size={14} color={colors.textTertiary} style={styles.historyArrow} />
								</TouchableOpacity>
							))}
						</ScrollView>
					)}
				</View>
			)}

			{/* Main Results Container */}
			<View style={styles.contentWrap}>
				{loading && results.length === 0 ? (
					renderSkeletons()
				) : results.length === 0 ? (
					renderEmpty()
				) : isWeb ? (
					<ScrollView
						style={styles.container}
						contentContainerStyle={[styles.listContent, { paddingHorizontal: padding, paddingBottom: 120 + insets.bottom }]}
						showsVerticalScrollIndicator={false}
						refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
					>
						<View style={styles.webGridContainer}>
							{results.map((item, index) => (
								<View
									key={item._id || index}
									style={[
										styles.webGridItem,
										{
											width: `${100 / numColumns}%`,
											paddingHorizontal: gap / 2,
											marginBottom: 16
										}
									]}
								>
									<FeedCard item={item} addToCart={handleAddToCart} />
								</View>
							))}
						</View>
					</ScrollView>
				) : (
					<TypedFlashList
						data={results}
						renderItem={renderItem}
						keyExtractor={(item: any, index: number) => `${item._id || index}`}
						estimatedItemSize={220}
						numColumns={numColumns}
						contentContainerStyle={{
							padding,
							paddingBottom: 100 + insets.bottom
						}}
						ListEmptyComponent={renderEmpty}
						onEndReached={handleLoadMore}
						onEndReachedThreshold={0.5}
						refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
						ListFooterComponent={
							loadingMore ? (
								<View style={styles.footerLoader}>
									<ActivityIndicator size="small" color={colors.primary} />
								</View>
							) : null
						}
					/>
				)}
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	searchBarContainer: {
		padding: 12,
		borderBottomWidth: StyleSheet.hairlineWidth
	},
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		borderWidth: 1,
		paddingHorizontal: 12,
		height: 48
	},
	searchIcon: {
		marginRight: 8
	},
	input: {
		flex: 1,
		fontSize: 16,
		paddingVertical: 8,
		...Platform.select({
			web: {
				outlineStyle: 'none'
			} as any
		})
	},
	actionBtn: {
		padding: 6,
		marginLeft: 4,
		justifyContent: 'center',
		alignItems: 'center'
	},
	panel: {
		padding: 16,
		borderBottomWidth: StyleSheet.hairlineWidth
	},
	panelHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12
	},
	panelTitle: {
		fontSize: 12,
		fontWeight: '600',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	clearHistoryBtn: {
		fontSize: 12,
		fontWeight: '600'
	},
	scopesRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 10,
		marginTop: 8
	},
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 14,
		paddingVertical: 8,
		borderRadius: 20,
		borderWidth: 1,
		gap: 6
	},
	chipActive: {},
	chipText: {
		fontSize: 13,
		fontWeight: '500'
	},
	chipTextActive: {
		fontWeight: '600'
	},
	historyList: {
		maxHeight: 200
	},
	historyItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth
	},
	historyItemText: {
		fontSize: 15,
		marginLeft: 10,
		flex: 1
	},
	historyArrow: {
		marginRight: 4
	},
	emptyHistoryText: {
		fontSize: 14,
		fontStyle: 'italic',
		paddingVertical: 8
	},
	contentWrap: {
		flex: 1
	},
	centerContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 120,
		paddingHorizontal: 32
	},
	emptyIconWrap: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: 16
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 8,
		textAlign: 'center'
	},
	emptySubtitle: {
		fontSize: 14,
		textAlign: 'center',
		lineHeight: 20
	},
	retryBtn: {
		marginTop: 16,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8
	},
	retryBtnText: {
		fontSize: 14,
		fontWeight: '600'
	},
	footerLoader: {
		paddingVertical: 16,
		alignItems: 'center'
	},
	// Skeleton
	skeletonWrap: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		padding: 16
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
	listContent: {
		paddingTop: 12,
		paddingBottom: 120
	},
	webGridContainer: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		width: '100%'
	},
	webGridItem: {
		boxSizing: 'border-box'
	} as any
})
