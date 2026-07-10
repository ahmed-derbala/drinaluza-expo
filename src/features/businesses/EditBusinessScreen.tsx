import React, { useState, useEffect, useMemo } from 'react'
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Platform, useWindowDimensions } from 'react-native'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { getBusinessBySlug, updateBusiness } from '@/features/businesses/businesses.api'
import { useTheme } from '@/core/theme'
import { useUser } from '@/core/contexts/UserContext'
import ErrorState from '@/features/common/ErrorState'
import LoadingState from '@/features/common/LoadingState'
import { toast } from '@/features/common/Toast'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import KeyboardAvoidingWrapper from '@/core/keyboard-avoiding-wrapper/KeyboardAvoidingWrapper'
import { LinearGradient } from 'expo-linear-gradient'
import SmartImage from '@/core/SmartImageViewer'
import StateBadge from '@/features/common/StateBadge'
import MultilingualNameInput from '@/features/common/MultilingualNameInput'
import { SmartHeader } from '@/core/smart-header'
import { uploadFile } from '@/core/file'

const SectionCard = ({
	title,
	children,
	colors,
	styles,
	isEditing,
	onEdit,
	onSave,
	onCancel,
	headerRight
}: {
	title: string
	children: React.ReactNode
	colors: any
	styles: any
	isEditing?: boolean
	onEdit?: () => void
	onSave?: () => void
	onCancel?: () => void
	headerRight?: React.ReactNode
}) => (
	<View style={styles.card}>
		<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
			<Text style={[styles.cardHeader, { marginBottom: 0 }]}>{title}</Text>
			<View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
				{headerRight}
				{onEdit && !isEditing && (
					<TouchableOpacity onPress={onEdit} style={{ padding: 4 }} activeOpacity={0.7}>
						<Ionicons name="create-outline" size={20} color={colors.primary} />
					</TouchableOpacity>
				)}
				{isEditing && (
					<View style={{ flexDirection: 'row', gap: 12 }}>
						<TouchableOpacity onPress={onCancel} style={{ padding: 4 }} activeOpacity={0.7}>
							<Ionicons name="close-circle-outline" size={22} color={colors.error} />
						</TouchableOpacity>
						<TouchableOpacity onPress={onSave} style={{ padding: 4 }} activeOpacity={0.7}>
							<Ionicons name="checkmark-circle" size={22} color={colors.success} />
						</TouchableOpacity>
					</View>
				)}
			</View>
		</View>
		<View style={styles.cardContent}>{children}</View>
	</View>
)

const InfoRow = ({ label, value, icon, colors, styles, isRtl }: any) => (
	<View style={styles.infoRow}>
		<View style={styles.infoRowIconContainer}>
			<Ionicons name={icon} size={18} color={colors.textSecondary} />
		</View>
		<View style={styles.infoRowContent}>
			<Text style={styles.infoRowLabel}>{label}</Text>
			<Text style={[styles.infoRowValue, { color: colors.text }, isRtl && { textAlign: 'right' }]}>{value}</Text>
		</View>
	</View>
)

