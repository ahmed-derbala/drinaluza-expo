import React from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getCaliberLabel } from '@/features/products/products.helpers'

export interface ProductSpecsSectionProps {
	editable: boolean
	colors: any
	translate: (key: string, defaultValue?: string) => string
	// If editable is true
	caliber?: 1 | 2 | 3 | 4 | 5
	setCaliber?: (val: 1 | 2 | 3 | 4 | 5) => void
	originStreet?: string
	setOriginStreet?: (val: string) => void
	originCity?: string
	setOriginCity?: (val: string) => void
	originRegion?: string
	setOriginRegion?: (val: string) => void
	originPostalCode?: string
	setOriginPostalCode?: (val: string) => void
	originCountry?: string
	setOriginCountry?: (val: string) => void
	// If editable is false (view mode)
	specs?: {
		caliber?: number
		origin?: {
			street?: string
			city?: string
			region?: string
			postalCode?: string
			country?: string
		}
	} | null
}

export default function ProductSpecsSection({
	editable,
	colors,
	translate,
	caliber = 3,
	setCaliber,
	originStreet = '',
	setOriginStreet,
	originCity = 'Ellouza',
	setOriginCity,
	originRegion = 'Sfax',
	setOriginRegion,
	originPostalCode = '3016',
	setOriginPostalCode,
	originCountry = 'Tunisia',
	setOriginCountry,
	specs
}: ProductSpecsSectionProps) {
	const styles = createStyles(colors)

	if (editable) {
		return (
			<View style={styles.card}>
				<Text style={styles.cardTitle}>
					{translate('product_specs', 'Product Specifications')} <Text style={styles.optional}>({translate('optional', 'Optional')})</Text>
				</Text>

				{/* Caliber Selection */}
				<View style={styles.fieldContainer}>
					<Text style={styles.fieldLabel}>
						{translate('caliber', 'Caliber')} <Text style={styles.required}>*</Text>
					</Text>
					<View style={styles.caliberContainer}>
						{([1, 2, 3, 4, 5] as const).map((val) => (
							<TouchableOpacity
								key={val}
								style={[styles.caliberButton, caliber === val && { backgroundColor: colors.primary, borderColor: colors.primary }]}
								onPress={() => setCaliber && setCaliber(val)}
							>
								<Text numberOfLines={1} adjustsFontSizeToFit style={[styles.caliberButtonText, caliber === val && { color: '#ffffff' }]}>
									{getCaliberLabel(val)}
								</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Origin Address Section */}
				<Text style={[styles.fieldLabel, { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 12 }]}>{translate('origin_address', 'Origin Address')}</Text>

				<View style={styles.row}>
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('origin_street', 'Street')}</Text>
						<View style={[styles.inputBox, { borderColor: originStreet ? colors.primary : colors.borderLight }]}>
							<TextInput
								style={[styles.textInput, { color: colors.text }]}
								value={originStreet}
								onChangeText={setOriginStreet}
								placeholder={translate('street_placeholder', 'e.g., Rue de la Paix')}
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
					</View>
				</View>

				<View style={styles.row}>
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('origin_city', 'City')}</Text>
						<View style={[styles.inputBox, { borderColor: originCity ? colors.primary : colors.borderLight }]}>
							<TextInput
								style={[styles.textInput, { color: colors.text }]}
								value={originCity}
								onChangeText={setOriginCity}
								placeholder={translate('city_placeholder', 'e.g., Ellouza')}
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
					</View>
					<View style={{ width: 12 }} />
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('origin_region', 'Region')}</Text>
						<View style={[styles.inputBox, { borderColor: originRegion ? colors.primary : colors.borderLight }]}>
							<TextInput
								style={[styles.textInput, { color: colors.text }]}
								value={originRegion}
								onChangeText={setOriginRegion}
								placeholder={translate('region_placeholder', 'e.g., Sfax')}
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
					</View>
				</View>

				<View style={styles.row}>
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('origin_postal_code', 'Postal Code')}</Text>
						<View style={[styles.inputBox, { borderColor: originPostalCode ? colors.primary : colors.borderLight }]}>
							<TextInput
								style={[styles.textInput, { color: colors.text }]}
								value={originPostalCode}
								onChangeText={setOriginPostalCode}
								placeholder="3016"
								placeholderTextColor={colors.textTertiary}
								keyboardType="numeric"
							/>
						</View>
					</View>
					<View style={{ width: 12 }} />
					<View style={styles.flexItem}>
						<Text style={styles.fieldLabel}>{translate('origin_country', 'Country')}</Text>
						<View style={[styles.inputBox, { borderColor: originCountry ? colors.primary : colors.borderLight }]}>
							<TextInput
								style={[styles.textInput, { color: colors.text }]}
								value={originCountry}
								onChangeText={setOriginCountry}
								placeholder={translate('country_placeholder', 'e.g., Tunisia')}
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
					</View>
				</View>
			</View>
		)
	}

	// Read-only specs card for detail page
	if (!specs) return null

	return (
		<View style={[styles.metaCardStatic, { backgroundColor: colors.card, borderColor: colors.border }]}>
			<View style={styles.metaCardHeader}>
				<View style={styles.metaCardTitleWrap}>
					<View style={[styles.metaCardIconBg, { backgroundColor: colors.primary + '15' }]}>
						<Ionicons name="options-outline" size={16} color={colors.primary} />
					</View>
					<Text style={[styles.metaCardTitle, { color: colors.textTertiary }]}>{translate('specifications', 'Specifications')}</Text>
				</View>
			</View>

			{/* Caliber */}
			<View style={styles.specDetailRow}>
				<Text style={[styles.specDetailLabel, { color: colors.textSecondary }]}>{translate('caliber_size', 'Caliber / Size')}</Text>
				<View style={[styles.caliberBadge, { backgroundColor: colors.primary + '15' }]}>
					<Text style={[styles.caliberText, { color: colors.primary }]}>{getCaliberLabel(specs.caliber || 3)}</Text>
				</View>
			</View>

			{/* Origin */}
			{specs.origin && (
				<View style={[styles.specDetailRow, { borderBottomWidth: 0 }]}>
					<Text style={[styles.specDetailLabel, { color: colors.textSecondary }]}>{translate('origin', 'Origin')}</Text>
					<Text style={[styles.originValue, { color: colors.text }]} numberOfLines={2}>
						{[specs.origin.street, specs.origin.city, specs.origin.region, specs.origin.country].filter(Boolean).join(', ')}
					</Text>
				</View>
			)}
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
		fieldContainer: {
			marginBottom: 16
		},
		fieldLabel: {
			fontSize: 14,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 8
		},
		optional: {
			fontWeight: '400',
			color: colors.textTertiary,
			fontSize: 12
		},
		required: {
			color: colors.error || '#EF4444'
		},
		caliberContainer: {
			flexDirection: 'row',
			gap: 8,
			justifyContent: 'space-between',
			alignItems: 'center',
			width: '100%'
		},
		caliberButton: {
			flex: 1,
			height: 38,
			borderRadius: 10,
			borderWidth: 1.5,
			borderColor: colors.border,
			justifyContent: 'center',
			alignItems: 'center',
			paddingHorizontal: 2
		},
		caliberButtonText: {
			fontSize: 12,
			fontWeight: '700',
			color: colors.textSecondary
		},
		row: {
			flexDirection: 'row',
			marginBottom: 16
		},
		flexItem: {
			flex: 1
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
		// Detail mode specific styles
		metaCardStatic: {
			borderRadius: 16,
			borderWidth: 1,
			padding: 16,
			marginBottom: 12
		},
		metaCardHeader: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 12
		},
		metaCardTitleWrap: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8
		},
		metaCardIconBg: {
			width: 28,
			height: 28,
			borderRadius: 8,
			justifyContent: 'center',
			alignItems: 'center'
		},
		metaCardTitle: {
			fontSize: 12,
			fontWeight: '700',
			textTransform: 'uppercase',
			letterSpacing: 0.5
		},
		specDetailRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			paddingVertical: 12,
			borderBottomWidth: 1,
			borderBottomColor: colors.border
		},
		specDetailLabel: {
			fontSize: 14,
			fontWeight: '500'
		},
		caliberBadge: {
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 8
		},
		caliberText: {
			fontSize: 12,
			fontWeight: '700'
		},
		originValue: {
			fontSize: 14,
			fontWeight: '600',
			textAlign: 'right',
			flex: 1,
			marginLeft: 16
		}
	})
