import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getCaliberIconSize, getCaliberFontSize } from '@products/products.helpers'
import { themeColors } from '@theme'

export interface CaliberChipProps {
	caliber: number
	variant?: 'chip' | 'selector' | 'badge' | 'static'
}

export const CaliberChip = React.memo(function CaliberChip({ caliber, variant = 'chip' }: CaliberChipProps) {
	if (caliber == null) return null
	const iconSize = getCaliberIconSize(caliber, variant as any)
	const fontSize = getCaliberFontSize(caliber, variant as any)

	return (
		<View style={styles.container}>
			<Ionicons name="fish" size={iconSize} color={themeColors.primary} />
			<Text style={[styles.text, { fontSize, color: themeColors.buttonText }]}>{caliber}</Text>
		</View>
	)
})

const styles = StyleSheet.create({
	container: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	text: {
		position: 'absolute',
		fontWeight: 'bold',
		textAlign: 'center',
		includeFontPadding: false,
		textAlignVertical: 'center'
	}
})

export default CaliberChip
