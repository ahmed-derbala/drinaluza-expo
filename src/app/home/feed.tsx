import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, ActivityIndicator, Animated, useWindowDimensions, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getFeed } from '../../components/feed/feed.api'
import { FeedItem } from '../../components/feed/feed.interface'
import { useFocusEffect } from '@react-navigation/native'
import FeedCard from '../../components/feed/feed.card'
import { useTheme } from '../../contexts/ThemeContext'
import { Ionicons } from '@expo/vector-icons'
import ErrorState from '../../components/common/ErrorState'
import Toast from '../../components/common/Toast'
import SearchBar from '../../components/search/SearchBar'
import { getCurrentUser } from '../../core/auth/auth.api'
import { parseError, logError } from '../../utils/errorHandler'
import { useUser } from '../../contexts/UserContext'

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
			marginBottom: 16
		}
	})

type BasketItem = FeedItem & { quantity: number }

export default function FeedScreen() {
	const { colors } = useTheme()
	const [feedItems, setFeedItems] = useState<FeedItem[]>([])
	const [displayedItems, setDisplayedItems] = useState<FeedItem[]>([])
	const [basket, setBasket] = useState<BasketItem[]>([])
	const [refreshing, setRefreshing] = useState(false)
	const [loading, setLoading] = useState(true)
	const [isSearchActive, setIsSearchActive] = useState(false)

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

	// Error handling state
	const [error, setError] = useState<{ message: string; retry?: () => void } | null>(null)
	const [showToast, setShowToast] = useState(false)
	const [toastType, setToastType] = useState<'success' | 'error' | 'warning' | 'info'>('error')

	const { user, localize, translate } = useUser()

	const styles = useMemo(() => createStyles(colors), [colors])

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
			else setIsLoadingMore(true)

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
			setError({ message: `${localize(item.name)} added to basket`, retry: undefined })
			setToastType('success')
			setShowToast(true)
		} catch (error) {
			console.error('Failed to add to basket:', error)
			setError({ message: 'Failed to add to basket', retry: undefined })
			setToastType('error')
			setShowToast(true)
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
		setError({ message, retry })
		setToastType('error')
		setShowToast(true)
	}, [])

	const renderHeader = useCallback(
		() => (
			<View style={styles.headerContainer}>
				<View style={styles.headerTop}>
					<View>
						<Text style={styles.greeting}>
							{translate('hello', 'Hello')}, {user?.slug || 'Guest'}
						</Text>
						<Text style={styles.title}>{translate('welcome_back', 'Welcome back 👋')}</Text>
					</View>
					<TouchableOpacity style={styles.refreshButton} onPress={refreshData} disabled={refreshing}>
						<Ionicons name={refreshing ? 'hourglass-outline' : 'refresh'} size={22} color={refreshing ? colors.textSecondary : colors.primary} />
					</TouchableOpacity>
				</View>
			</View>
		),
		[styles, colors, refreshData, refreshing, user]
	)

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

	return (
		<View style={styles.container}>
			{/* Search Bar */}
			<View
				style={{
					paddingHorizontal: padding,
					paddingVertical: 10,
					backgroundColor: colors.background,
					borderBottomWidth: 1,
					borderBottomColor: colors.border
				}}
			>
				<SearchBar onSearchResults={handleSearchResults} onSearchClear={handleSearchClear} onError={handleSearchError} />
			</View>

			<Animated.FlatList
				key={numColumns}
				data={displayedItems}
				renderItem={renderItem}
				numColumns={numColumns}
				columnWrapperStyle={numColumns > 1 ? { gap, paddingHorizontal: padding, alignItems: 'stretch' } : undefined}
				keyExtractor={(item) => item._id}
				contentContainerStyle={[styles.list, numColumns === 1 && { paddingHorizontal: padding }]}
				ListHeaderComponent={renderHeader}
				ListEmptyComponent={!loading ? renderEmpty : null}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshData} colors={[colors.primary]} tintColor={colors.primary} />}
				showsVerticalScrollIndicator={false}
				keyboardShouldPersistTaps="handled"
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
