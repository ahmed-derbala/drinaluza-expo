/**
 * DashboardStatPill — small shared stat badge used by dashboard cards.
 *
 * Purpose: avoid duplicated pill markup/styles between PersonalDashboardCard
 * and BusinessDashboardCard. Not a card itself, plain view only.
 */
import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme, type ThemeColors } from '@theme'

interface DashboardStatPillProps {
	icon: keyof typeof Ionicons.glyphMap
	label: string
	value: number
	accent: string
}

export const DashboardStatPill: React.FC<DashboardStatPillProps> = ({ icon, label, value, accent }) => {
	const { colors } = useTheme()
	const styles = useMemo(() => createStyles(colors), [colors])

	return (
		<View style={[styles.statPill, { backgroundColor: `${accent}12`, borderColor: `${accent}25` }]}>
			<Ionicons name={icon} size={14} color={accent} />
			<Text style={[styles.statPillValue, { color: accent }]}>{value}</Text>
			<Text style={[styles.statPillLabel, { color: colors.textSecondary }]} numberOfLines={1}>
				{label}
			</Text>
		</View>
	)
}

const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
		statPill: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 5,
			paddingHorizontal: 10,
			paddingVertical: 6,
			borderRadius: 10,
			borderWidth: 1
		},
		statPillValue: {
			fontSize: 13,
			fontWeight: '800'
		},
		statPillLabel: {
			fontSize: 11,
			fontWeight: '600',
			maxWidth: 90
		}
	})

export default React.memo(DashboardStatPill)
