import React, { useMemo } from 'react'
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native'
import { useUser } from '@contexts/UserContext'
import { themeColors } from '@theme'

export interface PriceBlockProps {
	price?: { total?: Record<string, number> }
	unit?: { measure?: string; min?: number }
	quantity?: number
	compact?: boolean
}

export const PriceBlock = React.memo(function PriceBlock({ price, unit, quantity = 1, compact }: PriceBlockProps) {
	const { currency, formatPrice, translate } = useUser()
	const { width } = useWindowDimensions()
	const isSmall = width < 500
	// @ts-ignore
	const unitPrice = price?.total?.[currency] || price?.total?.tnd || 0
	const total = useMemo(() => unitPrice * quantity, [unitPrice, quantity])
	const color = themeColors.primary
	const unitColor = themeColors.textTertiary

	return (
		<View style={[styles.container, compact && styles.containerCompact]}>
			<Text
				style={[styles.price, compact ? styles.priceCompact : isSmall ? styles.priceSmall : styles.priceNormal, { color }]}
				adjustsFontSizeToFit
				numberOfLines={1}
				minimumFontScale={0.5}
				ellipsizeMode="clip"
			>
				{formatPrice({ total: { [currency]: total } })}
			</Text>
			<Text style={[styles.unit, { color: unitColor }]} numberOfLines={1} ellipsizeMode="clip">
				{quantity === 1 ? `/ ${unit?.measure || translate('unit', 'unit')}` : `${quantity} ${unit?.measure || translate('unit', 'unit')}`}
			</Text>
		</View>
	)
})

const styles = StyleSheet.create({
	container: {
		flex: 1,
		minWidth: 0,
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 3,
		flexWrap: 'wrap'
	},
	containerCompact: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 4,
		flexWrap: 'nowrap'
	},
	price: {
		fontWeight: '800',
		letterSpacing: -0.5,
		flexShrink: 1
	},
	priceNormal: { fontSize: 20 },
	priceSmall: { fontSize: 18 },
	priceCompact: { fontSize: 15, width: 106, flexShrink: 0, textAlign: 'left' as const },
	unit: {
		fontSize: 11,
		fontWeight: '500',
		flexShrink: 0
	}
})

export default PriceBlock
