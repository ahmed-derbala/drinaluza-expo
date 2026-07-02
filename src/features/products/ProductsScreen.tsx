import { HeaderRefreshButton, SmartHeader } from '@/core/smart-header'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl, Platform } from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { useTheme } from '../../core/theme'
import { useUser } from '../../core/contexts/UserContext'
import { useScrollHandler } from '../../core/hooks/useScrollHandler'
import ErrorState from '../common/ErrorState'
import ProductCard from './products.card'
import { getProducts } from './products.api'
import { ProductFeedItem } from '../feed/feed.interface'
import { showAlert } from '../../core/helpers/popup'

export default function ProductsScreen() {
	const { colors } = useTheme()
	const { translate } = useUser()
	const router = useRouter()
	const { onScroll } = useScrollHandler()

	const [products, setProducts] = useState<ProductFeedItem[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)

	const loadProducts = useCallback(async (pageNum: number = 1, isRefresh: boolean = false) => {
		try {
			if (!isRefresh && pageNum === 1) setLoading(true)
			setError(null)

			const response = await getProducts(pageNum, 10)
			// Cast docs to ProductFeedItem (they are extremely similar types)
			const newProducts = response.data.docs as unknown as ProductFeedItem[]

			if (isRefresh || pageNum === 1) {
				setProducts(newProducts)
			} else {
				setProducts((prev) => [...prev, ...newProducts])
			}

			setHasMore(response.data.pagination.hasNextPage)
			setPage(pageNum)
		} catch (err: any) {
			console.error('Failed to load products:', err)
			setError({
				title: 'Error',
				message: err.message || 'Failed to load products.',
				type: 'unknown'
			})
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}, [])

	useEffect(() => {
		loadProducts(1)
	}, [loadProducts])

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		loadProducts(1, true)
	}, [loadProducts])

	const loadMore = () => {
		if (hasMore && !loading && !refreshing) {
			loadProducts(page + 1, false)
		}
	}

	const handleAddToCart = (item: ProductFeedItem, quantity: number) => {
		// Mock implementation for add to cart
		showAlert(translate('success', 'Success'), `${quantity} x ${item.name?.en} added to cart!`)
	}

	const styles = useMemo(() => createStyles(colors), [colors])

	if (loading && products.length === 0) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (error && products.length === 0) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen
					options={
						{
							title: translate('products', 'Products'),
							headerActions: [
								{
									key: 'refresh',
									onPress: onRefresh,
									isRefreshing: refreshing,
									accessibilityLabel: 'Refresh'
								}
							]
						} as any
					}
				/>
				<ErrorState title={error.title} message={error.message} onRetry={() => loadProducts(1)} icon="alert-circle-outline" />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: translate('products', 'Products'),
						headerActions: [
							{
								key: 'refresh',
								onPress: onRefresh,
								isRefreshing: refreshing,
								accessibilityLabel: 'Refresh'
							}
						]
					} as any
				}
			/>

			<SmartHeader.FlatList
				data={products}
				renderItem={({ item }: { item: ProductFeedItem }) => <ProductCard item={item} addToCart={handleAddToCart} />}
				keyExtractor={(item: ProductFeedItem) => item._id}
				contentContainerStyle={styles.list}
				showsVerticalScrollIndicator={false}
				onScroll={onScroll}
				scrollEventThrottle={16}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				onEndReached={loadMore}
				onEndReachedThreshold={0.5}
				ListFooterComponent={() => {
					if (!hasMore) return <View style={{ height: 40 }} />
					return (
						<View style={{ paddingVertical: 20 }}>
							<ActivityIndicator size="small" color={colors.primary} />
						</View>
					)
				}}
				ListEmptyComponent={() => (
					<View style={styles.emptyContainer}>
						<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('no_products_found', 'No products found.')}</Text>
					</View>
				)}
			/>
		</View>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		container: {
			flex: 1
		},
		list: {
			padding: 16,
			gap: 16
		},
		emptyContainer: {
			padding: 40,
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: 60
		},
		emptyText: {
			fontSize: 16,
			fontWeight: '500'
		}
	})
