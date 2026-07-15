import { HeaderRefreshButton, SmartHeader } from '@/core/smart-header'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, useWindowDimensions, Linking, RefreshControl, Platform, ScrollView, Modal } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import StateBadge from '@/features/common/StateBadge'

import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import QRCodeModal from '@/features/common/QRCodeModal'
import { useBusinessBySlug } from '@/features/businesses/useBusinessBySlug'
import { useBusinessProducts } from '@/features/businesses/useBusinessProducts'
import { getUserBySlug } from '@/features/users/users.api'
import { Business } from '@/features/businesses/businesses.interface'
import { ProductType } from '@/features/products/products.type'
import { getCaliberLabel, getCaliberIconSize, getHarvestLabel, getHarvestIcon } from '@/features/products/products.helpers'
import { useTheme, createShadow } from '@/core/theme'
import { getGeoCoordinates, openDirections } from '@/core/helpers/maps'
import ErrorState from '@/features/common/ErrorState'
import SmartImage from '@/core/SmartImageViewer'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import ReviewSection from '@/features/reviews/Reviews'

// Product Card for inline display
const ProductCard = ({
	product,
	colors,
	localize,
	onPress,
	cardWidth,
	styles
}: {
	product: ProductType
	colors: any
	localize: (obj: any) => string
	onPress?: () => void
	cardWidth: number
	styles: any
}) => {
	const imageUrl = product.media?.thumbnail?.url || product.defaultProduct?.media?.thumbnail?.url
	const stockQty = product.stock?.quantity || 0
	const isOutOfStock = stockQty === 0
	const rating = product.rating?.average || 0
	const ratingCount = product.rating?.count || 0

	const { translate } = useUser()
	return (
		<TouchableOpacity
			style={[
				styles.productCard,
				{
					backgroundColor: colors.card,
					borderColor: colors.borderLight || '#1E293B',
					width: cardWidth
				}
			]}
			activeOpacity={0.8}
			onPress={onPress}
		>
			<View style={styles.productImageContainer}>
				<SmartImage source={imageUrl} style={styles.productImage} resizeMode="cover" entityType="product" />
				{isOutOfStock && (
					<View style={[styles.outOfStockBadge, { backgroundColor: colors.error + '25', borderColor: colors.error + '40' }]}>
						<Text style={[styles.outOfStockText, { color: colors.error }]}>{translate('out_of_stock', 'Out of Stock')}</Text>
					</View>
				)}
			</View>
			<View style={styles.productInfo}>
				<Text style={[styles.productName, { color: colors.text }]} numberOfLines={2}>
					{localize(product.name)}
				</Text>

				<View style={styles.ratingAndPriceRow}>
					<View style={styles.productPriceRow}>
						<Text style={[styles.productPrice, { color: colors.primary }]}>{product.price?.total?.tnd?.toFixed(2) || '0.00'}</Text>
						<Text style={[styles.productCurrency, { color: colors.primary }]}> TND</Text>
					</View>

					{rating > 0 ? (
						<View style={styles.ratingRow}>
							<Ionicons name="star" size={12} color="#FFD700" />
							<Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
						</View>
					) : null}
				</View>

				<Text style={[styles.productUnit, { color: colors.textTertiary }]}>
					{translate('per_unit', 'per')} {product.unit?.measure || 'unit'}
				</Text>

				{/* Specifications (Caliber & Origin) */}
				{(product.specs?.caliber || product.specs?.origin?.city || product.specs?.harvest) && (
					<View style={styles.specsCardRow}>
						{product.specs?.caliber ? (
							<View style={[styles.caliberChip, { backgroundColor: colors.primary + '15' }]}>
								<Ionicons name="fish" size={getCaliberIconSize(product.specs.caliber, 'chip')} color={colors.primary} />
								<Text style={[styles.caliberChipText, { color: colors.primary }]} numberOfLines={1}>
									{getCaliberLabel(product.specs.caliber)}
								</Text>
							</View>
						) : null}
						{product.specs?.harvest ? (
							<View style={[styles.harvestChip, { backgroundColor: colors.success + '15' }]}>
								<Ionicons name={getHarvestIcon(product.specs?.harvest)} size={12} color={colors.success} />
								<Text style={[styles.harvestChipText, { color: colors.success }]} numberOfLines={1}>
									{getHarvestLabel(product.specs.harvest)}
								</Text>
							</View>
						) : null}
						{product.specs?.origin?.city ? (
							<View style={[styles.originChip, { backgroundColor: colors.borderLight + '25', borderColor: colors.borderLight + '40' }]}>
								<Ionicons name="location-outline" size={10} color={colors.textSecondary} />
								<Text style={[styles.originChipText, { color: colors.textSecondary }]} numberOfLines={1}>
									{product.specs.origin.city}
								</Text>
							</View>
						) : null}
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

	const cardWidth = isWideScreen ? (Math.min(width, maxWidth) - 40 - 24) / 3 : (width - 40 - 12) / 2

	const styles = createStyles(colors, isWideScreen, width)

	const handleCall = () => {
		const phone = business?.contact?.phone?.fullNumber
		if (phone) {
			Linking.openURL(`tel:${phone}`).catch((err) => console.log('Call action failed', err))
		}
	}

	const handleWhatsApp = () => {
		const whatsapp = business?.contact?.whatsapp || business?.contact?.phone?.fullNumber
		if (whatsapp) {
			const cleanNum = whatsapp.replace(/[^\d]/g, '')
			Linking.openURL(`https://wa.me/${cleanNum}`).catch((err) => console.log('WhatsApp action failed', err))
		}
	}

	const handleEmail = () => {
		const email = business?.contact?.email
		if (email) {
			Linking.openURL(`mailto:${email}`).catch((err) => console.log('Email action failed', err))
		}
	}

	const { data: businessResponse, isInitialLoading: businessLoading, isRefreshing: businessRefreshing, isOffline: businessOffline, refresh: refreshBusiness } = useBusinessBySlug({ businessSlug })
	const business = businessResponse?.data ?? null

	const { data: productsResponse, isInitialLoading: productsLoading, isRefreshing: productsRefreshing, isOffline: productsOffline, refresh: refreshProducts } = useBusinessProducts({ businessSlug })
	const products = (productsResponse?.data?.docs ?? []) as unknown as ProductType[]

	const [ownerPhoto, setOwnerPhoto] = useState<string | null>(null)
	const { onScroll } = useScrollHandler()

	const isInitialLoading = businessLoading || productsLoading
	const isRefreshing = businessRefreshing || productsRefreshing
	const isOffline = businessOffline && productsOffline

	const displayTitle = business ? localize(business.name) : translate('loading', 'Loading...')

	useEffect(() => {
		if (!business?.owner?.slug) return
		let cancelled = false
		const fetchOwner = async () => {
			try {
				const ownerResponse = await getUserBySlug(business.owner.slug)
				if (!cancelled) setOwnerPhoto(ownerResponse.data?.media?.thumbnail?.url || null)
			} catch (ownerErr) {
				console.log('Failed to fetch owner details for photo:', ownerErr)
			}
		}
		fetchOwner()
		return () => {
			cancelled = true
		}
	}, [business?.owner?.slug])

	const handleRefresh = useCallback(() => {
		refreshBusiness()
		refreshProducts()
	}, [refreshBusiness, refreshProducts])

	// QR Code state
	const [showQRCode, setShowQRCode] = useState(false)

	const handleOpenMap = () => {
		openDirections(business?.location, business?.address)
	}

	if (isInitialLoading) {
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

	if (isOffline && !business) {
		return (
			<View style={styles.container}>
				<Stack.Screen options={{ title: displayTitle }} />
				<View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
					<ErrorState icon="cloud-offline-outline" iconOnly />
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
								isRefreshing: isRefreshing,
								accessibilityLabel: 'Refresh'
							}
						]
					} as any
				}
			/>
			<SmartHeader.ScrollView
				style={styles.container}
				contentContainerStyle={[styles.scrollContent, { paddingTop: 12, paddingBottom: 40 + insets.bottom }, isWideScreen && { maxWidth: maxWidth, alignSelf: 'center', width: '100%' }]}
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Business Info Card */}
				<View style={[styles.infoCard, { backgroundColor: colors.card, borderColor: colors.borderLight || '#1E293B' }]}>
					<LinearGradient colors={[colors.primary, colors.primary + '10']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.businessBanner} />

					<View style={styles.infoCardContent}>
						<View style={styles.logoContainer}>
							<SmartImage source={business.media?.thumbnail?.url} style={styles.businessLogo} resizeMode="cover" entityType="business" enableFullscreenPreview={true} />
						</View>

						<View style={styles.brandingHeader}>
							<View style={{ flex: 1, gap: 4 }}>
								<Text style={[styles.businessName, { color: colors.text }]}>{localize(business.name)}</Text>
								<Text style={[styles.slugText, { color: colors.textSecondary }]}>@{business.slug}</Text>
							</View>
							<View style={{ gap: 6, alignItems: 'flex-end' }}>
								{business.state?.code && <StateBadge stateCode={business.state.code} />}
								{business.rating?.average ? (
									<View style={styles.headerRatingRow}>
										<Ionicons name="star" size={14} color="#FFD700" />
										<Text style={[styles.headerRatingText, { color: colors.text }]}>{business.rating.average.toFixed(1)}</Text>
										<Text style={{ fontSize: 11, color: colors.textTertiary }}>({business.rating.count})</Text>
									</View>
								) : null}
							</View>
						</View>

						{business.description ? <Text style={[styles.businessDescription, { color: colors.textSecondary }]}>{business.description}</Text> : null}

						{/* Quick Actions Row */}
						<View style={[styles.quickActionsRow, { borderTopColor: colors.borderLight + '30', borderBottomColor: colors.borderLight + '30' }]}>
							{business.contact?.phone?.fullNumber ? (
								<View style={styles.actionButtonWrapper}>
									<TouchableOpacity
										style={[styles.actionCircleButton, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '35' }]}
										onPress={handleCall}
										accessibilityLabel="Call business"
									>
										<Ionicons name="call" size={18} color={colors.primary} />
									</TouchableOpacity>
									<Text style={[styles.actionButtonLabel, { color: colors.textSecondary }]}>{translate('call', 'Call')}</Text>
								</View>
							) : null}

							{business.contact?.whatsapp || business.contact?.phone?.fullNumber ? (
								<View style={styles.actionButtonWrapper}>
									<TouchableOpacity style={[styles.actionCircleButton, { backgroundColor: '#25D36615', borderColor: '#25D36635' }]} onPress={handleWhatsApp} accessibilityLabel="Chat on WhatsApp">
										<Ionicons name="logo-whatsapp" size={18} color="#25D366" />
									</TouchableOpacity>
									<Text style={[styles.actionButtonLabel, { color: colors.textSecondary }]}>WhatsApp</Text>
								</View>
							) : null}

							{business.contact?.email ? (
								<View style={styles.actionButtonWrapper}>
									<TouchableOpacity
										style={[styles.actionCircleButton, { backgroundColor: colors.warning + '10', borderColor: colors.warning + '35' }]}
										onPress={handleEmail}
										accessibilityLabel="Email business"
									>
										<Ionicons name="mail" size={18} color={colors.warning} />
									</TouchableOpacity>
									<Text style={[styles.actionButtonLabel, { color: colors.textSecondary }]}>{translate('email', 'Email')}</Text>
								</View>
							) : null}

							{businessCoords ? (
								<View style={styles.actionButtonWrapper}>
									<TouchableOpacity
										style={[styles.actionCircleButton, { backgroundColor: colors.success + '10', borderColor: colors.success + '35' }]}
										onPress={handleOpenMap}
										accessibilityLabel="Get directions"
									>
										<Ionicons name="map" size={18} color={colors.success} />
									</TouchableOpacity>
									<Text style={[styles.actionButtonLabel, { color: colors.textSecondary }]}>{translate('directions', 'Directions')}</Text>
								</View>
							) : null}
						</View>

						{/* Metadata Cards Grid */}
						<View style={styles.infoCardGrid}>
							{business.owner ? (
								<TouchableOpacity
									style={[styles.infoCardCol, { borderColor: colors.borderLight + '40', backgroundColor: colors.background + '40' }]}
									onPress={() => {
										if (business.owner?.slug) {
											router.push(`/users/${business.owner.slug}` as any)
										}
									}}
									activeOpacity={0.7}
								>
									{ownerPhoto ? (
										<SmartImage source={ownerPhoto} style={styles.ownerAvatar} resizeMode="cover" entityType="user" />
									) : (
										<View style={[styles.ownerAvatarFallback, { backgroundColor: colors.primary + '15' }]}>
											<Ionicons name="person" size={16} color={colors.primary} />
										</View>
									)}
									<View style={{ flex: 1 }}>
										<Text style={styles.infoLabel}>{translate('owner', 'Owner')}</Text>
										<Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
											{localize(business.owner.name)}
										</Text>
									</View>
								</TouchableOpacity>
							) : null}

							{typeof business.deliveryRadiusKm === 'number' ? (
								<View style={[styles.infoCardCol, { borderColor: colors.borderLight + '40', backgroundColor: colors.background + '40' }]}>
									<Ionicons name="bicycle" size={16} color={colors.primary} />
									<View style={{ flex: 1 }}>
										<Text style={styles.infoLabel}>{translate('delivery_radius', 'Delivery')}</Text>
										<Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>
											{business.deliveryRadiusKm} km
										</Text>
									</View>
								</View>
							) : null}
						</View>

						{business.address ? (
							<View style={[styles.detailsSection, { borderTopWidth: 1, borderTopColor: colors.borderLight + '20' }]}>
								<Ionicons name="location-outline" size={16} color={colors.textSecondary} />
								<Text style={[styles.detailsText, { color: colors.textSecondary }]}>{fullAddress}</Text>
							</View>
						) : null}
					</View>
				</View>

				{/* Products Section */}
				<View style={[styles.productsSection, { backgroundColor: colors.card, borderColor: colors.borderLight || '#1E293B' }]}>
					<View style={styles.productsSectionHeader}>
						<Ionicons name="fish-outline" size={20} color={colors.primary} />
						<Text style={[styles.productsSectionTitle, { color: colors.text }]}>{translate('business_products', 'Products')}</Text>
						<View style={[styles.productsCountBadge, { backgroundColor: colors.primary + '15' }]}>
							<Text style={[styles.productsCountText, { color: colors.primary }]}>{products.length}</Text>
						</View>
					</View>

					{products.length > 0 ? (
						<ScrollView horizontal showsHorizontalScrollIndicator={true} contentContainerStyle={styles.productsScrollContainer} style={styles.productsScrollView}>
							{products.map((product) => (
								<ProductCard
									key={product._id}
									product={product}
									colors={colors}
									localize={localize}
									cardWidth={160}
									styles={styles}
									onPress={() => {
										if (product.slug) {
											router.push(`/businesses/${businessSlug}/products/${product.slug}` as any)
										}
									}}
								/>
							))}
						</ScrollView>
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

const createStyles = (colors: any, isWideScreen?: boolean, width?: number) =>
	StyleSheet.create({
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
			marginBottom: 20,
			borderWidth: 1,
			overflow: 'hidden',
			...createShadow({ offsetY: 2, opacity: 0.1, radius: 8, elevation: 3 })
		},
		businessBanner: {
			height: 140,
			width: '100%'
		},
		infoCardContent: {
			paddingHorizontal: 20,
			paddingBottom: 20,
			alignItems: 'stretch'
		},
		logoContainer: {
			position: 'relative',
			marginTop: -65,
			marginBottom: 16,
			alignSelf: 'center'
		},
		businessLogo: {
			width: 120,
			height: 120,
			borderRadius: 60
		},
		brandingHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'flex-start',
			marginBottom: 12,
			gap: 12
		},
		businessName: {
			fontSize: 22,
			fontWeight: '700',
			letterSpacing: -0.5,
			lineHeight: 28
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
			fontSize: 10,
			fontWeight: '600',
			color: colors.textSecondary,
			textTransform: 'uppercase',
			letterSpacing: 0.5,
			marginBottom: 2
		},
		infoValue: {
			fontSize: 14,
			fontWeight: '600'
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
		businessDescription: {
			fontSize: 14,
			fontStyle: 'italic',
			lineHeight: 20,
			marginBottom: 16,
			paddingHorizontal: 2
		},
		headerRatingRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4
		},
		headerRatingText: {
			fontSize: 14,
			fontWeight: '700'
		},
		quickActionsRow: {
			flexDirection: 'row',
			justifyContent: 'space-around',
			alignItems: 'center',
			paddingVertical: 14,
			borderTopWidth: 1,
			borderBottomWidth: 1,
			marginBottom: 16
		},
		actionButtonWrapper: {
			alignItems: 'center',
			gap: 6
		},
		actionCircleButton: {
			width: 44,
			height: 44,
			borderRadius: 22,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1
		},
		actionButtonLabel: {
			fontSize: 11,
			fontWeight: '600'
		},
		infoCardGrid: {
			flexDirection: 'row',
			gap: 12,
			marginBottom: 16
		},
		infoCardCol: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			padding: 12,
			borderRadius: 14,
			borderWidth: 1,
			gap: 10
		},
		ownerAvatar: {
			width: 32,
			height: 32,
			borderRadius: 16
		},
		ownerAvatarFallback: {
			width: 32,
			height: 32,
			borderRadius: 16,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1,
			borderColor: colors.borderLight + '20'
		},
		detailsSection: {
			flexDirection: 'row',
			alignItems: 'flex-start',
			gap: 8,
			paddingTop: 16
		},
		detailsText: {
			flex: 1,
			fontSize: 14,
			lineHeight: 20
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
		productsScrollView: {
			width: '100%',
			marginVertical: 4
		},
		productsScrollContainer: {
			gap: 12,
			paddingRight: 20,
			paddingBottom: 8
		},
		productCard: {
			borderRadius: 14,
			borderWidth: 1,
			overflow: 'hidden'
		},
		productImageContainer: {
			width: '100%',
			height: 120,
			position: 'relative'
		},
		productImage: {
			width: '100%',
			height: '100%'
		},
		productInfo: {
			padding: 12,
			gap: 6
		},
		productName: {
			fontSize: 14,
			fontWeight: '600',
			lineHeight: 18,
			height: 36
		},
		ratingAndPriceRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginTop: 2
		},
		productPriceRow: {
			flexDirection: 'row',
			alignItems: 'baseline'
		},
		productPrice: {
			fontSize: 16,
			fontWeight: '800'
		},
		productCurrency: {
			fontSize: 11,
			fontWeight: '600'
		},
		ratingRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 3
		},
		ratingText: {
			fontSize: 12,
			fontWeight: '700',
			color: '#FFD700'
		},
		ratingCount: {
			fontSize: 11,
			color: '#666'
		},
		productUnit: {
			fontSize: 11,
			fontWeight: '500'
		},
		outOfStockBadge: {
			position: 'absolute',
			top: 8,
			left: 8,
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 6,
			borderWidth: 1
		},
		outOfStockText: {
			fontSize: 9,
			fontWeight: '800',
			textTransform: 'uppercase',
			letterSpacing: 0.5
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
		},
		harvestChip: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 6,
			gap: 3
		},
		harvestChipText: {
			fontSize: 10,
			fontWeight: '700'
		}
	})
