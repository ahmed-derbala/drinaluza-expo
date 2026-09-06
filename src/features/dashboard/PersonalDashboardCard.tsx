/**
 * PersonalDashboardCard — pressable overview card for the personal dashboard profile.
 *
 * Purpose: display the personal profile identity (name, slug) plus
 * top-businesses counters, and navigate to the personal dashboard on press.
 * Based on BaseCard, view mode only.
 */
import React, { useMemo } from 'react'
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, type ThemeColors } from '@theme'
import { useUser } from '@contexts/UserContext'
import { BaseCard } from '@cards/BaseCard'
import { DashboardStatPill } from './DashboardStatPill'
import type { PersonalDashboard } from './dashboard.interface'

interface PersonalDashboardCardProps {
	profile: PersonalDashboard
	onPress?: () => void
	style?: StyleProp<ViewStyle>
}

const PersonalDashboardCard: React.FC<PersonalDashboardCardProps> = ({ profile, onPress, style }) => {
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const styles = useMemo(() => createStyles(colors), [colors])
	const user = profile.user

	return (
		<BaseCard onPress={onPress} activeOpacity={0.85} style={[styles.card, style]}>
			<View style={styles.cardHeader}>
				<View style={styles.cardHeaderLeft}>
					<View style={[styles.cardAvatar, { backgroundColor: `${colors.primary}15` }]}>
						<Ionicons name="person-outline" size={26} color={colors.primary} />
					</View>
					<View style={styles.cardHeaderText}>
						<Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={1}>
							{localize(user.name)}
						</Text>
						<Text style={[styles.cardSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
							@{user.slug}
						</Text>
					</View>
				</View>
				<View style={[styles.kindBadge, { backgroundColor: `${colors.primary}15`, borderColor: `${colors.primary}30` }]}>
					<Ionicons name="person-outline" size={12} color={colors.primary} />
					<Text style={[styles.kindBadgeText, { color: colors.primary }]}>{translate('dashboard.personal', 'Personal')}</Text>
				</View>
			</View>

			<View style={styles.statsRow}>
				<DashboardStatPill icon="storefront-outline" label={translate('dashboard.top_businesses_frequent', 'Frequent')} value={profile.topBusinesses?.frequent?.length ?? 0} accent={colors.info} />
				<DashboardStatPill icon="sparkles-outline" label={translate('dashboard.top_businesses_new', 'New')} value={profile.topBusinesses?.new?.length ?? 0} accent={colors.success} />
			</View>

			<View style={styles.cardFooter}>
				<Text style={[styles.cardCta, { color: colors.primary }]}>{translate('dashboard.open_personal', 'Open personal dashboard')}</Text>
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
			alignItems: 'center',
			justifyContent: 'center'
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

export default React.memo(PersonalDashboardCard)
