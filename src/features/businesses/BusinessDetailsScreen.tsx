import { HeaderRefreshButton, SmartHeader } from '@/core/smart-header'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions, Linking, RefreshControl, Platform, ScrollView } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import QRCodeModal from '@/features/common/QRCodeModal'
import { getBusinessBySlug, getBusinessProductsBySlug } from '@/features/businesses/businesses.api'
import { Business } from '@/features/businesses/businesses.interface'
import { ProductType } from '@/features/products/products.type'
import { useTheme, createShadow } from '@/core/theme'
import { parseError } from '@/core/helpers/errorHandler'
import { getGeoCoordinates, openDirections } from '@/core/helpers/maps'
import ErrorState from '@/features/common/ErrorState'
import SmartImage from '@/core/SmartImageViewer'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import ReviewSection from '@/features/reviews/Reviews'

// Product Card for inline display
const ProductCard = ({ product, colors, localize, onPress }: { product: ProductType; colors: any; localize: (obj: any) => string; onPress?: () => void }) => {
	const imageUrl = product.media?.thumbnail?.url || product.defaultProduct?.media?.thumbnail?.url
	const stockQty = product.stock?.quantity || 0
	const isOutOfStock = stockQty === 0
	const rating = product.rating?.average || 0
	const ratingCount = product.rating?.count || 0

	const { translate } = useUser()
	const getCaliberLabel = (c: number) => {
		switch (c) {
			case 1:
				return translate('caliber_very_small', 'Very Small')
			case 2:
				return translate('caliber_small', 'Small')
			case 3:
				return translate('caliber_medium', 'Medium')
			case 4:
				return translate('caliber_large', 'Large')
			case 5:
				return translate('caliber_very_large', 'Very Large')
			default:
				return translate('caliber_medium', 'Medium')
		}
	}
	return (
		<TouchableOpacity style={[styles.productCard, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]} activeOpacity={0.8} onPress={onPress}>
			<SmartImage source={imageUrl} style={styles.productImage} resizeMode="cover" entityType="product" containerStyle={styles.productImageContainer} />
			<View style={styles.productInfo}>
				<Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
					{localize(product.name)}
				</Text>
				{rating > 0 && (
					<View style={styles.ratingRow}>
						<Ionicons name="star" size={12} color="#FFD700" />
						<Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
						<Text style={styles.ratingCount}>({ratingCount})</Text>
					</View>
				)}
				<View style={styles.productPriceRow}>
					<Text style={[styles.productPrice, { color: colors.primary }]}>{product.price?.total?.tnd?.toFixed(2) || '0.00'}</Text>
					<Text style={[styles.productCurrency, { color: colors.primary }]}> TND</Text>
					<Text style={[styles.productUnit, { color: colors.textTertiary }]}>/{product.unit?.measure || 'unit'}</Text>
				</View>

				{/* Specifications (Caliber & Origin) */}
				{(product.specs?.caliber || product.specs?.origin?.city) && (
					<View style={styles.specsCardRow}>
						{product.specs?.caliber ? (
							<View style={[styles.caliberChip, { backgroundColor: colors.primary + '15' }]}>
								<Ionicons name="options-outline" size={10} color={colors.primary} />
								<Text style={[styles.caliberChipText, { color: colors.primary }]}>{getCaliberLabel(product.specs.caliber)}</Text>
							</View>
						) : null}
						{product.specs?.origin?.city ? (
							<View style={[styles.originChip, { backgroundColor: colors.surfaceVariant || 'rgba(255,255,255,0.05)' }]}>
								<Ionicons name="location-outline" size={10} color={colors.textSecondary} />
								<Text style={[styles.originChipText, { color: colors.textSecondary }]}>{product.specs.origin.city}</Text>
							</View>
						) : null}
					</View>
				)}
				{isOutOfStock && (
					<View style={[styles.outOfStockBadge, { backgroundColor: '#EF444415' }]}>
						<Text style={styles.outOfStockText}>Out of Stock</Text>
					</View>
				)}
			</View>
		</TouchableOpacity>
	)
}

