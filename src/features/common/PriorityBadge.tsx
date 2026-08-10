import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { colors as themeColors } from '@/core/theme'
import { translate } from '@/core/translation'

export type Priority = 'low' | 'medium' | 'high'

export const PRIORITY_COLORS: Record<Priority, string> = {
	high: themeColors.error,
	medium: themeColors.warning,
	low: themeColors.info
}

const PRIORITY_ICONS: Record<Priority, keyof typeof Ionicons.glyphMap> = {
	high: 'alert-circle',
	medium: 'warning',
	low: 'information-circle'
}

export interface PriorityBadgeProps {
	priority: Priority
	style?: StyleProp<ViewStyle>
}

export default function PriorityBadge({ priority, style }: PriorityBadgeProps) {
	const color = PRIORITY_COLORS[priority]
	const label = translate(`priority_${priority}`, priority.charAt(0).toUpperCase() + priority.slice(1))

	return (
		<View style={[styles.badge, { backgroundColor: color + '20' }, style]}>
			<Ionicons name={PRIORITY_ICONS[priority]} size={12} color={color} />
			<Text style={[styles.text, { color }]} numberOfLines={1}>
				{label}
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
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.4
	}
})
