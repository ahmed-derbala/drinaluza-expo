import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, FlatList, Platform, RefreshControl } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { getMyShopBySlug, getShopProducts } from '../../../../components/shops/shops.api'
import { Shop } from '../../../../components/shops/shops.interface'
import { ProductType } from '../../../../components/products/products.type'
import { useTheme } from '../../../../contexts/ThemeContext'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { parseError } from '../../../../utils/errorHandler'
import ErrorState from '../../../../components/common/ErrorState'
import ScreenHeader from '../../../../components/common/ScreenHeader'
import SmartImage from '../../../../components/common/SmartImage'
import { LinearGradient } from 'expo-linear-gradient'
import { useUser } from '../../../../contexts/UserContext'

// Inline Product Card Component
const ProductCard = ({ product, colors, localize, translate }: { product: ProductType; colors: any; localize: (obj: any) => string; translate: (key: string, fallback: string) => string }) => {
	const imageUrl = product.media?.thumbnail?.url || product.defaultProduct?.media?.thumbnail?.url
	const stockQty = product.stock?.quantity || 0
	const minThreshold = product.stock?.minThreshold || 5
	const isLowStock = stockQty > 0 && stockQty <= minThreshold
	const isOutOfStock = stockQty === 0

	const getStockStatus = () => {
		if (isOutOfStock) return { color: '#EF4444', bgColor: '#EF444415', label: translate('out_of_stock', 'Out') }
		if (isLowStock) return { color: '#F59E0B', bgColor: '#F59E0B15', label: translate('low_stock', 'Low') }
		return { color: '#10B981', bgColor: '#10B98115', label: translate('in_stock', 'In Stock') }
	}
	const stockStatus = getStockStatus()

	return (
		<View style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
			<SmartImage source={imageUrl} style={styles.productImage} resizeMode="cover" entityType="product" containerStyle={styles.productImageContainer} />
			<View style={styles.productInfo}>
				<Text style={[styles.productName, { color: colors.text }]} numberOfLines={1}>
					{localize(product.name)}
				</Text>
				<Text style={[styles.productPrice, { color: colors.primary }]}>
					{product.price?.total?.tnd?.toFixed(2) || '0.00'} TND
					<Text style={[styles.productUnit, { color: colors.textTertiary }]}>/{product.unit?.measure || 'unit'}</Text>
				</Text>
			</View>
			<View style={[styles.stockPill, { backgroundColor: stockStatus.bgColor }]}>
				<Text style={[styles.stockPillText, { color: stockStatus.color }]}>{stockQty}</Text>
			</View>
		</View>
	)
}