export default function BusinessDetailsScreen() {
	const { businessSlug } = useLocalSearchParams<{ businessSlug: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const { width } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const maxWidth = 800
	const isWideScreen = width > maxWidth

	const [business, setBusiness] = useState<Business | null>(null)
	const [products, setProducts] = useState<any[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const { onScroll } = useScrollHandler()

	const displayTitle = business ? localize(business.name) : translate('loading', 'Loading...')

	const loadBusinessDetails = useCallback(
		async (isRefresh = false) => {
			if (!businessSlug) return

			try {
				if (!isRefresh) setLoading(true)
				setError(null)

				const [businessResponse, productsResponse] = await Promise.all([getBusinessBySlug(businessSlug), getBusinessProductsBySlug(businessSlug).catch(() => null)])

				setBusiness(businessResponse.data)
				setProducts(productsResponse?.data?.docs || [])
			} catch (err: any) {
				console.error('Failed to load business details:', err)
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
		[businessSlug]
	)

	useEffect(() => {
		loadBusinessDetails()
	}, [loadBusinessDetails])

	const handleRefresh = useCallback(() => {
		setRefreshing(true)
		loadBusinessDetails(true)
	}, [loadBusinessDetails])

	// QR Code state
	const [showQRCode, setShowQRCode] = useState(false)

	const handleOpenMap = () => {
		openDirections(business?.location, business?.address)
	}

	if (loading) {
		return (
			<View style={styles.container}>
				<Stack.Screen
					options={
						{
							title: displayTitle,
							subtitle: `@${businessSlug}`,
							isLoading: true
						} as any
					}
				/>
				<View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			</View>
		)
	}

	if (error) {
		return (
			<View style={styles.container}>
				<Stack.Screen options={{ title: displayTitle }} />
				<View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
					<ErrorState
						title={error.title}
						message={error.message}
						onRetry={() => loadBusinessDetails()}
						icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'}
					/>
				</View>
			</View>
		)
	}

	if (!business) {
		return (
			<View style={styles.container}>
				<Stack.Screen options={{ title: displayTitle }} />
				<View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
					<Text style={[styles.errorText, { color: colors.text }]}>{translate('business_not_found', 'Business not found')}</Text>
				</View>
			</View>
		)
	}

	// Build address string
	const addressParts = []
	if (business.address?.street) addressParts.push(business.address.street)
	if (business.address?.city) addressParts.push(business.address.city)
	if (business.address?.region) addressParts.push(business.address.region)
	if (business.address?.country) addressParts.push(business.address.country)
	const fullAddress = addressParts.join(', ')
	const businessCoords = getGeoCoordinates(business.location)

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: displayTitle,
						subtitle: `@${business.slug}`,
						isLoading: false,
						fallbackRoute: '/(home)/feed',
						headerActions: [
							{
								key: 'qr-code',
								iconName: 'qr-code-outline',
								onPress: () => setShowQRCode(true),
								accessibilityLabel: 'QR Code'
							},
							{
								key: 'refresh',
								onPress: handleRefresh,
								isRefreshing: refreshing,
								accessibilityLabel: 'Refresh'
							}
						]
					} as any
				}
			/>
			<SmartHeader.ScrollView
				style={styles.container}
				contentContainerStyle={[styles.scrollContent, { paddingTop: 12, paddingBottom: 40 + insets.bottom }, isWideScreen && { maxWidth: maxWidth, alignSelf: 'center', width: '100%' }]}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Business Image */}
				<View style={styles.imageContainer}>
					<SmartImage source={business.media?.thumbnail?.url} style={styles.businessImage} resizeMode="cover" entityType="business" />
				</View>

				{/* Business Info Card */}
				<View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]}>
					<Text style={[styles.businessName, { color: colors.text }]}>{localize(business.name)}</Text>

					{/* Owner Info */}
					{business.owner && (
						<TouchableOpacity
							style={styles.infoRow}
							onPress={() => {
								if (business.owner?.slug) {
									router.push(`/users/${business.owner.slug}` as any)
								}
							}}
							activeOpacity={0.7}
						>
							<Ionicons name="person-outline" size={18} color={colors.textSecondary} />
							<View style={styles.infoContent}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('business_owner', 'Owner')}</Text>
								<View style={styles.ownerRow}>
									<Text style={[styles.infoValue, { color: colors.text }]}>{localize(business.owner.name)}</Text>
									<Text style={[styles.slugText, { color: colors.textTertiary }]}>@{business.owner.slug}</Text>
									{business.owner && (
										<View style={[styles.businessBadge, { backgroundColor: colors.primary + '15' }]}>
											<Text style={[styles.businessBadgeText, { color: colors.primary }]} numberOfLines={1}>
												{localize(business.owner.name)}
											</Text>
										</View>
									)}
								</View>
							</View>
						</TouchableOpacity>
					)}

					{/* Address */}
					{business.address && (
						<View style={styles.infoRow}>
							<Ionicons name="location-outline" size={18} color={colors.textSecondary} />
							<View style={styles.infoContent}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('business_address', 'Address')}</Text>
								<Text style={[styles.infoValue, { color: colors.text }]}>{fullAddress}</Text>
							</View>
						</View>
					)}

					{/* Location Coordinates */}
					{businessCoords && (
						<TouchableOpacity style={styles.infoRow} onPress={handleOpenMap} activeOpacity={0.7}>
							<Ionicons name="map-outline" size={18} color={colors.textSecondary} />
							<View style={styles.infoContent}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('business_location', 'Location')}</Text>
								<View style={styles.locationRow}>
									<Text style={[styles.infoValue, { color: colors.text }]}>
										{businessCoords[1].toFixed(4)}, {businessCoords[0].toFixed(4)}
									</Text>
									<Ionicons name="open-outline" size={16} color={colors.primary} />
								</View>
							</View>
						</TouchableOpacity>
					)}

					{/* Delivery Radius */}
					{typeof business.deliveryRadiusKm === 'number' && (
						<View style={styles.infoRow}>
							<Ionicons name="navigate-outline" size={18} color={colors.textSecondary} />
							<View style={styles.infoContent}>
								<Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{translate('business_delivery_radius', 'Delivery Radius')}</Text>
								<Text style={[styles.infoValue, { color: colors.text }]}>{business.deliveryRadiusKm} km</Text>
							</View>
						</View>
					)}
				</View>

				{/* Products Section */}
				<View style={[styles.productsSection, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]}>
					<View style={styles.productsSectionHeader}>
						<Ionicons name="fish-outline" size={20} color={colors.primary} />
						<Text style={[styles.productsSectionTitle, { color: colors.text }]}>{translate('business_products', 'Products')}</Text>
						<View style={[styles.productsCountBadge, { backgroundColor: colors.primary + '15' }]}>
							<Text style={[styles.productsCountText, { color: colors.primary }]}>{products.length}</Text>
						</View>
					</View>

					{products.length > 0 ? (
						<View style={styles.productsGrid}>
							{products.map((product) => (
								<ProductCard
									key={product._id}
									product={product}
									colors={colors}
									localize={localize}
									onPress={() => {
										if (product.slug) {
											router.push(`/businesses/${businessSlug}/products/${product.slug}` as any)
										}
									}}
								/>
							))}
						</View>
					) : (
						<View style={styles.emptyProducts}>
							<Ionicons name="fish-outline" size={48} color={colors.textTertiary} />
							<Text style={[styles.emptyText, { color: colors.textSecondary }]}>{translate('no_products_available', 'No products available')}</Text>
						</View>
					)}
				</View>

				{/* Reviews Section */}
				{business && <ReviewSection targetResource="businesses" targetId={business._id} targetName={localize(business.name)} />}
			</SmartHeader.ScrollView>

			{/* QR Code Viewer Modal */}
			{business && (
				<QRCodeModal
					visible={showQRCode}
					onClose={() => setShowQRCode(false)}
					value={`${process.env.EXPO_PUBLIC_FRONTEND_URL || 'https://drinaluza.com'}/b/${business.slug}`}
					title={localize(business.name)}
					subtitle={`@${business.slug}`}
					filenamePrefix={`business_${business.slug}`}
				/>
			)}
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
		marginBottom: 20
	},
	businessImage: {
		width: '100%',
		height: '100%'
	},
	infoCard: {
		borderRadius: 20,
		padding: 20,
		marginBottom: 20,
		borderWidth: 1,
		...createShadow({ offsetY: 2, opacity: 0.1, radius: 8, elevation: 3 })
	},
	businessName: {
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
		...createShadow({ offsetY: 2, opacity: 0.1, radius: 8, elevation: 3 })
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
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginBottom: 4
	},
	ratingText: {
		fontSize: 12,
		fontWeight: '600',
		color: '#FFD700'
	},
	ratingCount: {
		fontSize: 11,
		color: '#666'
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
	},
	headerIconBtn: {
		padding: 4,
		justifyContent: 'center',
		alignItems: 'center'
	},
	customersSection: {
		borderRadius: 20,
		padding: 20,
		borderWidth: 1,
		...createShadow({ offsetY: 2, opacity: 0.1, radius: 8, elevation: 3 })
	},
	customersSectionHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
		gap: 8
	},
	customersSectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		flex: 1
	},
	customersCountBadge: {
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12
	},
	customersCountText: {
		fontSize: 14,
		fontWeight: '700'
	},
	customersScrollContent: {
		gap: 12,
		paddingRight: 16
	},
	customerChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 10,
		paddingHorizontal: 12,
		borderRadius: 16,
		borderWidth: 1,
		gap: 10,
		width: 180
	},
	customerAvatar: {
		width: 36,
		height: 36,
		borderRadius: 18
	},
	customerChipText: {
		flex: 1,
		minWidth: 0
	},
	customerNameText: {
		fontSize: 13,
		fontWeight: '700'
	},
	customerSlugText: {
		fontSize: 11,
		fontWeight: '500',
		marginTop: 1
	},
	specsCardRow: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		gap: 6,
		marginTop: 4,
		alignItems: 'center'
	},
	caliberChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		gap: 3
	},
	caliberChipText: {
		fontSize: 10,
		fontWeight: '700'
	},
	originChip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 6,
		gap: 3,
		borderWidth: 1,
		borderColor: 'rgba(255,255,255,0.05)'
	},
	originChipText: {
		fontSize: 10,
		fontWeight: '600'
	}
})
