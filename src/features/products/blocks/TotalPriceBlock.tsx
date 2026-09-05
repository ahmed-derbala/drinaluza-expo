import React, { useMemo } from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme } from '@theme'
import { useUser } from '@contexts/UserContext'

export interface TotalPriceBlockProps {
	/** Price of a single unit in the active currency fallback chain. */
	unitPrice: number
	/** Quantity the total is computed for. Defaults to 1. */
	quantity?: number
	/** Unit measure shown next to the price (e.g. "kg"). When omitted, no unit is shown. */
	unitMeasure?: string
	/** When false, hides the "Total" label and shows only the price. Defaults to true. */
	showLabel?: boolean
}

export const TotalPriceBlock = React.memo(function TotalPriceBlock({ unitPrice, quantity = 1, unitMeasure, showLabel = true }: TotalPriceBlockProps) {
	const { colors } = useTheme()
	const { currency, formatPrice, translate } = useUser()
	const total = useMemo(() => unitPrice * quantity, [unitPrice, quantity])

	return (
		<View style={styles.container}>
			{showLabel && <Text style={[styles.label, { color: colors.textSecondary }]}>{translate('total', 'Total')}</Text>}
			<View style={styles.priceRow}>
				<Text style={[styles.price, { color: colors.primary }]} numberOfLines={1} adjustsFontSizeToFit>
					{formatPrice({ total: { [currency]: total } })}
				</Text>
				{unitMeasure ? (
					<Text style={[styles.unit, { color: colors.textSecondary }]} numberOfLines={1}>
						{quantity === 1 ? `/ ${unitMeasure}` : `${quantity} ${unitMeasure}`}
					</Text>
				) : null}
			</View>
		</View>
	)
})

const styles = StyleSheet.create({
	container: {
		flex: 1,
		minWidth: 0
	},
	label: {
		fontSize: 10,
		fontWeight: '700',
		textTransform: 'uppercase',
		letterSpacing: 0.8,
		marginBottom: 2
	},
	price: {
		fontSize: 22,
		fontWeight: '900',
		letterSpacing: -0.5,
		flexShrink: 1
	},
	priceRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 4
	},
	unit: {
		fontSize: 13,
		fontWeight: '500',
		flexShrink: 0
	}
})

export default TotalPriceBlock
