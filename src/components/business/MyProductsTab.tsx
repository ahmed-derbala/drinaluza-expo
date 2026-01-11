import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity } from 'react-native'
import SmartImage from '../common/SmartImage'
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

	const renderProductItem = ({ item }: { item: ProductType }) => {
		const imageUrl = item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url || (item.photos && item.photos.length > 0 ? item.photos[0] : null)

		return (
			<TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.7} onPress={() => {}}>
				<View style={styles.cardContent}>
					<View style={styles.imageContainer}>
						<SmartImage source={{ uri: imageUrl || '' }} style={styles.productImage} resizeMode="cover" fallbackIcon="inventory" />
					</View>
					<View style={styles.infoContainer}>
						<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
							{item.name?.en}
						</Text>
						<Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
							{item.shop?.name?.en || 'Unknown Shop'}
						</Text>
						<View style={styles.priceRow}>
							<Text style={[styles.priceText, { color: colors.primary }]}>{item.price?.total?.tnd?.toFixed(2) || '0.00'} TND</Text>
							<Text style={[styles.unitText, { color: colors.textTertiary }]}>/ {item.unit?.measure || 'unit'}</Text>
						</View>
						<View style={styles.stockRow}>
							<Ionicons name="cube-outline" size={14} color={colors.textTertiary} />
							<Text style={[styles.stockText, { color: colors.textTertiary }]}>Stock: {item.stock?.quantity || 0}</Text>
						</View>
					</View>
					<Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
				</View>
			</TouchableOpacity>
		)
	}

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
		padding: 12,
		marginHorizontal: 16,
		marginBottom: 12,
		borderRadius: 16,
		borderWidth: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.05,
		shadowRadius: 4,
		elevation: 2
	},
	cardContent: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	imageContainer: {
		width: 64,
		height: 64,
		borderRadius: 12,
		overflow: 'hidden',
		backgroundColor: 'rgba(0,0,0,0.05)'
	},
	productImage: {
		width: '100%',
		height: '100%'
	},
	infoContainer: {
		flex: 1,
		marginLeft: 16,
		marginRight: 8
	},
	cardTitle: {
		fontSize: 16,
		fontWeight: '700',
		marginBottom: 2
	},
	cardSubtitle: {
		fontSize: 13,
		marginBottom: 4
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 2
	},
	priceText: {
		fontSize: 15,
		fontWeight: '800'
	},
	unitText: {
		fontSize: 12,
		marginLeft: 4,
		fontWeight: '600'
	},
	stockRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4
	},
	stockText: {
		fontSize: 12,
		fontWeight: '500'
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
