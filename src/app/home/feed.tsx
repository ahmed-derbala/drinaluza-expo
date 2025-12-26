import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ScrollView, ActivityIndicator, Image, Animated, useWindowDimensions } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getFeed } from '../../components/feed/feed.api'
import { FeedItem } from '../../components/feed/feed.interface'
import { useFocusEffect } from '@react-navigation/native'
import { useRouter } from 'expo-router'
import ProductCard from '../../components/products/products.card'
import { useTheme } from '../../contexts/ThemeContext'
import { Ionicons } from '@expo/vector-icons'
import Toast from '../../components/common/Toast'
import SearchBar from '../../components/search/SearchBar'
import { getCurrentUser } from '../../core/auth/auth.api'
import { parseError, logError } from '../../utils/errorHandler'

const createStyles = (colors: any, isDark: boolean) =>
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
			marginBottom: 20
		},
		greeting: {
			fontSize: 16,
			color: colors.textSecondary,
			fontWeight: '500'
		},
		title: {
			fontSize: 28,
			fontWeight: 'bold',
			color: colors.text
		},
		headerActions: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 12
		},
		refreshButton: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: colors.card,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1,
			borderColor: colors.border
		},
		notificationButton: {
			width: 44,
			height: 44,
			borderRadius: 22,
			backgroundColor: colors.card,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1,
			borderColor: colors.border
		},
		badge: {
			position: 'absolute',
			top: 10,
			right: 12,
			width: 8,
			height: 8,
			borderRadius: 4,
			backgroundColor: colors.error,
			borderWidth: 1,
			borderColor: colors.card
		},
		categoriesContainer: {
			paddingRight: 20
		},
		categoryPill: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 16,
			paddingVertical: 10,
			borderRadius: 24,
			backgroundColor: colors.card,
			marginRight: 10,
			borderWidth: 1,
			borderColor: colors.border
		},
		categoryPillActive: {
			backgroundColor: colors.primary,
			borderColor: colors.primary
		},
		categoryText: {
			fontSize: 14,
			fontWeight: '600',
			color: colors.textSecondary
		},
		categoryTextActive: {
			color: '#fff'
		},
		cardWrapper: {
			marginBottom: 16
		},
		emptyContainer: {
			alignItems: 'center',
			justifyContent: 'center',
			paddingTop: 60
		},
		emptyImage: {
			width: 120,
			height: 120,
			marginBottom: 20,
			opacity: 0.7
		},
		emptyTitle: {
			fontSize: 18,
			fontWeight: '600',
			color: colors.text,
			marginBottom: 8
		},
		emptyText: {
			fontSize: 14,
			color: colors.textSecondary
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
		}
	})

const CATEGORIES = [
	{ id: 'all', name: 'All', icon: 'grid-outline' },
	{ id: 'vegetables', name: 'Vegetables', icon: 'nutrition-outline' },
	{ id: 'fruits', name: 'Fruits', icon: 'leaf-outline' },
	{ id: 'dairy', name: 'Dairy', icon: 'water-outline' },
	{ id: 'bakery', name: 'Bakery', icon: 'restaurant-outline' }
]

type BasketItem = FeedItem & { quantity: number }

