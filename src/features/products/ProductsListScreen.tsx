import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { View, StyleSheet, RefreshControl } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'

import { getItem, setItem } from '@/core/storage'
import { useProducts } from '@/features/products/useProducts'
import { getProducts } from '@/features/products/products.api'
import { ProductFeedItem } from '@/features/feed/feed.interface'
import ProductCard from '@/features/products/products.card'
import { Stack } from 'expo-router'
import { HeaderRefreshButton, SmartHeader } from '@/core/smart-header'
import ErrorState from '@/features/common/ErrorState'
import EmptyState from '@/features/common/EmptyState'
import Spinner from '@/features/common/Spinner'
import { useUser } from '@/core/contexts/UserContext'
import { useTheme, themeColors } from '@/core/theme'
import { toast } from '@/features/common/Toast'
import { useResponsiveGrid } from '@/core/hooks/useResponsiveGrid'
import { getToken } from '@/core/storage'

export default function ProductsListScreen() {
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

	const { numColumns, gap, padding, itemWidth } = useResponsiveGrid()

	// Reset appended pages whenever the cached page 1 refreshes (manual or auto on backend online)
	useEffect(() => {
		setExtraProducts([])
		setPage(1)
		setHasMore(true)
	}, [page1Response])

	const loadCart = async () => {
		try {
			const saved = await getItem<any[]>('cart')
			if (saved) setCart(saved)
		} catch {}
	}

	useFocusEffect(
		useCallback(() => {
			loadCart()
		}, [])
	)

	const loadMoreProducts = async (nextPage: number) => {
		try {
			setIsLoadingMore(true)
			const response = await getProducts(nextPage, 10)
			const newItems = response.data.docs as unknown as ProductFeedItem[]

			if (newItems.length < 10) {
				setHasMore(false)
			} else {
				setHasMore(true)
			}

			setExtraProducts((prev) => [...prev, ...newItems])
		} catch (err) {
			toast.show({ title: 'Error', content: 'Failed to load more products', borderColor: themeColors.error })
		} finally {
			setIsLoadingMore(false)
		}
	}

	const handleRefresh = async () => {
		setPage(1)
		setHasMore(true)
		await loadCart()
		await refresh()
	}

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
					router.push('/auth')
					return
				}

				const existing = cart.findIndex((b) => b._id === item._id)
				const newCart = existing > -1 ? cart.map((b, i) => (i === existing ? { ...b, quantity: b.quantity + qty } : b)) : [...cart, { ...item, quantity: qty }]

				setCart(newCart)
				await setItem('cart', newCart)
				toast.show({ title: 'Success', content: `Added to cart`, borderColor: themeColors.success, screen: user ? '/purchases?status=cart' : '/auth' })
			} catch {
				toast.show({ title: 'Error', content: 'Failed to add to cart', borderColor: themeColors.error })
			}
		},
		[cart, router]
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
					<ErrorState />
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
		if (isLoadingMore) {
			return <Spinner size="small" expand={false} />
		}
		return <View style={{ height: 20 }} />
	}, [isLoadingMore, colors.primary])

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

			<SmartHeader.FlashList
				data={products}
				key={numColumns}
				numColumns={numColumns}
				keyExtractor={(item: ProductFeedItem) => item._id}
				renderItem={renderItem}
				estimatedItemSize={260}
				contentContainerStyle={{ paddingHorizontal: numColumns > 1 ? padding - gap / 2 : padding, paddingTop: padding, paddingBottom: 100 }}
				showsVerticalScrollIndicator={false}
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				onEndReached={handleLoadMore}
				onEndReachedThreshold={0.5}
				ListEmptyComponent={renderEmpty}
				ListFooterComponent={renderFooter}
			/>

			{isInitialLoading && !isRefreshing && products.length === 0 && <Spinner style={styles.loadingOverlay} />}
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	emptyContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 120
	},
	loadingOverlay: {
		...StyleSheet.absoluteFill,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 10
	}
})
