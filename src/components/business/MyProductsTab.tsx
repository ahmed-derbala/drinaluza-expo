import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert } from 'react-native'
import { getMyProducts } from '../products/products.api'
import { ProductType } from '../products/products.type'
import { useFocusEffect } from '@react-navigation/native'

export default function MyProductsTab() {
	const [products, setProducts] = useState<ProductType[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [page, setPage] = useState(1)
	const [hasMore, setHasMore] = useState(true)

	const loadProducts = async (pageNum: number = 1, isRefresh: boolean = false) => {
		try {
			const response = await getMyProducts(pageNum, 10)
			const newProducts = response.data.data || []

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
		<View style={styles.card}>
			<Text style={styles.cardTitle}>{item.name}</Text>
			<Text style={styles.cardText}>Shop: {item.shop?.name || 'Unknown Shop'}</Text>
			<Text style={styles.cardText}>Price: {item.price?.value?.tnd ? `${item.price.value.tnd} TND` : 'Price not set'}</Text>
			<Text style={styles.cardText}>
				Unit: {item.price?.unit?.name || 'N/A'} (Min: {item.price?.unit?.min || 0})
			</Text>
			<Text style={styles.cardText}>Status: {item.isActive ? 'Active' : 'Inactive'}</Text>
			{item.availability && (
				<Text style={styles.cardText}>
					Available: {new Date(item.availability.startDate).toLocaleDateString()}
					{item.availability.endDate && ` - ${new Date(item.availability.endDate).toLocaleDateString()}`}
				</Text>
			)}
			<Text style={styles.cardText}>Created: {new Date(item.createdAt).toLocaleDateString()}</Text>
		</View>
	)

	if (loading && products.length === 0) {
		return (
			<View style={styles.container}>
				<Text style={styles.loadingText}>Loading products...</Text>
			</View>
		)
	}

	return (
		<View style={styles.container}>
			<Text style={styles.title}>My Products</Text>
			<FlatList
				data={products}
				renderItem={renderProductItem}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.list}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" colors={['#fff']} />}
				onEndReached={loadMore}
				onEndReachedThreshold={0.1}
				ListEmptyComponent={<Text style={styles.emptyText}>No products found</Text>}
			/>
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
		color: '#fff',
		marginBottom: 16,
		paddingHorizontal: 10
	},
	loadingText: {
		color: '#fff',
		fontSize: 16,
		textAlign: 'center',
		marginTop: 50
	},
	list: {
		paddingBottom: 20
	},
	card: {
		backgroundColor: '#333',
		padding: 15,
		marginHorizontal: 10,
		marginBottom: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#444'
	},
	cardTitle: {
		color: '#fff',
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 5
	},
	cardText: {
		color: '#bbb',
		fontSize: 14,
		marginBottom: 3
	},
	emptyText: {
		color: '#bbb',
		fontSize: 16,
		textAlign: 'center',
		marginTop: 50
	}
})
