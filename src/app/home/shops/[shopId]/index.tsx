import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, useWindowDimensions, Linking } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { getShopBySlug, getShopProductsBySlug } from '../../../../components/shops/shops.api'
import { Shop } from '../../../../components/shops/shops.interface'
import { useTheme } from '../../../../contexts/ThemeContext'
import { parseError } from '../../../../utils/errorHandler'
import ErrorState from '../../../../components/common/ErrorState'
import ScreenHeader from '../../../../components/common/ScreenHeader'
import SmartImage from '../../../../components/common/SmartImage'
import { useUser } from '../../../../contexts/UserContext'

export default function ShopDetailsScreen() {
	const { shopId: shopSlug } = useLocalSearchParams<{ shopId: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const isDark = true
	const { localize, translate } = useUser()
	const { width } = useWindowDimensions()
	const maxWidth = 800
	const isWideScreen = width > maxWidth
	const [shop, setShop] = useState<Shop | null>(null)
	const [productsCount, setProductsCount] = useState<number | null>(null)
	const [loading, setLoading] = useState(true)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)

	const loadShopDetails = async () => {
		if (!shopSlug) return

		try {
			setLoading(true)
			setError(null)
			const [shopResponse, productsResponse] = await Promise.all([
				getShopBySlug(shopSlug),
				getShopProductsBySlug(shopSlug).catch(() => null) // Don't fail if products fail
			])
			setShop(shopResponse.data)
			if (productsResponse?.data?.pagination) {
				setProductsCount(productsResponse.data.pagination.totalDocs)
			}
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
		}
	}

	useEffect(() => {
		loadShopDetails()
	}, [shopSlug])

	const handleViewProducts = () => {
		if (!shop) return
		router.push({
			pathname: '/home/shops/[shopId]/products',
			params: { shopId: shop.slug }
		})
	}

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
						onRetry={loadShopDetails}
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
			<ScreenHeader title={localize(shop.name)} showBack={true} />
			<ScrollView contentContainerStyle={[styles.scrollContent, isWideScreen && { maxWidth: maxWidth, alignSelf: 'center', width: '100%' }]}>
				{/* Shop Image */}
				<View style={styles.imageContainer}>
					<SmartImage source={{ uri: shop.media?.thumbnail?.url }} style={styles.shopImage} resizeMode="cover" fallbackIcon="store" />
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

					{/* Products Count */}
					{productsCount !== null && (
						<View style={styles.infoRow}>
							<MaterialIcons name="inventory" size={18} color={colors.textSecondary} />
							<View style={styles.infoContent}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('shop_products', 'Products')}</Text>
								<Text style={[styles.infoValue, { color: colors.text }]}>
									{productsCount} {productsCount === 1 ? translate('shop_product', 'product') : translate('shop_products_plural', 'products')} {translate('shop_available', 'available')}
								</Text>
							</View>
						</View>
					)}
				</View>

				{/* View Products Button */}
				<TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleViewProducts} activeOpacity={0.8}>
					<MaterialIcons name="shopping-bag" size={20} color="#fff" />
					<Text style={styles.buttonText}>{translate('shop_view_products', 'View Products')}</Text>
					<Ionicons name="chevron-forward" size={20} color="#fff" />
				</TouchableOpacity>
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
		height: 240,
		borderRadius: 16,
		overflow: 'hidden',
		marginBottom: 20,
		backgroundColor: '#f0f0f0'
	},
	shopImage: {
		width: '100%',
		height: '100%'
	},
	infoCard: {
		borderRadius: 16,
		padding: 20,
		marginBottom: 20,
		borderWidth: 1,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		elevation: 3
	},
	shopName: {
		fontSize: 28,
		fontWeight: '700',
		marginBottom: 20,
		letterSpacing: -0.5
	},
	infoRow: {
		flexDirection: 'row',
		marginBottom: 20,
		alignItems: 'flex-start'
	},
	infoContent: {
		flex: 1,
		marginLeft: 12
	},
	infoLabel: {
		fontSize: 12,
		fontWeight: '600',
		marginBottom: 4,
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	infoValue: {
		fontSize: 16,
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
		fontSize: 14,
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
	button: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		borderRadius: 12,
		padding: 16,
		gap: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4
	},
	buttonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '600',
		flex: 1,
		textAlign: 'center'
	},
	errorText: {
		fontSize: 16,
		textAlign: 'center',
		padding: 20
	}
})
