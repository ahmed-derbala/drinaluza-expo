/**
 * DashboardStatsColumns — minimal stat columns with dividers for dashboard cards.
 *
 * Purpose: shared stats strip for PersonalDashboardCard and
 * BusinessDashboardCard. Big tinted value over an uppercase label,
 * separated by hairline dividers. Plain view only, not a card itself.
 */
import React, { useMemo } from 'react'
import { View, Text, StyleSheet, type StyleProp, type ViewStyle } from 'react-native'
import { useTheme, type ThemeColors } from '@theme'

export interface DashboardStatColumn {
	label: string
	value: number
	color: string
}

interface DashboardStatsColumnsProps {
	stats: DashboardStatColumn[]
	style?: StyleProp<ViewStyle>
}

export const DashboardStatsColumns: React.FC<DashboardStatsColumnsProps> = ({ stats, style }) => {
	const { colors } = useTheme()
	const styles = useMemo(() => createStyles(colors), [colors])

	return (
		<View style={[styles.row, style]}>
			{stats.map((stat, index) => (
				<View key={stat.label} style={[styles.cell, index > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: colors.border }]}>
					<Text style={[styles.value, { color: stat.color }]} numberOfLines={1}>
						{stat.value}
					</Text>
					<Text style={[styles.label, { color: colors.textTertiary }]} numberOfLines={1}>
						{stat.label}
					</Text>
				</View>
			))}
		</View>
	)
}

const createStyles = (colors: ThemeColors) =>
	StyleSheet.create({
		row: {
			flexDirection: 'row',
			backgroundColor: colors.surface,
			borderRadius: 14,
			borderWidth: 1,
			borderColor: colors.border,
			paddingVertical: 12
		},
		cell: {
			flex: 1,
			minWidth: 0,
			alignItems: 'center',
			gap: 2,
			paddingHorizontal: 6
		},
		value: {
			fontSize: 20,
			fontWeight: '800',
			letterSpacing: -0.5
		},
		label: {
			fontSize: 10,
			fontWeight: '700',
			letterSpacing: 0.8,
			textTransform: 'uppercase'
		}
	})

export default React.memo(DashboardStatsColumns)