export default function FeedScreen() {
	const { colors, isDark } = useTheme()
	const [feedItems, setFeedItems] = useState<FeedItem[]>([])
	const [displayedItems, setDisplayedItems] = useState<FeedItem[]>([])
	const [basket, setBasket] = useState<BasketItem[]>([])
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [selectedCategory, setSelectedCategory] = useState('all')
	const [isSearchActive, setIsSearchActive] = useState(false)

	const { width } = useWindowDimensions()
	const minColumnWidth = 300
	const numColumns = Math.max(1, Math.floor(width / minColumnWidth))
	const gap = 16
	const padding = 16
	const itemWidth = (width - padding * 2 - gap * (numColumns - 1)) / numColumns

	// Pagination state
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [isLoadingMore, setIsLoadingMore] = useState(false)

	// Animation state
	const scrollY = useRef(new Animated.Value(0)).current
	const searchBarHeight = 140 // Adjusted for SearchBar + Filters height
	const diffClamp = Animated.diffClamp(scrollY, 0, searchBarHeight)
	const translateY = diffClamp.interpolate({
		inputRange: [0, searchBarHeight],
		outputRange: [0, -searchBarHeight],
		extrapolate: 'clamp'
	})

	// Error handling state
	const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null)
	const [showToast, setShowToast] = useState(false)
	const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('error')
	const [user, setUser] = useState<{ slug: string; role: string } | null>(null)

	useEffect(() => {
		const loadUser = async () => {
			const userData = await getCurrentUser()
			setUser(userData)
		}
		loadUser()
	}, [])

	const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark])

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

	const fetchFeed = async (pageNum: number = 1, shouldAppend: boolean = false) => {
		try {
			if (pageNum === 1) setLoading(true)

			const response = await getFeed(pageNum, 10)
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
				retry: errorInfo.canRetry ? () => fetchFeed(pageNum, shouldAppend) : undefined
			})
			setToastType('error')
			setShowToast(true)
		} finally {
			setLoading(false)
			setIsLoadingMore(false)
		}
	}

	const refreshData = useCallback(async () => {
		setRefreshing(true)
		setPage(1)
		setHasMore(true)
		await Promise.all([loadBasket(), fetchFeed(1, false)])
		setRefreshing(false)
	}, [])

	const handleLoadMore = useCallback(() => {
		if (!isSearchActive && hasMore && !loading && !isLoadingMore) {
			const nextPage = page + 1
			setPage(nextPage)
			fetchFeed(nextPage, true)
		}
	}, [isSearchActive, hasMore, loading, isLoadingMore, page])

	useFocusEffect(
		useCallback(() => {
			refreshData()
		}, [refreshData])
	)

	const addToBasket = async (item: FeedItem, quantity: number) => {
		try {
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
			setError({ message: `${item.name} added to basket`, retry: undefined })
			setToastType('success')
			setShowToast(true)
		} catch (error) {
			console.error('Failed to add to basket:', error)
			setError({ message: 'Failed to add to basket', retry: undefined })
			setToastType('error')
			setShowToast(true)
		}
	}

	// Handle search results
	const handleSearchResults = useCallback((results: FeedItem[]) => {
		setIsSearchActive(true)
		setDisplayedItems(results)
	}, [])

	// Handle search clear
	const handleSearchClear = useCallback(() => {
		setIsSearchActive(false)
		setDisplayedItems(feedItems)
	}, [feedItems])

	// Handle search errors
	const handleSearchError = useCallback((message: string, retry?: () => void) => {
		setError({ message, retry })
		setToastType('error')
		setShowToast(true)
	}, [])

	const router = useRouter()

	const renderHeader = useCallback(
		() => (
			<View style={styles.headerContainer}>
				<View style={styles.headerTop}>
					<View>
						<Text style={styles.greeting}>Hello, {user?.slug || 'User'}</Text>
						<Text style={styles.title}>Welcome back</Text>
					</View>
					<View style={styles.headerActions}>
						<TouchableOpacity style={styles.refreshButton} onPress={() => router.push('/home/settings')}>
							<Ionicons name="settings-outline" size={24} color={colors.text} />
						</TouchableOpacity>
						<TouchableOpacity style={styles.refreshButton} onPress={refreshData} disabled={refreshing}>
							<Ionicons name={refreshing ? 'hourglass-outline' : 'refresh-outline'} size={24} color={refreshing ? colors.textSecondary : colors.text} />
						</TouchableOpacity>
						<TouchableOpacity style={styles.notificationButton}>
							<Ionicons name="notifications-outline" size={24} color={colors.text} />
							<View style={styles.badge} />
						</TouchableOpacity>
					</View>
				</View>

				{/* SearchBar moved out of here */}
			</View>
		),
		[selectedCategory, styles, colors.text, colors.textSecondary, refreshData, refreshing, router]
	)

	const renderFooter = () => {
		if (!isLoadingMore) return null
		return (
			<View style={{ paddingVertical: 20 }}>
				<ActivityIndicator size="small" color={colors.primary} />
			</View>
		)
	}

	const renderEmpty = () => (
		<View style={styles.emptyContainer}>
			<Image source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076432.png' }} style={styles.emptyImage} />
			<Text style={styles.emptyTitle}>No products found</Text>
			<Text style={styles.emptyText}>Try adjusting your search or filters</Text>
		</View>
	)

	const renderItem = ({ item }: { item: FeedItem }) => (
		<View style={[styles.cardWrapper, { width: numColumns > 1 ? itemWidth : '100%' }]}>
			<ProductCard item={item} addToBasket={addToBasket} />
		</View>
	)

	return (
		<View style={styles.container}>
			<Animated.View
				style={{
					position: 'absolute',
					top: 0,
					left: 0,
					right: 0,
					zIndex: 100,
					transform: [{ translateY }],
					backgroundColor: colors.background,
					paddingHorizontal: 20,
					paddingTop: 10, // Add some top padding for status bar area if needed, or rely on SafeAreaView
					paddingBottom: 10
				}}
			>
				<SearchBar onSearchResults={handleSearchResults} onSearchClear={handleSearchClear} onError={handleSearchError} />
			</Animated.View>

			<Animated.FlatList
				key={numColumns}
				data={displayedItems}
				renderItem={renderItem}
				numColumns={numColumns}
				columnWrapperStyle={numColumns > 1 ? { gap, paddingHorizontal: padding } : undefined}
				keyExtractor={(item) => item._id}
				contentContainerStyle={[styles.list, { paddingTop: searchBarHeight + 20 }, numColumns === 1 && { paddingHorizontal: padding }]}
				ListHeaderComponent={renderHeader}
				ListEmptyComponent={!loading ? renderEmpty : null}
				refreshControl={
					<RefreshControl
						refreshing={refreshing}
						onRefresh={refreshData}
						colors={[colors.primary]}
						tintColor={colors.primary}
						progressViewOffset={searchBarHeight} // Offset refresh indicator
					/>
				}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
				onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
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
			<Toast visible={showToast} message={error?.message || ''} type={toastType} onHide={() => setShowToast(false)} onRetry={error?.retry} />
		</View>
	)
}
