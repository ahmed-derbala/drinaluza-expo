import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator, Animated, useWindowDimensions, Platform, ScrollView, Easing } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { getFeed } from '@/components/feed/feed.api'
import { FeedItem } from '@/components/feed/feed.interface'
import { useFocusEffect } from '@react-navigation/native'
import FeedCard from '@/components/feed/feed.card'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import ScreenHeader from '@/components/common/ScreenHeader'
import ErrorState from '@/components/common/ErrorState'
import { toast } from '@/core/helpers/toast'
import SearchBar from '@/components/search/SearchBar'
import { getCurrentUser } from '@/core/auth/auth.api'
import { parseError, logError } from '@/core/helpers/errorHandler'
import { useUser, useLayout, useTheme } from '@/core/contexts'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { getToken } from '@/core/auth/storage'

type FilterKey = 'product' | 'shop' | 'user'

const FILTER_OPTIONS: { key: FilterKey; icon: string; iconSet: 'ionicons' | 'material' }[] = [
	{ key: 'product', icon: 'fish-outline', iconSet: 'ionicons' },
	{ key: 'shop', icon: 'store', iconSet: 'material' },
	{ key: 'user', icon: 'people-outline', iconSet: 'ionicons' }
]

const createStyles = (colors: any) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background
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
			...StyleSheet.absoluteFillObject,
			backgroundColor: colors.background,
			justifyContent: 'center',
			alignItems: 'center',
			zIndex: 10
		},
		list: {
			paddingBottom: 20
		},
		cardWrapper: {
			marginBottom: 16,
			minHeight: 420
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
		}
	})

type BasketItem = FeedItem & { quantity: number }

