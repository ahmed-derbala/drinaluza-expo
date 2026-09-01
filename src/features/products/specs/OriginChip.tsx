import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'

export interface OriginChipProps {
	city?: string | null
	iconSize?: number
	showIcon?: boolean
}

export const OriginChip = React.memo(function OriginChip({ city, iconSize = 10, showIcon = true }: OriginChipProps) {
	const { colors } = useTheme()
	if (!city) return null
	const textColor = colors.textSecondary
	const iconColor = colors.textSecondary

	return (
		<View style={styles.container}>
			{showIcon && <Ionicons name="location-outline" size={iconSize} color={iconColor} />}
			<Text style={[styles.text, { color: textColor }]} numberOfLines={1}>
				{city}
			</Text>
		</View>
	)
})

const styles = StyleSheet.create({
	container: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 3
	},
	text: {
		fontSize: 10,
		fontWeight: '600'
	}
})

export default OriginChip
