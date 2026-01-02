import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { getMyProducts } from '../products/products.api'
import { ProductType } from '../products/products.type'
import { useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../../contexts/ThemeContext'

export default function MyProductsTab() {
	const router = useRouter()
	const { colors } = useTheme()
	const [products, setProducts] = useState<ProductType[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)

	const loadProducts = async (pageNum: number = 1, isRefresh: boolean = false) => {
		try {
			const response = await getMyProducts(pageNum, 10)
			const newProducts = response.data.docs || []

			if (isRefresh || pageNum === 1) {
				setProducts(newProducts)
			} else {
				setProducts((prev) => [...prev, ...newProducts])
			}

			setHasMore(response.data.pagination.hasNextPage)
			setPage(pageNum)
		} catch (error) {
			console.error('Failed to load products:', error)
			Alert.alert('Error', 'Failed to load products data')
		} finally {
			setLoading(false)
			setRefreshing(false)
		}
	}

	useFocusEffect(
		useCallback(() => {
			loadProducts(1, true)
		}, [])
	)

	const onRefresh = useCallback(() => {
		setRefreshing(true)
		loadProducts(1, true)
	}, [])

	const loadMore = () => {
		if (hasMore && !loading && !refreshing) {
			loadProducts(page + 1, false)
		}
	}

	const renderProductItem = ({ item }: { item: ProductType }) => (
		<View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
			<Text style={[styles.cardTitle, { color: colors.text }]}>{item.name?.en}</Text>
			<Text style={[styles.cardText, { color: colors.textSecondary }]}>Shop: {item.shop?.name?.en || 'Unknown Shop'}</Text>
			<Text style={[styles.cardText, { color: colors.textSecondary }]}>Price: {item.price?.value?.tnd ? `${item.price.value.tnd} TND` : 'Price not set'}</Text>
			<Text style={[styles.cardText, { color: colors.textSecondary }]}>
				Unit: {item.price?.unit?.name || 'N/A'} (Min: {item.price?.unit?.min || 0})
			</Text>
			<Text style={[styles.cardText, { color: item.isActive ? '#4CAF50' : '#F44336' }]}>Status: {item.isActive ? 'Active' : 'Inactive'}</Text>
			{item.availability && (
				<Text style={[styles.cardText, { color: colors.textSecondary }]}>
					Available: {new Date(item.availability.startDate).toLocaleDateString()}
					{item.availability.endDate && ` - ${new Date(item.availability.endDate).toLocaleDateString()}`}
				</Text>
			)}
			<Text style={[styles.cardText, { color: colors.textTertiary }]}>Created: {new Date(item.createdAt).toLocaleDateString()}</Text>
		</View>
	)

	if (loading && products.length === 0) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Text style={[styles.loadingText, { color: colors.text }]}>Loading products...</Text>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Text style={[styles.title, { color: colors.text }]}>My Products</Text>
			<FlatList
				data={products}
				renderItem={renderProductItem}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.list}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onEndReached={loadMore}
				onEndReachedThreshold={0.1}
				ListEmptyComponent={<Text style={[styles.emptyText, { color: colors.textSecondary }]}>No products found</Text>}
			/>

			{/* FAB to create product */}
			<TouchableOpacity style={[styles.fab, { backgroundColor: colors.primary }]} onPress={() => router.push('/home/business/create-product')}>
				<Ionicons name="add" size={28} color="#fff" />
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		padding: 10
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 16,
		paddingHorizontal: 10
	},
	loadingText: {
		fontSize: 16,
		textAlign: 'center',
		marginTop: 50
	},
	list: {
		paddingBottom: 20
	},
	card: {
		padding: 15,
		marginHorizontal: 10,
		marginBottom: 10,
		borderRadius: 8,
		borderWidth: 1
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 5
	},
	cardText: {
		fontSize: 14,
		marginBottom: 3
	},
	emptyText: {
		fontSize: 16,
		textAlign: 'center',
		marginTop: 50
	},
	fab: {
		position: 'absolute',
		right: 20,
		bottom: 20,
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.3,
		shadowRadius: 4
	}
})
