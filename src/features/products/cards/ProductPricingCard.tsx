import { themeColors } from '@/core/theme'
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { IconButton } from '@/features/common/buttons/IconButton'
import { BaseCard } from '@/features/common/cards/BaseCard'

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
	onCancelPress
}: ProductPricingCardProps) {
	const styles = createStyles(colors)

	if (variant === 'create' || variant === 'edit') {
		const isEditing = variant === 'edit'
		return (
			<BaseCard title={translate('pricing_units', 'Pricing & Units')} mode={isEditing ? 'edit' : 'view'} onSave={onSavePress} onCancel={onCancelPress}>
				<View style={styles.row}>
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('price_tnd', 'Price (TND)')} *</Text>
						<View style={[styles.inputBox, { borderColor: priceTND ? colors.primary : colors.border }]}>
							<Text style={styles.prefix}>TND</Text>
							<TextInput style={[styles.textInput, { color: colors.text }]} value={priceTND} onChangeText={setPriceTND} placeholder="0.00" keyboardType="decimal-pad" />
						</View>
					</View>
				</View>
				<View style={styles.row}>
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('unit_measure', 'Unit Measure')}</Text>
						<View style={styles.segmentContainer}>
							{['kg', 'piece', 'crate'].map((val) => {
								const isSelected = unit === val
								return (
									<TouchableOpacity key={val} style={[styles.segmentButton, isSelected && { backgroundColor: colors.primary }]} onPress={() => setUnit(val)}>
										<Text style={[styles.segmentText, { color: isSelected ? themeColors.buttonText : colors.textSecondary }]}>{translate(val, val)}</Text>
									</TouchableOpacity>
								)
							})}
						</View>
					</View>
					<View style={{ width: 12 }} />
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('unit_step', 'Unit Step')}</Text>
						<View style={[styles.inputBox, { borderColor: colors.primary }]}>
							<TextInput style={[styles.textInput, { color: colors.text }]} value={unitStep} onChangeText={setUnitStep} placeholder="1" keyboardType="numeric" />
						</View>
					</View>
				</View>
				<View style={styles.row}>
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('min_unit', 'Min Limit')}</Text>
						<View style={[styles.inputBox, { borderColor: colors.primary }]}>
							<TextInput style={[styles.textInput, { color: colors.text }]} value={minUnit} onChangeText={setMinUnit} placeholder="1" keyboardType="numeric" />
						</View>
					</View>
					<View style={{ width: 12 }} />
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('max_unit', 'Max Limit')}</Text>
						<View style={[styles.inputBox, { borderColor: colors.primary }]}>
							<TextInput style={[styles.textInput, { color: colors.text }]} value={maxUnit} onChangeText={setMaxUnit} placeholder="10" keyboardType="numeric" />
						</View>
					</View>
				</View>
				<Text style={styles.subSectionTitle}>{translate('single_piece_weight_kg', 'Single piece weight (kg)')}</Text>
				<View style={styles.row}>
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('min', 'Min')}</Text>
						<View style={[styles.inputBox, { borderColor: colors.primary }]}>
							<TextInput style={[styles.textInput, { color: colors.text }]} value={singlePieceMinWeightKg} onChangeText={setSinglePieceMinWeightKg} placeholder="0.0" keyboardType="decimal-pad" />
						</View>
					</View>
					<View style={{ width: 12 }} />
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('avg', 'Avg')}</Text>
						<View style={[styles.inputBox, { borderColor: colors.primary }]}>
							<TextInput style={[styles.textInput, { color: colors.text }]} value={singlePieceAvgWeightKg} onChangeText={setSinglePieceAvgWeightKg} placeholder="0.0" keyboardType="decimal-pad" />
						</View>
					</View>
					<View style={{ width: 12 }} />
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('max', 'Max')}</Text>
						<View style={[styles.inputBox, { borderColor: colors.primary }]}>
							<TextInput style={[styles.textInput, { color: colors.text }]} value={singlePieceMaxWeightKg} onChangeText={setSinglePieceMaxWeightKg} placeholder="0.0" keyboardType="decimal-pad" />
						</View>
					</View>
				</View>
			</BaseCard>
		)
	}

	// view mode
	return (
		<View style={styles.viewSection}>
			<View style={styles.viewHeader}>
				<Text style={styles.priceLabel}>{translate('price', 'Price')}</Text>
				{canEdit && onEditPress && <IconButton icon="create-outline" label={translate('edit', 'Edit')} onPress={onEditPress} style={styles.editActionBtn} />}
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
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		row: {
			flexDirection: 'row',
			marginBottom: 16
		},
		flexItem: {
			flex: 1
		},
		fieldLabel: {
			fontSize: 14,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 8
		},
		prefix: {
			fontSize: 16,
			fontWeight: '600',
			color: colors.textSecondary,
			marginRight: 8
		},
		inputBox: {
			height: 48,
			borderRadius: 12,
			borderWidth: 1.5,
			backgroundColor: colors.surfaceVariant,
			paddingHorizontal: 12,
			flexDirection: 'row',
			alignItems: 'center'
		},
		textInput: {
			flex: 1,
			fontSize: 16,
			height: '100%',
			padding: 0
		},
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
		},
		subSectionTitle: {
			fontSize: 13,
			fontWeight: '700',
			color: colors.text,
			marginTop: 16,
			marginBottom: 8
		},
		segmentContainer: {
			flexDirection: 'row',
			height: 48,
			borderRadius: 12,
			borderWidth: 1.5,
			borderColor: colors.border,
			backgroundColor: colors.surfaceVariant,
			padding: 4,
			gap: 4
		},
		segmentButton: {
			flex: 1,
			borderRadius: 8,
			justifyContent: 'center',
			alignItems: 'center'
		},
		segmentText: {
			fontSize: 14,
			fontWeight: '700'
		}
	})
