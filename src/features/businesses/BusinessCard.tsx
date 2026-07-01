import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, TextStyle, ViewStyle, ImageStyle, useWindowDimensions } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, createShadow } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import SmartImage from '@/core/SmartImageViewer'
import { Business } from './businesses.interface'
import { useRouter } from 'expo-router'
import { getGeoCoordinates, openDirections } from '@/core/helpers/maps'

export interface BusinessCardProps {
	business: Business
	width: number
	imageHeight: number
	showExtended?: boolean
	isExtraSmall?: boolean
	fontSize?: number
	subtitleFontSize?: number
	smallFontSize?: number
}

const BusinessCard: React.FC<BusinessCardProps> = ({ business, width, imageHeight, showExtended = false, isExtraSmall = false, fontSize = 14, subtitleFontSize = 13, smallFontSize = 12 }) => {
	const { colors } = useTheme()
	const { translate, localize } = useUser()
	const router = useRouter()
	const { height: windowHeight } = useWindowDimensions()
	const isDark = true

	const handleBusinessPress = (slug: string) => {
		router.push(`/businesses/${slug}` as any)
	}

	// Build address string
	const addressParts = []
	if (business.address?.street) addressParts.push(business.address.street)
	if (business.address?.city) addressParts.push(business.address.city)
	if (business.address?.region) addressParts.push(business.address.region)
	if (business.address?.country) addressParts.push(business.address.country)
	const fullAddress = addressParts.join(', ')

	const businessName = localize(business.name) || translate('unnamed_business', 'Unnamed Business')
	const ownerSlug = business.owner?.slug || 'owner'
	const ownerName = localize(business.owner?.name) || ''
	const rating = business.rating?.average || 0
	const ratingCount = business.rating?.count || 0

	const styles = createStyles(colors, isDark, {
		width,
		imageHeight,
		isExtraSmall,
		fontSize,
		subtitleFontSize,
		smallFontSize,
		windowHeight
	})

	const showRating = windowHeight >= 500 && rating > 0
	const showOwner = windowHeight >= 460
	const showAddress = windowHeight >= 520 && fullAddress

	return (
		<TouchableOpacity style={styles.businessCard as ViewStyle} onPress={() => handleBusinessPress(business.slug)}>
			{/* Business Image */}
			<View style={styles.businessImageContainer as ViewStyle}>
				<SmartImage source={business.media?.thumbnail?.url} style={styles.businessImage as ImageStyle} resizeMode="cover" entityType="business" />
			</View>

			<View style={styles.businessCardContent as ViewStyle}>
				{/* Business Name and Owner */}
				<View style={styles.businessHeader as ViewStyle}>
					<Text style={styles.businessName as TextStyle} numberOfLines={2}>
						{businessName}
					</Text>
					{showRating && (
						<View style={styles.ratingContainer as ViewStyle}>
							<Ionicons name="star" size={isExtraSmall ? 12 : 14} color="#FFD700" />
							<Text style={styles.ratingText as TextStyle}>{rating.toFixed(1)}</Text>
							<Text style={styles.ratingCount as TextStyle}>({ratingCount})</Text>
						</View>
					)}
					{showOwner && showExtended && ownerName && (
						<Text style={styles.businessOwnerLabel as TextStyle} numberOfLines={2}>
							{ownerName}
						</Text>
					)}
					{showOwner && (
						<Text style={styles.ownerName as TextStyle} numberOfLines={2}>
							@{ownerSlug}
						</Text>
					)}
				</View>

				{/* Address */}
				{showAddress ? (
					<View style={styles.addressContainer as ViewStyle}>
						<Ionicons name="location-outline" size={isExtraSmall ? 12 : 14} color={colors.textSecondary} />
						<Text style={styles.addressText as TextStyle} numberOfLines={2}>
							{fullAddress}
						</Text>
					</View>
				) : null}

				{/* Contact Buttons */}
				<View style={styles.contactButtons as ViewStyle}>
					{business.contact?.phone?.fullNumber ? (
						<TouchableOpacity
							style={styles.contactButton as ViewStyle}
							onPress={() => {
								if (business.contact?.phone?.fullNumber) {
									Linking.openURL(`tel:${business.contact.phone.fullNumber}`).catch(() => {})
								}
							}}
						>
							<Ionicons name="call-outline" size={isExtraSmall ? 16 : 18} color={colors.primary} />
						</TouchableOpacity>
					) : null}
					{business.contact?.whatsapp ? (
						<TouchableOpacity
							style={[styles.contactButton as ViewStyle, styles.whatsappButton as ViewStyle]}
							onPress={() => {
								if (business.contact?.whatsapp) {
									Linking.openURL(`https://wa.me/${business.contact.whatsapp.replace(/[^0-9]/g, '')}`).catch(() => {})
								}
							}}
						>
							<Ionicons name="logo-whatsapp" size={isExtraSmall ? 16 : 18} color="#fff" />
						</TouchableOpacity>
					) : null}
					{getGeoCoordinates(business.location) ? (
						<TouchableOpacity style={styles.contactButton as ViewStyle} onPress={() => openDirections(business.location, business.address)}>
							<Ionicons name="map-outline" size={isExtraSmall ? 16 : 18} color={colors.primary} />
						</TouchableOpacity>
					) : null}
				</View>

				{/* View Business Button */}
				<TouchableOpacity style={styles.viewButton as ViewStyle} onPress={() => handleBusinessPress(business.slug)}>
					<Ionicons name="storefront-outline" size={isExtraSmall ? 16 : 18} color="#fff" />
				</TouchableOpacity>
			</View>
		</TouchableOpacity>
	)
}

