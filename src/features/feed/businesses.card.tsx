import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native'
import SmartImage from '@/core/SmartImageViewer'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { BusinessFeedItem } from './feed.interface'
import { useRouter } from 'expo-router'
import { useUser } from '../../core/contexts/UserContext'
import ContactButtons from '@/features/common/ContactButtons'

type BusinessCardProps = {
	item: BusinessFeedItem
}

export default function BusinessCard({ item }: BusinessCardProps) {
	const { localize, translate } = useUser()
	const router = useRouter()

	const businessName = localize(item.name) || localize(item.business?.name) || translate('business', 'Business')
	const businessSlug = item.business?.slug || item.slug
	const address = item.business?.address
	const addressLine = address ? [address.street, address.city, address.region].filter(Boolean).join(', ') : null
	const rating = item.rating?.average || item.business?.rating?.average || 0
	const ratingCount = item.rating?.count || item.business?.rating?.count || 0

	const handlePress = () => {
		if (businessSlug) router.push(`/businesses/${businessSlug}` as any)
	}

	return (
		<TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={1}>
			{/* ── Business header row ── */}
			<View style={styles.headerRow}>
				{/* Left: avatar + name + slug */}
				<TouchableOpacity onPress={handlePress} style={styles.bizLeft} activeOpacity={0.75}>
					{item.media?.thumbnail?.url ? (
						<SmartImage source={item.media.thumbnail.url} style={styles.bizAvatar} resizeMode="cover" entityType="business" />
					) : (
						<View style={styles.bizAvatarFallback}>
							<MaterialIcons name="store" size={16} color="#0EA5E9" />
						</View>
					)}
					<View style={styles.bizInfo}>
						<Text style={styles.bizName} numberOfLines={2}>
							{businessName}
						</Text>
						{businessSlug ? (
							<Text style={styles.bizSlug} numberOfLines={2}>
								@{businessSlug}
							</Text>
						) : null}
					</View>
				</TouchableOpacity>
			</View>

			{/* ── Address row ── */}
			{addressLine ? (
				<View style={styles.addressRow}>
					<Ionicons name="location-outline" size={11} color="rgba(255,255,255,0.35)" />
					<Text style={styles.addressText} numberOfLines={1}>
						{addressLine}
					</Text>
				</View>
			) : null}

			{/* Contact buttons row below name/slug */}
			{(item.contact?.phone?.fullNumber || item.contact?.whatsapp || item.contact?.email || item.business?.location || item.business?.address) && (
				<View style={styles.bizContactRow}>
					<ContactButtons contact={item.contact} location={item.business?.location} address={item.business?.address} />
				</View>
			)}

			{/* ── Banner image ── */}
			<View style={styles.banner}>
				<SmartImage source={item.media?.thumbnail?.url} style={styles.bannerImg} resizeMode="cover" entityType="business" />
				<View style={styles.bannerOverlay} />

				{/* Rating badge overlaid on banner */}
				{rating > 0 && (
					<View style={styles.ratingBadge}>
						<MaterialIcons name="star" size={11} color="#FBBF24" />
						<Text style={styles.ratingVal}>{rating.toFixed(1)}</Text>
						<Text style={styles.ratingCnt}>({ratingCount})</Text>
					</View>
				)}

				{/* View arrow */}
				<TouchableOpacity style={styles.viewBtn} onPress={handlePress} accessibilityLabel="View business">
					<MaterialIcons name="arrow-forward" size={15} color="#ffffff" />
				</TouchableOpacity>
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

	// ── Header row ──
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 12,
		paddingTop: 10,
		paddingBottom: 6
	},
	bizContactRow: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		paddingHorizontal: 12,
		paddingBottom: 8,
		marginTop: -4
	},
	bizLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flex: 1,
		minWidth: 0
	},
	bizAvatar: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: 'rgba(255, 255, 255, 0.05)',
		flexShrink: 0
	},
	bizAvatarFallback: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: 'rgba(14, 165, 233, 0.12)',
		justifyContent: 'center',
		alignItems: 'center',
		flexShrink: 0
	},
	bizInfo: {
		flex: 1,
		minWidth: 0,
		gap: 2
	},
	bizName: {
		fontSize: 14,
		fontWeight: '700',
		color: 'rgba(255, 255, 255, 0.92)',
		flexShrink: 1
	},
	bizSlug: {
		fontSize: 11,
		fontWeight: '500',
		color: '#0EA5E9',
		flexShrink: 1
	},

	// ── Address row ──
	addressRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 12,
		paddingBottom: 8
	},
	addressText: {
		flex: 1,
		fontSize: 11,
		color: 'rgba(255, 255, 255, 0.35)',
		fontWeight: '500'
	},

	// ── Banner ──
	banner: {
		width: '100%',
		aspectRatio: 2.4,
		position: 'relative'
	},
	bannerImg: {
		width: '100%',
		height: '100%'
	},
	bannerOverlay: {
		...StyleSheet.absoluteFill,
		backgroundColor: 'rgba(10, 14, 26, 0.2)'
	},
	ratingBadge: {
		position: 'absolute',
		bottom: 10,
		left: 10,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3,
		backgroundColor: 'rgba(10,14,26,0.75)',
		borderRadius: 10,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderWidth: StyleSheet.hairlineWidth,
		borderColor: 'rgba(251,191,36,0.3)'
	},
	ratingVal: {
		fontSize: 11,
		fontWeight: '700',
		color: '#FBBF24'
	},
	ratingCnt: {
		fontSize: 10,
		color: 'rgba(255, 255, 255, 0.45)'
	},
	viewBtn: {
		position: 'absolute',
		bottom: 10,
		right: 10,
		width: 32,
		height: 32,
		borderRadius: 10,
		backgroundColor: '#0EA5E9',
		justifyContent: 'center',
		alignItems: 'center',
		...Platform.select({
			web: {
				boxShadow: '0 2px 10px rgba(14, 165, 233, 0.4)',
				transition: 'transform 0.12s ease'
			} as any
		})
	}
})
