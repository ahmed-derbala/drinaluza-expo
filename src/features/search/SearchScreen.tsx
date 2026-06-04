import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, useWindowDimensions, Platform, FlatList, Keyboard } from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { getItem, setItem, removeItem } from '@/core/storage'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { searchFeed } from '../feed/feed.api'
import { FeedItem } from '../feed/feed.interface'
import FeedCard from '../feed/feed.card'
import { parseError, logError } from '@/core/helpers/errorHandler'
import { getToken } from '@/core/storage'
import { toast } from '@/features/common/Toast'

type SearchType = 'all' | 'products' | 'businesses' | 'users'

const FILTER_OPTIONS: { key: SearchType; label: string; icon: string }[] = [
	{ key: 'all', label: 'All', icon: 'grid-outline' },
	{ key: 'products', label: 'Products', icon: 'fish-outline' },
	{ key: 'businesses', label: 'Businesses', icon: 'storefront-outline' },
	{ key: 'users', label: 'Users', icon: 'people-outline' }
]

type CartItem = FeedItem & { quantity: number }

export default function SearchScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const { q: queryQ, filter: queryFilter } = useLocalSearchParams<{ q?: string; filter?: string }>()
	const { translate, appLang, localize } = useUser()
	const insets = useSafeAreaInsets()
	const { width } = useWindowDimensions()

	const [searchText, setSearchText] = useState('')
	const [activeFilter, setActiveFilter] = useState<SearchType>('all')
	const [results, setResults] = useState<FeedItem[]>([])
	const [loading, setLoading] = useState(false)
	const [cart, setCart] = useState<CartItem[]>([])
	const [error, setError] = useState<string | null>(null)
	const [history, setHistory] = useState<string[]>([])

	const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const inputRef = useRef<TextInput>(null)

	// Responsiveness layout settings (matches FeedScreen)
	const numColumns = useMemo(() => {
		if (width < 500) return 1
		if (width < 800) return 2
		if (width < 1100) return 3
		if (width < 1440) return 4
		return 5
	}, [width])

	const gap = 14
	const padding = 16

	const loadCart = async () => {
		try {
			const storedCart = await getItem<CartItem[]>('cart')
			if (storedCart) {
				setCart(storedCart)
			}
		} catch (error) {
			console.error('Failed to load cart in SearchScreen:', error)
		}
	}

	// Synchronize URL parameters with local state on load / update
	useEffect(() => {
		let currentQ = queryQ || ''
		let currentFilter = (queryFilter as SearchType) || 'all'

		if (currentQ !== searchText) {
			setSearchText(currentQ)
		}
		if (currentFilter !== activeFilter) {
			setActiveFilter(currentFilter)
		}

		if (currentQ.trim()) {
			performSearch(currentQ, currentFilter)
		}
	}, [queryQ, queryFilter])

	const saveToHistory = useCallback(async (text: string) => {
		const trimmedText = text.trim()
		if (!trimmedText) return

		try {
			const currentHistory = (await getItem<string[]>('search_history')) || []
			// Remove duplicate if exists so we can move it to the front
			let updatedHistory = currentHistory.filter((item) => item.toLowerCase() !== trimmedText.toLowerCase())
			// Insert at the beginning of the array
			updatedHistory.unshift(trimmedText)
			// Limit to 10 unique entries
			if (updatedHistory.length > 10) {
				updatedHistory = updatedHistory.slice(0, 10)
			}

			setHistory(updatedHistory)
			await setItem('search_history', updatedHistory)
		} catch (error) {
			console.error('Failed to save search history:', error)
		}
	}, [])

	const deleteHistoryItem = useCallback(async (itemToDelete: string) => {
		try {
			const currentHistory = await getItem<string[]>('search_history')
			if (currentHistory) {
				const updatedHistory = currentHistory.filter((item) => item !== itemToDelete)
				setHistory(updatedHistory)
				await setItem('search_history', updatedHistory)
			}
		} catch (error) {
			console.error('Failed to delete history item:', error)
		}
	}, [])

	const clearAllHistory = useCallback(async () => {
		try {
			setHistory([])
			await removeItem('search_history')
		} catch (error) {
			console.error('Failed to clear search history:', error)
		}
	}, [])

	const addToCart = async (item: FeedItem, quantity: number) => {
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
			console.error('Failed to add to cart:', err)
			toast.show({ title: 'Error', message: 'Failed to add to cart', color: '#EF4444' })
		}
	}

	const performSearch = useCallback(
		async (text: string, filterType: SearchType) => {
			if (!text.trim()) {
				setResults([])
				setLoading(false)
				return
			}

			setLoading(true)
			setError(null)

			try {
				const apiLang = ((appLang || 'en').startsWith('tn') ? 'tn' : 'en') as 'en' | 'tn'
				const components = filterType === 'all' ? ['products', 'businesses', 'users'] : [filterType]
				const response = await searchFeed(text, apiLang, components)
				setResults(response.data.docs)

				// Save successful queries with non-empty results to history
				if (response.data.docs.length > 0) {
					saveToHistory(text)
				}
			} catch (err) {
				logError(err, 'SearchScreen')
				const errorInfo = parseError(err)
				setError(errorInfo.message)
			} finally {
				setLoading(false)
			}
		},
		[appLang, saveToHistory]
	)

	const loadHistory = useCallback(async () => {
		try {
			const parsedHistory = await getItem<string[]>('search_history')
			if (parsedHistory) {
				setHistory(parsedHistory)

				// Automatically trigger search on last search term on mount only if there is no URL query
				if (parsedHistory.length > 0 && !queryQ) {
					const lastSearch = parsedHistory[0]
					setSearchText(lastSearch)
					performSearch(lastSearch, activeFilter)
					router.setParams({ q: lastSearch })
				}
			}
		} catch (error) {
			console.error('Failed to load search history:', error)
		}
	}, [performSearch, activeFilter, queryQ, router])

	const handleTextChange = useCallback(
		(text: string) => {
			setSearchText(text)

			if (searchTimerRef.current) {
				clearTimeout(searchTimerRef.current)
			}

			// Debounce search and URL sync to 400ms to prevent interface lagging
			searchTimerRef.current = setTimeout(() => {
				router.setParams({ q: text || '' })
				if (text.trim()) {
					performSearch(text, activeFilter)
				} else {
					setResults([])
					setLoading(false)
				}
			}, 400)
		},
		[performSearch, activeFilter, router]
	)

	const handleFilterChange = useCallback(
		(filterType: SearchType) => {
			setActiveFilter(filterType)
			router.setParams({ filter: filterType })
			performSearch(searchText, filterType)
		},
		[searchText, performSearch, router]
	)

	const handleClear = useCallback(() => {
		setSearchText('')
		setResults([])
		setError(null)
		router.setParams({ q: '' })
		if (searchTimerRef.current) {
			clearTimeout(searchTimerRef.current)
		}
		inputRef.current?.focus()
	}, [router])

	// Load cart and search history on mount
	useEffect(() => {
		const timer = setTimeout(() => {
			inputRef.current?.focus()
		}, 100)
		loadCart()
		loadHistory()
		return () => {
			clearTimeout(timer)
			if (searchTimerRef.current) {
				clearTimeout(searchTimerRef.current)
			}
		}
	}, [loadHistory])

	const renderItem = useCallback(
		({ item }: { item: FeedItem }) => (
			<View style={{ width: '100%', paddingHorizontal: numColumns > 1 ? gap / 2 : 0, marginBottom: 14 }}>
				<FeedCard item={item} addToCart={addToCart} />
			</View>
		),
		[numColumns, addToCart, gap]
	)

	const renderEmpty = () => {
		if (loading) return null

		if (error) {
			return (
				<View style={styles.emptyContainer}>
					<Ionicons name="alert-circle-outline" size={54} color={colors.error || '#EF4444'} />
					<Text style={[styles.emptyTitle, { color: colors.text }]}>{translate('search_failed', 'Search failed')}</Text>
					<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
					<TouchableOpacity style={[styles.retryButton, { backgroundColor: colors.primary }]} onPress={() => performSearch(searchText, activeFilter)}>
						<Text style={styles.retryButtonText}>{translate('retry', 'Retry')}</Text>
					</TouchableOpacity>
				</View>
			)
		}

		if (searchText.trim()) {
			return (
				<View style={styles.emptyContainer}>
					<Ionicons name="search-outline" size={54} color={colors.textTertiary} />
					<Text style={[styles.emptyTitle, { color: colors.text }]}>{translate('no_results', 'No results found')}</Text>
					<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('try_adjusting_search', 'Check spelling or try searching other keywords')}</Text>
				</View>
			)
		}

		// If input is empty and we have search history, render the history list!
		if (history.length > 0) {
			return (
				<View style={styles.historyContainer}>
					<View style={styles.historyHeader}>
						<Text style={[styles.historyTitle, { color: colors.textSecondary }]}>{translate('recent_searches', 'Recent Searches')}</Text>
						<TouchableOpacity onPress={clearAllHistory}>
							<Text style={[styles.clearAllText, { color: colors.primary }]}>{translate('clear_all', 'Clear All')}</Text>
						</TouchableOpacity>
					</View>
					{history.map((item) => (
						<View key={item} style={[styles.historyItem, { borderBottomColor: colors.border }]}>
							<TouchableOpacity
								style={styles.historyItemPressable}
								onPress={() => {
									setSearchText(item)
									router.setParams({ q: item })
									performSearch(item, activeFilter)
								}}
							>
								<Ionicons name="time-outline" size={18} color={colors.textSecondary} style={styles.historyIcon} />
								<Text style={[styles.historyText, { color: colors.text }]}>{item}</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={() => deleteHistoryItem(item)} style={styles.historyDeleteButton}>
								<Ionicons name="close" size={16} color={colors.textTertiary} />
							</TouchableOpacity>
						</View>
					))}
				</View>
			)
		}

		// Default empty search screen placeholder
		return (
			<View style={styles.emptyContainer}>
				<View style={[styles.largeSearchIconBg, { backgroundColor: colors.surfaceVariant }]}>
					<Ionicons name="search-outline" size={40} color={colors.primary} />
				</View>
				<Text style={[styles.emptyTitle, { color: colors.text }]}>{translate('search_title', 'Find everything')}</Text>
				<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('search_desc', 'Search for products, businesses, or team members instantly')}</Text>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? insets.top : insets.top + 8 }]}>
			{/* Custom Stack Header - aligned with standard navigation style */}
			<View style={styles.header}>
				<TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
					<Ionicons name={Platform.OS === 'ios' ? 'chevron-back' : 'arrow-back'} size={26} color={colors.text} />
				</TouchableOpacity>

				<View style={[styles.searchBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
					<Ionicons name="search" size={20} color={colors.textSecondary} style={styles.searchIcon} />
					<TextInput
						ref={inputRef}
						style={[styles.searchInput, { color: colors.text }]}
						placeholder={translate('search_placeholder', 'Search products, businesses...')}
						placeholderTextColor={colors.textTertiary}
						value={searchText}
						onChangeText={handleTextChange}
						returnKeyType="search"
						autoCorrect={false}
						autoCapitalize="none"
						keyboardAppearance="dark"
						onSubmitEditing={() => {
							if (searchText.trim()) {
								performSearch(searchText, activeFilter)
								saveToHistory(searchText)
							}
						}}
					/>
					{searchText.length > 0 && (
						<TouchableOpacity onPress={handleClear} style={[styles.clearButton, { backgroundColor: colors.surfaceVariant }]}>
							<Ionicons name="close" size={18} color={colors.text} />
						</TouchableOpacity>
					)}
				</View>
			</View>

			{/* Category Filter Chips */}
			<View style={styles.filtersWrapper}>
				<FlatList
					horizontal
					showsHorizontalScrollIndicator={false}
					data={FILTER_OPTIONS}
					keyExtractor={(item) => item.key}
					contentContainerStyle={styles.filtersList}
					renderItem={({ item }) => {
						const isActive = activeFilter === item.key
						return (
							<TouchableOpacity
								style={[
									styles.filterChip,
									{ backgroundColor: colors.surface, borderColor: colors.border },
									isActive && [styles.filterChipActive, { backgroundColor: colors.primaryContainer, borderColor: colors.primary }]
								]}
								onPress={() => handleFilterChange(item.key)}
								activeOpacity={0.7}
							>
								<Ionicons name={item.icon as any} size={16} color={isActive ? colors.primary : colors.textSecondary} style={styles.chipIcon} />
								<Text style={[styles.chipText, { color: colors.textSecondary }, isActive && [styles.chipTextActive, { color: colors.primary }]]}>{translate(item.key, item.label)}</Text>
							</TouchableOpacity>
						)
					}}
				/>
			</View>

			{/* Search Results */}
			<View style={styles.resultsContainer}>
				{loading && results.length === 0 ? (
					<View style={styles.centerLoading}>
						<ActivityIndicator size="large" color={colors.primary} />
					</View>
				) : (
					<FlashList
						key={numColumns}
						data={results}
						renderItem={renderItem}
						numColumns={numColumns}
						keyExtractor={(item: any) => item.slug || item._id}
						contentContainerStyle={[styles.list, { paddingHorizontal: numColumns > 1 ? padding - gap / 2 : padding }]}
						ListEmptyComponent={renderEmpty}
						keyboardShouldPersistTaps="handled"
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
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingBottom: 12,
		gap: 12
	},
	backButton: {
		width: 36,
		height: 44,
		justifyContent: 'center',
		alignItems: 'flex-start'
	},
	searchBox: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		borderRadius: 12,
		paddingHorizontal: 14,
		height: 44,
		borderWidth: 1
	},
	searchIcon: {
		marginRight: 8
	},
	searchInput: {
		flex: 1,
		fontSize: 15,
		padding: 0,
		height: '100%'
	},
	clearButton: {
		width: 24,
		height: 24,
		borderRadius: 6,
		justifyContent: 'center',
		alignItems: 'center',
		marginLeft: 6
	},
	filtersWrapper: {
		paddingBottom: 10,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(128,128,128,0.1)'
	},
	filtersList: {
		paddingHorizontal: 16,
		gap: 8
	},
	filterChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 10,
		borderWidth: 1
	},
	filterChipActive: {
		borderWidth: 1
	},
	chipIcon: {
		marginRight: 6
	},
	chipText: {
		fontSize: 13,
		fontWeight: '600'
	},
	chipTextActive: {
		fontWeight: '700'
	},
	resultsContainer: {
		flex: 1
	},
	centerLoading: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	list: {
		paddingVertical: 16
	},
	cardWrapper: {
		marginBottom: 14
	},
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 80,
		paddingHorizontal: 32
	},
	largeSearchIconBg: {
		width: 80,
		height: 80,
		borderRadius: 24,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 20
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600',
		marginBottom: 8,
		textAlign: 'center'
	},
	emptyText: {
		fontSize: 13,
		textAlign: 'center',
		lineHeight: 18
	},
	retryButton: {
		marginTop: 20,
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 10
	},
	retryButtonText: {
		color: '#fff',
		fontWeight: '600',
		fontSize: 14
	},
	historyContainer: {
		paddingHorizontal: 16,
		paddingTop: 12,
		width: '100%'
	},
	historyHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 10,
		paddingBottom: 8,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(128,128,128,0.08)'
	},
	historyTitle: {
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.8,
		textTransform: 'uppercase'
	},
	clearAllText: {
		fontSize: 13,
		fontWeight: '600'
	},
	historyItem: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingVertical: 12,
		borderBottomWidth: 1
	},
	historyItemPressable: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	historyIcon: {
		opacity: 0.6
	},
	historyText: {
		fontSize: 14,
		fontWeight: '500'
	},
	historyDeleteButton: {
		padding: 4,
		justifyContent: 'center',
		alignItems: 'center'
	}
})
