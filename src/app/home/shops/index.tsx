import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTheme } from '../../../contexts/ThemeContext'
import { useWindowDimensions } from 'react-native'
import { StyleSheet, View, Text, TouchableOpacity, FlatList, RefreshControl, ActivityIndicator, Linking, ViewStyle, TextStyle, ImageStyle } from 'react-native'
import { useRouter } from 'expo-router'
import { useState, useEffect } from 'react'
import ScreenHeader from '../../../components/common/ScreenHeader'
import ErrorState from '../../../components/common/ErrorState'
import SmartImage from '../../../components/common/SmartImage'
import { getShops } from '../../../components/shops/shops.api'
import { showPopup, showAlert } from '../../../utils/popup'
import { parseError, logError } from '../../../utils/errorHandler'
import { Shop } from '../../../components/shops/shops.interface'
import { useUser } from '../../../contexts/UserContext'
// Common themed styles removed as they're not needed

// Responsive layout will be calculated inside the component

// Mock data removed in favor of real API

const createStyles = (
	colors: any,
	isDark: boolean,
	opts: {
		cardWidth: number
		numColumns: number
		padding: number
		fontSize: number
		subtitleFontSize: number
		smallFontSize: number
		imageHeight: number
		isCompact: boolean
		showExtended: boolean
		isExtraSmall: boolean
		isSmallScreen: boolean
		isMediumScreen: boolean
		isLargeScreen: boolean
		isExtraLarge: boolean
	}
) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background
		},
		headerSection: {
			padding: opts.isExtraSmall ? 12 : opts.isSmallScreen ? 16 : 20,
			paddingBottom: opts.isExtraSmall ? 12 : 16
		},
		headerTitle: {
			fontSize: opts.fontSize,
			fontWeight: '800',
			color: colors.text,
			marginBottom: 8,
			letterSpacing: -0.5
		},
		headerSubtitle: {
			fontSize: opts.subtitleFontSize,
			color: colors.textSecondary,
			letterSpacing: 0.1
		},
		listContent: {
			flexGrow: 1,
			padding: opts.padding,
			paddingBottom: 24,
			paddingTop: opts.isExtraSmall ? 4 : 8
		},
		shopCard: {
			flex: 1,
			margin: opts.isExtraSmall ? 4 : 6,
			borderRadius: opts.isExtraSmall ? 12 : 16,
			overflow: 'hidden',
			backgroundColor: colors.card,
			borderWidth: 1,
			borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: isDark ? 0.15 : 0.05,
			shadowRadius: 6,
			elevation: 2,
			width: opts.cardWidth - (opts.isExtraSmall ? 8 : 12), // Subtract margin from width
			maxWidth: opts.cardWidth - (opts.isExtraSmall ? 8 : 12),
			minHeight: opts.isExtraSmall ? 240 : 300,
			alignSelf: 'flex-start',
			flexDirection: 'column',
			justifyContent: 'space-between' as const
		},
		shopImageContainer: {
			position: 'relative',
			width: '100%',
			height: opts.imageHeight,
			backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
		},
		imageOverlay: {
			position: 'absolute',
			left: 0,
			right: 0,
			bottom: 0,
			height: 64,
			backgroundColor: isDark ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.18)'
		},
		shopImage: {
			width: '100%',
			height: '100%'
		},
		shopCardContent: {
			flex: 1,
			padding: opts.isExtraSmall ? 10 : 16,
			justifyContent: 'space-between'
		},
		shopHeader: {
			marginBottom: opts.isExtraSmall ? 8 : 12
		},
		businessName: {
			fontSize: opts.smallFontSize,
			color: colors.textSecondary,
			marginBottom: 2,
			fontWeight: '500'
		},
		shopName: {
			fontSize: opts.fontSize,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 4,
			lineHeight: opts.fontSize * 1.2
		},
		ownerName: {
			fontSize: opts.smallFontSize,
			color: colors.textTertiary,
			fontWeight: '500'
		},
		shopOwnerRow: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 8
		},
		shopOwner: {
			fontSize: 14,
			color: colors.textSecondary,
			marginLeft: 6
		},
		businessBadge: {
			paddingHorizontal: 8,
			paddingVertical: 3,
			borderRadius: 6,
			backgroundColor: colors.primary + '15',
			marginLeft: 8
		},
		businessBadgeText: {
			fontSize: 11,
			fontWeight: '600',
			color: colors.primary
		},
		shopAddress: {
			fontSize: 13,
			color: colors.textTertiary,
			flexDirection: 'row',
			alignItems: 'center',
			marginTop: 4
		},
		// addressText is defined later in the styles
		shopFooter: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginTop: 12,
			paddingTop: 12,
			borderTopWidth: 1,
			borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
		},
		shopStats: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 16
		},
		statItem: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4
		},
		ratingContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			marginBottom: 8
		},
		ratingBadge: {
			backgroundColor: colors.primary,
			borderRadius: 8,
			paddingHorizontal: 10,
			paddingVertical: 6,
			alignItems: 'center',
			flexDirection: 'row'
		},
		ratingText: {
			color: '#fff',
			fontSize: 12,
			fontWeight: '600',
			marginRight: 6
		},
		ratingStars: {
			color: '#fff',
			fontSize: 14
		},
		reviewsContainer: {
			marginLeft: 8
		},
		reviewsText: {
			color: colors.textSecondary,
			fontSize: 12
		},
		categoryContainer: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: opts.isExtraSmall ? 4 : 6,
			marginBottom: opts.isExtraSmall ? 8 : 12
		},
		categoryChip: {
			backgroundColor: colors.backgroundSecondary || 'rgba(0,0,0,0.05)',
			paddingHorizontal: opts.isExtraSmall ? 6 : 8,
			paddingVertical: opts.isExtraSmall ? 2 : 4,
			borderRadius: opts.isExtraSmall ? 8 : 12,
			borderWidth: 0.5,
			borderColor: colors.border || 'rgba(0,0,0,0.1)'
		},
		categoryText: {
			fontSize: opts.smallFontSize,
			color: colors.textSecondary,
			fontWeight: '500'
		},
		quickActions: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginTop: 12,
			gap: 8
		},
		quickActionButton: {
			backgroundColor: colors.primary,
			borderRadius: 10,
			paddingVertical: 8,
			paddingHorizontal: 12,
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center'
		},
		quickActionText: {
			color: '#fff',
			fontSize: 14,
			fontWeight: '600',
			marginLeft: 8
		},
		quickActionSecondary: {
			backgroundColor: 'transparent',
			borderRadius: 10,
			paddingVertical: 8,
			paddingHorizontal: 12,
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: 1,
			borderColor: colors.border
		},
		quickActionSecondaryText: {
			color: colors.text,
			fontSize: 14,
			fontWeight: '600',
			marginLeft: 8
		},
		distanceContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 4
		},
		distanceText: {
			color: colors.text,
			fontSize: 12,
			marginLeft: 4
		},
		distanceBadge: {
			backgroundColor: colors.primary,
			borderRadius: 8,
			paddingHorizontal: 8,
			paddingVertical: 4,
			alignItems: 'center'
		},
		deliveryBadge: {
			marginLeft: 8,
			backgroundColor: colors.primary + '10',
			borderRadius: 8,
			paddingHorizontal: 8,
			paddingVertical: 4
		},
		deliveryBadgeText: {
			color: colors.primary,
			fontSize: 12,
			fontWeight: '600'
		},
		distanceBadgeText: {
			color: '#fff',
			fontSize: 12,
			fontWeight: '600'
		},
		hoursContainer: {
			backgroundColor: colors.card,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: colors.border,
			padding: 12
		},
		hoursHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 8
		},
		hoursIcon: {
			color: colors.primary
		},
		hoursText: {
			color: colors.text,
			fontSize: 12,
			fontWeight: '500'
		},
		hoursSecondaryText: {
			color: colors.textSecondary,
			fontSize: 10,
			marginLeft: 4
		},
		descriptionText: {
			color: colors.text,
			fontSize: 13,
			lineHeight: 18,
			marginTop: 8
		},
		button: {
			backgroundColor: colors.primary,
			borderRadius: 8,
			paddingVertical: 12,
			paddingHorizontal: 20,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.2,
			shadowRadius: 8,
			elevation: 3
		},
		buttonText: {
			color: '#fff'
		},
		// Status and Business State Styles
		statusBadge: {
			position: 'absolute',
			top: 12,
			right: 12,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			borderRadius: 12,
			paddingHorizontal: 8,
			paddingVertical: 4,
			minWidth: 80
		},
		statusText: {
			color: '#fff',
			fontSize: 12,
			fontWeight: '600',
			marginLeft: 4
		},
		businessStateBadge: {
			position: 'absolute',
			top: 12,
			left: 12,
			borderRadius: 12,
			paddingHorizontal: 8,
			paddingVertical: 4,
			backgroundColor: 'rgba(0, 0, 0, 0.5)',
			backdropFilter: 'blur(4px)'
		},
		businessStateText: {
			fontSize: 11,
			fontWeight: '600',
			color: '#fff'
		},
		// Contact Buttons
		contactButtons: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginTop: opts.isExtraSmall ? 8 : 12,
			gap: opts.isExtraSmall ? 6 : 8
		},
		contactButton: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			paddingVertical: opts.isExtraSmall ? 8 : 10,
			paddingHorizontal: opts.isExtraSmall ? 10 : 12,
			borderRadius: opts.isExtraSmall ? 6 : 8,
			backgroundColor: colors.backgroundSecondary || 'rgba(0,0,0,0.05)',
			borderWidth: 0.5,
			borderColor: colors.border || 'rgba(0,0,0,0.1)'
		},
		whatsappButton: {
			backgroundColor: '#25D366',
			borderColor: '#25D366'
		},
		viewButton: {
			backgroundColor: colors.primary,
			borderRadius: opts.isExtraSmall ? 6 : 10,
			paddingVertical: opts.isExtraSmall ? 10 : 12,
			paddingHorizontal: opts.isExtraSmall ? 14 : 18,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: opts.isExtraSmall ? 8 : 12
		},
		// Address
		addressContainer: {
			flexDirection: 'row',
			alignItems: 'flex-start',
			marginTop: 8,
			marginBottom: 12
		},
		addressText: {
			flex: 1,
			fontSize: opts.smallFontSize,
			color: colors.textSecondary,
			marginLeft: 8,
			lineHeight: opts.smallFontSize * 1.3
		},
		// Empty State
		emptyContainer: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			padding: opts.isExtraSmall ? 16 : 24
		},
		emptyIcon: {
			width: opts.isExtraSmall ? 60 : 80,
			height: opts.isExtraSmall ? 60 : 80,
			borderRadius: 40,
			backgroundColor: colors.backgroundSecondary || 'rgba(0,0,0,0.05)',
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: opts.isExtraSmall ? 12 : 16
		},
		emptyTitle: {
			fontSize: opts.fontSize,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 8,
			textAlign: 'center'
		},
		emptyText: {
			fontSize: opts.subtitleFontSize,
			color: colors.textSecondary,
			textAlign: 'center',
			paddingHorizontal: opts.isExtraSmall ? 16 : 24,
			maxWidth: 300
		},
		// Loading State
		loadingContainer: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			padding: opts.isExtraSmall ? 16 : 24
		}
	})

