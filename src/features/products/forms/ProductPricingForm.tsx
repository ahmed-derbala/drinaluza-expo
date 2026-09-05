/**
 * ProductPricingForm — editable pricing & units fields.
 *
 * Purpose: keep ProductPricingCard focused on view/edit switching; this form
 * owns the field composition, built on BaseForm primitives (BaseForm,
 * FormRow, FormCol, FormLabel, FormInputWrapper, FormInput).
 */
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { themeColors } from '@theme'
import { BaseForm, FormRow, FormCol, FormLabel, FormInputWrapper, FormInput } from '@forms'

export interface ProductPricingFormProps {
	colors: any
	translate: (key: string, defaultValue?: string) => string
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
	singlePieceMinWeightKg: string
	setSinglePieceMinWeightKg: (v: string) => void
	singlePieceAvgWeightKg: string
	setSinglePieceAvgWeightKg: (v: string) => void
	singlePieceMaxWeightKg: string
	setSinglePieceMaxWeightKg: (v: string) => void
}

const UNIT_OPTIONS = ['kg', 'piece', 'crate']

export function ProductPricingForm({
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
	setSinglePieceMaxWeightKg
}: ProductPricingFormProps) {
	const styles = createStyles(colors)

	return (
		<BaseForm>
			<FormRow>
				<FormCol>
					<FormLabel>{translate('price_tnd', 'Price (TND)')} *</FormLabel>
					<FormInputWrapper style={{ borderColor: priceTND ? colors.primary : colors.border, backgroundColor: colors.surfaceVariant }}>
						<Text style={styles.prefix}>TND</Text>
						<FormInput value={priceTND} onChangeText={setPriceTND} placeholder="0.00" keyboardType="decimal-pad" />
					</FormInputWrapper>
				</FormCol>
			</FormRow>
			<FormRow>
				<FormCol>
					<FormLabel>{translate('unit_measure', 'Unit Measure')}</FormLabel>
					<View style={styles.segmentContainer}>
						{UNIT_OPTIONS.map((val) => {
							const isSelected = unit === val
							return (
								<TouchableOpacity key={val} style={[styles.segmentButton, isSelected && { backgroundColor: colors.primary }]} onPress={() => setUnit(val)}>
									<Text style={[styles.segmentText, { color: isSelected ? themeColors.buttonText : colors.textSecondary }]}>{translate(val, val)}</Text>
								</TouchableOpacity>
							)
						})}
					</View>
				</FormCol>
				<FormCol>
					<FormLabel>{translate('unit_step', 'Unit Step')}</FormLabel>
					<FormInputWrapper style={{ borderColor: colors.primary, backgroundColor: colors.surfaceVariant }}>
						<FormInput value={unitStep} onChangeText={setUnitStep} placeholder="1" keyboardType="numeric" />
					</FormInputWrapper>
				</FormCol>
			</FormRow>
			<FormRow>
				<FormCol>
					<FormLabel>{translate('min_unit', 'Min Limit')}</FormLabel>
					<FormInputWrapper style={{ borderColor: colors.primary, backgroundColor: colors.surfaceVariant }}>
						<FormInput value={minUnit} onChangeText={setMinUnit} placeholder="1" keyboardType="numeric" />
					</FormInputWrapper>
				</FormCol>
				<FormCol>
					<FormLabel>{translate('max_unit', 'Max Limit')}</FormLabel>
					<FormInputWrapper style={{ borderColor: colors.primary, backgroundColor: colors.surfaceVariant }}>
						<FormInput value={maxUnit} onChangeText={setMaxUnit} placeholder="10" keyboardType="numeric" />
					</FormInputWrapper>
				</FormCol>
			</FormRow>
			<FormLabel style={styles.subSectionTitle}>{translate('single_piece_weight_kg', 'Single piece weight (kg)')}</FormLabel>
			<FormRow>
				<FormCol>
					<FormLabel>{translate('min', 'Min')}</FormLabel>
					<FormInputWrapper style={{ borderColor: colors.primary, backgroundColor: colors.surfaceVariant }}>
						<FormInput value={singlePieceMinWeightKg} onChangeText={setSinglePieceMinWeightKg} placeholder="0.0" keyboardType="decimal-pad" />
					</FormInputWrapper>
				</FormCol>
				<FormCol>
					<FormLabel>{translate('avg', 'Avg')}</FormLabel>
					<FormInputWrapper style={{ borderColor: colors.primary, backgroundColor: colors.surfaceVariant }}>
						<FormInput value={singlePieceAvgWeightKg} onChangeText={setSinglePieceAvgWeightKg} placeholder="0.0" keyboardType="decimal-pad" />
					</FormInputWrapper>
				</FormCol>
				<FormCol>
					<FormLabel>{translate('max', 'Max')}</FormLabel>
					<FormInputWrapper style={{ borderColor: colors.primary, backgroundColor: colors.surfaceVariant }}>
						<FormInput value={singlePieceMaxWeightKg} onChangeText={setSinglePieceMaxWeightKg} placeholder="0.0" keyboardType="decimal-pad" />
					</FormInputWrapper>
				</FormCol>
			</FormRow>
		</BaseForm>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		prefix: {
			fontSize: 16,
			fontWeight: '600',
			color: colors.textSecondary,
			marginRight: 8
		},
		subSectionTitle: {
			fontSize: 13,
			fontWeight: '700',
			color: colors.text,
			marginTop: 4
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

export default ProductPricingForm
