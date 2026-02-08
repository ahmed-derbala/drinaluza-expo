import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, useWindowDimensions, Linking, RefreshControl, Platform } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { getShopBySlug, getShopProductsBySlug } from '@/components/shops/shops.api'
import { Shop } from '@/components/shops/shops.interface'
import { ProductType } from '@/components/products/products.type'
import { useTheme } from '@/core/contexts/ThemeContext'
import { parseError } from '@/core/helpers/errorHandler'
import ErrorState from '@/components/common/ErrorState'
import ScreenHeader from '@/components/common/ScreenHeader'
import SmartImage from '@/core/helpers/SmartImage'
import { useUser } from '@/core/contexts/UserContext'

// Product Card for inline display
const ProductCard = ({ product, colors, localize, onPress }: { product: ProductType; colors: any; localize: (obj: any) => string; onPress?: () => void }) => {
	const imageUrl = product.media?.thumbnail?.url || product.defaultProduct?.media?.thumbnail?.url
	const stockQty = product.stock?.quantity || 0
	const isOutOfStock = stockQty === 0

	return (
		<TouchableOpacity style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.border }]} activeOpacity={0.8} onPress={onPress}>
			<SmartImage source={imageUrl} style={styles.productImage} resizeMode="cover" entityType="product" containerStyle={styles.productImageContainer} />
			<View style={styles.productInfo}>
				<Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
					{localize(product.name)}
				</Text>
				<View style={styles.productPriceRow}>
					<Text style={[styles.productPrice, { color: colors.primary }]}>{product.price?.total?.tnd?.toFixed(2) || '0.00'}</Text>
					<Text style={[styles.productCurrency, { color: colors.primary }]}> TND</Text>
					<Text style={[styles.productUnit, { color: colors.textTertiary }]}>/{product.unit?.measure || 'unit'}</Text>
				</View>
				{isOutOfStock && (
					<View style={[styles.outOfStockBadge, { backgroundColor: '#EF444415' }]}>
						<Text style={styles.outOfStockText}>Out of Stock</Text>
					</View>
				)}
			</View>
		</TouchableOpacity>
	)
}