interface ResponsiveConfig {
	numColumns: number
	cardWidth: number
	imageHeight: number
	gap: number
	padding: number
	fontSize: number
	subtitleFontSize: number
	smallFontSize: number
	isCompact: boolean
	showExtended: boolean
	isExtraSmall: boolean
	isSmallScreen: boolean
	isMediumScreen: boolean
	isLargeScreen: boolean
	isExtraLarge: boolean
}

const getResponsiveConfig = (width: number): ResponsiveConfig => {
	// More granular breakpoints for better responsiveness
	const isExtraSmall = width < 360
	const isSmallScreen = width >= 360 && width < 480
	const isMediumScreen = width >= 480 && width < 768
	const isLargeScreen = width >= 768 && width < 1024
	const isExtraLarge = width >= 1024

	// Dynamic container padding based on screen size
	const containerPadding = isExtraSmall ? 8 : isSmallScreen ? 12 : isMediumScreen ? 16 : 20
	const availableWidth = width - containerPadding * 2

	// Responsive card sizing
	const minCardWidth = isExtraSmall ? 160 : isSmallScreen ? 200 : isMediumScreen ? 240 : 280
	const maxCardWidth = isExtraLarge ? 380 : isLargeScreen ? 340 : isMediumScreen ? 300 : 260

	// Responsive gap between cards
	const gap = isExtraSmall ? 8 : isSmallScreen ? 10 : isMediumScreen ? 12 : isLargeScreen ? 16 : 20

	// Calculate optimal number of columns
	let numColumns = Math.max(1, Math.floor(availableWidth / (minCardWidth + gap)))

	// Limit maximum columns for better UX
	numColumns = Math.min(numColumns, isExtraLarge ? 5 : isLargeScreen ? 4 : isMediumScreen ? 3 : 2)

	// Calculate card width to fill available space
	const totalGapWidth = (numColumns - 1) * gap
	const cardWidth = Math.min(maxCardWidth, (availableWidth - totalGapWidth) / numColumns)

	// Responsive image height (maintain aspect ratio)
	const imageHeight = Math.round(cardWidth * (isExtraSmall ? 0.65 : 0.6))

	// Responsive font sizes
	const fontSize = isExtraSmall ? 12 : isSmallScreen ? 13 : isMediumScreen ? 14 : isLargeScreen ? 15 : 16
	const subtitleFontSize = fontSize - 1
	const smallFontSize = fontSize - 2

	return {
		numColumns,
		cardWidth,
		imageHeight,
		gap,
		padding: containerPadding,
		fontSize,
		subtitleFontSize,
		smallFontSize,
		isCompact: width < 400,
		showExtended: width >= 600,
		isExtraSmall,
		isSmallScreen,
		isMediumScreen,
		isLargeScreen,
		isExtraLarge
	}
}

