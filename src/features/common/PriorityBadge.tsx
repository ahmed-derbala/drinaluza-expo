import { useEffect, useRef } from 'react'
import { View, StyleSheet, StyleProp, ViewStyle, Animated } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { themeColors } from '@/core/theme'

export type Priority = 'default' | 'normal' | 'high'

export const PRIORITY_COLORS: Record<Priority, string> = {
	high: themeColors.error,
	normal: themeColors.warning,
	default: themeColors.info
}

const PRIORITY_ICONS: Record<Priority, keyof typeof Ionicons.glyphMap> = {
	high: 'alert-circle',
	normal: 'warning',
	default: 'information-circle'
}

export interface PriorityBadgeProps {
	priority: Priority
	style?: StyleProp<ViewStyle>
}

export default function PriorityBadge({ priority, style }: PriorityBadgeProps) {
	const color = PRIORITY_COLORS[priority]
	const blink = useRef(new Animated.Value(1)).current

	useEffect(() => {
		if (priority !== 'high') return

		const animation = Animated.loop(
			Animated.sequence([Animated.timing(blink, { toValue: 0.3, duration: 600, useNativeDriver: true }), Animated.timing(blink, { toValue: 1, duration: 600, useNativeDriver: true })])
		)
		animation.start()

		return () => {
			animation.stop()
		}
	}, [priority, blink])

	return (
		<View style={[styles.badge, { backgroundColor: color + '20' }, style]}>
			<Animated.View style={{ opacity: blink }}>
				<Ionicons name={PRIORITY_ICONS[priority]} size={12} color={color} />
			</Animated.View>
		</View>
	)
}

const styles = StyleSheet.create({
	badge: {
		justifyContent: 'center',
		alignItems: 'center',
		padding: 4,
		borderRadius: 10,
		alignSelf: 'flex-start'
	}
})
