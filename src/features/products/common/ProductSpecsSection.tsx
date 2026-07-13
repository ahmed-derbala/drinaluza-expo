import React from 'react'
import { View, Text, TouchableOpacity, TextInput, StyleSheet } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { getCaliberLabel, getCaliberIconSize, getHarvestLabel, getHarvestIcon } from '@/features/products/products.helpers'
import AddressForm from '@/features/common/AddressForm'

export interface ProductSpecsSectionProps {
	editable: boolean
	colors: any
	translate: (key: string, defaultValue?: string) => string
	// If editable is true
	caliber?: 1 | 2 | 3 | 4 | 5
	setCaliber?: (val: 1 | 2 | 3 | 4 | 5) => void
	harvest?: 'wild' | 'farm'
	setHarvest?: (val: 'wild' | 'farm') => void
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
		harvest?: 'wild' | 'farm'
		origin?: {
			street?: string
			city?: string
			region?: string
			postalCode?: string
			country?: string
		}
	} | null
	onEdit?: () => void
	onSavePress?: () => void
	onCancelPress?: () => void
}

export default function ProductSpecsSection({
	editable,
	colors,
	translate,
	caliber = 3,
	setCaliber,
	harvest = 'farm',
	setHarvest,
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
	specs,
	onEdit,
	onSavePress,
	onCancelPress
}: ProductSpecsSectionProps) {
	const styles = createStyles(colors)

	if (editable) {
		return (
			<View style={styles.card}>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
					<Text style={[styles.cardTitle, { marginBottom: 0 }]}>
						{translate('specifications', 'Specifications')} <Text style={styles.optional}>({translate('optional', 'Optional')})</Text>
					</Text>
					<View style={{ flexDirection: 'row', gap: 12 }}>
						{onCancelPress && (
							<TouchableOpacity onPress={onCancelPress} style={{ padding: 4 }}>
								<Ionicons name="close-circle-outline" size={22} color={colors.error || '#EF4444'} />
							</TouchableOpacity>
						)}
						{onSavePress && (
							<TouchableOpacity onPress={onSavePress} style={{ padding: 4 }}>
								<Ionicons name="checkmark-circle" size={22} color={colors.success || '#10B981'} />
							</TouchableOpacity>
						)}
					</View>
				</View>

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
								<Ionicons name={caliber === val ? 'fish' : 'fish-outline'} size={getCaliberIconSize(val, 'selector')} color={caliber === val ? '#ffffff' : colors.primary} />
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Harvest Selection */}
				<View style={styles.fieldContainer}>
					<Text style={styles.fieldLabel}>{translate('harvest', 'Harvest')}</Text>
					<View style={styles.harvestContainer}>
						{(['farm', 'wild'] as const).map((val) => (
							<TouchableOpacity
								key={val}
								style={[styles.harvestButton, harvest === val && { backgroundColor: colors.primary, borderColor: colors.primary }]}
								onPress={() => setHarvest && setHarvest(val)}
							>
								<Ionicons name={getHarvestIcon(val)} size={16} color={harvest === val ? '#ffffff' : colors.primary} />
								<Text style={[styles.harvestButtonText, harvest === val && { color: '#ffffff' }]}>{getHarvestLabel(val)}</Text>
							</TouchableOpacity>
						))}
					</View>
				</View>

				{/* Origin Address Section */}
				<Text style={[styles.fieldLabel, { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 12 }]}>{translate('origin_address', 'Origin Address')}</Text>

				<AddressForm
					street={originStreet}
					setStreet={setOriginStreet || (() => {})}
					city={originCity}
					setCity={setOriginCity || (() => {})}
					region={originRegion}
					setRegion={setOriginRegion || (() => {})}
					postalCode={originPostalCode}
					setPostalCode={setOriginPostalCode || (() => {})}
					country={originCountry}
					setCountry={setOriginCountry || (() => {})}
				/>
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
						<Ionicons name="fish-outline" size={22} color={colors.primary} />
					</View>
					<Text style={[styles.metaCardTitle, { color: colors.textTertiary }]}>{translate('specifications', 'Specifications')}</Text>
				</View>
				{onEdit && (
					<TouchableOpacity onPress={onEdit} style={{ padding: 4 }} activeOpacity={0.7}>
						<Ionicons name="create-outline" size={18} color={colors.primary} />
					</TouchableOpacity>
				)}
			</View>

			{/* Caliber */}
			<View style={styles.specDetailRow}>
				<Text style={[styles.specDetailLabel, { color: colors.textSecondary }]}>{translate('caliber', 'Caliber')}</Text>
				<View style={[styles.caliberBadge, { backgroundColor: colors.primary + '15' }]}>
					<Ionicons name="fish" size={getCaliberIconSize(specs.caliber, 'badge')} color={colors.primary} />
					<Text style={[styles.caliberText, { color: colors.primary }]}>{getCaliberLabel(specs.caliber || 3)}</Text>
				</View>
			</View>

			{/* Harvest */}
			<View style={styles.specDetailRow}>
				<Text style={[styles.specDetailLabel, { color: colors.textSecondary }]}>{translate('harvest', 'Harvest')}</Text>
				<View style={[styles.harvestBadge, { backgroundColor: colors.success + '15' }]}>
					<Ionicons name={getHarvestIcon(specs.harvest)} size={14} color={colors.success} />
					<Text style={[styles.harvestText, { color: colors.success }]}>{getHarvestLabel(specs.harvest || 'farm')}</Text>
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
			height: 48,
			borderRadius: 10,
			borderWidth: 1.5,
			borderColor: colors.border,
			justifyContent: 'center',
			alignItems: 'center',
			paddingHorizontal: 2,
			gap: 2
		},
		caliberButtonText: {
			fontSize: 12,
			fontWeight: '700',
			color: colors.textSecondary
		},
		harvestContainer: {
			flexDirection: 'row',
			gap: 8,
			justifyContent: 'space-between',
			alignItems: 'center',
			width: '100%'
		},
		harvestButton: {
			flex: 1,
			height: 48,
			borderRadius: 10,
			borderWidth: 1.5,
			borderColor: colors.border,
			flexDirection: 'row',
			justifyContent: 'center',
			alignItems: 'center',
			gap: 6,
			paddingHorizontal: 8
		},
		harvestButtonText: {
			fontSize: 13,
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
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4,
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 8
		},
		caliberText: {
			fontSize: 12,
			fontWeight: '700'
		},
		harvestBadge: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 4,
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 8
		},
		harvestText: {
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
