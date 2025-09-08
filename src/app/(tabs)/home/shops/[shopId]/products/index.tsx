import { Stack, useLocalSearchParams, useRouter } from 'expo-router'
import { View, Text, StyleSheet, ActivityIndicator, FlatList, TouchableOpacity, StatusBar } from 'react-native'
import { useTheme } from '@/contexts/ThemeContext'
import { useEffect, useState } from 'react'
import { getShopProducts } from '@/components/shops/shops.api'

interface Product {
	_id: string
	name: string
	price: {
		value: {
			tnd: number
		}
		unit: {
			name: string
			min: number
		}
	}
	stock: {
		quantity: number
	}
	isActive: boolean
}

export default function ShopProductsScreen() {
	const { shopId } = useLocalSearchParams<{ shopId: string }>()
	const { colors } = useTheme()
	const [isLoading, setIsLoading] = useState(true)
	const [products, setProducts] = useState<Product[]>([])
	const [error, setError] = useState<string | null>(null)
	const [refreshing, setRefreshing] = useState(false)

	const loadProducts = async (showLoading = true) => {
		if (!shopId) return

		try {
			if (showLoading) setIsLoading(true)
			const response = await getShopProducts(shopId)
			setProducts(response.data?.data || [])
		} catch (err) {
			console.error('Failed to fetch products:', err)
			setError('Failed to load products. Please try again.')
		} finally {
			setIsLoading(false)
			setRefreshing(false)
		}
	}

	useEffect(() => {
		loadProducts()
	}, [shopId])

	const handleRefresh = () => {
		setRefreshing(true)
		loadProducts(false)
	}

	const renderProductItem = ({ item }: { item: Product }) => (
		<View
			style={{
				backgroundColor: colors.card,
				borderRadius: 12,
				padding: 16,
				marginBottom: 12,
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 4,
				elevation: 2,
				marginHorizontal: 16,
				marginTop: 12
			}}
		>
			<View
				style={{
					flexDirection: 'row',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: 12
				}}
			>
				<Text
					style={{
						fontSize: 18,
						fontWeight: '600',
						flex: 1,
						color: colors.text,
						marginRight: 8
					}}
				>
					{item.name}
				</Text>
				<View
					style={{
						paddingHorizontal: 8,
						paddingVertical: 4,
						borderRadius: 12,
						backgroundColor: item.isActive ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)'
					}}
				>
					<Text
						style={{
							color: item.isActive ? '#4CAF50' : '#F44336',
							fontSize: 12,
							fontWeight: '600'
						}}
					>
						{item.isActive ? 'Active' : 'Inactive'}
					</Text>
				</View>
			</View>

			<View
				style={{
					flexDirection: 'row',
					justifyContent: 'space-between',
					alignItems: 'center'
				}}
			>
				<Text
					style={{
						fontSize: 16,
						fontWeight: '600',
						color: colors.primary
					}}
				>
					{item.price.value.tnd} TND / {item.price.unit.name}
				</Text>
				<Text
					style={{
						fontSize: 14,
						color: colors.textSecondary
					}}
				>
					In Stock: {item.stock.quantity}
				</Text>
			</View>
		</View>
	)

	if (isLoading && !refreshing) {
		return (
			<View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
				<StatusBar barStyle="light-content" backgroundColor={colors.primary} />
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (error) {
		return (
			<View style={{ flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }}>
				<StatusBar barStyle="light-content" backgroundColor={colors.primary} />
				<Text style={{ color: colors.text, marginBottom: 16 }}>{error}</Text>
				<TouchableOpacity
					style={{
						paddingHorizontal: 20,
						paddingVertical: 10,
						backgroundColor: colors.primary,
						borderRadius: 8
					}}
					onPress={() => loadProducts()}
				>
					<Text style={{ color: 'white', fontWeight: '600' }}>Retry</Text>
				</TouchableOpacity>
			</View>
		)
	}

	return (
		<View style={{ flex: 1 }}>
			<StatusBar barStyle="light-content" backgroundColor={colors.primary} />
			<Stack.Screen
				options={{
					title: 'Products',
					headerShown: true
				}}
			/>

			<FlatList
				data={products}
				renderItem={renderProductItem}
				keyExtractor={(item) => item._id}
				contentContainerStyle={[styles.listContent, { backgroundColor: colors.background }]}
				style={{ flex: 1, backgroundColor: colors.background }}
				refreshing={refreshing}
				onRefresh={handleRefresh}
				ListEmptyComponent={
					<View style={[styles.emptyContainer, { backgroundColor: colors.background }]}>
						<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No products found</Text>
					</View>
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
		padding: 16
	},
	productCard: {
		borderRadius: 12,
		padding: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2
	},
	productHeader: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12
	},
	productName: {
		fontSize: 18,
		fontWeight: '600',
		flex: 1
	},
	statusBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 12,
		marginLeft: 8
	},
	productDetails: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center'
	},
	price: {
		fontSize: 16,
		fontWeight: '600'
	},
	stock: {
		fontSize: 14
	},
	emptyContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 32
	},
	emptyText: {
		fontSize: 16,
		textAlign: 'center'
	},
	retryButton: {
		paddingHorizontal: 20,
		paddingVertical: 10,
		borderRadius: 8
	},
	buttonText: {
		color: '#fff',
		fontWeight: '600',
		textAlign: 'center'
	}
})
