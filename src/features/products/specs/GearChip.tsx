import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@/core/theme'
import { getGearLabel } from '@/features/products/products.helpers'
import { GearIcon } from '@/features/products/common/GearIcons'

export interface GearChipProps {
	gear?: 'trap' | 'gillnet' | string | null
	size?: number
	showLabel?: boolean
}

export const GearChip = React.memo(function GearChip({ gear, size = 14, showLabel = false }: GearChipProps) {
	const { colors } = useTheme()
	if (!gear) return null
	const color = colors.primary
	const label = showLabel ? getGearLabel(gear as any) : null

	if (showLabel && label) {
		return (
			<View style={[styles.chip, { backgroundColor: colors.primary + '15' }]}>
				<GearIcon type={gear as any} size={size} color={color} />
				<Text style={[styles.text, { color }]} numberOfLines={1}>
					{label}
				</Text>
			</View>
		)
	}

	return <GearIcon type={gear as any} size={size} color={color} />
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

export default GearChip
