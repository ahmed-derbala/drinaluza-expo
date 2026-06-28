import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator, useWindowDimensions, TouchableOpacity } from 'react-native'
import { useRouter, useFocusEffect } from 'expo-router'
import { FlashList } from '@shopify/flash-list'

import { getItem, setItem } from '@/core/storage'
import { Ionicons } from '@expo/vector-icons'
import { getProducts } from '@/features/products/products.api'
import { ProductFeedItem } from '@/features/feed/feed.interface'
import ProductCard from '@/features/products/products.card'
import { Stack } from 'expo-router'
import HeaderRefreshButton from '../common/HeaderRefreshButton'
import ErrorState from '@/features/common/ErrorState'
import { parseError, logError } from '@/core/helpers/errorHandler'
import { useUser } from '@/core/contexts/UserContext'
import { useTheme } from '@/core/theme'
import { toast } from '@/features/common/Toast'
import { useResponsiveGrid } from '@/core/hooks/useResponsiveGrid'
import { getToken } from '@/core/storage'

export default function ProductsListScreen() {
	const { colors } = useTheme()
	const router = useRouter()
	const { translate } = useUser()

	const [products, setProducts] = useState<ProductFeedItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ message: string; title: string; type: string } | null>(null)

	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)
	const [isLoadingMore, setIsLoadingMore] = useState(false)

	const [cart, setCart] = useState<any[]>([])

	const { numColumns, gap, padding, itemWidth } = useResponsiveGrid()

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

	const loadProducts = async (pageNum: number = 1, shouldAppend: boolean = false) => {
		try {
			if (pageNum === 1) setLoading(true)
			else setIsLoadingMore(true)
			setError(null)

			const response = await getProducts(pageNum, 10)
			const newItems = response.data.docs as any as ProductFeedItem[]

			if (newItems.length < 10) {
				setHasMore(false)
			} else {
				setHasMore(true)
			}

			if (shouldAppend) {
				setProducts((prev) => [...prev, ...newItems])
			} else {
				setProducts(newItems)
			}
		} catch (err) {
			logError(err, 'loadProducts')
			const parsed = parseError(err)
			setError({ title: parsed.title, message: parsed.message, type: parsed.type })
		} finally {
			setLoading(false)
			setRefreshing(false)
			setIsLoadingMore(false)
		}
	}

	useEffect(() => {
		loadProducts(1, false)
	}, [])

	const handleRefresh = async () => {
		setRefreshing(true)
		setPage(1)
		setHasMore(true)
		await loadCart()
		await loadProducts(1, false)
	}

	const handleLoadMore = () => {
		if (hasMore && !loading && !isLoadingMore && !refreshing) {
			const next = page + 1
			setPage(next)
			loadProducts(next, true)
		}
	}

	const handleAddToCart = useCallback(
		async (item: ProductFeedItem, qty: number) => {
			try {
				const token = await getToken()
				if (!token) {
					toast.show({ title: 'Info', message: 'Please log in to add items to cart', color: '#3B82F6' })
					router.push('/auth')
					return
				}

				const existing = cart.findIndex((b) => b._id === item._id)
				const newCart = existing > -1 ? cart.map((b, i) => (i === existing ? { ...b, quantity: b.quantity + qty } : b)) : [...cart, { ...item, quantity: qty }]

				setCart(newCart)
				await setItem('cart', newCart)
				toast.show({ title: 'Success', message: `Added to cart`, color: '#10B981', screen: '/profile/purchases?status=cart' })
			} catch {
				toast.show({ title: 'Error', message: 'Failed to add to cart', color: '#EF4444' })
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

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={{
					title: translate('products', 'Products'),
					headerRight: () => (
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
							<TouchableOpacity
								style={{
									width: 40,
									height: 40,
									borderRadius: 10,
									backgroundColor: colors.surface,
									justifyContent: 'center',
									alignItems: 'center',
									borderWidth: 1,
									borderColor: colors.border || 'transparent'
								}}
								onPress={() => router.push('/profile/purchases?status=cart' as any)}
							>
								<Ionicons name="cart-outline" size={20} color={colors.primary} />
								{cart.length > 0 && (
									<View
										style={{
											position: 'absolute',
											top: -6,
											right: -6,
											backgroundColor: colors.error || '#ef4444',
											borderRadius: 10,
											minWidth: 20,
											height: 20,
											justifyContent: 'center',
											alignItems: 'center',
											paddingHorizontal: 4,
											borderWidth: 1.5,
											borderColor: colors.surface
										}}
									>
										<Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>{cart.length}</Text>
									</View>
								)}
							</TouchableOpacity>
							<HeaderRefreshButton onRefresh={handleRefresh} isRefreshing={refreshing} />
						</View>
					)
				}}
			/>

			{error ? (
				<ErrorState title={error.title} message={error.message} onRetry={handleRefresh} />
			) : (
				<FlashList
					data={products}
					key={numColumns}
					numColumns={numColumns}
					keyExtractor={(item: ProductFeedItem, idx: number) => item._id + '-' + idx}
					renderItem={renderItem}
					contentContainerStyle={{ paddingHorizontal: numColumns > 1 ? padding - gap / 2 : padding, paddingTop: padding, paddingBottom: 100 }}
					showsVerticalScrollIndicator={false}
					refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
					onEndReached={handleLoadMore}
					onEndReachedThreshold={0.5}
					ListEmptyComponent={() => {
						if (loading) return null
						return (
							<View style={styles.emptyContainer}>
								<Ionicons name="fish-outline" size={64} color={colors.textTertiary} style={{ marginBottom: 16 }} />
								<Text style={[styles.emptyTitle, { color: colors.text }]}>{translate('no_products', 'No products found')}</Text>
							</View>
						)
					}}
					ListFooterComponent={() => {
						if (isLoadingMore) {
							return (
								<View style={{ paddingVertical: 20, alignItems: 'center' }}>
									<ActivityIndicator size="small" color={colors.primary} />
								</View>
							)
						}
						return <View style={{ height: 20 }} />
					}}
				/>
			)}

			{loading && !refreshing && products.length === 0 && (
				<View style={styles.loadingOverlay}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			)}
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
		paddingVertical: 60
	},
	emptyTitle: {
		fontSize: 18,
		fontWeight: '600'
	},
	loadingOverlay: {
		...StyleSheet.absoluteFill,
		justifyContent: 'center',
		alignItems: 'center',
		zIndex: 10
	}
})
