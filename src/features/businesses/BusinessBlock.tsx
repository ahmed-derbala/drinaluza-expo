import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { SmartMediaView } from '@/core/smart-media'
import { useUser } from '@/core/contexts/UserContext'
import { themeColors } from '@/core/theme'
import { getStreetString } from '@/features/common/address'
import type { LocalizedName, Address } from '@/features/common/address'

export type BusinessBlockBusiness = {
	name: LocalizedName
	slug: string
	media?: {
		thumbnail?: {
			url: string
		}
	}
	address?: Address
}

export interface BusinessBlockProps {
	business?: BusinessBlockBusiness | null
	onPress?: () => void
	showAddress?: boolean
}

const BusinessBlock: React.FC<BusinessBlockProps> = React.memo(({ business, onPress, showAddress = true }) => {
	const { localize } = useUser()

	if (!business) return null

	const streetStr = getStreetString(business.address?.street, localize)
	const city = business.address?.city
	const addressLine = [streetStr, city].filter(Boolean).join(', ')

	const content = (
		<View style={styles.bizRow}>
			<View style={styles.bizLeft}>
				{business.media?.thumbnail?.url ? (
					<SmartMediaView media={business.media.thumbnail.url} style={styles.bizAvatar} resizeMode="cover" />
				) : (
					<View style={styles.bizAvatarFallback}>
						<MaterialIcons name="store" size={14} color={themeColors.primary} />
					</View>
				)}
				<View style={styles.bizInfo}>
					<Text style={styles.bizName} numberOfLines={2}>
						{localize(business.name)}
					</Text>
					{business.slug ? (
						<Text style={styles.bizSlug} numberOfLines={2}>
							{business.slug}
						</Text>
					) : null}
				</View>
			</View>
		</View>
	)

	return (
		<View>
			{onPress ? (
				<TouchableOpacity onPress={onPress} activeOpacity={0.75}>
					{content}
				</TouchableOpacity>
			) : (
				content
			)}
			{showAddress && addressLine ? (
				<View style={styles.addressRow}>
					<Ionicons name="location-outline" size={11} color={themeColors.buttonText40} />
					<Text style={styles.bizAddress} numberOfLines={1}>
						{addressLine}
					</Text>
				</View>
			) : null}
		</View>
	)
})

BusinessBlock.displayName = 'BusinessBlock'

const styles = StyleSheet.create({
	bizRow: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingTop: 8,
		paddingBottom: 2
	},
	bizLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flex: 1,
		minWidth: 0
	},
	bizInfo: {
		flex: 1,
		minWidth: 0
	},
	bizAvatar: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: themeColors.buttonText5
	},
	bizAvatarFallback: {
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: themeColors.primaryContainer,
		justifyContent: 'center',
		alignItems: 'center'
	},
	bizName: {
		fontSize: 13,
		fontWeight: '700',
		color: themeColors.buttonText,
		textAlign: 'left'
	},
	bizSlug: {
		fontSize: 10,
		color: themeColors.buttonText40
	},
	addressRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		paddingHorizontal: 10,
		paddingBottom: 4
	},
	bizAddress: {
		flex: 1,
		fontSize: 11,
		color: themeColors.buttonText40
	}
})

export default BusinessBlock
