import React, { useMemo } from 'react'
import { View, Text, StyleSheet, TouchableOpacity, Platform, Linking, useWindowDimensions } from 'react-native'
import SmartImage from '@/core/SmartImageViewer'
import { MaterialIcons, Ionicons } from '@expo/vector-icons'
import { UserFeedItem } from './feed.interface'
import { useTheme } from '../../core/theme'
import { useUser } from '../../core/contexts/UserContext'

type UserCardProps = {
	item: UserFeedItem
}

const ROLE_CONFIG: Record<string, { icon: string; label: string; color: string; bg: string }> = {
	business_owner: { icon: 'storefront', label: 'Business Owner', color: '#38BDF8', bg: '#0C4A6E' },
	admin: { icon: 'shield', label: 'Admin', color: '#FBBF24', bg: '#78350F' },
	customer: { icon: 'person', label: 'Customer', color: '#2DD4BF', bg: '#134E4A' },
	default: { icon: 'person', label: 'User', color: '#94A3B8', bg: '#1E293B' }
}

export default function UserCard({ item }: UserCardProps) {
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const { width, height: windowHeight } = useWindowDimensions()
	const styles = useMemo(() => createStyles(colors, width, windowHeight), [colors, width, windowHeight])

	const userName = localize(item.name) || item.slug || translate('user', 'User')
	const roleConfig = ROLE_CONFIG[item.role] || ROLE_CONFIG.default
	const address = item.address
	const locationText = address ? [address.city, address.country].filter(Boolean).join(', ') : ''
	const isActive = item.state?.code === 'active'
	const hasContact = item.contact?.phone || item.contact?.whatsapp || item.contact?.email

	const router = require('expo-router').useRouter()

	const handleCall = () => {
		const phone = item.contact?.phone?.fullNumber
		if (phone) Linking.openURL(`tel:${phone}`).catch(() => {})
	}

	const handleWhatsApp = () => {
		const wa = item.contact?.whatsapp
		if (wa) Linking.openURL(`https://wa.me/${wa.replace(/[^0-9]/g, '')}`).catch(() => {})
	}

	const handleEmail = () => {
		const email = item.contact?.email
		if (email) Linking.openURL(`mailto:${email}`).catch(() => {})
	}

	const handlePress = () => {
		if (item.slug) {
			router.push(`/users/${item.slug}` as any)
		}
	}

	return (
		<TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.8}>
			{/* Header with avatar and info */}
			<View style={styles.header}>
				<View style={styles.avatarContainer}>
					<SmartImage source={typeof item.media?.thumbnail === 'string' ? item.media.thumbnail : item.media?.thumbnail?.url} style={styles.avatar} resizeMode="cover" entityType="user" />
					{/* Online indicator */}
					{isActive && <View style={styles.statusDot} />}
				</View>

				<View style={styles.headerInfo}>
					<Text style={styles.userName} numberOfLines={1}>
						{userName}
					</Text>

					{/* Role badge */}
					<View style={[styles.roleBadge, { backgroundColor: roleConfig.bg }]}>
						<MaterialIcons name={roleConfig.icon as any} size={12} color={roleConfig.color} />
						<Text style={[styles.roleText, { color: roleConfig.color }]}>{translate(item.role || 'user', roleConfig.label)}</Text>
					</View>
				</View>

				{/* User type icon */}
				{windowHeight >= 450 && (
					<View style={styles.typeBadge}>
						<Ionicons name="person" size={16} color={colors.primary} />
					</View>
				)}
			</View>

			{/* Location info */}
			{locationText && windowHeight >= 480 ? (
				<View style={styles.locationRow}>
					<Ionicons name="location-outline" size={14} color={colors.textTertiary} />
					<Text style={styles.locationText} numberOfLines={1}>
						{locationText}
					</Text>
				</View>
			) : null}

			{/* Footer with contact + slug */}
			<View style={styles.footer}>
				{item.slug ? (
					<View style={styles.slugContainer}>
						<Text style={styles.slugPrefix}>@</Text>
						<Text style={styles.slugText} numberOfLines={1}>
							{item.slug}
						</Text>
					</View>
				) : (
					<View />
				)}

				{hasContact ? (
					<View style={styles.contactActions}>
						{item.contact?.phone ? (
							<TouchableOpacity style={styles.actionBtn} onPress={handleCall} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
								<Ionicons name="call-outline" size={16} color={colors.primary} />
							</TouchableOpacity>
						) : null}
						{item.contact?.whatsapp ? (
							<TouchableOpacity style={[styles.actionBtn, { backgroundColor: '#134E4A' }]} onPress={handleWhatsApp} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
								<Ionicons name="logo-whatsapp" size={16} color="#2DD4BF" />
							</TouchableOpacity>
						) : null}
						{item.contact?.email ? (
							<TouchableOpacity style={styles.actionBtn} onPress={handleEmail} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
								<Ionicons name="mail-outline" size={16} color={colors.primary} />
							</TouchableOpacity>
						) : null}
					</View>
				) : null}
			</View>
		</TouchableOpacity>
	)
}

