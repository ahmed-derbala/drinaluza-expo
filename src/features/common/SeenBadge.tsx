import React from 'react'
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle, GestureResponderEvent } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { translate } from '@/core/translation'

export interface SeenBadgeProps {
	/** Whether the item has been seen. */
	seen: boolean
	/** Optional press handler. When provided, the badge becomes pressable (e.g. to toggle seen state). */
	onPress?: (event: GestureResponderEvent) => void
	/** Badge diameter. Defaults to 28. */
	size?: number
	style?: StyleProp<ViewStyle>
}

export default function SeenBadge({ seen, onPress, size = 28, style }: SeenBadgeProps) {
	const { colors } = useTheme()
	const color = seen ? colors.success : colors.primary
	const icon = seen ? 'checkmark-circle' : 'eye-off-outline'
	const accessibilityLabel = seen ? translate('seen', 'Seen') : translate('mark_as_seen', 'Mark as seen')

	const badge = (
		<View style={[styles.badge, { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '15' }, style]}>
			<Ionicons name={icon} size={Math.round(size * 0.6)} color={color} />
		</View>
	)

	if (!onPress) return badge

	return (
		<TouchableOpacity onPress={onPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
			{badge}
		</TouchableOpacity>
	)
}

const styles = StyleSheet.create({
	badge: {
		alignItems: 'center',
		justifyContent: 'center'
	}
})
