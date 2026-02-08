import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity, Platform, ActivityIndicator } from 'react-native'
import SmartImage from '../../core/helpers/SmartImage'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons'
import { getMyProducts } from '../products/products.api'
import { ProductType } from '../products/products.type'
import { useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../../core/contexts/ThemeContext'

import ScreenHeader from '../common/ScreenHeader'
import { useUser } from '../../core/contexts/UserContext'

const ProductItem = ({ item }: { item: ProductType }) => {
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const router = useRouter()
	const imageUrl = item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url || (item.photos && item.photos.length > 0 ? item.photos[0] : null)

	// Stock status logic
	const stockQty = item.stock?.quantity || 0
	const minThreshold = item.stock?.minThreshold || 5
	const isLowStock = stockQty > 0 && stockQty <= minThreshold
	const isOutOfStock = stockQty === 0
	const isInStock = stockQty > minThreshold

	// Get stock status color and label
	const getStockStatus = () => {
		if (isOutOfStock) return { color: '#EF4444', bgColor: '#EF444415', label: translate('out_of_stock', 'Out of Stock'), icon: 'alert-circle' as const }
		if (isLowStock) return { color: '#F59E0B', bgColor: '#F59E0B15', label: translate('low_stock', 'Low Stock'), icon: 'warning' as const }
		return { color: '#10B981', bgColor: '#10B98115', label: translate('in_stock', 'In Stock'), icon: 'checkmark-circle' as const }
	}
	const stockStatus = getStockStatus()

	return (
		<TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.85} onPress={() => {}}>
			{/* Gradient overlay */}
			<LinearGradient colors={[`${colors.primary}06`, `transparent`, `${colors.primary}03`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGradient} />

			{/* Main content */}
			<View style={styles.cardContent}>
				{/* Product Image */}
				<View style={styles.imageWrapper}>
					<SmartImage source={imageUrl} style={styles.productImage} resizeMode="cover" entityType="product" containerStyle={styles.imageContainer} />

					{/* Stock status overlay on image */}
					{(isOutOfStock || isLowStock) && (
						<View style={[styles.imageOverlay, { backgroundColor: isOutOfStock ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.4)' }]}>
							<Ionicons name={stockStatus.icon} size={20} color="#fff" />
						</View>
					)}
				</View>

				{/* Info section */}
				<View style={styles.infoContainer}>
					{/* Product name */}
					<Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
						{localize(item.name) || item.name?.en}
					</Text>

					{/* Shop info */}
					<View style={styles.shopRow}>
						<View style={[styles.shopBadge, { backgroundColor: `${colors.primary}10` }]}>
							<Ionicons name="storefront" size={10} color={colors.primary} />
						</View>
						<Text style={[styles.shopName, { color: colors.textSecondary }]} numberOfLines={1}>
							{localize(item.shop?.name) || item.shop?.name?.en || 'Unknown Shop'}
						</Text>
					</View>

					{/* Price section */}
					<View style={styles.priceContainer}>
						<Text style={[styles.priceValue, { color: colors.primary }]}>{item.price?.total?.tnd?.toFixed(2) || '0.00'}</Text>
						<Text style={[styles.priceCurrency, { color: colors.primary }]}> TND</Text>
						<Text style={[styles.priceUnit, { color: colors.textTertiary }]}>/{item.unit?.measure || 'unit'}</Text>
					</View>

					{/* Bottom row: Stock status + quantity */}
					<View style={styles.bottomRow}>
						<View style={[styles.statusPill, { backgroundColor: stockStatus.bgColor }]}>
							<Ionicons name={stockStatus.icon} size={12} color={stockStatus.color} />
							<Text style={[styles.statusText, { color: stockStatus.color }]}>{stockStatus.label}</Text>
						</View>
						<View style={[styles.quantityBadge, { backgroundColor: colors.surface }]}>
							<Ionicons name="cube-outline" size={14} color={colors.textSecondary} />
							<Text style={[styles.quantityText, { color: colors.text }]}>{stockQty}</Text>
						</View>
					</View>
				</View>

				{/* Arrow indicator */}
				<View style={[styles.arrowContainer, { backgroundColor: `${colors.primary}08` }]}>
					<Ionicons name="chevron-forward" size={20} color={colors.primary} />
				</View>
			</View>
		</TouchableOpacity>
	)
}

export default function MyProductsTab() {
	const router = useRouter()
	const { colors } = useTheme()
	const { translate } = useUser()
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

	if (loading && products.length === 0) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Text style={[styles.loadingText, { color: colors.text }]}>Loading products...</Text>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader title={translate('business.my_products', 'My Products')} showBack={true} onRefresh={onRefresh} isRefreshing={refreshing} />
			<FlatList
				data={products}
				renderItem={({ item }) => <ProductItem item={item} />}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.list}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onEndReached={loadMore}
				onEndReachedThreshold={0.1}
				ListEmptyComponent={
					<View style={styles.emptyContainer}>
						<LinearGradient colors={[`${colors.primary}15`, `${colors.primary}05`]} style={styles.emptyIconContainer}>
							<Ionicons name="fish-outline" size={48} color={colors.primary} />
						</LinearGradient>
						<Text style={[styles.emptyTitleText, { color: colors.text }]}>No Products Yet</Text>
						<Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>Add your seafood products to your shops to start selling.</Text>
						<TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/home/business/create-product')}>
							<Ionicons name="add" size={32} color="#fff" />
						</TouchableOpacity>
					</View>
				}
			/>

			{/* FAB to create product */}
			<TouchableOpacity style={styles.fabContainer} onPress={() => router.push('/home/business/create-product')}>
				<LinearGradient colors={[colors.primary, `${colors.primary}E6`]} style={styles.fab}>
					<Ionicons name="add" size={30} color="#fff" />
				</LinearGradient>
			</TouchableOpacity>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	loadingText: {
		fontSize: 16,
		textAlign: 'center',
		marginTop: 50
	},
	list: {
		padding: 16,
		paddingBottom: 100
	},
	card: {
		padding: 16,
		marginBottom: 14,
		borderRadius: 24,
		borderWidth: 1,
		overflow: 'hidden',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 6 },
				shadowOpacity: 0.12,
				shadowRadius: 12
			},
			android: {
				elevation: 4
			}
		})
	},
	cardGradient: {
		...StyleSheet.absoluteFillObject
	},
	cardContent: {
		flexDirection: 'row',
		alignItems: 'flex-start'
	},
	imageWrapper: {
		position: 'relative'
	},
	imageContainer: {
		width: 90,
		height: 90,
		borderRadius: 18,
		overflow: 'hidden',
		backgroundColor: 'rgba(0,0,0,0.05)'
	},
	productImage: {
		width: '100%',
		height: '100%'
	},
	imageOverlay: {
		...StyleSheet.absoluteFillObject,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center'
	},
	infoContainer: {
		flex: 1,
		marginLeft: 14,
		marginRight: 8,
		paddingVertical: 2
	},
	productName: {
		fontSize: 16,
		fontWeight: '700',
		letterSpacing: -0.3,
		lineHeight: 22,
		marginBottom: 6
	},
	shopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginBottom: 8
	},
	shopBadge: {
		width: 20,
		height: 20,
		borderRadius: 6,
		justifyContent: 'center',
		alignItems: 'center'
	},
	shopName: {
		fontSize: 12,
		fontWeight: '500',
		flex: 1
	},
	priceContainer: {
		flexDirection: 'row',
		alignItems: 'baseline',
		marginBottom: 10
	},
	priceValue: {
		fontSize: 20,
		fontWeight: '800',
		letterSpacing: -0.5
	},
	priceCurrency: {
		fontSize: 13,
		fontWeight: '700'
	},
	priceUnit: {
		fontSize: 12,
		fontWeight: '500'
	},
	bottomRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	statusPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 12
	},
	statusText: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.3
	},
	quantityBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		paddingHorizontal: 10,
		paddingVertical: 5,
		borderRadius: 10
	},
	quantityText: {
		fontSize: 14,
		fontWeight: '700'
	},
	arrowContainer: {
		width: 36,
		height: 36,
		borderRadius: 12,
		justifyContent: 'center',
		alignItems: 'center',
		alignSelf: 'center'
	},
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 40,
		marginTop: 60
	},
	emptyIconContainer: {
		width: 100,
		height: 100,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 24
	},
	emptyTitleText: {
		fontSize: 22,
		fontWeight: '800',
		marginBottom: 12,
		textAlign: 'center'
	},
	emptySubtext: {
		fontSize: 15,
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: 32
	},
	emptyButton: {
		paddingHorizontal: 28,
		paddingVertical: 14,
		borderRadius: 16,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.2,
				shadowRadius: 8
			},
			android: {
				elevation: 4
			}
		})
	},
	emptyButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700'
	},
	fabContainer: {
		position: 'absolute',
		right: 24,
		bottom: 24,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.25,
				shadowRadius: 12
			},
			android: {
				elevation: 8
			}
		})
	},
	fab: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: 'center',
		justifyContent: 'center'
	}
})
