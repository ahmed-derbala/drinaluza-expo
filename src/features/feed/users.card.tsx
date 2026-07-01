import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking } from 'react-native'
import SmartImage from '@/core/SmartImageViewer'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { UserFeedItem } from './feed.interface'
import { useUser } from '../../core/contexts/UserContext'
import { useRouter } from 'expo-router'

type UserCardProps = {
	item: UserFeedItem
}

const ROLE_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
	business_owner: { icon: 'storefront', label: 'Business Owner', color: '#38BDF8' },
	admin: { icon: 'shield', label: 'Admin', color: '#FBBF24' },
	customer: { icon: 'person', label: 'Customer', color: '#2DD4BF' },
	default: { icon: 'person', label: 'User', color: '#94A3B8' }
}

export default function UserCard({ item }: UserCardProps) {
	const { localize, translate } = useUser()
	const router = useRouter()

	const userName = localize(item.name) || item.slug || translate('user', 'User')
	const roleConfig = ROLE_CONFIG[item.role] || ROLE_CONFIG.default
	const address = item.address
	const locationText = address ? [address.city, address.country].filter(Boolean).join(', ') : ''
	const isActive = item.state?.code === 'active'
	const hasContact = item.contact?.phone || item.contact?.whatsapp || item.contact?.email

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

	const handleEmail = (e: any) => {
		e.stopPropagation?.()
		const email = item.contact?.email
		if (email) Linking.openURL(`mailto:${email}`).catch(() => {})
	}

	const handlePress = () => {
		if (item.slug) router.push(`/users/${item.slug}` as any)
	}

	return (
		<TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.88}>
			{/* Header: Avatar + Info */}
			<View style={styles.header}>
				<View style={styles.avatarWrap}>
					<SmartImage source={typeof item.media?.thumbnail === 'string' ? item.media.thumbnail : item.media?.thumbnail?.url} style={styles.avatar} resizeMode="cover" entityType="user" />
					{isActive && <View style={styles.statusDot} />}
				</View>

				<View style={styles.headerInfo}>
					<Text style={styles.userName} numberOfLines={2}>
						{userName}
					</Text>

					{/* Role chip */}
					<View style={[styles.roleChip, { backgroundColor: roleConfig.color + '14', borderColor: roleConfig.color + '30' }]}>
						<MaterialIcons name={roleConfig.icon as any} size={10} color={roleConfig.color} />
						<Text style={[styles.roleText, { color: roleConfig.color }]}>{translate(item.role || 'user', roleConfig.label)}</Text>
					</View>
				</View>

				{/* Person type badge */}
				<View style={styles.typeBadge}>
					<Ionicons name="person" size={13} color="#0EA5E9" />
				</View>
			</View>

			{/* Location */}
			{locationText ? (
				<View style={styles.metaRow}>
					<Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.4)" />
					<Text style={styles.metaText} numberOfLines={1}>
						{locationText}
					</Text>
				</View>
			) : null}

			{/* Footer: slug + contact actions */}
			<View style={styles.footer}>
				{item.slug && (
					<View style={styles.slugRow}>
						<Text style={styles.slugAt}>@</Text>
						<Text style={styles.slugText} numberOfLines={2}>
							{item.slug}
						</Text>
					</View>
				)}

				{hasContact && (
					<View style={styles.contactActionsRow}>
						{item.contact?.phone && (
							<TouchableOpacity style={styles.contactBtn} onPress={handleCall} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
								<Ionicons name="call-outline" size={16} color="#0EA5E9" />
							</TouchableOpacity>
						)}
						{item.contact?.whatsapp && (
							<TouchableOpacity style={[styles.contactBtn, { backgroundColor: 'rgba(45, 212, 191, 0.1)' }]} onPress={handleWhatsApp} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
								<Ionicons name="logo-whatsapp" size={16} color="#2DD4BF" />
							</TouchableOpacity>
						)}
						{item.contact?.email && (
							<TouchableOpacity style={styles.contactBtn} onPress={handleEmail} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
								<Ionicons name="mail-outline" size={16} color="#0EA5E9" />
							</TouchableOpacity>
						)}
					</View>
				)}
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
		padding: 14,
		gap: 10,
		justifyContent: 'space-between',
		overflow: 'hidden',
		...Platform.select({
			web: {
				backdropFilter: 'blur(20px)',
				WebkitBackdropFilter: 'blur(20px)',
				transition: 'transform 0.15s ease, box-shadow 0.15s ease'
			} as any
		})
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12
	},
	avatarWrap: {
		position: 'relative'
	},
	avatar: {
		width: 52,
		height: 52,
		borderRadius: 16,
		backgroundColor: 'rgba(255, 255, 255, 0.03)',
		borderWidth: 1,
		borderColor: 'rgba(14, 165, 233, 0.2)'
	},
	statusDot: {
		position: 'absolute',
		bottom: -1,
		right: -1,
		width: 12,
		height: 12,
		borderRadius: 6,
		backgroundColor: '#34D399',
		borderWidth: 2,
		borderColor: '#0F172A'
	},
	headerInfo: {
		flex: 1,
		gap: 4
	},
	userName: {
		fontSize: 16,
		fontWeight: '700',
		color: '#F8FAFC',
		letterSpacing: -0.2
	},
	roleChip: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		alignSelf: 'flex-start',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		borderWidth: 1
	},
	roleText: {
		fontSize: 10,
		fontWeight: '600',
		textTransform: 'capitalize'
	},
	typeBadge: {
		width: 30,
		height: 30,
		borderRadius: 8,
		backgroundColor: 'rgba(14, 165, 233, 0.12)',
		justifyContent: 'center',
		alignItems: 'center'
	},
	metaRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6
	},
	metaText: {
		fontSize: 12,
		color: 'rgba(255, 255, 255, 0.45)',
		fontWeight: '500',
		flex: 1
	},
	footer: {
		flexDirection: 'column',
		alignItems: 'stretch',
		paddingTop: 10,
		borderTopWidth: StyleSheet.hairlineWidth,
		borderTopColor: 'rgba(255, 255, 255, 0.08)'
	},
	slugRow: {
		flexDirection: 'row',
		alignItems: 'center',
		width: '100%'
	},
	slugAt: {
		fontSize: 13,
		fontWeight: '700',
		color: '#0EA5E9'
	},
	slugText: {
		fontSize: 12,
		color: 'rgba(255, 255, 255, 0.45)',
		fontWeight: '500',
		flex: 1
	},
	contactActionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'flex-end',
		gap: 6,
		marginTop: 8,
		width: '100%'
	},
	contactBtn: {
		width: 36,
		height: 36,
		borderRadius: 10,
		backgroundColor: 'rgba(14, 165, 233, 0.1)',
		justifyContent: 'center',
		alignItems: 'center'
	}
})