export default function EditBusinessScreen() {
	const { businessSlug } = useLocalSearchParams<{ businessSlug: string }>()
	const router = useRouter()
	const { colors } = useTheme()
	const { translate } = useUser()
	const { width } = useWindowDimensions()

	const [loading, setLoading] = useState(true)
	const [saving, setSaving] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const [focusedField, setFocusedField] = useState<string | null>(null)
	const [uploadingPhoto, setUploadingPhoto] = useState(false)

	const [editMode, setEditMode] = useState({
		names: false,
		about: false,
		contact: false,
		coordinates: false,
		address: false
	})

	// Form State
	const [nameEn, setNameEn] = useState('')
	const [nameTnLatn, setNameTnLatn] = useState('')
	const [nameTnArab, setNameTnArab] = useState('')
	const [description, setDescription] = useState('')

	const [street, setStreet] = useState('')
	const [city, setCity] = useState('')
	const [region, setRegion] = useState('')
	const [country, setCountry] = useState('')
	const [postalCode, setPostalCode] = useState('')

	const [phoneCountry, setPhoneCountry] = useState('216')
	const [phoneLocal, setPhoneLocal] = useState('')
	const [backupPhones, setBackupPhones] = useState<Array<{ countryCode: string; localNumber: string }>>([])
	const [whatsapp, setWhatsapp] = useState('')
	const [email, setEmail] = useState('')

	const [longitude, setLongitude] = useState('')
	const [latitude, setLatitude] = useState('')
	const [accuracy, setAccuracy] = useState('5.0')
	const [heading, setHeading] = useState('0')
	const [speed, setSpeed] = useState('0')
	const [altitude, setAltitude] = useState('35.2')
	const [sharingEnabled, setSharingEnabled] = useState(false)
	const [businessState, setBusinessState] = useState('active')
	const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null)

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
			setDescription(biz.description || '')

			setStreet(biz.address?.street || '')
			setCity(biz.address?.city || '')
			setRegion(biz.address?.region || '')
			setCountry(biz.address?.country || '')
			setPostalCode(biz.address?.postalCode || '')

			setPhoneCountry(biz.contact?.phone?.countryCode || '216')
			setPhoneLocal(biz.contact?.phone?.localNumber || '')
			setBackupPhones(
				biz.contact?.backupPhones?.map((bp: any) => ({
					countryCode: bp.countryCode || '216',
					localNumber: bp.localNumber || ''
				})) || []
			)
			setWhatsapp(biz.contact?.whatsapp || '')
			setEmail(biz.contact?.email || '')

			const locationObj = biz.location
			const coords = locationObj?.geo?.coordinates ?? (locationObj as any)?.coordinates
			if (coords && coords.length === 2) {
				setLongitude(coords[0].toString())
				setLatitude(coords[1].toString())
			} else {
				setLongitude('')
				setLatitude('')
			}
			setAccuracy(locationObj?.accuracy?.toString() || '5.0')
			setHeading(locationObj?.heading?.toString() || '0')
			setSpeed(locationObj?.speed?.toString() || '0')
			setAltitude(locationObj?.altitude?.toString() || '35.2')
			setSharingEnabled(locationObj?.sharingEnabled || false)
			setBusinessState(biz.state?.code || 'active')
			setThumbnailUrl(biz.media?.thumbnail?.url || null)
		} catch (err: any) {
			setError(err.message || 'Failed to load business details')
		} finally {
			setLoading(false)
		}
	}

	const handleGetCurrentLocation = async () => {
		try {
			const { status } = await Location.requestForegroundPermissionsAsync()
			if (status !== 'granted') {
				toast.show({ title: 'Error', message: 'Permission to access location was denied', color: colors.error })
				return
			}

			const location = await Location.getCurrentPositionAsync({})
			setLatitude(location.coords.latitude.toString())
			setLongitude(location.coords.longitude.toString())
			setAccuracy(location.coords.accuracy?.toString() || '5.0')
			setHeading(location.coords.heading?.toString() || '0')
			setSpeed(location.coords.speed?.toString() || '0')
			setAltitude(location.coords.altitude?.toString() || '0')
			toast.show({ title: 'Success', message: 'Location coordinates retrieved successfully', color: colors.success })
		} catch (error) {
			toast.show({ title: 'Error', message: 'Failed to get current location', color: colors.error })
		}
	}

	const handleUploadPhoto = async () => {
		try {
			let DocumentPicker: any
			try {
				DocumentPicker = require('expo-document-picker')
			} catch (e) {
				console.error('expo-document-picker not installed:', e)
				toast.show({ title: 'Error', message: 'expo-document-picker is not installed. Install it to enable photo upload.', color: colors.error })
				return
			}

			const result = await DocumentPicker.getDocumentAsync({
				type: ['image/*'],
				copyToCacheDirectory: true
			})

			if (result.canceled) {
				return
			}

			const file = result.assets[0]
			if (!file) {
				return
			}

			setUploadingPhoto(true)

			const uploadResult = await uploadFile({
				uri: file.uri,
				name: file.name,
				type: file.mimeType || 'image/jpeg',
				fileType: 'image',
				fileObj: file,
				onProgress: (progress) => {
					console.log(`Upload progress: ${progress}%`)
				}
			})

			if (uploadResult.success && uploadResult.file) {
				await updateBusiness(businessSlug!, {
					media: {
						thumbnail: uploadResult.file
					}
				})
				setThumbnailUrl(uploadResult.file.url)
				toast.show({ title: 'Success', message: 'Business photo updated successfully!', color: colors.success })
			} else if (uploadResult.success && uploadResult.fileUrl) {
				await updateBusiness(businessSlug!, {
					media: {
						thumbnail: {
							url: uploadResult.fileUrl
						}
					}
				})
				setThumbnailUrl(uploadResult.fileUrl)
				toast.show({ title: 'Success', message: 'Business photo updated successfully!', color: colors.success })
			} else {
				toast.show({ title: 'Error', message: uploadResult.error || 'Failed to upload photo', color: colors.error })
			}
		} catch (error: any) {
			console.error('Error uploading photo:', error)
			toast.show({ title: 'Error', message: error.message || 'Failed to upload photo', color: colors.error })
		} finally {
			setUploadingPhoto(false)
		}
	}

	const saveNames = async () => {
		if (!nameEn.trim()) {
			toast.show({ title: 'Error', message: 'English name is required', color: colors.error })
			return
		}
		try {
			setSaving(true)
			await updateBusiness(businessSlug!, {
				name: {
					en: nameEn.trim(),
					tn_latn: nameTnLatn.trim() || undefined,
					tn_arab: nameTnArab.trim() || undefined
				}
			})
			toast.show({ title: 'Success', message: translate('business_names_updated', 'Business names updated successfully'), color: colors.success })
			setEditMode((prev) => ({ ...prev, names: false }))
		} catch (err: any) {
			toast.show({ title: 'Error', message: err.message || 'Failed to update business names', color: colors.error })
		} finally {
			setSaving(false)
		}
	}

	const saveAbout = async () => {
		try {
			setSaving(true)
			await updateBusiness(businessSlug!, {
				description: description.trim() || undefined
			})
			toast.show({ title: 'Success', message: translate('business_about_updated', 'Business info updated successfully'), color: colors.success })
			setEditMode((prev) => ({ ...prev, about: false }))
		} catch (err: any) {
			toast.show({ title: 'Error', message: err.message || 'Failed to update business description', color: colors.error })
		} finally {
			setSaving(false)
		}
	}

	const saveContact = async () => {
		try {
			setSaving(true)
			await updateBusiness(businessSlug!, {
				contact: {
					phone: {
						countryCode: phoneCountry.trim(),
						localNumber: phoneLocal.trim(),
						fullNumber: `+${phoneCountry.trim()}${phoneLocal.trim()}`
					},
					backupPhones: backupPhones
						.filter((bp) => bp.localNumber.trim() !== '')
						.map((bp) => ({
							countryCode: bp.countryCode.trim(),
							localNumber: bp.localNumber.trim(),
							fullNumber: `+${bp.countryCode.trim()}${bp.localNumber.trim()}`
						})),
					whatsapp: whatsapp.trim() || undefined,
					email: email.trim() || undefined
				}
			})
			toast.show({ title: 'Success', message: translate('business_contact_updated', 'Business contact updated successfully'), color: colors.success })
			setEditMode((prev) => ({ ...prev, contact: false }))
		} catch (err: any) {
			toast.show({ title: 'Error', message: err.message || 'Failed to update business contact', color: colors.error })
		} finally {
			setSaving(false)
		}
	}

	const saveCoordinates = async () => {
		try {
			setSaving(true)
			const updateData: any = {}
			if (longitude.trim() && latitude.trim()) {
				updateData.location = {
					geo: {
						type: 'Point',
						coordinates: [parseFloat(longitude.trim()), parseFloat(latitude.trim())]
					},
					accuracy: parseFloat(accuracy.trim()) || 5.0,
					heading: parseFloat(heading.trim()) || 0,
					speed: parseFloat(speed.trim()) || 0,
					altitude: parseFloat(altitude.trim()) || 35.2,
					sharingEnabled
				}
			}
			await updateBusiness(businessSlug!, updateData)
			toast.show({ title: 'Success', message: translate('business_coordinates_updated', 'Business coordinates updated successfully'), color: colors.success })
			setEditMode((prev) => ({ ...prev, coordinates: false }))
		} catch (err: any) {
			toast.show({ title: 'Error', message: err.message || 'Failed to update coordinates', color: colors.error })
		} finally {
			setSaving(false)
		}
	}

	const saveAddress = async () => {
		try {
			setSaving(true)
			await updateBusiness(businessSlug!, {
				address: {
					street: street.trim(),
					city: city.trim(),
					region: region.trim(),
					country: country.trim(),
					postalCode: postalCode.trim()
				}
			})
			toast.show({ title: 'Success', message: translate('business_address_updated', 'Business address updated successfully'), color: colors.success })
			setEditMode((prev) => ({ ...prev, address: false }))
		} catch (err: any) {
			toast.show({ title: 'Error', message: err.message || 'Failed to update address', color: colors.error })
		} finally {
			setSaving(false)
		}
	}

	const cancelEdit = (sectionKey: keyof typeof editMode) => {
		setEditMode((prev) => ({ ...prev, [sectionKey]: false }))
		loadBusiness()
	}

	const styles = useMemo(() => createStyles(colors, width), [colors, width])

	if (loading) {
		return (
			<View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
				<LoadingState />
			</View>
		)
	}

	if (error) {
		return (
			<View style={[styles.container, { backgroundColor: colors.background }]}>
				<Stack.Screen options={{ headerShown: false }} />
				<SmartHeader title={translate('edit_business', 'Edit Business')} fallbackRoute="/dashboard" />
				<ErrorState title="Error" message={error} onRetry={loadBusiness} />
			</View>
		)
	}

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<Stack.Screen options={{ headerShown: false }} />
			<SmartHeader title={translate('edit_business', 'Edit Business')} fallbackRoute="/dashboard" />

			<KeyboardAvoidingWrapper style={styles.form} contentContainerStyle={styles.formContent} scrollViewProps={{ keyboardShouldPersistTaps: 'handled' }}>
				{/* Top Hero Banner */}
				<View style={styles.heroBanner}>
					<LinearGradient colors={['#0EA5E930', '#00000000']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
					<View style={styles.heroContent}>
						<TouchableOpacity style={styles.avatarWrapper} onPress={handleUploadPhoto} disabled={uploadingPhoto} activeOpacity={0.8}>
							<SmartImage source={thumbnailUrl} style={styles.avatarImage} entityType="business" />
							<View style={styles.cameraIconBadge}>{uploadingPhoto ? <ActivityIndicator size="small" color="#ffffff" /> : <Ionicons name="camera" size={12} color="#ffffff" />}</View>
						</TouchableOpacity>
						<View style={styles.heroInfoText}>
							<Text style={styles.heroTitle}>{nameEn || translate('business_name', 'Business Name')}</Text>
							<View style={styles.heroBadgeRow}>
								<StateBadge stateCode={businessState} />
							</View>
						</View>
					</View>
				</View>

				{saving && (
					<View style={styles.savingOverlay}>
						<ActivityIndicator size="small" color={colors.primary} />
						<Text style={{ color: colors.textSecondary, fontSize: 13, fontWeight: '600' }}>{translate('saving', 'Saving...')}</Text>
					</View>
				)}

				<View style={styles.tabContent}>
					{/* Translations Card */}
					<SectionCard
						title={translate('business_names', 'Business Names')}
						colors={colors}
						styles={styles}
						isEditing={editMode.names}
						onEdit={() => setEditMode((prev) => ({ ...prev, names: true }))}
						onSave={saveNames}
						onCancel={() => cancelEdit('names')}
					>
						{editMode.names ? (
							<MultilingualNameInput nameEn={nameEn} setNameEn={setNameEn} nameTnLatn={nameTnLatn} setNameTnLatn={setNameTnLatn} nameTnArab={nameTnArab} setNameTnArab={setNameTnArab} />
						) : (
							<View style={{ gap: 12 }}>
								<InfoRow label={translate('english_name', 'English Name')} value={nameEn} icon="text" colors={colors} styles={styles} />
								<InfoRow label={translate('tunisian_latin_name', 'Tunisian Name (Latin)')} value={nameTnLatn || '—'} icon="text-outline" colors={colors} styles={styles} />
								<InfoRow label={translate('tunisian_arabic_name', 'Tunisian Name (Arabic)')} value={nameTnArab || '—'} icon="language" colors={colors} styles={styles} isRtl />
							</View>
						)}
					</SectionCard>

					{/* Description Card */}
					<SectionCard
						title={translate('about_business', 'About Business')}
						colors={colors}
						styles={styles}
						isEditing={editMode.about}
						onEdit={() => setEditMode((prev) => ({ ...prev, about: true }))}
						onSave={saveAbout}
						onCancel={() => cancelEdit('about')}
					>
						{editMode.about ? (
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Description</Text>
								<View style={[styles.inputWrapper, { minHeight: 90, alignItems: 'flex-start', paddingVertical: 12 }, focusedField === 'description' && styles.inputWrapperFocused]}>
									<Ionicons name="document-text" size={18} color={focusedField === 'description' ? colors.primary : colors.textTertiary} style={[styles.inputIcon, { marginTop: 2 }]} />
									<TextInput
										style={[styles.textInput, { minHeight: 70, textAlignVertical: 'top' }]}
										value={description}
										onChangeText={setDescription}
										placeholder="Describe your business, services, products, or working hours..."
										placeholderTextColor={colors.textTertiary}
										multiline={true}
										onFocus={() => setFocusedField('description')}
										onBlur={() => setFocusedField(null)}
									/>
								</View>
							</View>
						) : (
							<Text style={[styles.descriptionText, { color: description ? colors.text : colors.textTertiary }]}>{description || translate('no_description', 'No description provided yet.')}</Text>
						)}
					</SectionCard>

					{/* Contact Info Card */}
					<SectionCard
						title={translate('contact', 'Contact Info')}
						colors={colors}
						styles={styles}
						isEditing={editMode.contact}
						onEdit={() => setEditMode((prev) => ({ ...prev, contact: true }))}
						onSave={saveContact}
						onCancel={() => cancelEdit('contact')}
					>
						{editMode.contact ? (
							<View style={{ gap: 12 }}>
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Phone Number</Text>
									<View style={{ flexDirection: 'row', gap: 10 }}>
										<View style={[styles.inputWrapper, { flex: 0.3, paddingHorizontal: 10 }, focusedField === 'phoneCountry' && styles.inputWrapperFocused]}>
											<Text style={{ color: colors.textSecondary }}>+</Text>
											<TextInput
												style={styles.textInput}
												value={phoneCountry}
												onChangeText={setPhoneCountry}
												keyboardType="phone-pad"
												placeholder="216"
												placeholderTextColor={colors.textTertiary}
												onFocus={() => setFocusedField('phoneCountry')}
												onBlur={() => setFocusedField(null)}
											/>
										</View>
										<View style={[styles.inputWrapper, { flex: 0.7 }, focusedField === 'phoneLocal' && styles.inputWrapperFocused]}>
											<Ionicons name="call" size={18} color={focusedField === 'phoneLocal' ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
											<TextInput
												style={styles.textInput}
												value={phoneLocal}
												onChangeText={setPhoneLocal}
												keyboardType="phone-pad"
												placeholder="99112619"
												placeholderTextColor={colors.textTertiary}
												onFocus={() => setFocusedField('phoneLocal')}
												onBlur={() => setFocusedField(null)}
											/>
										</View>
									</View>
								</View>

								{/* Backup Phones Section */}
								<View style={{ marginTop: 8 }}>
									<Text style={styles.inputLabel}>Backup Phones</Text>
									{backupPhones.map((bp, index) => (
										<View key={`backup-${index}`} style={{ flexDirection: 'row', gap: 10, marginBottom: 8, alignItems: 'center' }}>
											<View style={[styles.inputWrapper, { flex: 0.3, paddingHorizontal: 10 }, focusedField === `bp-country-${index}` && styles.inputWrapperFocused]}>
												<Text style={{ color: colors.textSecondary }}>+</Text>
												<TextInput
													style={styles.textInput}
													value={bp.countryCode}
													onChangeText={(text) => {
														const updated = [...backupPhones]
														updated[index].countryCode = text
														setBackupPhones(updated)
													}}
													keyboardType="phone-pad"
													placeholder="216"
													placeholderTextColor={colors.textTertiary}
													onFocus={() => setFocusedField(`bp-country-${index}`)}
													onBlur={() => setFocusedField(null)}
												/>
											</View>
											<View style={[styles.inputWrapper, { flex: 0.6 }, focusedField === `bp-local-${index}` && styles.inputWrapperFocused]}>
												<Ionicons name="call" size={18} color={focusedField === `bp-local-${index}` ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
												<TextInput
													style={styles.textInput}
													value={bp.localNumber}
													onChangeText={(text) => {
														const updated = [...backupPhones]
														updated[index].localNumber = text
														setBackupPhones(updated)
													}}
													keyboardType="phone-pad"
													placeholder="Backup number"
													placeholderTextColor={colors.textTertiary}
													onFocus={() => setFocusedField(`bp-local-${index}`)}
													onBlur={() => setFocusedField(null)}
												/>
											</View>
											<TouchableOpacity
												style={{ flex: 0.1, alignItems: 'center', justifyContent: 'center' }}
												onPress={() => {
													setBackupPhones(backupPhones.filter((_, idx) => idx !== index))
												}}
											>
												<Ionicons name="trash-outline" size={20} color={colors.error} />
											</TouchableOpacity>
										</View>
									))}
									<TouchableOpacity
										style={[styles.addBackupBtn, { borderColor: colors.primary }]}
										onPress={() => {
											setBackupPhones([...backupPhones, { countryCode: '216', localNumber: '' }])
										}}
									>
										<Ionicons name="add-circle-outline" size={18} color={colors.primary} />
										<Text style={[styles.addBackupText, { color: colors.primary }]}>Add Backup Phone</Text>
									</TouchableOpacity>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>WhatsApp</Text>
									<View style={[styles.inputWrapper, focusedField === 'whatsapp' && styles.inputWrapperFocused]}>
										<Ionicons name="logo-whatsapp" size={18} color={focusedField === 'whatsapp' ? '#25D366' : colors.textTertiary} style={styles.inputIcon} />
										<TextInput
											style={styles.textInput}
											value={whatsapp}
											onChangeText={setWhatsapp}
											keyboardType="phone-pad"
											placeholder="+21699112619"
											placeholderTextColor={colors.textTertiary}
											onFocus={() => setFocusedField('whatsapp')}
											onBlur={() => setFocusedField(null)}
										/>
									</View>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Email</Text>
									<View style={[styles.inputWrapper, focusedField === 'email' && styles.inputWrapperFocused]}>
										<Ionicons name="mail" size={18} color={focusedField === 'email' ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
										<TextInput
											style={styles.textInput}
											value={email}
											onChangeText={setEmail}
											keyboardType="email-address"
											autoCapitalize="none"
											placeholder="drinaluza@gmail.com"
											placeholderTextColor={colors.textTertiary}
											onFocus={() => setFocusedField('email')}
											onBlur={() => setFocusedField(null)}
										/>
									</View>
								</View>
							</View>
						) : (
							<View style={{ gap: 12 }}>
								<InfoRow label={translate('phone_number', 'Phone Number')} value={`+${phoneCountry} ${phoneLocal}`.trim()} icon="call" colors={colors} styles={styles} />
								{backupPhones.map((bp, index) => (
									<InfoRow
										key={`backup-${index}`}
										label={`${translate('backup_phone', 'Backup Phone')} ${index + 1}`}
										value={`+${bp.countryCode} ${bp.localNumber}`.trim()}
										icon="call-outline"
										colors={colors}
										styles={styles}
									/>
								))}
								<InfoRow label="WhatsApp" value={whatsapp || '—'} icon="logo-whatsapp" colors={colors} styles={styles} />
								<InfoRow label="Email" value={email || '—'} icon="mail" colors={colors} styles={styles} />
							</View>
						)}
					</SectionCard>

					{/* Coordinates Card */}
					<SectionCard
						title={translate('coordinates', 'Coordinates')}
						colors={colors}
						styles={styles}
						isEditing={editMode.coordinates}
						onEdit={() => setEditMode((prev) => ({ ...prev, coordinates: true }))}
						onSave={saveCoordinates}
						onCancel={() => cancelEdit('coordinates')}
						headerRight={
							editMode.coordinates && (
								<TouchableOpacity style={styles.getLocationChip} onPress={handleGetCurrentLocation} activeOpacity={0.8}>
									<Ionicons name="navigate" size={12} color={colors.primary} />
									<Text style={styles.getLocationText}>{translate('get_current', 'GPS')}</Text>
								</TouchableOpacity>
							)
						}
					>
						{editMode.coordinates ? (
							<View style={{ gap: 12 }}>
								<View style={{ flexDirection: 'row', gap: 12 }}>
									<View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
										<Text style={styles.inputLabel}>Latitude</Text>
										<View style={[styles.inputWrapper, focusedField === 'latitude' && styles.inputWrapperFocused]}>
											<TextInput
												style={styles.textInput}
												value={latitude}
												onChangeText={setLatitude}
												keyboardType="numeric"
												placeholder="e.g. 36.80"
												placeholderTextColor={colors.textTertiary}
												onFocus={() => setFocusedField('latitude')}
												onBlur={() => setFocusedField(null)}
											/>
										</View>
									</View>
									<View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
										<Text style={styles.inputLabel}>Longitude</Text>
										<View style={[styles.inputWrapper, focusedField === 'longitude' && styles.inputWrapperFocused]}>
											<TextInput
												style={styles.textInput}
												value={longitude}
												onChangeText={setLongitude}
												keyboardType="numeric"
												placeholder="e.g. 10.18"
												placeholderTextColor={colors.textTertiary}
												onFocus={() => setFocusedField('longitude')}
												onBlur={() => setFocusedField(null)}
											/>
										</View>
									</View>
								</View>

								<View style={{ flexDirection: 'row', gap: 12 }}>
									<View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
										<Text style={styles.inputLabel}>Accuracy (m)</Text>
										<View style={[styles.inputWrapper, focusedField === 'accuracy' && styles.inputWrapperFocused]}>
											<TextInput
												style={styles.textInput}
												value={accuracy}
												onChangeText={setAccuracy}
												keyboardType="numeric"
												placeholder="e.g. 5.0"
												placeholderTextColor={colors.textTertiary}
												onFocus={() => setFocusedField('accuracy')}
												onBlur={() => setFocusedField(null)}
											/>
										</View>
									</View>
									<View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
										<Text style={styles.inputLabel}>Altitude (m)</Text>
										<View style={[styles.inputWrapper, focusedField === 'altitude' && styles.inputWrapperFocused]}>
											<TextInput
												style={styles.textInput}
												value={altitude}
												onChangeText={setAltitude}
												keyboardType="numeric"
												placeholder="e.g. 35.2"
												placeholderTextColor={colors.textTertiary}
												onFocus={() => setFocusedField('altitude')}
												onBlur={() => setFocusedField(null)}
											/>
										</View>
									</View>
								</View>

								<View style={{ flexDirection: 'row', gap: 12 }}>
									<View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
										<Text style={styles.inputLabel}>Heading (°)</Text>
										<View style={[styles.inputWrapper, focusedField === 'heading' && styles.inputWrapperFocused]}>
											<TextInput
												style={styles.textInput}
												value={heading}
												onChangeText={setHeading}
												keyboardType="numeric"
												placeholder="e.g. 0"
												placeholderTextColor={colors.textTertiary}
												onFocus={() => setFocusedField('heading')}
												onBlur={() => setFocusedField(null)}
											/>
										</View>
									</View>
									<View style={[styles.inputGroup, { flex: 1, marginBottom: 0 }]}>
										<Text style={styles.inputLabel}>Speed (m/s)</Text>
										<View style={[styles.inputWrapper, focusedField === 'speed' && styles.inputWrapperFocused]}>
											<TextInput
												style={styles.textInput}
												value={speed}
												onChangeText={setSpeed}
												keyboardType="numeric"
												placeholder="e.g. 0"
												placeholderTextColor={colors.textTertiary}
												onFocus={() => setFocusedField('speed')}
												onBlur={() => setFocusedField(null)}
											/>
										</View>
									</View>
								</View>

								<TouchableOpacity style={[styles.sharingCard, sharingEnabled && styles.sharingCardActive]} onPress={() => setSharingEnabled(!sharingEnabled)} activeOpacity={0.8}>
									<View style={[styles.checkbox, sharingEnabled && styles.checkboxActive]}>{sharingEnabled && <Ionicons name="checkmark" size={16} color="#ffffff" />}</View>
									<View style={{ flex: 1 }}>
										<Text style={styles.sharingTitle}>{translate('share_location', 'Share location with customers')}</Text>
										<Text style={styles.sharingDesc}>{translate('share_location_desc', 'Show store coordinates on map details')}</Text>
									</View>
								</TouchableOpacity>
							</View>
						) : (
							<View style={{ gap: 12 }}>
								<InfoRow label="Latitude" value={latitude || '—'} icon="compass" colors={colors} styles={styles} />
								<InfoRow label="Longitude" value={longitude || '—'} icon="compass-outline" colors={colors} styles={styles} />
								<InfoRow label="Accuracy" value={accuracy ? `${accuracy} m` : '—'} icon="locate-outline" colors={colors} styles={styles} />
								<InfoRow label="Altitude" value={altitude ? `${altitude} m` : '—'} icon="trending-up-outline" colors={colors} styles={styles} />
								<InfoRow label="Heading" value={heading ? `${heading}°` : '—'} icon="compass-outline" colors={colors} styles={styles} />
								<InfoRow label="Speed" value={speed ? `${speed} m/s` : '—'} icon="speedometer-outline" colors={colors} styles={styles} />
								<InfoRow
									label={translate('location_sharing', 'Location Sharing')}
									value={sharingEnabled ? translate('enabled', 'Enabled') : translate('disabled', 'Disabled')}
									icon={sharingEnabled ? 'eye' : 'eye-off'}
									colors={colors}
									styles={styles}
								/>
							</View>
						)}
					</SectionCard>

					{/* Address Card */}
					<SectionCard
						title={translate('address', 'Address')}
						colors={colors}
						styles={styles}
						isEditing={editMode.address}
						onEdit={() => setEditMode((prev) => ({ ...prev, address: true }))}
						onSave={saveAddress}
						onCancel={() => cancelEdit('address')}
					>
						{editMode.address ? (
							<View style={{ gap: 12 }}>
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Street</Text>
									<View style={[styles.inputWrapper, focusedField === 'street' && styles.inputWrapperFocused]}>
										<Ionicons name="location-outline" size={18} color={focusedField === 'street' ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
										<TextInput
											style={styles.textInput}
											value={street}
											onChangeText={setStreet}
											placeholder="Street Address"
											placeholderTextColor={colors.textTertiary}
											onFocus={() => setFocusedField('street')}
											onBlur={() => setFocusedField(null)}
										/>
									</View>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>City</Text>
									<View style={[styles.inputWrapper, focusedField === 'city' && styles.inputWrapperFocused]}>
										<Ionicons name="business-outline" size={18} color={focusedField === 'city' ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
										<TextInput
											style={styles.textInput}
											value={city}
											onChangeText={setCity}
											placeholder="City"
											placeholderTextColor={colors.textTertiary}
											onFocus={() => setFocusedField('city')}
											onBlur={() => setFocusedField(null)}
										/>
									</View>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Region</Text>
									<View style={[styles.inputWrapper, focusedField === 'region' && styles.inputWrapperFocused]}>
										<Ionicons name="map-outline" size={18} color={focusedField === 'region' ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
										<TextInput
											style={styles.textInput}
											value={region}
											onChangeText={setRegion}
											placeholder="Region"
											placeholderTextColor={colors.textTertiary}
											onFocus={() => setFocusedField('region')}
											onBlur={() => setFocusedField(null)}
										/>
									</View>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Country</Text>
									<View style={[styles.inputWrapper, focusedField === 'country' && styles.inputWrapperFocused]}>
										<Ionicons name="globe-outline" size={18} color={focusedField === 'country' ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
										<TextInput
											style={styles.textInput}
											value={country}
											onChangeText={setCountry}
											placeholder="Country"
											placeholderTextColor={colors.textTertiary}
											onFocus={() => setFocusedField('country')}
											onBlur={() => setFocusedField(null)}
										/>
									</View>
								</View>

								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Postal Code</Text>
									<View style={[styles.inputWrapper, focusedField === 'postalCode' && styles.inputWrapperFocused]}>
										<Ionicons name="mail-unread-outline" size={18} color={focusedField === 'postalCode' ? colors.primary : colors.textTertiary} style={styles.inputIcon} />
										<TextInput
											style={styles.textInput}
											value={postalCode}
											onChangeText={setPostalCode}
											placeholder="Postal Code"
											placeholderTextColor={colors.textTertiary}
											onFocus={() => setFocusedField('postalCode')}
											onBlur={() => setFocusedField(null)}
										/>
									</View>
								</View>
							</View>
						) : (
							<View style={{ gap: 12 }}>
								<InfoRow label={translate('street', 'Street')} value={street || '—'} icon="location" colors={colors} styles={styles} />
								<InfoRow label={translate('city', 'City')} value={city || '—'} icon="business" colors={colors} styles={styles} />
								<InfoRow label={translate('region', 'Region')} value={region || '—'} icon="map" colors={colors} styles={styles} />
								<InfoRow label={translate('country', 'Country')} value={country || '—'} icon="globe" colors={colors} styles={styles} />
								<InfoRow label={translate('postal_code', 'Postal Code')} value={postalCode || '—'} icon="mail-unread" colors={colors} styles={styles} />
							</View>
						)}
					</SectionCard>
				</View>
			</KeyboardAvoidingWrapper>
		</View>
	)
}

const createStyles = (colors: any, width: number) =>
	StyleSheet.create({
		container: {
			flex: 1
		},
		centered: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center'
		},
		form: {
			flex: 1
		},
		formContent: {
			padding: 16,
			paddingBottom: 80
		},
		heroBanner: {
			height: 160,
			marginHorizontal: -16,
			marginTop: -16,
			marginBottom: 20,
			paddingHorizontal: 24,
			justifyContent: 'flex-end',
			paddingBottom: 24,
			borderBottomWidth: 1.5,
			borderColor: colors.borderLight,
			backgroundColor: colors.surface
		},
		heroContent: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 16
		},
		avatarWrapper: {
			width: 80,
			height: 80,
			borderRadius: 22,
			borderWidth: 2,
			borderColor: colors.primary,
			position: 'relative',
			backgroundColor: colors.background,
			overflow: 'visible'
		},
		avatarImage: {
			width: '100%',
			height: '100%',
			borderRadius: 20
		},
		cameraIconBadge: {
			position: 'absolute',
			bottom: -4,
			right: -4,
			width: 24,
			height: 24,
			borderRadius: 12,
			backgroundColor: colors.primary,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 2,
			borderColor: colors.surface
		},
		heroInfoText: {
			flex: 1,
			justifyContent: 'center'
		},
		heroTitle: {
			fontSize: 20,
			fontWeight: '800',
			color: colors.text,
			letterSpacing: -0.5,
			marginBottom: 6
		},
		heroBadgeRow: {
			alignSelf: 'flex-start'
		},
		tabContent: {
			gap: 16
		},
		addBackupBtn: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 8,
			paddingVertical: 12,
			borderWidth: 1.5,
			borderColor: colors.primary,
			borderStyle: 'dashed',
			borderRadius: 16,
			marginTop: 8,
			backgroundColor: 'transparent'
		},
		addBackupText: {
			fontSize: 13,
			fontWeight: '700'
		},
		card: {
			backgroundColor: colors.surface,
			borderRadius: 24,
			borderWidth: 1.5,
			borderColor: colors.borderLight,
			padding: 20,
			...Platform.select({
				ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
				android: { elevation: 2 }
			})
		},
		cardHeader: {
			fontSize: 16,
			fontWeight: '800',
			color: colors.text,
			marginBottom: 0,
			letterSpacing: -0.2
		},
		cardContent: {
			marginTop: 4
		},
		inputGroup: {
			marginBottom: 16
		},
		inputLabel: {
			fontSize: 12,
			fontWeight: '700',
			color: colors.textSecondary,
			marginBottom: 8,
			marginLeft: 4,
			textTransform: 'uppercase',
			letterSpacing: 0.5
		},
		required: {
			color: colors.error
		},
		inputWrapper: {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: colors.background,
			borderWidth: 1.5,
			borderColor: colors.borderLight,
			borderRadius: 16,
			paddingHorizontal: 16,
			paddingVertical: 12,
			minHeight: 52
		},
		inputWrapperFocused: {
			borderColor: colors.primary,
			backgroundColor: colors.background
		},
		inputIcon: {
			marginRight: 12
		},
		textInput: {
			flex: 1,
			fontSize: 15,
			color: colors.text,
			fontWeight: '500',
			padding: 0
		},
		locationHeaderRow: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginBottom: 20
		},
		getLocationChip: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6,
			paddingHorizontal: 10,
			paddingVertical: 6,
			backgroundColor: colors.primaryContainer,
			borderRadius: 10,
			borderWidth: 1,
			borderColor: `${colors.primary}30`
		},
		getLocationText: {
			fontSize: 11,
			fontWeight: '700',
			color: colors.primary
		},
		sharingCard: {
			flexDirection: 'row',
			alignItems: 'center',
			backgroundColor: colors.background,
			borderColor: colors.borderLight,
			borderWidth: 1.5,
			borderRadius: 16,
			padding: 16,
			gap: 12,
			marginTop: 12
		},
		sharingCardActive: {
			borderColor: colors.primary,
			backgroundColor: colors.primaryContainer
		},
		checkbox: {
			width: 24,
			height: 24,
			borderRadius: 8,
			borderWidth: 2,
			borderColor: colors.textTertiary,
			alignItems: 'center',
			justifyContent: 'center',
			backgroundColor: 'transparent'
		},
		checkboxActive: {
			backgroundColor: colors.primary,
			borderColor: colors.primary
		},
		sharingTitle: {
			fontSize: 14,
			fontWeight: '700',
			color: colors.text,
			letterSpacing: -0.1
		},
		sharingDesc: {
			fontSize: 11,
			fontWeight: '500',
			color: colors.textSecondary,
			marginTop: 2
		},
		infoRow: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingVertical: 10,
			gap: 14,
			borderBottomWidth: 1,
			borderBottomColor: `${colors.borderLight}40`
		},
		infoRowIconContainer: {
			width: 38,
			height: 38,
			borderRadius: 12,
			backgroundColor: `${colors.textSecondary}12`,
			justifyContent: 'center',
			alignItems: 'center'
		},
		infoRowContent: {
			flex: 1
		},
		infoRowLabel: {
			fontSize: 11,
			fontWeight: '700',
			color: colors.textSecondary,
			textTransform: 'uppercase',
			letterSpacing: 0.5,
			marginBottom: 2
		},
		infoRowValue: {
			fontSize: 15,
			fontWeight: '600'
		},
		descriptionText: {
			fontSize: 15,
			lineHeight: 22,
			fontWeight: '500'
		},
		savingOverlay: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8,
			paddingVertical: 10,
			paddingHorizontal: 16,
			borderRadius: 12,
			backgroundColor: `${colors.primary}12`,
			marginBottom: 16,
			alignSelf: 'center'
		}
	})
