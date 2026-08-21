import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { Ionicons } from '@expo/vector-icons'
import type { LocalizedName } from './address.interface'
import LocalizedFormInput from '@/features/common/LocalizedFormInput'

export interface AddressFormProps {
	street: LocalizedName
	setStreet: (val: LocalizedName) => void
	city: string
	setCity: (val: string) => void
	region: string
	setRegion: (val: string) => void
	country: string
	setCountry: (val: string) => void
}

export default function AddressForm({ street, setStreet, city, setCity, region, setRegion, country, setCountry }: AddressFormProps) {
	const { colors } = useTheme()
	const { translate } = useUser()
	const [focusedField, setFocusedField] = useState<string | null>(null)

	const renderField = (
		label: string,
		value: string,
		onChangeText: (val: string) => void,
		placeholder: string,
		iconName: keyof typeof Ionicons.glyphMap,
		fieldName: string,
		keyboardType: 'default' | 'numeric' = 'default'
	) => {
		const isFocused = focusedField === fieldName
		return (
			<View style={styles.inputGroup}>
				<Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{label}</Text>
				<View
					style={[
						styles.inputWrapper,
						{
							borderColor: isFocused ? colors.primary : colors.border,
							backgroundColor: colors.background
						}
					]}
				>
					<View style={[styles.iconBadge, { backgroundColor: colors.text + '05', borderRightColor: colors.border }]}>
						<Ionicons name={iconName} size={18} color={isFocused ? colors.primary : colors.textSecondary} />
					</View>
					<TextInput
						style={[styles.textInput, { color: colors.text }]}
						value={value}
						onChangeText={onChangeText}
						placeholder={placeholder}
						placeholderTextColor={colors.textTertiary}
						onFocus={() => setFocusedField(fieldName)}
						onBlur={() => setFocusedField(null)}
						keyboardType={keyboardType}
						underlineColorAndroid="transparent"
					/>
				</View>
			</View>
		)
	}

	const streetObj = street || { en: '', tn_latn: '', tn_arab: '' }

	return (
		<View style={styles.container}>
			<View style={styles.inputGroup}>
				<Text style={[styles.inputLabel, { color: colors.textSecondary }]}>{translate('street', 'Street Address')}</Text>
				<View style={{ gap: 8 }}>
					<LocalizedFormInput value={streetObj.en || ''} onChangeText={(val) => setStreet({ ...streetObj, en: val })} lang="en" placeholder={translate('street_placeholder_en', 'e.g., 123 Main St')} />
					<LocalizedFormInput
						value={streetObj.tn_latn || ''}
						onChangeText={(val) => setStreet({ ...streetObj, tn_latn: val })}
						lang="tn_latn"
						placeholder={translate('street_placeholder_tn_latn', 'e.g., Rue de la Paix')}
					/>
					<LocalizedFormInput
						value={streetObj.tn_arab || ''}
						onChangeText={(val) => setStreet({ ...streetObj, tn_arab: val })}
						lang="tn_arab"
						placeholder={translate('street_placeholder_tn_arab', 'e.g., شارع السلام')}
					/>
				</View>
			</View>
			<View style={styles.row}>
				<View style={styles.col}>{renderField(translate('city', 'City'), city, setCity, translate('city_placeholder', 'e.g., Ellouza'), 'business-outline', 'city')}</View>
				<View style={styles.gap} />
				<View style={styles.col}>{renderField(translate('region', 'Region'), region, setRegion, translate('region_placeholder', 'e.g., Sfax'), 'map-outline', 'region')}</View>
			</View>
			<View style={styles.row}>
				<View style={styles.col}>{renderField(translate('country', 'Country'), country, setCountry, translate('country_placeholder', 'e.g., Tunisia'), 'earth-outline', 'country')}</View>
			</View>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		width: '100%',
		gap: 12
	},
	row: {
		flexDirection: 'row',
		width: '100%'
	},
	col: {
		flex: 1
	},
	gap: {
		width: 12
	},
	inputGroup: {
		width: '100%'
	},
	inputLabel: {
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 6
	},
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		height: 46,
		borderRadius: 10,
		borderWidth: 1.5,
		overflow: 'hidden'
	},
	iconBadge: {
		width: 40,
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center',
		borderRightWidth: 1.5
	},
	textInput: {
		flex: 1,
		fontSize: 15,
		paddingHorizontal: 12,
		height: '100%'
	}
})
