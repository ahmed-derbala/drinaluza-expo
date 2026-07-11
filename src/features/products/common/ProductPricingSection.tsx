import React from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

export interface ProductPricingSectionProps {
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
	// View values
	formattedPrice?: string
	unitMeasure?: string
	minLimit?: number
	maxLimit?: number | string
	// Inline Edit Actions
	canEdit?: boolean
	onEditPress?: () => void
	onSavePress?: () => void
	onCancelPress?: () => void
}

export default function ProductPricingSection({
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
	formattedPrice,
	unitMeasure,
	minLimit = 1,
	maxLimit = '∞',
	canEdit,
	onEditPress,
	onSavePress,
	onCancelPress
}: ProductPricingSectionProps) {
	const styles = createStyles(colors)

	if (variant === 'create') {
		return (
			<View style={styles.card}>
				<Text style={styles.cardTitle}>{translate('pricing_units', 'Pricing & Units')}</Text>
				<View style={styles.row}>
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('price_tnd', 'Price (TND)')} *</Text>
						<View style={[styles.inputBox, { borderColor: priceTND ? colors.primary : colors.borderLight }]}>
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
										<Text style={[styles.segmentText, { color: isSelected ? '#ffffff' : colors.textSecondary }]}>{translate(val, val)}</Text>
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
			</View>
		)
	}

	if (variant === 'edit') {
		return (
			<View style={styles.editSection}>
				<View style={styles.editHeader}>
					<Text style={styles.cardTitle}>{translate('pricing_units', 'Pricing & Units')}</Text>
					<View style={styles.actionButtons}>
						{onCancelPress && (
							<TouchableOpacity onPress={onCancelPress} style={styles.actionBtn}>
								<Ionicons name="close-circle-outline" size={22} color={colors.error || '#EF4444'} />
							</TouchableOpacity>
						)}
						{onSavePress && (
							<TouchableOpacity onPress={onSavePress} style={styles.actionBtn}>
								<Ionicons name="checkmark-circle" size={22} color={colors.success || '#10B981'} />
							</TouchableOpacity>
						)}
					</View>
				</View>
				<View style={styles.row}>
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('price_tnd', 'Price (TND)')} *</Text>
						<View style={[styles.inputBox, { borderColor: priceTND ? colors.primary : colors.borderLight }]}>
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
										<Text style={[styles.segmentText, { color: isSelected ? '#ffffff' : colors.textSecondary }]}>{translate(val, val)}</Text>
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
			</View>
		)
	}

	// view mode
	return (
		<View style={styles.viewSection}>
			<View style={styles.viewHeader}>
				<Text style={styles.priceLabel}>{translate('price', 'Price')}</Text>
				{canEdit && onEditPress && (
					<TouchableOpacity onPress={onEditPress} style={styles.editActionBtn} activeOpacity={0.7}>
						<Ionicons name="create-outline" size={16} color={colors.primary} />
					</TouchableOpacity>
				)}
			</View>
			<View style={styles.priceContainer}>
				<Text style={[styles.priceValue, { color: colors.primary }]}>{formattedPrice}</Text>
				<Text style={[styles.priceUnit, { color: colors.textSecondary }]}>/ {unitMeasure || translate('unit', 'unit')}</Text>
			</View>
			<Text style={[styles.quantityRange, { color: colors.textSecondary }]}>
				{translate('min', 'Min')}: {minLimit} - {translate('max', 'Max')}: {maxLimit} {unitMeasure || ''}
			</Text>
		</View>
	)
}

const createStyles = (colors: any) =>
	StyleSheet.create({
		card: {
			backgroundColor: colors.card,
			borderRadius: 16,
			padding: 16,
			marginBottom: 16,
			borderWidth: 1,
			borderColor: colors.border
		},
		cardTitle: {
			fontSize: 16,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 16
		},
		editSection: {
			borderBottomWidth: 1,
			borderBottomColor: colors.borderLight,
			paddingBottom: 16,
			marginBottom: 16
		},
		editHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 12
		},
		actionButtons: {
			flexDirection: 'row',
			gap: 12
		},
		actionBtn: {
			padding: 4
		},
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
			borderBottomColor: colors.borderLight
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
		segmentContainer: {
			flexDirection: 'row',
			height: 48,
			borderRadius: 12,
			borderWidth: 1.5,
			borderColor: colors.borderLight,
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
