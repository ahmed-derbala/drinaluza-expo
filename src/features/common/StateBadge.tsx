import React from 'react'
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native'
import { useTheme, colors as themeColors } from '@/core/theme'
import { translate } from '@/core/translation'

export const STATES = {
	PENDING: 'pending',
	ACTIVE: 'active',
	SUSPENDED: 'suspended',
	DELETED: 'deleted'
} as const

export type StateCode = (typeof STATES)[keyof typeof STATES] | 'inactive'

export interface StateBadgeProps {
	stateCode: StateCode | string
	showDot?: boolean
	containerStyle?: StyleProp<ViewStyle>
	textStyle?: StyleProp<TextStyle>
	dotStyle?: StyleProp<ViewStyle>
}

export default function StateBadge({ stateCode, showDot = true, containerStyle, textStyle, dotStyle }: StateBadgeProps) {
	const { colors } = useTheme()
	const code = stateCode ? stateCode.toLowerCase() : ''

	let stateColor = themeColors.textTertiary // default neutral/deleted grey
	let stateBg = themeColors.textTertiary8
	let label = translate(code || 'unknown', (code || 'UNKNOWN').toUpperCase())

	if (code === 'active') {
		stateColor = colors.success
		stateBg = colors.success + '15'
	} else if (code === 'pending') {
		stateColor = colors.warning
		stateBg = colors.warning + '15'
	} else if (code === 'suspended' || code === 'inactive') {
		stateColor = colors.error
		stateBg = colors.error + '15'
		label = code === 'suspended' ? translate('suspended', 'SUSPENDED') : translate('inactive', 'INACTIVE')
	} else if (code === 'deleted') {
		stateColor = themeColors.textTertiary
		stateBg = themeColors.textTertiary8
	}

	return (
		<View style={[styles.badge, { backgroundColor: stateBg }, containerStyle]}>
			{showDot && <View style={[styles.dot, { backgroundColor: stateColor }, dotStyle]} />}
			<Text style={[styles.text, { color: stateColor }, textStyle]}>{label}</Text>
		</View>
	)
}

const styles = StyleSheet.create({
	badge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 8,
		alignSelf: 'flex-start'
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		marginRight: 6
	},
	text: {
		fontSize: 12,
		fontWeight: '700',
		letterSpacing: 0.5
	}
})
