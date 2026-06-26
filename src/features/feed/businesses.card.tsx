import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native'
import SmartImage from '@/core/SmartImageViewer'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { BusinessFeedItem } from './feed.interface'
import { useRouter } from 'expo-router'
import { useUser } from '../../core/contexts/UserContext'

type BusinessCardProps = {
	item: BusinessFeedItem
}

export default function BusinessCard({ item }: BusinessCardProps) {
	const { localize, translate } = useUser()
	const router = useRouter()

	const businessName = localize(item.name) || localize(item.business?.name) || translate('business', 'Business')
	const ownerName = localize(item.business?.owner?.name)
	const address = item.business?.address
	const locationText = address ? [address.city, address.country].filter(Boolean).join(', ') : ''
	const streetText = address?.street || ''
	const rating = item.rating?.average || item.business?.rating?.average || 0
	const ratingCount = item.rating?.count || item.business?.rating?.count || 0

	const handlePress = () => {
		const slug = item.business?.slug || item.slug
		if (slug) router.push(`/businesses/${slug}` as any)
	}

	const handleCall = (e: any) => {
		e.stopPropagation?.()
		const phone = item.contact?.phone?.fullNumber
		if (phone) Linking.openURL(`tel:${phone}`).catch(() => {})
	}

	const handleWhatsApp = (e: any) => {
		e.stopPropagation?.()
		const wa = item.contact?.whatsapp
		if (wa) Linking.openURL(`https://wa.me/${wa.replace(/[^0-9]/g, '')}`).catch(() => {})
	}

	const handleDirections = (e: any) => {
		e.stopPropagation?.()
		const coords = item.business?.location?.coordinates
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

	const handleEmail = (e: any) => {
		e.stopPropagation?.()
		const email = item.contact?.email
		if (email) Linking.openURL(`mailto:${email}`).catch(() => {})
	}

	const hasLocation = item.business?.location?.coordinates && item.business.location.coordinates.length === 2

	return (
		<TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.88}>
			{/* Banner image */}
			<View style={styles.banner}>
				<SmartImage source={item.media?.thumbnail?.url} style={styles.bannerImg} resizeMode="cover" entityType="business" />
				<View style={styles.bannerOverlay} />
				<View style={styles.storeBadge}>
					<MaterialIcons name="store" size={14} color="#0EA5E9" />
				</View>
			</View>

			{/* Content */}
			<View style={styles.content}>
				<Text style={styles.name} numberOfLines={1}>
					{businessName}
				</Text>

				{rating > 0 && (
					<View style={styles.ratingRow}>
						<MaterialIcons name="star" size={12} color="#FBBF24" />
						<Text style={styles.ratingVal}>{rating.toFixed(1)}</Text>
						<Text style={styles.ratingCnt}>({ratingCount})</Text>
					</View>
				)}

				{ownerName && (
					<View style={styles.metaRow}>
						<Ionicons name="person-outline" size={11} color="rgba(255,255,255,0.4)" />
						<Text style={styles.metaText} numberOfLines={1}>
							{ownerName}
						</Text>
					</View>
				)}

				{locationText && (
					<View style={styles.metaRow}>
						<Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.4)" />
						<Text style={styles.metaText} numberOfLines={1}>
							{locationText}
						</Text>
					</View>
				)}

				{streetText && (
					<Text style={styles.streetText} numberOfLines={1}>
						{streetText}
					</Text>
				)}

				{/* Actions row */}
				<View style={styles.actionsRow}>
					{item.contact?.phone && (
						<TouchableOpacity style={styles.actionBtn} onPress={handleCall} hitSlop={12}>
							<Ionicons name="call-outline" size={16} color="#0EA5E9" />
						</TouchableOpacity>
					)}
					{item.contact?.whatsapp && (
						<TouchableOpacity style={[styles.actionBtn, { backgroundColor: 'rgba(45, 212, 191, 0.1)' }]} onPress={handleWhatsApp} hitSlop={12}>
							<Ionicons name="logo-whatsapp" size={16} color="#2DD4BF" />
						</TouchableOpacity>
					)}
					{item.contact?.email && (
						<TouchableOpacity style={styles.actionBtn} onPress={handleEmail} hitSlop={12}>
							<Ionicons name="mail-outline" size={16} color="#0EA5E9" />
						</TouchableOpacity>
					)}
					{hasLocation && (
						<TouchableOpacity style={styles.actionBtn} onPress={handleDirections} hitSlop={12}>
							<Ionicons name="navigate-outline" size={16} color="#0EA5E9" />
						</TouchableOpacity>
					)}

					<View style={{ flex: 1 }} />

					<TouchableOpacity style={styles.viewBtn} onPress={handlePress}>
						<MaterialIcons name="arrow-forward" size={16} color="#ffffff" />
					</TouchableOpacity>
				</View>
			</View>
		</TouchableOpacity>
	)
}

// ─── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
	card: {
		flex: 1,
		borderRadius: 20,
		backgroundColor: 'rgba(15, 23, 42, 0.65)',
		borderWidth: 1,
		borderColor: '#0EA5E9',
		overflow: 'hidden',
		...Platform.select({
			web: {
				transition: 'transform 0.15s ease, box-shadow 0.15s ease',
				backdropFilter: 'blur(20px)',
				WebkitBackdropFilter: 'blur(20px)'
			} as any
		})
	},
	banner: {
		width: '100%',
		aspectRatio: 2.4,
		position: 'relative',
		backgroundColor: 'rgba(255, 255, 255, 0.02)'
	},
	bannerImg: {
		width: '100%',
		height: '100%'
	},
	bannerOverlay: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10, 14, 26, 0.2)'
	},
	storeBadge: {
		position: 'absolute',
		top: 10,
		right: 10,
		width: 28,
		height: 28,
		borderRadius: 8,
		backgroundColor: 'rgba(14, 165, 233, 0.12)',
		borderWidth: 1,
		borderColor: 'rgba(14, 165, 233, 0.2)',
		justifyContent: 'center',
		alignItems: 'center'
	},
	content: {
		padding: 14,
		gap: 6
	},
	name: {
		fontSize: 16,
		fontWeight: '700',
		color: '#F8FAFC',
		letterSpacing: -0.2
	},
	ratingRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		marginTop: 2
	},
	ratingVal: {
		fontSize: 12,
		fontWeight: '700',
		color: '#FBBF24'
	},
	ratingCnt: {
		fontSize: 10,
		color: 'rgba(255, 255, 255, 0.35)'
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 1
	},
	metaText: {
		fontSize: 12,
		color: 'rgba(255, 255, 255, 0.45)',
		fontWeight: '500',
		flex: 1
	},
	streetText: {
		fontSize: 11,
		color: 'rgba(255, 255, 255, 0.3)',
		marginLeft: 17,
		fontWeight: '400'
	},
	actionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6,
		marginTop: 10,
		paddingTop: 10,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: 'rgba(255, 255, 255, 0.08)'
	},
	actionBtn: {
		width: 40,
		height: 40,
		borderRadius: 10,
		backgroundColor: 'rgba(14, 165, 233, 0.1)',
		justifyContent: 'center',
		alignItems: 'center'
	},
	viewBtn: {
		width: 34,
		height: 34,
		borderRadius: 10,
		backgroundColor: '#0EA5E9',
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				boxShadow: '0 2px 10px rgba(14, 165, 233, 0.35)',
				transition: 'transform 0.12s ease'
			} as any
		})
	}
})
