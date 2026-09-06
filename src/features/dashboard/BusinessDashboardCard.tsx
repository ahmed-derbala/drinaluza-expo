/**
 * BusinessDashboardCard — pressable cover card for a business dashboard profile.
 *
 * Purpose: business thumbnail banner with a scrim and floating kind badge,
 * an overlapping identity avatar, city meta, minimal stat columns and a
 * solid call-to-action. Navigates to the business dashboard on press.
 * Based on BaseCard.
 */
import React, { useMemo } from 'react'
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme, themeColors, type ThemeColors } from '@theme'
import { useUser } from '@contexts/UserContext'
import { BaseCard } from '@cards/BaseCard'
import { SmartMediaView } from '@smart-media'
import { DashboardStatsColumns, type DashboardStatColumn } from './DashboardStatsColumns'
import type { BusinessDashboard } from './dashboard.interface'

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

	const stats: DashboardStatColumn[] = [
		{ label: translate('dashboard.products_total', 'Products'), value: profile.products?.count ?? 0, color: colors.primary },
		{ label: translate('dashboard.low_stock', 'Low stock'), value: profile.products?.lowStock ?? 0, color: colors.warning },
		{ label: translate('dashboard.out_of_stock', 'Out of stock'), value: profile.products?.outOfStock ?? 0, color: colors.error }
	]
	const city = business.address?.city || business.address?.region
	const thumbnail = business.media?.thumbnail?.url

	return (
		<BaseCard onPress={onPress} activeOpacity={0.85} style={[styles.card, style]}>
			<View style={styles.banner}>
				{thumbnail ? (
					<SmartMediaView media={thumbnail} style={StyleSheet.absoluteFill} resizeMode="cover" />
				) : (
					<LinearGradient colors={[themeColors.primaryContainer30, themeColors.primaryContainer]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
				)}
				<LinearGradient colors={[themeColors.background0, themeColors.background75]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[StyleSheet.absoluteFill, { pointerEvents: 'none' as any }]} />
				<View style={[styles.kindBadge, { backgroundColor: themeColors.background50 }]}>
					<Ionicons name="storefront-outline" size={12} color={themeColors.buttonText} />
					<Text style={[styles.kindBadgeText, { color: themeColors.buttonText }]}>{translate('dashboard.business', 'Business')}</Text>
				</View>
			</View>

			<View style={styles.body}>
				<View style={[styles.avatar, { backgroundColor: colors.surface, borderColor: colors.background }]}>
					<SmartMediaView media={thumbnail} style={styles.avatarImg} resizeMode="cover" />
				</View>
				<Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
					{localize(business.name)}
				</Text>
				<Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
					@{business.slug}
				</Text>
				{city ? (
					<View style={styles.metaRow}>
						<Ionicons name="location-outline" size={14} color={colors.textTertiary} />
						<Text style={[styles.metaText, { color: colors.textTertiary }]} numberOfLines={1}>
							{city}
						</Text>
					</View>
				) : null}

				<DashboardStatsColumns stats={stats} />
			</View>
		</BaseCard>
	)
}

const BANNER_HEIGHT = 118
const AVATAR_SIZE = 64

const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
		card: {
			// width auto (not 100%): with horizontal margins, 100% overflows
			// the right edge on web where margins don't shrink the box
			width: 'auto',
			marginHorizontal: 16,
			marginTop: 16,
			padding: 0
		},
		banner: {
			height: BANNER_HEIGHT,
			overflow: 'hidden',
			backgroundColor: colors.surface
		},
		kindBadge: {
			position: 'absolute',
			top: 12,
			right: 12,
			flexDirection: 'row',
			alignItems: 'center',
			gap: 5,
			paddingHorizontal: 10,
			paddingVertical: 5,
			borderRadius: 10
		},
		kindBadgeText: {
			fontSize: 10,
			fontWeight: '800',
			letterSpacing: 0.6,
			textTransform: 'uppercase'
		},
		body: {
			padding: 18
		},
		avatar: {
			width: AVATAR_SIZE,
			height: AVATAR_SIZE,
			borderRadius: 20,
			overflow: 'hidden',
			borderWidth: 3,
			marginTop: -AVATAR_SIZE / 2 - 18,
			marginBottom: 12
		},
		avatarImg: {
			width: '100%',
			height: '100%'
		},
		title: {
			fontSize: 19,
			fontWeight: '800',
			letterSpacing: -0.4
		},
		subtitle: {
			fontSize: 13,
			fontWeight: '500',
			marginTop: 3
		},
		metaRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6,
			marginTop: 8,
			marginBottom: 16
		},
		metaText: {
			fontSize: 12,
			fontWeight: '500',
			flex: 1
		}
	})

export default React.memo(BusinessDashboardCard)