const createStyles = (
	colors: any,
	isDark: boolean,
	opts: {
		width: number
		imageHeight: number
		isExtraSmall: boolean
		fontSize: number
		subtitleFontSize: number
		smallFontSize: number
		windowHeight: number
	}
) => {
	const isCompact = opts.windowHeight < 550
	const maxCardHeight = Math.max(180, opts.windowHeight - 140)
	return StyleSheet.create({
		businessCard: {
			flex: 1,
			margin: opts.isExtraSmall ? 4 : 6,
			borderRadius: opts.isExtraSmall ? 12 : 16,
			overflow: 'hidden',
			backgroundColor: colors.card,
			borderWidth: 1.5,
			borderColor: colors.info || '#3B82F6',
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: isDark ? 0.15 : 0.05,
			shadowRadius: 6,
			elevation: 2,
			width: opts.width - (opts.isExtraSmall ? 8 : 12),
			maxWidth: opts.width - (opts.isExtraSmall ? 8 : 12),
			minHeight: Math.min(opts.isExtraSmall ? 220 : 280, maxCardHeight),
			maxHeight: maxCardHeight,
			alignSelf: 'flex-start',
			flexDirection: 'column',
			justifyContent: 'space-between'
		},
		businessImageContainer: {
			position: 'relative',
			width: '100%',
			height: Math.min(opts.imageHeight, opts.windowHeight * 0.18),
			backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)'
		},
		businessImage: {
			width: '100%',
			height: '100%'
		},
		businessCardContent: {
			flex: 1,
			padding: isCompact ? 8 : opts.isExtraSmall ? 10 : 16,
			justifyContent: 'space-between'
		},
		businessHeader: {
			marginBottom: isCompact ? 4 : opts.isExtraSmall ? 8 : 12
		},
		businessOwnerLabel: {
			fontSize: opts.smallFontSize,
			color: colors.textSecondary,
			marginBottom: 2,
			fontWeight: '500'
		},
		businessName: {
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
		ratingContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			marginBottom: 8
		},
		ratingText: {
			color: colors.text,
			fontSize: 12,
			fontWeight: '600'
		},
		ratingCount: {
			color: colors.textSecondary,
			fontSize: 12,
			marginLeft: 4
		},
		contactButtons: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginTop: isCompact ? 4 : opts.isExtraSmall ? 8 : 12,
			gap: opts.isExtraSmall ? 6 : 8
		},
		contactButton: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			paddingVertical: isCompact ? 4 : opts.isExtraSmall ? 8 : 10,
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
			paddingVertical: isCompact ? 6 : opts.isExtraSmall ? 10 : 12,
			paddingHorizontal: opts.isExtraSmall ? 14 : 18,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			marginTop: isCompact ? 4 : opts.isExtraSmall ? 8 : 12
		},
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
		}
	})
}

export default React.memo(BusinessCard)