export default function FeedScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const [feedItems, setFeedItems] = useState<FeedItem[]>([])
	const [displayedItems, setDisplayedItems] = useState<FeedItem[]>([])
	const [basket, setBasket] = useState<BasketItem[]>([])
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [isSearchActive, setIsSearchActive] = useState(false)
	const [activeFilters, setActiveFilters] = useState<FilterKey[]>([])

	const { width } = useWindowDimensions()
	const minColumnWidth = 320
	const numColumns = Math.max(1, Math.floor(width / minColumnWidth))
	const gap = 16
	const padding = 16
	const itemWidth = (width - padding * 2 - gap * (numColumns - 1)) / numColumns

	// Pagination state
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [isLoadingMore, setIsLoadingMore] = useState(false)

	// Animation state for search bar
	const scrollY = useRef(new Animated.Value(0)).current
	const searchBarHeight = 80

	// Animation for refresh icon
	const refreshSpinValue = useRef(new Animated.Value(0)).current

	// Error handling state
	const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null)

	const { user, localize, translate } = useUser()

	const { onScroll } = useScrollHandler()
	const { isSearchBarVisible, setSearchBarVisible } = useLayout()
	const insets = useSafeAreaInsets()
	const styles = useMemo(() => createStyles(colors), [colors])

	const getFilterParam = (filters: FilterKey[]): string | undefined => {
		// No filter or all selected = show everything
		if (filters.length === 0 || filters.length === FILTER_OPTIONS.length) return undefined
		return filters.join(',')
	}

	const loadBasket = async () => {
		try {
			const storedBasket = await AsyncStorage.getItem('basket')
			if (storedBasket) {
				setBasket(JSON.parse(storedBasket))
			}
		} catch (error) {
			console.error('Failed to load basket:', error)
		}
	}

	const fetchFeed = async (pageNum: number = 1, shouldAppend: boolean = false, filters: FilterKey[] = activeFilters) => {
		try {
			if (pageNum === 1) setLoading(true)
			else setIsLoadingMore(true)

			const response = await getFeed(pageNum, 10, getFilterParam(filters))
			const newItems = response.data.docs

			if (newItems.length < 10) {
				setHasMore(false)
			} else {
				setHasMore(true)
			}

			if (shouldAppend) {
				setFeedItems((prev) => [...prev, ...newItems])
				if (!isSearchActive) {
					setDisplayedItems((prev) => [...prev, ...newItems])
				}
			} else {
				setFeedItems(newItems)
				if (!isSearchActive) {
					setDisplayedItems(newItems)
				}
			}
			setError(null)
		} catch (err) {
			logError(err, 'fetchFeed')
			const errorInfo = parseError(err)
			setError({
				message: errorInfo.message,
				retry: errorInfo.canRetry ? () => fetchFeed(pageNum, shouldAppend, filters) : undefined
			})
		} finally {
			setLoading(false)
			setIsLoadingMore(false)
		}
	}

	const refreshData = useCallback(async () => {
		// Animate rotation on press
		Animated.timing(refreshSpinValue, {
			toValue: 1,
			duration: 300,
			easing: Easing.out(Easing.ease),
			useNativeDriver: true
		}).start(() => {
			refreshSpinValue.setValue(0)
		})

		setRefreshing(true)
		setPage(1)
		setHasMore(true)
		await Promise.all([loadBasket(), fetchFeed(1, false, activeFilters)])
		setRefreshing(false)
	}, [activeFilters, refreshSpinValue])

	const handleLoadMore = useCallback(() => {
		if (!isSearchActive && hasMore && !loading && !isLoadingMore) {
			const nextPage = page + 1
			setPage(nextPage)
			fetchFeed(nextPage, true)
		}
	}, [isSearchActive, hasMore, loading, isLoadingMore, page])

	const handleFilterToggle = useCallback((key: FilterKey) => {
		setActiveFilters((prev) => {
			const newFilters = prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
			setPage(1)
			setHasMore(true)
			setIsSearchActive(false)
			fetchFeed(1, false, newFilters)
			return newFilters
		})
	}, [])

	useFocusEffect(
		useCallback(() => {
			refreshData()
		}, [refreshData])
	)

	const addToBasket = async (item: FeedItem, quantity: number) => {
		try {
			const token = await getToken()
			if (!token) {
				toast.info('Please log in to add items to basket')
				router.push('/auth')
				return
			}

			const existingItemIndex = basket.findIndex((basketItem) => basketItem._id === item._id)
			let newBasket: BasketItem[]

			if (existingItemIndex > -1) {
				newBasket = [...basket]
				newBasket[existingItemIndex] = {
					...newBasket[existingItemIndex],
					quantity: (newBasket[existingItemIndex].quantity || 0) + quantity
				}
			} else {
				newBasket = [...basket, { ...item, quantity }]
			}

			setBasket(newBasket)

			await AsyncStorage.setItem('basket', JSON.stringify(newBasket))
			toast.success(`${localize(item.name)} added to basket`, {
				actions: [
					{
						icon: 'cart-outline',
						onPress: () => router.push({ pathname: '/(home)/purchases', params: { filter: 'cart' } })
					}
				]
			})
		} catch (error) {
			console.error('Failed to add to basket:', error)
			toast.error('Failed to add to basket')
		}
	}

	const handleSearchResults = useCallback((results: FeedItem[]) => {
		setIsSearchActive(true)
		setDisplayedItems(results)
	}, [])

	const handleSearchClear = useCallback(() => {
		setIsSearchActive(false)
		setDisplayedItems(feedItems)
	}, [feedItems])

	const handleSearchError = useCallback((message: string, retry?: () => void) => {
		toast.error(message)
	}, [])

	const handleToggleSearch = useCallback(() => {
		setSearchBarVisible(!isSearchBarVisible)
	}, [isSearchBarVisible, setSearchBarVisible])

	const renderFooter = () => {
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

	const renderItem = ({ item }: { item: FeedItem }) => (
		<View style={[styles.cardWrapper, { width: numColumns > 1 ? itemWidth : '100%' }]}>
			<FeedCard item={item} addToBasket={addToBasket} />
		</View>
	)

	const renderFilterIcon = (option: (typeof FILTER_OPTIONS)[0]) => {
		const isActive = activeFilters.includes(option.key)
		const iconColor = isActive ? colors.primary : colors.textTertiary
		const size = 22

		if (option.iconSet === 'material') {
			return <MaterialIcons name={option.icon as any} size={size} color={iconColor} />
		}
		return <Ionicons name={option.icon as any} size={size} color={iconColor} />
	}

	const headerRightActions = (
		<View style={{ flexDirection: 'row', gap: 8 }}>
			<TouchableOpacity style={[styles.refreshButtonSmall, { backgroundColor: colors.surface }]} onPress={handleToggleSearch}>
				<Ionicons name={isSearchBarVisible ? 'search' : 'search-outline'} size={20} color={colors.primary} />
			</TouchableOpacity>
			<TouchableOpacity style={[styles.refreshButtonSmall, { backgroundColor: colors.surface }]} onPress={refreshData} disabled={refreshing}>
				<Animated.View style={{ transform: [{ rotate: refreshSpinValue.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }}>
					<MaterialIcons name="refresh" size={20} color={colors.primary} />
				</Animated.View>
			</TouchableOpacity>
		</View>
	)

	return (
		<View style={styles.container}>
			<ScreenHeader title={translate('feed', 'Feed')} subtitle={`${translate('hello', 'Hello')}, ${user?.slug || 'Guest'}`} showBack={false} rightActions={headerRightActions} />

			{/* Backdrop to dismiss search bar when tapping outside */}
			{isSearchBarVisible && (
				<TouchableOpacity
					style={{
						position: 'absolute',
						top: Platform.OS === 'web' ? 50 : insets.top + 60,
						left: 0,
						right: 0,
						bottom: 0,
						zIndex: 5
					}}
					activeOpacity={1}
					onPress={handleToggleSearch}
				/>
			)}

			{/* Search Bar and Filters - combined container */}
			<View
				style={{
					position: 'absolute',
					top: Platform.OS === 'web' ? 50 : insets.top + 60,
					left: 0,
					right: 0,
					zIndex: 10,
					display: isSearchBarVisible ? 'flex' : 'none',
					backgroundColor: colors.background,
					borderBottomWidth: 1,
					borderBottomColor: colors.border
				}}
			>
				<View style={{ paddingHorizontal: padding, paddingVertical: 10 }}>
					<SearchBar onSearchResults={handleSearchResults} onSearchClear={handleSearchClear} onError={handleSearchError} />
				</View>
				<View style={{ ...styles.filterContainer, paddingTop: 12, paddingBottom: 12 }}>
					<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
						{FILTER_OPTIONS.map((option) => (
							<TouchableOpacity
								key={option.key}
								style={[styles.filterChip, activeFilters.includes(option.key) && styles.filterChipActive]}
								onPress={() => handleFilterToggle(option.key)}
								activeOpacity={0.7}
							>
								{renderFilterIcon(option)}
							</TouchableOpacity>
						))}
					</ScrollView>
				</View>
			</View>

			<Animated.FlatList
				key={numColumns}
				data={displayedItems}
				renderItem={renderItem}
				numColumns={numColumns}
				columnWrapperStyle={numColumns > 1 ? { gap, paddingHorizontal: padding, alignItems: 'stretch' } : undefined}
				keyExtractor={(item) => item.slug || item._id}
				contentContainerStyle={[styles.list, numColumns === 1 && { paddingHorizontal: padding }]}
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
		</View>
	)
}