const createStyles = (colors: any, screenWidth: number, windowHeight: number) => {
	const isSmall = screenWidth < 400
	const isCompact = windowHeight < 550
	return StyleSheet.create({
		card: {
			flex: 1,
			backgroundColor: colors.card,
			borderRadius: 16,
			overflow: 'hidden',
			borderWidth: 1.5,
			borderColor: colors.info || '#3B82F6',
			padding: isCompact ? 10 : 16,
			gap: isCompact ? 6 : 12,
			justifyContent: 'space-between',
			maxHeight: Math.max(160, windowHeight - 140),
			...Platform.select({
				ios: {
					shadowColor: colors.primary,
					shadowOffset: { width: 0, height: 4 },
					shadowOpacity: 0.12,
					shadowRadius: 10
				},
				android: { elevation: 4 },
				web: { boxShadow: `0 4px 12px ${colors.primary}12` }
			})
		},
		header: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: isCompact ? 8 : 12
		},
		avatarContainer: {
			position: 'relative'
		},
		avatar: {
			width: isCompact ? 44 : isSmall ? 52 : 58,
			height: isCompact ? 44 : isSmall ? 52 : 58,
			borderRadius: isCompact ? 12 : isSmall ? 16 : 18,
			backgroundColor: colors.surface
		},
		statusDot: {
			position: 'absolute',
			bottom: 1,
			right: 1,
			width: 14,
			height: 14,
			borderRadius: 7,
			backgroundColor: '#34D399',
			borderWidth: 2.5,
			borderColor: colors.card
		},
		headerInfo: {
			flex: 1,
			gap: 6
		},
		userName: {
			fontSize: isSmall ? 17 : 19,
			fontWeight: '700',
			color: colors.text
		},
		roleBadge: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 5,
			alignSelf: 'flex-start',
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 8
		},
		roleText: {
			fontSize: 11,
			fontWeight: '600',
			textTransform: 'capitalize'
		},
		typeBadge: {
			width: 36,
			height: 36,
			borderRadius: 10,
			backgroundColor: colors.primaryContainer,
			justifyContent: 'center',
			alignItems: 'center'
		},
		locationRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6,
			paddingLeft: 2
		},
		locationText: {
			fontSize: 13,
			color: colors.textSecondary,
			fontWeight: '500'
		},
		footer: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingTop: 10,
			borderTopWidth: 1,
			borderTopColor: colors.border
		},
		slugContainer: {
			flexDirection: 'row',
			alignItems: 'center'
		},
		slugPrefix: {
			fontSize: 14,
			fontWeight: '700',
			color: colors.primary
		},
		slugText: {
			fontSize: 13,
			color: colors.textTertiary,
			fontWeight: '500'
		},
		contactActions: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6
		},
		actionBtn: {
			width: 32,
			height: 32,
			borderRadius: 8,
			backgroundColor: colors.primaryContainer,
			justifyContent: 'center',
			alignItems: 'center'
		}
	})
}
