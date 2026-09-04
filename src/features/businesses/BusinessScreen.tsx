import { config } from '@/config'
import { HeaderRefreshButton, HeaderQRCodeButton, SmartHeader } from '@/core/smart-header'
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import StateBadge from '@/features/common/StateBadge'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import QRCodeModal from '@/features/common/QRCodeModal'
import { PhoneButton } from '@/core/ui/buttons/PhoneButton'
import { WhatsAppButton } from '@/core/ui/buttons/WhatsAppButton'
import { EmailButton } from '@/core/ui/buttons/EmailButton'
import { WebsiteButton } from '@/core/ui/buttons/WebsiteButton'
import { DirectionsButton } from '@/core/ui/buttons/DirectionsButton'
import Spinner from '@/features/common/Spinner'
import { useBusinessBySlug } from '@/features/businesses/useBusinessBySlug'
import { useBusinessProducts } from '@/features/businesses/useBusinessProducts'
import { getUserBySlug } from '@/features/users/users.api'
import { ProductType } from '@/features/products/products.type'
import { useTheme, themeColors } from '@/core/theme'
import ErrorBlock from '@/core/error/ErrorBlock'
import { SmartMediaView } from '@/core/smart-media'
import { useUser } from '@/core/contexts/UserContext'
import { formatAddress } from '@/features/common/address'
import { useScrollHandler } from '@/core/scroll'
import ReviewSection from '@/features/reviews/Reviews'
import BusinessProductsCard from '@/features/businesses/BusinessProductsCard'
export default function BusinessScreen() {
	const { businessSlug } = useLocalSearchParams<{ businessSlug: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const insets = useSafeAreaInsets()
	const styles = useMemo(() => createStyles(colors), [colors])
	const { data: businessResponse, isInitialLoading: businessLoading, isRefreshing: businessRefreshing, isOffline: businessOffline, refresh: refreshBusiness } = useBusinessBySlug({ businessSlug })
	const business = businessResponse?.data ?? null
	const { data: productsResponse, isInitialLoading: productsLoading, isRefreshing: productsRefreshing, isOffline: productsOffline, refresh: refreshProducts } = useBusinessProducts({ businessSlug })
	const products = (productsResponse?.data?.docs ?? []) as unknown as ProductType[]
	const [ownerPhoto, setOwnerPhoto] = useState<string | null>(null)
	const { onScroll } = useScrollHandler()
	const isInitialLoading = businessLoading || productsLoading
	const isRefreshing = businessRefreshing || productsRefreshing
	const isOffline = businessOffline && productsOffline
	const displayTitle = business ? localize(business.name) : ''
	useEffect(() => {
		if (!business?.owner?.slug) return
		let cancelled = false
		const fetchOwner = async () => {
			try {
				const ownerResponse = await getUserBySlug(business.owner.slug)
				if (!cancelled) setOwnerPhoto(ownerResponse.data?.media?.thumbnail?.url || null)
			} catch (ownerErr) {}
		}
		fetchOwner()
		return () => {
			cancelled = true
		}
	}, [business?.owner?.slug])
	const [showQRCode, setShowQRCode] = useState(false)
	const handleRefresh = useCallback(() => {
		refreshBusiness()
		refreshProducts()
	}, [refreshBusiness, refreshProducts])
	const handleShowQRCode = useCallback(() => setShowQRCode(true), [])
	const headerActions = useMemo(
		() => [<HeaderQRCodeButton key="qr-code" onPress={handleShowQRCode} />, <HeaderRefreshButton key="refresh" onRefresh={handleRefresh} isRefreshing={isRefreshing} />],
		[handleShowQRCode, handleRefresh, isRefreshing]
	)
	if (isInitialLoading) {
		return (
			<View style={styles.container}>
				<Stack.Screen
					options={
						{
							title: displayTitle,
							subtitle: `${businessSlug}`
						} as any
					}
				/>
				<Spinner />
			</View>
		)
	}
	if (isOffline && !business) {
		return (
			<View style={styles.container}>
				<Stack.Screen options={{ title: translate('error', 'Error') }} />
				<SmartHeader title={translate('error', 'Error')} fallbackRoute="/(home)/feed" />
				<View style={[styles.errorContainer, { backgroundColor: colors.background }]}>
					<ErrorBlock />
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
	const fullAddress = formatAddress(business.address, localize)
	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen
				options={
					{
						title: displayTitle,
						subtitle: `${business.slug}`,
						fallbackRoute: '/(home)/feed',
						headerActions: headerActions
					} as any
				}
			/>
			<SmartHeader.ScrollView
				style={styles.container}
				contentContainerStyle={[styles.scrollContent, { paddingTop: 12, paddingBottom: 40 + insets.bottom }]}
				refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} colors={[colors.primary]} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
				keyboardShouldPersistTaps="handled"
				showsVerticalScrollIndicator={false}
			>
				{/* Business Info Card */}
				<View style={[styles.infoCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
					<LinearGradient colors={[colors.primary, colors.primary + '10']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.businessBanner} />
					<View style={styles.infoCardContent}>
						<View style={styles.logoContainer}>
							<SmartMediaView media={business.media?.thumbnail?.url} style={styles.businessLogo} resizeMode="cover" enableFullscreenPreview={true} />
						</View>
						<View style={styles.brandingHeader}>
							<View style={{ flex: 1, gap: 4 }}>
								<Text style={[styles.businessName, { color: colors.text }]}>{localize(business.name)}</Text>
								<Text style={[styles.slugText, { color: colors.textSecondary }]}>{business.slug}</Text>
							</View>
							<View style={{ gap: 6, alignItems: 'flex-end' }}>
								{business.state?.code && <StateBadge stateCode={business.state.code} />}
								{business.rating?.average ? (
									<View style={styles.headerRatingRow}>
										<Ionicons name="star" size={14} color={themeColors.warning} />
										<Text style={[styles.headerRatingText, { color: colors.text }]}>{business.rating.average.toFixed(1)}</Text>
										<Text style={{ fontSize: 11, color: colors.textTertiary }}>({business.rating.count})</Text>
									</View>
								) : null}
							</View>
						</View>
						{business.description ? <Text style={[styles.businessDescription, { color: colors.textSecondary }]}>{business.description}</Text> : null}
						{/* Quick Actions Row */}
						<View style={[styles.quickActionsRow, { borderTopColor: colors.border + '30', borderBottomColor: colors.border + '30' }]}>
							<PhoneButton phone={business.contact?.phone} size={50} />
							<WhatsAppButton whatsapp={business.contact?.whatsapp || business.contact?.phone?.fullNumber} size={50} />
							<EmailButton email={business.contact?.email} size={50} />
							<WebsiteButton website={business.contact?.website} size={50} />
							<DirectionsButton location={business.location} address={business.address} size={50} />
						</View>
						{/* Metadata Cards Grid */}
						<View style={styles.infoCardGrid}>
							{business.owner ? (
								<TouchableOpacity
									style={[styles.infoCardCol, { borderColor: colors.border + '40', backgroundColor: colors.background + '40' }]}
									onPress={() => {
										if (business.owner?.slug) {
											router.push(`/users/${business.owner.slug}` as any)
										}
									}}
									activeOpacity={0.7}
								>
									{ownerPhoto ? (
										<SmartMediaView media={ownerPhoto} style={styles.ownerAvatar} resizeMode="cover" />
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
								<View style={[styles.infoCardCol, { borderColor: colors.border + '40', backgroundColor: colors.background + '40' }]}>
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
							<View style={[styles.detailsSection, { borderTopWidth: 1, borderTopColor: colors.border + '20' }]}>
								<Ionicons name="location-outline" size={16} color={colors.textSecondary} />
								<Text style={[styles.detailsText, { color: colors.textSecondary }]}>{fullAddress}</Text>
							</View>
						) : null}
					</View>
				</View>
				{/* Products Section */}
				<BusinessProductsCard products={products} />
				{/* Reviews Section */}
				{business && <ReviewSection targetResource="businesses" targetId={business._id} targetName={localize(business.name)} />}
			</SmartHeader.ScrollView>
			{/* QR Code Viewer Modal */}
			{business && (
				<QRCodeModal
					visible={showQRCode}
					onClose={() => setShowQRCode(false)}
					value={`${config.frontend.url}/b/${business.slug}`}
					title={localize(business.name)}
					subtitle={`${business.slug}`}
					filenamePrefix={`business_${business.slug}`}
				/>
			)}
		</View>
	)
}
const createStyles = (colors: any) =>
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
			overflow: 'hidden'
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
		actionCircleButton: {
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1
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
			borderColor: colors.border + '20'
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
			borderWidth: 1
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
			borderColor: themeColors.buttonText5
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
