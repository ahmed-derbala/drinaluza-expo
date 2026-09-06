/**
 * BusinessDashboardCard — pressable overview card for a business dashboard profile.
 *
 * Purpose: display the business identity (thumbnail, name, slug, city) plus
 * product counters, and navigate to the business dashboard on press.
 * Based on BaseCard, view mode only.
 */
import React, { useMemo } from 'react'
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, type ThemeColors } from '@theme'
import { useUser } from '@contexts/UserContext'
import { BaseCard } from '@cards/BaseCard'
import { SmartMediaView } from '@smart-media'
import { DashboardStatPill } from './DashboardStatPill'
import type { BusinessDashboard, ProductStats } from './dashboard.interface'

interface BusinessDashboardCardProps {
	profile: BusinessDashboard
	onPress?: () => void
	style?: StyleProp<ViewStyle>
}

const BusinessDashboardCard: React.FC<BusinessDashboardCardProps> = ({ profile, onPress, style }) => {
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const styles = useMemo(() => createStyles(colors), [colors])
	const business = profile.business

	const stats: { key: keyof ProductStats; label: string; icon: keyof typeof Ionicons.glyphMap; accent: string }[] = [
		{ key: 'count', label: translate('dashboard.products_total', 'Products'), icon: 'cube-outline', accent: colors.primary },
		{ key: 'lowStock', label: translate('dashboard.low_stock', 'Low stock'), icon: 'warning-outline', accent: colors.warning },
		{ key: 'outOfStock', label: translate('dashboard.out_of_stock', 'Out of stock'), icon: 'remove-circle-outline', accent: colors.error }
	]
	const city = business.address?.city || business.address?.region

	return (
		<BaseCard onPress={onPress} activeOpacity={0.85} style={[styles.card, style]}>
			<View style={styles.cardHeader}>
				<View style={styles.cardHeaderLeft}>
					<SmartMediaView media={business.media?.thumbnail?.url} style={styles.cardAvatar} resizeMode="cover" />
					<View style={styles.cardHeaderText}>
						<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
							{localize(business.name)}
						</Text>
						<Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
							@{business.slug}
						</Text>
					</View>
				</View>
				<View style={[styles.kindBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
					<Ionicons name="storefront-outline" size={12} color={colors.primary} />
					<Text style={[styles.kindBadgeText, { color: colors.primary }]}>{translate('dashboard.business', 'Business')}</Text>
				</View>
			</View>

			{city ? (
				<View style={styles.cardMetaRow}>
					<Ionicons name="location-outline" size={14} color={colors.textTertiary} />
					<Text style={[styles.cardMetaText, { color: colors.textTertiary }]} numberOfLines={1}>
						{city}
					</Text>
				</View>
			) : null}

			<View style={styles.statsRow}>
				{stats.map((stat) => (
					<DashboardStatPill key={stat.key} icon={stat.icon} label={stat.label} value={profile.products?.[stat.key] ?? 0} accent={stat.accent} />
				))}
			</View>

			<View style={styles.cardFooter}>
				<Text style={[styles.cardCta, { color: colors.primary }]}>{translate('dashboard.open_business', 'Open business dashboard')}</Text>
				<Ionicons name="chevron-forward" size={16} color={colors.primary} />
			</View>
		</BaseCard>
	)
}

const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
		card: {
			marginHorizontal: 16,
			marginTop: 16
		},
		cardHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			gap: 12,
			marginBottom: 14
		},
		cardHeaderLeft: {
			flexDirection: 'row',
			alignItems: 'center',
			flex: 1,
			minWidth: 0,
			gap: 12
		},
		cardAvatar: {
			width: 52,
			height: 52,
			borderRadius: 16,
			borderWidth: 1,
			borderColor: `${colors.primary}30`,
			backgroundColor: colors.surface
		},
		cardHeaderText: {
			flex: 1,
			minWidth: 0
		},
		cardTitle: {
			fontSize: 17,
			fontWeight: '700',
			letterSpacing: -0.3
		},
		cardSubtitle: {
			fontSize: 13,
			fontWeight: '500',
			marginTop: 2
		},
		kindBadge: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4,
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 8,
			borderWidth: 1
		},
		kindBadgeText: {
			fontSize: 9,
			fontWeight: '800',
			letterSpacing: 0.6,
			textTransform: 'uppercase'
		},
		cardMetaRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6,
			marginBottom: 12
		},
		cardMetaText: {
			fontSize: 12,
			fontWeight: '500',
			flex: 1
		},
		statsRow: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			gap: 8,
			marginBottom: 14
		},
		cardFooter: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			paddingTop: 12,
			borderTopWidth: StyleSheet.hairlineWidth,
			borderTopColor: `${colors.border}80`
		},
		cardCta: {
			fontSize: 13,
			fontWeight: '700'
		}
	})

export default React.memo(BusinessDashboardCard)
