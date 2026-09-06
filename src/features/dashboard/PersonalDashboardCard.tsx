/**
 * PersonalDashboardCard — pressable cover card for the personal dashboard profile.
 *
 * Purpose: gradient banner with a floating kind badge, an overlapping
 * identity avatar, minimal stat columns and a solid call-to-action.
 * Navigates to the personal dashboard on press. Based on BaseCard.
 */
import React, { useMemo } from 'react'
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useTheme, themeColors, type ThemeColors } from '@theme'
import { useUser } from '@contexts/UserContext'
import { BaseCard } from '@cards/BaseCard'
import { DashboardStatsColumns, type DashboardStatColumn } from './DashboardStatsColumns'
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

	const stats: DashboardStatColumn[] = [
		{ label: translate('dashboard.top_businesses_frequent', 'Frequent'), value: profile.topBusinesses?.frequent?.length ?? 0, color: colors.info },
		{ label: translate('dashboard.top_businesses_new', 'New'), value: profile.topBusinesses?.new?.length ?? 0, color: colors.success }
	]

	return (
		<BaseCard onPress={onPress} activeOpacity={0.85} style={[styles.card, style]}>
			<View style={styles.banner}>
				<LinearGradient colors={[themeColors.primaryContainer30, themeColors.primaryContainer]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
				<Ionicons name="person" size={120} color={themeColors.primary25} style={styles.watermark} />
				<View style={[styles.kindBadge, { backgroundColor: themeColors.background50 }]}>
					<Ionicons name="person-outline" size={12} color={themeColors.buttonText} />
					<Text style={[styles.kindBadgeText, { color: themeColors.buttonText }]}>{translate('dashboard.personal', 'Personal')}</Text>
				</View>
			</View>

			<View style={styles.body}>
				<View style={[styles.avatar, { backgroundColor: colors.primaryContainer, borderColor: colors.background }]}>
					<Ionicons name="person-outline" size={30} color={colors.primary} />
				</View>
				<Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
					{localize(user.name)}
				</Text>
				<Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
					@{user.slug}
				</Text>

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
			overflow: 'hidden'
		},
		watermark: {
			position: 'absolute',
			right: -18,
			bottom: -24
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
			borderRadius: AVATAR_SIZE / 2,
			alignItems: 'center',
			justifyContent: 'center',
			borderWidth: 3,
			marginTop: -AVATAR_SIZE / 2 - 18,
			marginBottom: 12
		},
		title: {
			fontSize: 19,
			fontWeight: '800',
			letterSpacing: -0.4
		},
		subtitle: {
			fontSize: 13,
			fontWeight: '500',
			marginTop: 3,
			marginBottom: 16
		}
	})

export default React.memo(PersonalDashboardCard)