export default function ShopDetailsScreen() {
	const { shopId: shopSlug } = useLocalSearchParams<{ shopId: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const { width } = useWindowDimensions()
	const maxWidth = 800
	const isWideScreen = width > maxWidth

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

				const [shopResponse, productsResponse] = await Promise.all([getShopBySlug(shopSlug), getShopProductsBySlug(shopSlug).catch(() => null)])

				setShop(shopResponse.data)
				setProducts(productsResponse?.data?.docs || [])
			} catch (err: any) {
				console.error('Failed to load shop details:', err)
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

	const handleOpenMap = () => {
		if (!shop?.location?.coordinates) return
		const [lng, lat] = shop.location.coordinates
		const url = `https://www.google.com/maps?q=${lat},${lng}`
		Linking.openURL(url).catch((err) => console.error('Failed to open map:', err))
	}

	if (loading) {
		return (
			<View style={styles.container}>
				<ScreenHeader title={translate('common.loading', 'Loading...')} showBack={true} />
				<View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			</View>
		)
	}

	if (error) {
		return (
			<View style={styles.container}>
				<ScreenHeader title={translate('common.error', 'Error')} showBack={true} />
				<View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
					<ErrorState
						title={error.title}
						message={error.message}
						onRetry={() => loadShopDetails()}
						icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
					/>
				</View>
			</View>
		)
	}

	if (!shop) {
		return (
			<View style={styles.container}>
				<ScreenHeader title={translate('shop_not_found', 'Shop not found')} showBack={true} />
				<View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
					<Text style={[styles.errorText, { color: colors.text }]}>{translate('shop_not_found', 'Shop not found')}</Text>
				</View>
			</View>
		)
	}

	const addressParts = []
	if (shop.address?.street) addressParts.push(shop.address.street)
	if (shop.address?.city) addressParts.push(shop.address.city)
	if (shop.address?.state) addressParts.push(shop.address.state)
	if (shop.address?.country) addressParts.push(shop.address.country)
	const fullAddress = addressParts.join(', ')

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader title={localize(shop.name)} showBack={true} onRefresh={handleRefresh} isRefreshing={refreshing} />
			<ScrollView
				contentContainerStyle={[styles.scrollContent, isWideScreen && { maxWidth: maxWidth, alignSelf: 'center', width: '100%' }]}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
			>
				{/* Shop Image */}
				<View style={styles.imageContainer}>
					<SmartImage source={shop.media?.thumbnail?.url} style={styles.shopImage} resizeMode="cover" entityType="shop" />
				</View>

				{/* Shop Info Card */}
				<View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<Text style={[styles.shopName, { color: colors.text }]}>{localize(shop.name)}</Text>

					{/* Owner Info */}
					{shop.owner && (
						<View style={styles.infoRow}>
							<Ionicons name="person-outline" size={18} color={colors.textSecondary} />
							<View style={styles.infoContent}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('shop_owner', 'Owner')}</Text>
								<View style={styles.ownerRow}>
									<Text style={[styles.infoValue, { color: colors.text }]}>{localize(shop.owner.name)}</Text>
									<Text style={[styles.slugText, { color: colors.textTertiary }]}>@{shop.owner.slug}</Text>
									{shop.owner.business && (
										<View style={[styles.businessBadge, { backgroundColor: colors.primary + '15' }]}>
											<Text style={[styles.businessBadgeText, { color: colors.primary }]} numberOfLines={1}>
												{localize(shop.owner.business.name)}
											</Text>
										</View>
									)}
								</View>
							</View>
						</View>
					)}

					{/* Address */}
					{shop.address && (
						<View style={styles.infoRow}>
							<Ionicons name="location-outline" size={18} color={colors.textSecondary} />
							<View style={styles.infoContent}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('shop_address', 'Address')}</Text>
								<Text style={[styles.infoValue, { color: colors.text }]}>{fullAddress}</Text>
							</View>
						</View>
					)}

					{/* Location Coordinates */}
					{shop.location?.coordinates && (
						<TouchableOpacity style={styles.infoRow} onPress={handleOpenMap} activeOpacity={0.7}>
							<Ionicons name="map-outline" size={18} color={colors.textSecondary} />
							<View style={styles.infoContent}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('shop_location', 'Location')}</Text>
								<View style={styles.locationRow}>
									<Text style={[styles.infoValue, { color: colors.text }]}>
										{shop.location.coordinates[1].toFixed(4)}, {shop.location.coordinates[0].toFixed(4)}
									</Text>
									<Ionicons name="open-outline" size={16} color={colors.primary} />
								</View>
							</View>
						</TouchableOpacity>
					)}

					{/* Delivery Radius */}
					{typeof shop.deliveryRadiusKm === 'number' && (
						<View style={styles.infoRow}>
							<Ionicons name="navigate-outline" size={18} color={colors.textSecondary} />
							<View style={styles.infoContent}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('shop_delivery_radius', 'Delivery Radius')}</Text>
								<Text style={[styles.infoValue, { color: colors.text }]}>{shop.deliveryRadiusKm} km</Text>
							</View>
						</View>
					)}
				</View>

				{/* Products Section */}
				<View style={[styles.productsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
					<View style={styles.productsSectionHeader}>
						<Ionicons name="fish-outline" size={20} color={colors.primary} />
						<Text style={[styles.productsSectionTitle, { color: colors.text }]}>{translate('shop_products', 'Products')}</Text>
						<View style={[styles.productsCountBadge, { backgroundColor: colors.primary + '15' }]}>
							<Text style={[styles.productsCountText, { color: colors.primary }]}>{products.length}</Text>
						</View>
					</View>

					{products.length > 0 ? (
						<View style={styles.productsGrid}>
							{products.map((product) => (
								<ProductCard key={product._id} product={product} colors={colors} localize={localize} />
							))}
						</View>
					) : (
						<View style={styles.emptyProducts}>
							<Ionicons name="fish-outline" size={48} color={colors.textTertiary} />
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('no_products_available', 'No products available')}</Text>
						</View>
					)}
				</View>
			</ScrollView>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center'
	},
	errorContainer: {
		flex: 1,
		padding: 20
	},
	scrollContent: {
		padding: 20,
		paddingBottom: 40
	},
	imageContainer: {
		width: '100%',
		height: 200,
		borderRadius: 20,
		overflow: 'hidden',
		marginBottom: 20,
		backgroundColor: '#f0f0f0'
	},
	shopImage: {
		width: '100%',
		height: '100%'
	},
	infoCard: {
		borderRadius: 20,
		padding: 20,
		marginBottom: 20,
		borderWidth: 1,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8
			},
			android: {
				elevation: 3
			}
		})
	},
	shopName: {
		fontSize: 26,
		fontWeight: '700',
		marginBottom: 20,
		letterSpacing: -0.5
	},
	infoRow: {
		flexDirection: 'row',
		marginBottom: 16,
		alignItems: 'flex-start'
	},
	infoContent: {
		flex: 1,
		marginLeft: 12
	},
	infoLabel: {
		fontSize: 11,
		fontWeight: '600',
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	infoValue: {
		fontSize: 15,
		fontWeight: '500',
		lineHeight: 22
	},
	ownerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		flexWrap: 'wrap',
		gap: 8
	},
	slugText: {
		fontSize: 13,
		fontWeight: '500'
	},
	businessBadge: {
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6
	},
	businessBadgeText: {
		fontSize: 11,
		fontWeight: '600'
	},
	locationRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6
	},
	productsSection: {
		borderRadius: 20,
		padding: 20,
		borderWidth: 1,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8
			},
			android: {
				elevation: 3
			}
		})
	},
	productsSectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		gap: 8
	},
	productsSectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		flex: 1
	},
	productsCountBadge: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12
	},
	productsCountText: {
		fontSize: 14,
		fontWeight: '700'
	},
	productsGrid: {
		gap: 12
	},
	productCard: {
		flexDirection: 'row',
		padding: 12,
		borderRadius: 14,
		borderWidth: 1,
		gap: 12
	},
	productImageContainer: {
		width: 72,
		height: 72,
		borderRadius: 12,
		overflow: 'hidden'
	},
	productImage: {
		width: '100%',
		height: '100%'
	},
	productInfo: {
		flex: 1,
		justifyContent: 'center'
	},
	productName: {
		fontSize: 15,
		fontWeight: '600',
		marginBottom: 6,
		lineHeight: 20
	},
	productPriceRow: {
		flexDirection: 'row',
		alignItems: 'baseline'
	},
	productPrice: {
		fontSize: 18,
		fontWeight: '800'
	},
	productCurrency: {
		fontSize: 13,
		fontWeight: '600'
	},
	productUnit: {
		fontSize: 12,
		fontWeight: '500'
	},
	outOfStockBadge: {
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		marginTop: 6,
		alignSelf: 'flex-start'
	},
	outOfStockText: {
		fontSize: 10,
		fontWeight: '700',
		color: '#EF4444',
		textTransform: 'uppercase'
	},
	emptyProducts: {
		alignItems: 'center',
		paddingVertical: 32,
		gap: 12
	},
	emptyText: {
		fontSize: 15,
		fontWeight: '500'
	},
	errorText: {
		fontSize: 16,
		textAlign: 'center',
		padding: 20
	}
})
