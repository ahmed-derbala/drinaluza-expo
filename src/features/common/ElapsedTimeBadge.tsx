import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'

export interface ElapsedTimeBadgeProps {
	/** ISO date string or Date the elapsed time is computed from. */
	date: string | Date
	/** Optional color override. Defaults to the theme's secondary text color. */
	color?: string
	style?: StyleProp<ViewStyle>
}

function formatElapsed(dateInput: string | Date, translate: (key: string, fallback: string) => string) {
	const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput
	const now = new Date()
	const diffTime = Math.abs(now.getTime() - date.getTime())
	const diffMinutes = Math.floor(diffTime / (1000 * 60))
	const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
	const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))

	if (diffMinutes < 60) return `${diffMinutes}m ${translate('ago', 'ago')}`
	if (diffHours < 24) return `${diffHours}h ${translate('ago', 'ago')}`
	if (diffDays < 7) return `${diffDays}d ${translate('ago', 'ago')}`
	return date.toLocaleDateString()
}

export default function ElapsedTimeBadge({ date, color, style }: ElapsedTimeBadgeProps) {
	const { colors } = useTheme()
	const { translate } = useUser()
	const resolvedColor = color ?? colors.textSecondary

	return (
		<View style={[styles.badge, { backgroundColor: resolvedColor + '15' }, style]}>
			<Ionicons name="time-outline" size={12} color={resolvedColor} />
			<Text style={[styles.text, { color: resolvedColor }]} numberOfLines={1}>
				{formatElapsed(date, translate)}
			</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 3,
		borderRadius: 10,
		gap: 4,
		alignSelf: 'flex-start'
	},
	text: {
		fontSize: 11,
		fontWeight: '600'
	}
})
