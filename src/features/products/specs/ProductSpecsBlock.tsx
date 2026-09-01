import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { useTheme, themeColors } from '@/core/theme'
import { CaliberChip } from './CaliberChip'
import { HarvestChip } from './HarvestChip'
import { GearChip } from './GearChip'
import { OriginChip } from './OriginChip'
import { QuantityStepper } from '@/features/common/QuantityStepper'

export interface ProductSpecsBlockProps {
	specs?: {
		caliber?: number
		harvest?: string
		gear?: string
		origin?: { city?: string }
	}
	singlePieceAvg?: number
	variant?: 'light' | 'dark'
}

export const ProductSpecsBlock = React.memo(function ProductSpecsBlock({ specs, singlePieceAvg, variant = 'dark' }: ProductSpecsBlockProps) {
	const { colors } = useTheme()
	const isLight = variant === 'light'
	const primaryColor = isLight ? themeColors.buttonText : colors.primary

	if (!specs?.caliber && !specs?.harvest && !specs?.gear && !specs?.origin?.city && singlePieceAvg == null) {
		return <View style={styles.placeholderFull} />
	}

	return (
		<View style={styles.container}>
			<View style={styles.rowTop}>
				<View style={styles.iconRow}>
					{specs?.caliber ? <CaliberChip caliber={specs.caliber} variant="chip" /> : null}
					{singlePieceAvg != null && <Text style={[styles.weightText, { color: primaryColor }]}>~ {singlePieceAvg.toFixed(2)} kg/piece</Text>}
				</View>
			</View>
			{(specs?.harvest || specs?.origin?.city || specs?.gear) && (
				<View style={styles.rowBottom}>
					<HarvestChip harvest={specs?.harvest} size={14} />
					<GearChip gear={specs?.gear} size={14} />
					<OriginChip city={specs?.origin?.city} />
				</View>
			)}
		</View>
	)
})

const styles = StyleSheet.create({
	container: {
		flexDirection: 'column',
		justifyContent: 'center',
		gap: 4,
		minHeight: 58,
		marginTop: 4,
		marginBottom: 6
	},
	placeholder: {
		height: 28,
		width: 60
	},
	placeholderFull: {
		height: 58,
		minHeight: 58,
		marginTop: 4,
		marginBottom: 6
	},
	rowTop: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		gap: 8
	},
	iconRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		flex: 1,
		overflow: 'hidden'
	},
	weightText: {
		fontSize: 11,
		fontWeight: '700'
	},
	rowBottom: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 5,
		flex: 1,
		overflow: 'hidden'
	}
})

export default ProductSpecsBlock