export default function MyShopDetailsScreen() {
	const { shopSlug } = useLocalSearchParams<{ shopSlug: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const [shop, setShop] = useState<Shop | null>(null)
	const [products, setProducts] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)

	const loadShopDetails = useCallback(
		async (isRefresh = false) => {
			if (!shopSlug) return

			try {
				if (!isRefresh) setLoading(true)
				setError(null)

				const [shopResponse, productsResponse] = await Promise.all([getMyShopBySlug(shopSlug), getShopProducts(shopSlug).catch(() => null)])

				setShop(shopResponse.data)
				setProducts(productsResponse?.data?.docs || [])
			} catch (err: any) {
				console.error('Failed to load my shop details:', err)
				const errorInfo = parseError(err)
				setError({
					title: errorInfo.title,
					message: errorInfo.message,
					type: errorInfo.type
				})
			} finally {
				setLoading(false)
				setRefreshing(false)
			}
		},
		[shopSlug]
	)

	useEffect(() => {
		loadShopDetails()
	}, [loadShopDetails])

	const handleRefresh = useCallback(() => {
		setRefreshing(true)
		loadShopDetails(true)
	}, [loadShopDetails])

	if (loading) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (error) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ScreenHeader title="Shop Details" showBack={true} />
				<ErrorState
					title={error.title}
					message={error.message}
					onRetry={() => loadShopDetails()}
					icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
				/>
			</View>
		)
	}

	if (!shop) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<ScreenHeader title="Shop Details" showBack={true} />
				<View style={styles.centerContent}>
					<Text style={[styles.errorText, { color: colors.text }]}>Shop not found</Text>
				</View>
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader title={localize(shop.name)} subtitle={translate('manage_shop', 'Manage Shop')} showBack={true} onRefresh={handleRefresh} isRefreshing={refreshing} />

			<ScrollView
				contentContainerStyle={styles.scrollContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
			>
				{/* Shop Status Info */}
				<View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.sectionHeader}>
						<MaterialIcons name="info-outline" size={20} color={colors.primary} />
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('shop_information', 'Shop Information')}</Text>
					</View>

					<View style={styles.infoRow}>
						<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('status', 'Status')}</Text>
						<View style={[styles.statusBadge, { backgroundColor: shop.isActive !== false ? '#10B98115' : '#EF444415' }]}>
							<Text style={[styles.statusText, { color: shop.isActive !== false ? '#10B981' : '#EF4444' }]}>
								{shop.isActive !== false ? translate('active', 'ACTIVE') : translate('inactive', 'INACTIVE')}
							</Text>
						</View>
					</View>

					<View style={styles.infoRow}>
						<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('city', 'City')}</Text>
						<Text style={[styles.infoValue, { color: colors.text }]}>{shop.address?.city || 'N/A'}</Text>
					</View>

					<View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
						<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('address', 'Address')}</Text>
						<Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
							{shop.address?.street || 'N/A'}
						</Text>
					</View>
				</View>

				{/* Products Section */}
				<View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.sectionHeader}>
						<Ionicons name="fish-outline" size={20} color={colors.primary} />
						<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('products', 'Products')}</Text>
						<View style={[styles.countBadge, { backgroundColor: colors.primary + '15' }]}>
							<Text style={[styles.countText, { color: colors.primary }]}>{products.length}</Text>
						</View>
					</View>

					{products.length > 0 ? (
						<View style={styles.productsList}>
							{products.map((product) => (
								<ProductCard key={product._id} product={product} colors={colors} localize={localize} translate={translate} />
							))}
						</View>
					) : (
						<View style={styles.emptyProducts}>
							<Ionicons name="fish-outline" size={40} color={colors.textTertiary} />
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('no_products_yet', 'No products yet')}</Text>
						</View>
					)}

					{/* Add Product FAB */}
					<TouchableOpacity
						style={[styles.addProductFab, { backgroundColor: colors.primary }]}
						onPress={() => router.push({ pathname: '/home/business/create-product', params: { shopSlug: shop.slug, shopId: shop._id } })}
						activeOpacity={0.8}
					>
						<Ionicons name="add" size={28} color="#fff" />
					</TouchableOpacity>
				</View>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 40
	},
	centerContent: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	section: {
		padding: 16,
		borderRadius: 16,
		borderWidth: 1,
		marginBottom: 16,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.08,
				shadowRadius: 8
			},
			android: {
				elevation: 2
			}
		})
	},
	sectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		gap: 8
	},
	sectionTitle: {
		fontSize: 16,
		fontWeight: '700',
		flex: 1
	},
	countBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 12
	},
	countText: {
		fontSize: 13,
		fontWeight: '700'
	},
	infoRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: StyleSheet.hairlineWidth,
		borderBottomColor: 'rgba(150,150,150,0.15)'
	},
	infoLabel: {
		fontSize: 14,
		fontWeight: '500'
	},
	infoValue: {
		fontSize: 14,
		fontWeight: '600',
		flex: 1,
		textAlign: 'right',
		marginLeft: 16
	},
	statusBadge: {
		paddingHorizontal: 10,
		paddingVertical: 4,
		borderRadius: 8
	},
	statusText: {
		fontSize: 11,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	errorText: {
		fontSize: 16,
		fontWeight: '600'
	},
	productsList: {
		gap: 10
	},
	productCard: {
		flexDirection: 'row',
		alignItems: 'center',
		padding: 12,
		borderRadius: 12,
		borderWidth: 1,
		gap: 12
	},
	productImageContainer: {
		width: 56,
		height: 56,
		borderRadius: 10,
		overflow: 'hidden'
	},
	productImage: {
		width: '100%',
		height: '100%'
	},
	productInfo: {
		flex: 1
	},
	productName: {
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 4
	},
	productPrice: {
		fontSize: 14,
		fontWeight: '700'
	},
	productUnit: {
		fontSize: 12,
		fontWeight: '500'
	},
	stockPill: {
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 8,
		minWidth: 36,
		alignItems: 'center'
	},
	stockPillText: {
		fontSize: 13,
		fontWeight: '700'
	},
	emptyProducts: {
		alignItems: 'center',
		paddingVertical: 24,
		gap: 8
	},
	emptyText: {
		fontSize: 14,
		fontWeight: '500'
	},
	addProductFab: {
		width: 56,
		height: 56,
		borderRadius: 28,
		alignItems: 'center',
		justifyContent: 'center',
		alignSelf: 'center',
		marginTop: 16,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.25,
				shadowRadius: 8
			},
			android: {
				elevation: 6
			}
		})
	}
})
