import React, { useState } from 'react'
import { View, Text, TextInput, StyleSheet } from 'react-native'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import { Ionicons } from '@expo/vector-icons'

export interface AddressFormProps {
	street: string
	setStreet: (val: string) => void
	city: string
	setCity: (val: string) => void
	region: string
	setRegion: (val: string) => void
	postalCode: string
	setPostalCode: (val: string) => void
	country: string
	setCountry: (val: string) => void
}

export default function AddressForm({ street, setStreet, city, setCity, region, setRegion, postalCode, setPostalCode, country, setCountry }: AddressFormProps) {
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
							backgroundColor: colors.card
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

	return (
		<View style={styles.container}>
			{renderField(translate('street', 'Street Address'), street, setStreet, translate('street_placeholder', 'e.g., Rue de la Paix'), 'home-outline', 'street')}
			<View style={styles.row}>
				<View style={styles.col}>{renderField(translate('city', 'City'), city, setCity, translate('city_placeholder', 'e.g., Ellouza'), 'business-outline', 'city')}</View>
				<View style={styles.gap} />
				<View style={styles.col}>{renderField(translate('region_or_state', 'Region / State'), region, setRegion, translate('region_placeholder', 'e.g., Sfax'), 'map-outline', 'region')}</View>
			</View>
			<View style={styles.row}>
				<View style={styles.col}>{renderField(translate('postal_code', 'Postal Code'), postalCode, setPostalCode, '3016', 'navigate-outline', 'postalCode', 'numeric')}</View>
				<View style={styles.gap} />
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
