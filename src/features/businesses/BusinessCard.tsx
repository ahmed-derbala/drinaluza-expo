import React, { useMemo } from 'react'
import { View, Text, StyleSheet, Platform, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, themeColors } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { SmartMediaView } from '@/core/smart-media'
import { Business } from './businesses.interface'
import { useRouter } from 'expo-router'
import { PhoneButton } from '@/core/ui/buttons/PhoneButton'
import { WhatsAppButton } from '@/core/ui/buttons/WhatsAppButton'
import { WebsiteButton } from '@/core/ui/buttons/WebsiteButton'
import { DirectionsButton } from '@/core/ui/buttons/DirectionsButton'
import { BaseCard } from '@/features/common/cards/BaseCard'
import { LinearGradient } from 'expo-linear-gradient'

export interface BusinessCardProps {
	business: Business
	style?: StyleProp<ViewStyle>
}

const CARD_HEIGHT = 360

const BusinessCard: React.FC<BusinessCardProps> = ({ business, style }) => {
	const { colors } = useTheme()
	const { translate, localize } = useUser()
	const router = useRouter()

	const handleBusinessPress = () => {
		router.push(`/businesses/${business.slug}` as any)
	}

	const streetText = useMemo(() => {
		const street = (business.address as any)?.street
		if (!street) return ''
		if (typeof street === 'string') return street
		return localize(street as any)
	}, [business.address, localize])
	const businessName = useMemo(() => localize(business.name) || translate('unnamed_business', 'Unnamed Business'), [business.name, localize, translate])
	const rating = business.rating?.average || 0
	const ratingCount = business.rating?.count || 0

	return (
		<BaseCard onPress={handleBusinessPress} style={[styles.card, style]} contentStyle={styles.cardContent} borderColor={colors.info} backgroundColor={colors.background}>
			{/* Background — business thumbnail as card background */}
			<View style={[styles.bgImageContainer, { pointerEvents: 'none' as any }]}>
				<SmartMediaView media={business.media?.thumbnail?.url} style={StyleSheet.absoluteFill} contentFit="cover" />
			</View>
			<LinearGradient
				colors={[themeColors.background50, themeColors.background25, themeColors.background75]}
				start={{ x: 0, y: 0 }}
				end={{ x: 0, y: 1 }}
				style={[styles.bgOverlay, { pointerEvents: 'none' as any }]}
			/>

			{/* Content — flex 1, space-between, fixed heights for sub-sections */}
			<View style={styles.content}>
				{/* Top: name + street (street just under name, grouped) */}
				<View style={styles.topGroup}>
					<View style={styles.header}>
						<Text style={[styles.businessName, { color: themeColors.buttonText }]} numberOfLines={2}>
							{businessName}
						</Text>
					</View>
					<View style={styles.streetRow}>
						<View style={styles.streetPill}>
							<Ionicons name="location" size={12} color={themeColors.buttonText} />
							<Text style={styles.streetText} numberOfLines={1}>
								{streetText || '—'}
							</Text>
						</View>
					</View>
				</View>

				{/* Rating — always 20h, placeholder when no rating */}
				<View style={styles.ratingRow}>
					{rating > 0 ? (
						<>
							<Ionicons name="star" size={14} color={themeColors.warning} />
							<Text style={styles.ratingText}>{rating.toFixed(1)}</Text>
							<Text style={[styles.ratingCount, { color: themeColors.buttonText40 }]}>({ratingCount})</Text>
						</>
					) : (
						<View style={styles.ratingPlaceholder} />
					)}
				</View>

				{/* Contact — fixed 48h, no shift, no bottom-right button */}
				<View style={styles.footer}>
					<View style={styles.contactRow}>
						<PhoneButton phone={business.contact?.phone} size={36} />
						<WhatsAppButton whatsapp={business.contact?.whatsapp} size={36} />
						<WebsiteButton website={business.contact?.website} size={36} />
						<DirectionsButton location={business.location} address={business.address} size={36} />
					</View>
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
	bgImageContainer: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		overflow: 'hidden',
		borderRadius: 16,
		...Platform.select({
			web: {
				overflow: 'hidden',
				isolation: 'isolate' as any,
				transform: 'translateZ(0)' as any
			} as any
		})
	},
	bgOverlay: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0
	},
	content: {
		flex: 1,
		padding: 12,
		justifyContent: 'space-between',
		gap: 0,
		zIndex: 1
	},
	topGroup: {
		gap: 6,
		alignSelf: 'stretch'
	},
	header: {
		height: 44,
		justifyContent: 'flex-start',
		alignItems: 'flex-start',
		alignSelf: 'stretch'
	},
	businessName: {
		fontSize: 15,
		fontWeight: '700',
		lineHeight: 20,
		textAlign: 'left',
		alignSelf: 'flex-start'
	},
	streetRow: {
		height: 22,
		flexDirection: 'row',
		alignItems: 'center'
	},
	streetPill: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		backgroundColor: themeColors.background75,
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 10,
		maxWidth: '100%',
		borderWidth: 1,
		borderColor: themeColors.buttonText10
	},
	streetText: {
		flexShrink: 1,
		fontSize: 12,
		lineHeight: 16,
		fontWeight: '700',
		color: themeColors.buttonText
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
	footer: {
		height: 48,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-start',
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
