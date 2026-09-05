import { View, Text, StyleSheet } from 'react-native'
import { IconBaseButton } from '@buttons/IconBaseButton'
import { SaveButton, CancelButton } from '@buttons'
import { BaseCard } from '@cards/BaseCard'
import { ProductPricingForm } from '@products/forms/ProductPricingForm'

export interface ProductPricingCardProps {
	variant: 'view' | 'edit' | 'create'
	colors: any
	translate: (key: string, defaultValue?: string) => string
	// Editable values
	priceTND: string
	setPriceTND: (v: string) => void
	unit: string
	setUnit: (v: string) => void
	minUnit: string
	setMinUnit: (v: string) => void
	maxUnit: string
	setMaxUnit: (v: string) => void
	unitStep: string
	setUnitStep: (v: string) => void
	// Single piece weight values
	singlePieceMinWeightKg: string
	setSinglePieceMinWeightKg: (v: string) => void
	singlePieceAvgWeightKg: string
	setSinglePieceAvgWeightKg: (v: string) => void
	singlePieceMaxWeightKg: string
	setSinglePieceMaxWeightKg: (v: string) => void
	// View values
	formattedPrice?: string
	unitMeasure?: string
	minLimit?: number
	maxLimit?: number | string
	singlePieceMin?: number
	singlePieceAvg?: number
	singlePieceMax?: number
	// Inline Edit Actions
	canEdit?: boolean
	onEditPress?: () => void
	onSavePress?: () => void
	onCancelPress?: () => void
	/** Loading state forwarded to BaseCard (spins/disables the save action). */
	loading?: boolean
}

export default function ProductPricingCard({
	variant,
	colors,
	translate,
	priceTND,
	setPriceTND,
	unit,
	setUnit,
	minUnit,
	setMinUnit,
	maxUnit,
	setMaxUnit,
	unitStep,
	setUnitStep,
	singlePieceMinWeightKg,
	setSinglePieceMinWeightKg,
	singlePieceAvgWeightKg,
	setSinglePieceAvgWeightKg,
	singlePieceMaxWeightKg,
	setSinglePieceMaxWeightKg,
	formattedPrice,
	unitMeasure,
	minLimit = 1,
	maxLimit = '∞',
	singlePieceMin,
	singlePieceAvg,
	singlePieceMax,
	canEdit,
	onEditPress,
	onSavePress,
	onCancelPress,
	loading = false
}: ProductPricingCardProps) {
	const styles = createStyles(colors)

	if (variant === 'create' || variant === 'edit') {
		const isEditing = variant === 'edit'
		return (
			<BaseCard
				title={translate('pricing_units', 'Pricing')}
				mode={isEditing ? 'form' : 'view'}
				headerRight={
					isEditing && (onSavePress || onCancelPress) ? (
						<>
							{onCancelPress ? <CancelButton onPress={onCancelPress} /> : null}
							{onSavePress ? <SaveButton onPress={onSavePress} loading={loading} disabled={loading} /> : null}
						</>
					) : null
				}
			>
				<ProductPricingForm
					colors={colors}
					translate={translate}
					priceTND={priceTND}
					setPriceTND={setPriceTND}
					unit={unit}
					setUnit={setUnit}
					minUnit={minUnit}
					setMinUnit={setMinUnit}
					maxUnit={maxUnit}
					setMaxUnit={setMaxUnit}
					unitStep={unitStep}
					setUnitStep={setUnitStep}
					singlePieceMinWeightKg={singlePieceMinWeightKg}
					setSinglePieceMinWeightKg={setSinglePieceMinWeightKg}
					singlePieceAvgWeightKg={singlePieceAvgWeightKg}
					setSinglePieceAvgWeightKg={setSinglePieceAvgWeightKg}
					singlePieceMaxWeightKg={singlePieceMaxWeightKg}
					setSinglePieceMaxWeightKg={setSinglePieceMaxWeightKg}
				/>
			</BaseCard>
		)
	}

	// view mode
	return (
		<BaseCard>
			<View style={styles.viewSection}>
				<View style={styles.viewHeader}>
					<Text style={styles.priceLabel}>{translate('price', 'Price')}</Text>
					{canEdit && onEditPress && <IconBaseButton icon="create-outline" label={translate('edit', 'Edit')} onPress={onEditPress} style={styles.editActionBtn} />}
				</View>
				<View style={styles.priceContainer}>
					<Text style={[styles.priceValue, { color: colors.primary }]}>{formattedPrice}</Text>
					<Text style={[styles.priceUnit, { color: colors.textSecondary }]}>/ {unitMeasure || translate('unit', 'unit')}</Text>
				</View>
				<Text style={[styles.quantityRange, { color: colors.textSecondary }]}>
					{translate('min', 'Min')}: {minLimit} - {translate('max', 'Max')}: {maxLimit} {unitMeasure || ''}
				</Text>
				{(singlePieceMin != null || singlePieceAvg != null || singlePieceMax != null) && (
					<Text style={[styles.quantityRange, { color: colors.textSecondary }]}>
						{translate('single_piece_weight', 'Single piece weight')}: {singlePieceMin != null ? singlePieceMin.toFixed(2) : '—'} / {singlePieceAvg != null ? singlePieceAvg.toFixed(2) : '—'} /{' '}
						{singlePieceMax != null ? singlePieceMax.toFixed(2) : '—'} kg
					</Text>
				)}
			</View>
		</BaseCard>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		viewSection: {
			marginBottom: 20,
			paddingBottom: 20,
			borderBottomWidth: 1,
			borderBottomColor: colors.border
		},
		viewHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 6
		},
		priceLabel: {
			fontSize: 11,
			textTransform: 'uppercase',
			fontWeight: '700',
			letterSpacing: 1,
			color: colors.textTertiary
		},
		editActionBtn: {
			padding: 2
		},
		priceContainer: {
			flexDirection: 'row',
			alignItems: 'baseline'
		},
		priceValue: {
			fontSize: 36,
			fontWeight: '900',
			letterSpacing: -1
		},
		priceUnit: {
			fontSize: 16,
			fontWeight: '500',
			marginLeft: 6
		},
		quantityRange: {
			fontSize: 13,
			marginTop: 6,
			fontWeight: '500'
		}
	})
