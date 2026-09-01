import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/core/theme'
import { getHarvestIcon, getHarvestLabel } from '@/features/products/products.helpers'

export interface HarvestChipProps {
	harvest?: 'wild' | 'farm' | string | null
	size?: number
	showLabel?: boolean
}

export const HarvestChip = React.memo(function HarvestChip({ harvest, size = 14, showLabel = false }: HarvestChipProps) {
	const { colors } = useTheme()
	if (!harvest) return null
	const color = colors.success
	const iconName = getHarvestIcon(harvest as any)
	const label = showLabel ? getHarvestLabel(harvest as any) : null

	if (showLabel && label) {
		return (
			<View style={[styles.chip, { backgroundColor: colors.success + '15' }]}>
				<Ionicons name={iconName} size={size} color={color} />
				<Text style={[styles.text, { color }]} numberOfLines={1}>
					{label}
				</Text>
			</View>
		)
	}

	return <Ionicons name={iconName} size={size} color={color} />
})

const styles = StyleSheet.create({
	chip: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 8,
		paddingVertical: 4,
		borderRadius: 6,
		gap: 3
	},
	text: {
		fontSize: 10,
		fontWeight: '700'
	}
})

export default HarvestChip
