import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform, useWindowDimensions } from 'react-native'
import SmartImage from '../../core/helpers/SmartImage'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { ShopFeedItem } from './feed.interface'
import { useTheme } from '../../core/contexts/ThemeContext'
import { useRouter } from 'expo-router'
import { useUser } from '../../core/contexts/UserContext'

type ShopCardProps = {
	item: ShopFeedItem
}

export default function ShopCard({ item }: ShopCardProps) {
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const router = useRouter()
	const { width } = useWindowDimensions()
	const styles = useMemo(() => createStyles(colors, width), [colors, width])

	const shopName = localize(item.name) || localize(item.shop?.name) || translate('shop', 'Shop')
	const ownerName = localize(item.shop?.owner?.name)
	const address = item.shop?.address
	const locationText = address ? [address.city, address.country].filter(Boolean).join(', ') : ''
	const streetText = address?.street || ''

	const handlePress = () => {
		const slug = item.shop?.slug || item.slug
		if (slug) {
			router.push(`/home/shops/${slug}` as any)
		}
	}

	const handleCall = () => {
		const phone = item.contact?.phone?.fullNumber
		if (phone) {
			Linking.openURL(`tel:${phone}`).catch(() => {})
		}
	}

	const handleWhatsApp = () => {
		const wa = item.contact?.whatsapp
		if (wa) {
			Linking.openURL(`https://wa.me/${wa.replace(/[^0-9]/g, '')}`).catch(() => {})
		}
	}

	const handleDirections = () => {
		const coords = item.shop?.location?.coordinates
		if (coords && coords.length === 2) {
			const [lng, lat] = coords
			const url = Platform.select({
				ios: `maps:?daddr=${lat},${lng}`,
				android: `google.navigation:q=${lat},${lng}`,
				default: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`
			})
			if (url) Linking.openURL(url).catch(() => {})
		}
	}

	const handleEmail = () => {
		const email = item.contact?.email
		if (email) {
			Linking.openURL(`mailto:${email}`).catch(() => {})
		}
	}

	const hasContact = item.contact?.phone || item.contact?.whatsapp || item.contact?.email
	const hasLocation = item.shop?.location?.coordinates && item.shop.location.coordinates.length === 2

	return (
		<TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.85}>
			{/* Thumbnail */}
			<View style={styles.imageContainer}>
				<SmartImage source={item.media?.thumbnail?.url} style={styles.image} resizeMode="cover" entityType="shop" />
				<View style={styles.imageOverlay} />
				{/* Shop badge */}
				<View style={styles.badge}>
					<MaterialIcons name="store" size={14} color={colors.primary} />
				</View>
			</View>

			{/* Info */}
			<View style={styles.info}>
				<Text style={styles.shopName} numberOfLines={1}>
					{shopName}
				</Text>

				{ownerName ? (
					<View style={styles.ownerRow}>
						<Ionicons name="person-outline" size={12} color={colors.textTertiary} />
						<Text style={styles.ownerText} numberOfLines={1}>
							{ownerName}
						</Text>
					</View>
				) : null}

				{locationText ? (
					<View style={styles.locationRow}>
						<Ionicons name="location-outline" size={12} color={colors.textTertiary} />
						<Text style={styles.locationText} numberOfLines={1}>
							{locationText}
						</Text>
					</View>
				) : null}

				{streetText ? (
					<Text style={styles.streetText} numberOfLines={1}>
						{streetText}
					</Text>
				) : null}

				{/* Action buttons — icons only */}
				{hasContact || hasLocation ? (
					<View style={styles.actions}>
						{item.contact?.phone ? (
							<TouchableOpacity style={styles.actionBtn} onPress={handleCall} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
								<Ionicons name="call-outline" size={18} color={colors.primary} />
							</TouchableOpacity>
						) : null}
						{item.contact?.whatsapp ? (
							<TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#134E4A' }]} onPress={handleWhatsApp} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
								<Ionicons name="logo-whatsapp" size={18} color="#2DD4BF" />
							</TouchableOpacity>
						) : null}
						{item.contact?.email ? (
							<TouchableOpacity style={styles.actionBtn} onPress={handleEmail} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
								<Ionicons name="mail-outline" size={18} color={colors.primary} />
							</TouchableOpacity>
						) : null}
						{hasLocation ? (
							<TouchableOpacity style={styles.actionBtn} onPress={handleDirections} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
								<Ionicons name="navigate-outline" size={18} color={colors.primary} />
							</TouchableOpacity>
						) : null}
						{/* Spacer + arrow */}
						<View style={{ flex: 1 }} />
						<TouchableOpacity style={styles.viewBtn} onPress={handlePress}>
							<MaterialIcons name="arrow-forward" size={20} color={colors.textOnPrimary} />
						</TouchableOpacity>
					</View>
				) : (
					<View style={styles.actions}>
						<View style={{ flex: 1 }} />
						<TouchableOpacity style={styles.viewBtn} onPress={handlePress}>
							<MaterialIcons name="arrow-forward" size={20} color={colors.textOnPrimary} />
						</TouchableOpacity>
					</View>
				)}
			</View>
		</TouchableOpacity>
	)
}

const createStyles = (colors: any, screenWidth: number) => {
	const isSmall = screenWidth < 400
	return StyleSheet.create({
		card: {
			flex: 1,
			backgroundColor: colors.card,
			borderRadius: 16,
			overflow: 'hidden',
			borderWidth: 1,
			borderColor: colors.border,
			...Platform.select({
				ios: {
					shadowColor: colors.primary,
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.15,
					shadowRadius: 12
				},
				android: { elevation: 6 },
				web: { boxShadow: `0 4px 12px ${colors.primary}15` }
			})
		},
		imageContainer: {
			width: '100%',
			aspectRatio: 2.2,
			backgroundColor: colors.surface,
			position: 'relative'
		},
		image: {
			width: '100%',
			height: '100%'
		},
		imageOverlay: {
			...StyleSheet.absoluteFillObject,
			backgroundColor: 'rgba(2, 6, 23, 0.15)'
		},
		badge: {
			position: 'absolute',
			top: 10,
			right: 10,
			width: 32,
			height: 32,
			borderRadius: 10,
			backgroundColor: colors.primaryContainer,
			justifyContent: 'center',
			alignItems: 'center'
		},
		info: {
			flex: 1,
			padding: 14,
			gap: 6,
			justifyContent: 'space-between'
		},
		shopName: {
			fontSize: isSmall ? 17 : 19,
			fontWeight: '700',
			color: colors.text
		},
		ownerRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 5
		},
		ownerText: {
			fontSize: 12,
			color: colors.textTertiary,
			fontWeight: '500'
		},
		locationRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 5
		},
		locationText: {
			fontSize: 12,
			color: colors.textSecondary,
			fontWeight: '500'
		},
		streetText: {
			fontSize: 11,
			color: colors.textTertiary,
			marginLeft: 17
		},
		actions: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			marginTop: 6,
			paddingTop: 10,
			borderTopWidth: 1,
			borderTopColor: colors.border
		},
		actionBtn: {
			width: 36,
			height: 36,
			borderRadius: 10,
			backgroundColor: colors.primaryContainer,
			justifyContent: 'center',
			alignItems: 'center'
		},
		viewBtn: {
			width: 40,
			height: 40,
			borderRadius: 12,
			backgroundColor: colors.primary,
			justifyContent: 'center',
			alignItems: 'center',
			...Platform.select({
				ios: {
					shadowColor: colors.primary,
					shadowOffset: { width: 0, height: 3 },
					shadowOpacity: 0.35,
					shadowRadius: 6
				},
				android: { elevation: 4 },
				web: { boxShadow: `0 3px 8px ${colors.primary}40` }
			})
		}
	})
}
