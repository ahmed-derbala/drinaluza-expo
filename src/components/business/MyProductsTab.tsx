import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, FlatList, StyleSheet, RefreshControl, Alert, TouchableOpacity, Platform } from 'react-native'
import SmartImage from '../common/SmartImage'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons'
import { getMyProducts } from '../products/products.api'
import { ProductType } from '../products/products.type'
import { useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../../contexts/ThemeContext'

import ScreenHeader from '../common/ScreenHeader'
import { useUser } from '../../contexts/UserContext'

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

	const renderProductItem = ({ item }: { item: ProductType }) => {
		const imageUrl = item.media?.thumbnail?.url || item.defaultProduct?.media?.thumbnail?.url || (item.photos && item.photos.length > 0 ? item.photos[0] : null)
		const { localize, translate } = useUser()

		return (
			<TouchableOpacity style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8} onPress={() => {}}>
				<LinearGradient colors={[`${colors.primary}08`, `transparent`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGradient} />
				<View style={styles.cardContent}>
					<View style={styles.imageContainer}>
						<SmartImage source={imageUrl} style={styles.productImage} resizeMode="cover" entityType="product" />
						{item.stock?.quantity && item.stock.quantity <= (item.stock.minThreshold || 5) && (
							<View style={styles.lowStockBadge}>
								<Text style={styles.lowStockText}>Low</Text>
							</View>
						)}
					</View>
					<View style={styles.infoContainer}>
						<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
							{localize(item.name) || item.name?.en}
						</Text>
						<View style={styles.shopRow}>
							<Ionicons name="storefront-outline" size={12} color={colors.textSecondary} />
							<Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
								{localize(item.shop?.name) || item.shop?.name?.en || 'Unknown Shop'}
							</Text>
						</View>
						<View style={styles.footerRow}>
							<Text style={[styles.priceText, { color: colors.primary }]}>
								{item.price?.total?.tnd?.toFixed(2) || '0.00'} <Text style={styles.currencyText}>TND</Text>
								<Text style={[styles.unitText, { color: colors.textTertiary }]}> / {item.unit?.measure || 'unit'}</Text>
							</Text>
							<View style={styles.stockBadge}>
								<Ionicons name="cube-outline" size={12} color={colors.textSecondary} />
								<Text style={[styles.stockText, { color: colors.textSecondary }]}>{item.stock?.quantity || 0}</Text>
							</View>
						</View>
					</View>
					<View style={styles.arrowContainer}>
						<Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
					</View>
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
			<ScreenHeader title={translate('business.my_products', 'My Products')} showBack={true} />
			<FlatList
				data={products}
				renderItem={renderProductItem}
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
		padding: 20,
		paddingBottom: 100
	},
	card: {
		padding: 16,
		marginBottom: 16,
		borderRadius: 20,
		borderWidth: 1,
		overflow: 'hidden',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.1,
				shadowRadius: 8
			},
			android: {
				elevation: 3
			}
		})
	},
	cardGradient: {
		...StyleSheet.absoluteFillObject
	},
	cardContent: {
		flexDirection: 'row',
		alignItems: 'center'
	},
	imageContainer: {
		width: 80,
		height: 80,
		borderRadius: 16,
		overflow: 'hidden',
		backgroundColor: 'rgba(0,0,0,0.05)',
		position: 'relative'
	},
	productImage: {
		width: '100%',
		height: '100%'
	},
	lowStockBadge: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: '#EF4444',
		paddingVertical: 2,
		alignItems: 'center'
	},
	lowStockText: {
		color: '#fff',
		fontSize: 9,
		fontWeight: '800',
		textTransform: 'uppercase'
	},
	infoContainer: {
		flex: 1,
		marginLeft: 16,
		marginRight: 8
	},
	cardTitle: {
		fontSize: 17,
		fontWeight: '700',
		marginBottom: 4,
		letterSpacing: -0.3
	},
	shopRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginBottom: 8
	},
	cardSubtitle: {
		fontSize: 13,
		fontWeight: '500'
	},
	footerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between'
	},
	priceText: {
		fontSize: 16,
		fontWeight: '800'
	},
	currencyText: {
		fontSize: 12,
		fontWeight: '600'
	},
	unitText: {
		fontSize: 12,
		fontWeight: '500'
	},
	stockBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: 'rgba(0,0,0,0.03)',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8
	},
	stockText: {
		fontSize: 12,
		fontWeight: '700'
	},
	arrowContainer: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: 'rgba(0,0,0,0.02)',
		justifyContent: 'center',
		alignItems: 'center'
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
