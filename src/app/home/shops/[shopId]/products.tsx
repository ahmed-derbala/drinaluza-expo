import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, FlatList, RefreshControl, ActivityIndicator } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { getShopProducts } from '../../../../components/shops/shops.api'
import { Product } from '../../../../components/shops/shops.interface'
import { useTheme } from '../../../../contexts/ThemeContext'

export default function ShopProductsScreen() {
	const { shopId, shopName } = useLocalSearchParams<{ shopId: string; shopName?: string }>()
	const { colors } = useTheme()
	const [products, setProducts] = useState<Product[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Header is now handled by Stack.Screen options below

	const loadProducts = async () => {
		if (!shopId) return

		try {
			setRefreshing(true)
			setError(null)
			const response = await getShopProducts(shopId)
			setProducts(response.data.data || [])
		} catch (err) {
			console.error('Failed to load products:', err)
			setError('Failed to load products. Please try again.')
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		loadProducts()
	}, [shopId])

	const handleRefresh = () => {
		loadProducts()
	}

	const renderProductItem = ({ item }: { item: Product }) => (
		<View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
			<Text style={[styles.productName, { color: colors.text }]}>{item.name}</Text>
			<Text style={[styles.productPrice, { color: colors.primary }]}>{item.price?.value?.tnd?.toFixed(2) || 'N/A'} TND</Text>
			<Text style={[styles.productStock, { color: colors.textSecondary }]}>{item.stock?.quantity || 0} in stock</Text>
		</View>
	)

	if (loading && !refreshing) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={{
					headerTitle: shopName || 'Products',
					headerBackTitle: 'Back'
				}}
			/>
			<FlatList
				data={products}
				renderItem={renderProductItem}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.listContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				ListEmptyComponent={
					!loading && !refreshing ? (
						<View style={styles.emptyContainer}>
							<Text style={[styles.emptyText, { color: colors.text }]}>{error || 'No products found for this shop.'}</Text>
						</View>
					) : null
				}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	listContent: {
		padding: 16,
		flexGrow: 1
	},
	productCard: {
		borderRadius: 8,
		padding: 16,
		marginBottom: 12,
		borderWidth: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		elevation: 2
	},
	productName: {
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 4
	},
	productPrice: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 4
	},
	productStock: {
		fontSize: 14
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20
	},
	emptyText: {
		fontSize: 16,
		textAlign: 'center'
	}
})
