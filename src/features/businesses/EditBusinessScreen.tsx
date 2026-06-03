import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform } from 'react-native'
import { SmartKeyboardSafeView } from '@/core/smart-keyboard-safe-view'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { getBusinessBySlug, updateBusiness } from '@/features/businesses/businesses.api'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import ErrorState from '@/features/common/ErrorState'
import { toast } from '@/features/common/Toast'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'

export default function EditBusinessScreen() {
	const { businessSlug } = useLocalSearchParams<{ businessSlug: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { translate } = useUser()

	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)

	// Form State
	const [nameEn, setNameEn] = useState('')
	const [nameTnLatn, setNameTnLatn] = useState('')
	const [nameTnArab, setNameTnArab] = useState('')

	const [street, setStreet] = useState('')
	const [city, setCity] = useState('')
	const [region, setRegion] = useState('')
	const [country, setCountry] = useState('')

	const [phoneCountry, setPhoneCountry] = useState('216')
	const [phoneLocal, setPhoneLocal] = useState('')
	const [whatsapp, setWhatsapp] = useState('')
	const [email, setEmail] = useState('')

	const [longitude, setLongitude] = useState('')
	const [latitude, setLatitude] = useState('')
	const [sharingEnabled, setSharingEnabled] = useState(false)

	useEffect(() => {
		if (businessSlug) {
			loadBusiness()
		}
	}, [businessSlug])

	const loadBusiness = async () => {
		try {
			setLoading(true)
			setError(null)
			const res = await getBusinessBySlug(businessSlug!)
			const biz = res.data

			setNameEn(biz.name?.en || '')
			setNameTnLatn(biz.name?.tn_latn || '')
			setNameTnArab(biz.name?.tn_arab || '')

			setStreet(biz.address?.street || '')
			setCity(biz.address?.city || '')
			setRegion(biz.address?.region || '')
			setCountry(biz.address?.country || '')

			setPhoneCountry(biz.contact?.phone?.countryCode || '216')
			setPhoneLocal(biz.contact?.phone?.localNumber || '')
			setWhatsapp(biz.contact?.whatsapp || '')
			setEmail(biz.contact?.email || '')

			const coords = biz.location?.coordinates
			if (coords && coords.length === 2) {
				setLongitude(coords[0].toString())
				setLatitude(coords[1].toString())
			} else {
				setLongitude('')
				setLatitude('')
			}
			setSharingEnabled(biz.location?.sharingEnabled || false)
		} catch (err: any) {
			setError(err.message || 'Failed to load business details')
		} finally {
			setLoading(false)
		}
	}

	const handleGetCurrentLocation = async () => {
		try {
			setLoading(true) // Reusing loading state for the spinner or we can use a separate one, but let's keep it simple
			const { status } = await Location.requestForegroundPermissionsAsync()
			if (status !== 'granted') {
				toast.show({ title: 'Error', message: 'Permission to access location was denied', color: '#EF4444' })
				setLoading(false)
				return
			}

			const location = await Location.getCurrentPositionAsync({})
			setLatitude(location.coords.latitude.toString())
			setLongitude(location.coords.longitude.toString())
		} catch (error) {
			toast.show({ title: 'Error', message: 'Failed to get current location', color: '#EF4444' })
		} finally {
			setLoading(false)
		}
	}

	const handleSave = async () => {
		if (!nameEn.trim()) {
			toast.show({ title: 'Error', message: 'English name is required', color: '#EF4444' })
			return
		}

		try {
			setSaving(true)
			const updateData = {
				name: {
					en: nameEn.trim(),
					tn_latn: nameTnLatn.trim() || undefined,
					tn_arab: nameTnArab.trim() || undefined
				},
				address: {
					street: street.trim(),
					city: city.trim(),
					region: region.trim(),
					country: country.trim()
				},
				contact: {
					phone: {
						countryCode: phoneCountry.trim(),
						localNumber: phoneLocal.trim(),
						fullNumber: `+${phoneCountry.trim()}${phoneLocal.trim()}`
					},
					whatsapp: whatsapp.trim() || undefined,
					email: email.trim() || undefined
				}
			} as any

			if (longitude.trim() && latitude.trim()) {
				updateData.location = {
					type: 'Point',
					coordinates: [parseFloat(longitude.trim()), parseFloat(latitude.trim())],
					sharingEnabled
				}
			}

			await updateBusiness(businessSlug!, updateData)
			toast.show({ title: 'Success', message: translate('business_updated', 'Business updated successfully'), color: '#10B981' })
			router.back()
		} catch (err: any) {
			toast.show({ title: 'Error', message: err.message || 'Failed to update business', color: '#EF4444' })
		} finally {
			setSaving(false)
		}
	}

	if (loading) {
		return (
			<View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (error) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ title: translate('edit_business', 'Edit Business') }} />
				<ErrorState title="Error" message={error} onRetry={loadBusiness} />
			</View>
		)
	}

	return (
		<SmartKeyboardSafeView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.scrollContent}>
			<Stack.Screen options={{ title: translate('edit_business', 'Edit Business') }} />

			<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
				<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('business_name', 'Business Name')}</Text>

				<View style={styles.inputGroup}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>English (Required)</Text>
					<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
						<Ionicons name="business-outline" size={20} color={colors.textTertiary} />
						<TextInput style={[styles.input, { color: colors.text }]} value={nameEn} onChangeText={setNameEn} placeholder="e.g. Drinaluza" placeholderTextColor={colors.textTertiary} />
					</View>
				</View>

				<View style={styles.inputGroup}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>Tunisian (Latin)</Text>
					<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
						<Ionicons name="language-outline" size={20} color={colors.textTertiary} />
						<TextInput style={[styles.input, { color: colors.text }]} value={nameTnLatn} onChangeText={setNameTnLatn} placeholder="e.g. Drinaluza" placeholderTextColor={colors.textTertiary} />
					</View>
				</View>

				<View style={styles.inputGroup}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>Tunisian (Arabic)</Text>
					<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
						<Ionicons name="language-outline" size={20} color={colors.textTertiary} />
						<TextInput
							style={[styles.input, { color: colors.text }]}
							value={nameTnArab}
							onChangeText={setNameTnArab}
							placeholder="e.g. درينالوزا"
							placeholderTextColor={colors.textTertiary}
							textAlign="right"
						/>
					</View>
				</View>
			</View>

			<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
				<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('address', 'Address')}</Text>

				<View style={styles.inputGroup}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>Street</Text>
					<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
						<Ionicons name="location-outline" size={20} color={colors.textTertiary} />
						<TextInput style={[styles.input, { color: colors.text }]} value={street} onChangeText={setStreet} placeholder="Street Address" placeholderTextColor={colors.textTertiary} />
					</View>
				</View>

				<View style={styles.inputGroup}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>City</Text>
					<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
						<Ionicons name="map-outline" size={20} color={colors.textTertiary} />
						<TextInput style={[styles.input, { color: colors.text }]} value={city} onChangeText={setCity} placeholder="City" placeholderTextColor={colors.textTertiary} />
					</View>
				</View>

				<View style={styles.inputGroup}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>Region</Text>
					<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
						<Ionicons name="map-outline" size={20} color={colors.textTertiary} />
						<TextInput style={[styles.input, { color: colors.text }]} value={region} onChangeText={setRegion} placeholder="Region" placeholderTextColor={colors.textTertiary} />
					</View>
				</View>

				<View style={styles.inputGroup}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>Country</Text>
					<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
						<Ionicons name="globe-outline" size={20} color={colors.textTertiary} />
						<TextInput style={[styles.input, { color: colors.text }]} value={country} onChangeText={setCountry} placeholder="Country" placeholderTextColor={colors.textTertiary} />
					</View>
				</View>
			</View>

			<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
				<Text style={[styles.sectionTitle, { color: colors.text }]}>{translate('contact', 'Contact Info')}</Text>

				<View style={styles.inputGroup}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
					<View style={{ flexDirection: 'row', gap: 8 }}>
						<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border, flex: 0.3, paddingHorizontal: 10 }]}>
							<Text style={{ color: colors.textSecondary }}>+</Text>
							<TextInput
								style={[styles.input, { color: colors.text }]}
								value={phoneCountry}
								onChangeText={setPhoneCountry}
								keyboardType="phone-pad"
								placeholder="216"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
						<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border, flex: 0.7 }]}>
							<Ionicons name="call-outline" size={20} color={colors.textTertiary} />
							<TextInput
								style={[styles.input, { color: colors.text }]}
								value={phoneLocal}
								onChangeText={setPhoneLocal}
								keyboardType="phone-pad"
								placeholder="99112619"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
					</View>
				</View>

				<View style={styles.inputGroup}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>WhatsApp</Text>
					<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
						<Ionicons name="logo-whatsapp" size={20} color={colors.textTertiary} />
						<TextInput
							style={[styles.input, { color: colors.text }]}
							value={whatsapp}
							onChangeText={setWhatsapp}
							keyboardType="phone-pad"
							placeholder="+21699112619"
							placeholderTextColor={colors.textTertiary}
						/>
					</View>
				</View>

				<View style={styles.inputGroup}>
					<Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
					<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
						<Ionicons name="mail-outline" size={20} color={colors.textTertiary} />
						<TextInput
							style={[styles.input, { color: colors.text }]}
							value={email}
							onChangeText={setEmail}
							keyboardType="email-address"
							autoCapitalize="none"
							placeholder="drinaluza@gmail.com"
							placeholderTextColor={colors.textTertiary}
						/>
					</View>
				</View>
			</View>

			<View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
				<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
					<Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>{translate('location', 'Location')}</Text>
					<TouchableOpacity
						onPress={handleGetCurrentLocation}
						style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: `${colors.primary}20`, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }}
					>
						<Ionicons name="navigate" size={16} color={colors.primary} />
						<Text style={{ color: colors.primary, fontWeight: '600', fontSize: 13 }}>{translate('get_current', 'Current')}</Text>
					</TouchableOpacity>
				</View>

				<View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
					<View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
						<Text style={[styles.label, { color: colors.textSecondary }]}>Latitude</Text>
						<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
							<TextInput
								style={[styles.input, { color: colors.text }]}
								value={latitude}
								onChangeText={setLatitude}
								keyboardType="numeric"
								placeholder="36.8"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
					</View>

					<View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
						<Text style={[styles.label, { color: colors.textSecondary }]}>Longitude</Text>
						<View style={[styles.inputWrapper, { backgroundColor: colors.background, borderColor: colors.border }]}>
							<TextInput
								style={[styles.input, { color: colors.text }]}
								value={longitude}
								onChangeText={setLongitude}
								keyboardType="numeric"
								placeholder="10.18"
								placeholderTextColor={colors.textTertiary}
							/>
						</View>
					</View>
				</View>

				<TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }} onPress={() => setSharingEnabled(!sharingEnabled)} activeOpacity={0.8}>
					<View
						style={[
							{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
							sharingEnabled ? { backgroundColor: colors.primary, borderColor: colors.primary } : { borderColor: colors.textTertiary }
						]}
					>
						{sharingEnabled && <Ionicons name="checkmark" size={16} color="#fff" />}
					</View>
					<Text style={{ color: colors.text }}>{translate('share_location', 'Share location with customers')}</Text>
				</TouchableOpacity>
			</View>

			<TouchableOpacity style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
				{saving ? (
					<ActivityIndicator color="#fff" />
				) : (
					<>
						<Ionicons name="save-outline" size={20} color="#fff" />
						<Text style={styles.saveBtnText}>{translate('save', 'Save Changes')}</Text>
					</>
				)}
			</TouchableOpacity>
		</SmartKeyboardSafeView>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	centered: {
		justifyContent: 'center',
		alignItems: 'center'
	},
	scrollContent: {
		padding: 16,
		paddingBottom: 100
	},
	card: {
		borderRadius: 16,
		borderWidth: 1,
		padding: 20,
		marginBottom: 16
	},
	sectionTitle: {
		fontSize: 18,
		fontWeight: '700',
		marginBottom: 20
	},
	inputGroup: {
		marginBottom: 16
	},
	label: {
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 8,
		marginLeft: 4
	},
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 12,
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 12
	},
	input: {
		flex: 1,
		fontSize: 16
	},
	saveBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 16,
		borderRadius: 12,
		marginTop: 8,
		gap: 8
	},
	saveBtnText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700'
	}
})