export default function ShopsListScreen() {
	const { colors } = useTheme()
	const isDark = true
	const router = useRouter()
	const [shops, setShops] = useState<Shop[]>([])
	const [loading, setLoading] = useState(true)
	const [refreshing, setRefreshing] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)
	const { translate, localize } = useUser()

	const { width } = useWindowDimensions()
	const responsiveConfig = getResponsiveConfig(width)
	const {
		numColumns,
		cardWidth,
		imageHeight,
		gap,
		padding,
		fontSize,
		subtitleFontSize,
		smallFontSize,
		isCompact,
		showExtended,
		isExtraSmall,
		isSmallScreen,
		isMediumScreen,
		isLargeScreen,
		isExtraLarge
	} = responsiveConfig

	const styles = createStyles(colors, isDark, {
		cardWidth,
		numColumns,
		padding,
		fontSize,
		subtitleFontSize,
		smallFontSize,
		imageHeight,
		isCompact,
		showExtended,
		isExtraSmall,
		isSmallScreen,
		isMediumScreen,
		isLargeScreen,
		isExtraLarge
	})

	const loadShops = async () => {
		try {
			if (!refreshing) setLoading(true)
			setError(null)
			const response = await getShops()
			setShops(response.data.docs || [])
		} catch (err: any) {
			console.error('Error loading shops:', err)

			// Handle 401 Unauthorized - redirect to auth screen
			if (err.response?.status === 401) {
				showAlert(translate('session_expired_title', 'Session Expired'), translate('session_expired_message', 'Please log in again to continue.'))
				router.replace('/auth')
				return
			}

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
	}

	const handleRefresh = async () => {
		setRefreshing(true)
		try {
			await loadShops()
		} finally {
			setRefreshing(false)
		}
	}

	const onRefresh = handleRefresh

	useEffect(() => {
		loadShops()
	}, [])

	const handleShopPress = (slug: string) => {
		// Navigate to shop details using slug
		router.push(`/home/shops/${slug}` as any)
	}

	const renderShopCard = ({ item }: { item: Shop }) => {
		// Build address string
		const addressParts = []
		if (item.address?.street) addressParts.push(item.address.street)
		if (item.address?.city) addressParts.push(item.address.city)
		if (item.address?.state) addressParts.push(item.address.state)
		if (item.address?.country) addressParts.push(item.address.country)
		const fullAddress = addressParts.join(', ')

		// Get shop details from API response
		const shopName = localize(item.name) || translate('unnamed_shop', 'Unnamed Shop')
		const businessName = localize(item.owner?.business?.name) || ''
		const ownerSlug = item.owner?.slug || 'owner'
		const ownerName = localize(item.owner?.name) || ''

		return (
			<TouchableOpacity style={styles.shopCard as ViewStyle} onPress={() => handleShopPress(item.slug)}>
				{/* Shop Image */}
				<View style={styles.shopImageContainer as ViewStyle}>
					<SmartImage source={{ uri: item.media?.thumbnail?.url }} style={styles.shopImage as ImageStyle} resizeMode="cover" />
				</View>

				<View style={styles.shopCardContent as ViewStyle}>
					{/* Shop Name and Owner */}
					<View style={styles.shopHeader as ViewStyle}>
						<Text style={styles.shopName as TextStyle} numberOfLines={2}>
							{shopName}
						</Text>
						{showExtended && businessName && (
							<Text style={styles.businessName as TextStyle} numberOfLines={1}>
								{businessName}
							</Text>
						)}
						<Text style={styles.ownerName as TextStyle} numberOfLines={1}>
							@{ownerSlug}
						</Text>
					</View>

					{/* Address */}
					{fullAddress && (
						<View style={styles.addressContainer as ViewStyle}>
							<Ionicons name="location-outline" size={isExtraSmall ? 12 : 14} color={colors.textSecondary} />
							<Text style={styles.addressText as TextStyle} numberOfLines={2}>
								{fullAddress}
							</Text>
						</View>
					)}

					{/* Contact Buttons */}
					<View style={styles.contactButtons as ViewStyle}>
						{item.contact?.phone?.fullNumber ? (
							<TouchableOpacity
								style={styles.contactButton as ViewStyle}
								onPress={() => {
									if (item.contact?.phone?.fullNumber) {
										Linking.openURL(`tel:${item.contact.phone.fullNumber}`)
									}
								}}
							>
								<Ionicons name="call-outline" size={isExtraSmall ? 16 : 18} color={colors.primary} />
							</TouchableOpacity>
						) : null}
						{item.contact?.whatsapp ? (
							<TouchableOpacity
								style={[styles.contactButton as ViewStyle, styles.whatsappButton as ViewStyle]}
								onPress={() => {
									if (item.contact?.whatsapp) {
										Linking.openURL(`https://wa.me/${item.contact.whatsapp.replace(/[^0-9]/g, '')}`)
									}
								}}
							>
								<Ionicons name="logo-whatsapp" size={isExtraSmall ? 16 : 18} color="#fff" />
							</TouchableOpacity>
						) : null}
						{item.location?.coordinates ? (
							<TouchableOpacity
								style={styles.contactButton as ViewStyle}
								onPress={() => {
									// Open map with coordinates
									if (item.location?.coordinates) {
										const [longitude, latitude] = item.location.coordinates
										const mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
										Linking.openURL(mapUrl)
									}
								}}
							>
								<Ionicons name="map-outline" size={isExtraSmall ? 16 : 18} color={colors.primary} />
							</TouchableOpacity>
						) : null}
					</View>

					{/* View Shop Button */}
					<TouchableOpacity style={styles.viewButton as ViewStyle} onPress={() => handleShopPress(item.slug)}>
						<Ionicons name="storefront-outline" size={isExtraSmall ? 16 : 18} color="#fff" />
					</TouchableOpacity>
				</View>
			</TouchableOpacity>
		)
	}

	const renderEmpty = () => {
		if (error) {
			return (
				<ErrorState title={error.title} message={error.message} onRetry={loadShops} icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'} />
			)
		}
		return (
			<View style={styles.emptyContainer as ViewStyle}>
				<View style={styles.emptyIcon as ViewStyle}>
					<MaterialIcons name="store" size={isExtraSmall ? 32 : 40} color={colors.textTertiary} />
				</View>
				<Text style={styles.emptyTitle as TextStyle}>{translate('no_shops', 'No shops available')}</Text>
				<Text style={styles.emptyText as TextStyle}>{translate('check_back_later_shops', 'Check back later for new shops')}</Text>
			</View>
		)
	}

	// Handle loading state
	if (loading) {
		return (
			<View style={styles.container as ViewStyle}>
				<View style={styles.loadingContainer as ViewStyle}>
					<ActivityIndicator size="large" color={colors.primary} />
				</View>
			</View>
		)
	}

	// Main render
	return (
		<View style={styles.container as ViewStyle}>
			{!error && (
				<View style={styles.headerSection as ViewStyle}>
					<Text style={styles.headerTitle as TextStyle}>{translate('discover_shops', 'Discover Shops')}</Text>
					<Text style={styles.headerSubtitle as TextStyle}>
						{shops.length} {shops.length === 1 ? translate('shop_product', 'shop') : translate('shop_products_plural', 'shops')} {translate('shops_available', 'available near you')}
					</Text>
				</View>
			)}
			<FlatList
				key={`cols-${numColumns}`}
				data={shops}
				renderItem={renderShopCard}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.listContent as ViewStyle}
				columnWrapperStyle={
					numColumns > 1
						? {
								gap,
								marginBottom: gap
							}
						: undefined
				}
				numColumns={numColumns}
				ListEmptyComponent={renderEmpty}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
			/>
		</View>
	)
}
