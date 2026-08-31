import React, { useMemo } from 'react'
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, themeColors } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { SmartMediaView } from '@/core/smart-media'
import { Business } from './businesses.interface'
import { useRouter } from 'expo-router'
import { formatAddress } from '@/features/common/address'
import { IconButton } from '@/features/common/buttons/IconButton'
import { PhoneButton } from '@/features/common/buttons/PhoneButton'
import { WhatsAppButton } from '@/features/common/buttons/WhatsAppButton'
import { WebsiteButton } from '@/features/common/buttons/WebsiteButton'
import { DirectionsButton } from '@/features/common/buttons/DirectionsButton'
import { BaseCard } from '@/features/common/cards/BaseCard'

export interface BusinessCardProps {
	business: Business
	style?: StyleProp<ViewStyle>
}

const CARD_HEIGHT = 360
const IMAGE_HEIGHT = 140

const BusinessCard: React.FC<BusinessCardProps> = ({ business, style }) => {
	const { colors } = useTheme()
	const { translate, localize } = useUser()
	const router = useRouter()

	const handleBusinessPress = () => {
		router.push(`/businesses/${business.slug}` as any)
	}

	const fullAddress = useMemo(() => formatAddress(business.address, localize), [business.address, localize])
	const businessName = useMemo(() => localize(business.name) || translate('unnamed_business', 'Unnamed Business'), [business.name, localize, translate])
	const ownerSlug = business.owner?.slug || 'owner'
	const ownerName = useMemo(() => localize(business.owner?.name) || '', [business.owner?.name, localize])
	const rating = business.rating?.average || 0
	const ratingCount = business.rating?.count || 0

	return (
		<BaseCard onPress={handleBusinessPress} style={[styles.card, style]} contentStyle={styles.cardContent} borderColor={colors.info} backgroundColor={colors.background}>
			{/* Image — fixed height, no shift */}
			<View style={styles.imageContainer}>
				<SmartMediaView media={business.media?.thumbnail?.url} style={styles.image} contentFit="cover" />
			</View>

			{/* Content — flex 1, space-between, fixed heights for sub-sections */}
			<View style={styles.content}>
				{/* Header: name (2 lines, 44h) */}
				<View style={styles.header}>
					<Text style={[styles.businessName, { color: colors.text }]} numberOfLines={2}>
						{businessName}
					</Text>
				</View>

				{/* Rating — always 20h, placeholder when no rating */}
				<View style={styles.ratingRow}>
					{rating > 0 ? (
						<>
							<Ionicons name="star" size={14} color={themeColors.warning} />
							<Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
							<Text style={[styles.ratingCount, { color: colors.textSecondary }]}>({ratingCount})</Text>
						</>
					) : (
						<View style={styles.ratingPlaceholder} />
					)}
				</View>

				{/* Owner — always 18h */}
				<View style={styles.ownerRow}>
					<Text style={[styles.ownerName, { color: colors.textTertiary }]} numberOfLines={1}>
						{ownerName || ownerSlug}
					</Text>
				</View>

				{/* Address — always 36h (2 lines), placeholder when missing */}
				<View style={styles.addressRow}>
					<Ionicons name="location-outline" size={12} color={colors.textSecondary} style={styles.addressIcon} />
					<Text style={[styles.addressText, { color: colors.textSecondary }]} numberOfLines={2}>
						{fullAddress || ' '}
					</Text>
				</View>

				{/* Contact + View — fixed 48h, no shift */}
				<View style={styles.footer}>
					<View style={styles.contactRow}>
						<PhoneButton phone={business.contact?.phone} size={36} />
						<WhatsAppButton whatsapp={business.contact?.whatsapp} size={36} />
						<WebsiteButton website={business.contact?.website} size={36} />
						<DirectionsButton location={business.location} address={business.address} size={36} />
					</View>
					<IconButton
						icon="storefront-outline"
						label={translate('view_business', 'View Business')}
						onPress={(e) => {
							e.stopPropagation?.()
							handleBusinessPress()
						}}
						variant="primary"
						size={36}
					/>
				</View>
			</View>
		</BaseCard>
	)
}

const styles = StyleSheet.create({
	card: {
		height: CARD_HEIGHT,
		minHeight: CARD_HEIGHT,
		maxHeight: CARD_HEIGHT,
		padding: 0,
		overflow: 'hidden' as any,
		borderWidth: 1.5,
		borderRadius: 16
	},
	cardContent: {
		flex: 1,
		padding: 0
	},
	imageContainer: {
		width: '100%',
		height: IMAGE_HEIGHT,
		backgroundColor: themeColors.buttonText5,
		overflow: 'hidden'
	},
	image: {
		width: '100%',
		height: '100%'
	},
	content: {
		flex: 1,
		padding: 12,
		justifyContent: 'space-between',
		gap: 0
	},
	header: {
		height: 44,
		justifyContent: 'center'
	},
	businessName: {
		fontSize: 15,
		fontWeight: '700',
		lineHeight: 20
	},
	ratingRow: {
		height: 20,
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4
	},
	ratingPlaceholder: {
		height: 20
	},
	ratingText: {
		fontSize: 12,
		fontWeight: '600',
		color: themeColors.warning
	},
	ratingCount: {
		fontSize: 12,
		marginLeft: 2
	},
	ownerRow: {
		height: 18,
		justifyContent: 'center'
	},
	ownerName: {
		fontSize: 12,
		fontWeight: '500',
		lineHeight: 16
	},
	addressRow: {
		height: 36,
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 6,
		marginTop: 2
	},
	addressIcon: {
		marginTop: 2
	},
	addressText: {
		flex: 1,
		fontSize: 12,
		lineHeight: 16
	},
	footer: {
		height: 48,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8,
		marginTop: 4,
		paddingTop: 8,
		borderTopWidth: 1,
		borderTopColor: themeColors.buttonText10
	},
	contactRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6
	}
})

export default React.memo(BusinessCard)
