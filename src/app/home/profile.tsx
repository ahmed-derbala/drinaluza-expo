import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, Platform, useWindowDimensions, ActivityIndicator, Linking } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { checkAuth, getMyProfile, updateMyProfile, signOut, switchUser } from '../../core/auth/auth.api'
import { useTheme } from '../../contexts/ThemeContext'
import ScreenHeader from '../../components/common/ScreenHeader'
import ErrorState from '../../components/common/ErrorState'
import { showPopup, showAlert, showConfirm } from '../../utils/popup'
import { requestBusiness } from '../../components/business/business.api'
import { parseError, logError } from '../../utils/errorHandler'

import { UserData } from '../../components/profile/profile.interface'

const LANGUAGES = [
	{ code: 'en', label: 'English', flag: '🇺🇸' },
	{ code: 'tn_latn', label: 'Tunisian (Latin)', flag: '🇹🇳', icon: 'A' },
	{ code: 'tn_arab', label: 'Tunisian (Arabic)', flag: '🇹🇳', icon: 'ع' }
]

const CURRENCIES = [
	{ code: 'tnd', label: 'Tunisian Dinar', symbol: 'DT' },
	{ code: 'eur', label: 'Euro', symbol: '€' },
	{ code: 'usd', label: 'US Dollar', symbol: '$' }
]

const SOCIAL_PLATFORMS = [
	{ id: 'facebook', label: 'Facebook', icon: 'logo-facebook', color: '#1877F2', prefix: 'facebook.com/' },
	{ id: 'instagram', label: 'Instagram', icon: 'logo-instagram', color: '#E4405F', prefix: 'instagram.com/' },
	{ id: 'whatsapp', label: 'WhatsApp', icon: 'logo-whatsapp', color: '#25D366', prefix: '+' }
]

// Components moved outside to prevent re-creation on render
const Section = ({
	title,
	children,
	styles,
	isEditing,
	onEdit,
	onSave,
	onCancel
}: {
	title: string
	children: React.ReactNode
	styles: any
	isEditing?: boolean
	onEdit?: () => void
	onSave?: () => void
	onCancel?: () => void
}) => (
	<View style={styles.section}>
		<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
			<Text style={[styles.sectionTitle, { marginBottom: 0 }]}>{title}</Text>
			{onEdit && !isEditing && (
				<TouchableOpacity onPress={onEdit} style={{ padding: 4 }}>
					<Ionicons name="create-outline" size={20} color={styles.sectionTitle.color} />
				</TouchableOpacity>
			)}
			{isEditing && (
				<View style={{ flexDirection: 'row', gap: 12 }}>
					<TouchableOpacity onPress={onCancel} style={{ padding: 4 }}>
						<Ionicons name="close-circle-outline" size={22} color="#EF4444" />
					</TouchableOpacity>
					<TouchableOpacity onPress={onSave} style={{ padding: 4 }}>
						<Ionicons name="checkmark-circle" size={22} color="#10B981" />
					</TouchableOpacity>
				</View>
			)}
		</View>
		<View style={styles.sectionContent}>{children}</View>
	</View>
)

const InfoItem = ({
	label,
	value,
	icon,
	styles,
	iconColor,
	onPress,
	onLongPress,
	onCopy
}: {
	label: string
	value: string | React.ReactNode
	icon: any
	styles: any
	iconColor: string
	onPress?: () => void
	onLongPress?: () => void
	onCopy?: () => void
}) => {
	const Content = (
		<View style={styles.infoItem}>
			<View style={styles.infoIconContainer}>
				<Ionicons name={icon} size={20} color={iconColor} />
			</View>
			<View style={styles.infoContent}>
				<Text style={styles.infoLabel}>{label}</Text>
				{typeof value === 'string' ? <Text style={styles.infoValue}>{value}</Text> : value}
			</View>
			{onCopy && (
				<TouchableOpacity onPress={onCopy} style={{ padding: 8 }}>
					<Ionicons name="copy-outline" size={18} color="#9CA3AF" />
				</TouchableOpacity>
			)}
		</View>
	)

	if (onPress || onLongPress) {
		return (
			<TouchableOpacity onPress={onPress} onLongPress={onLongPress} delayLongPress={500}>
				{Content}
			</TouchableOpacity>
		)
	}

	return Content
}

export default function ProfileScreen() {
	const router = useRouter()
	const { colors, isDark } = useTheme()
	const { width } = useWindowDimensions()
	const maxWidth = 800
	const isWideScreen = width > maxWidth
	const styles = createStyles(colors, isDark, isWideScreen, width)

	const [loading, setLoading] = useState(true)
	const [userData, setUserData] = useState<UserData | null>(null)
	const [editMode, setEditMode] = useState({
		basic: false,
		address: false,
		social: false,
		settings: false,
		phone: false,
		photo: false
	})
	const [showDatePicker, setShowDatePicker] = useState(false)
	const [imageError, setImageError] = useState(false)
	const [error, setError] = useState<{ title: string; message: string; type: string } | null>(null)

	const loadProfile = async () => {
		try {
			setLoading(true)
			setError(null)
			const isAuthenticated = await checkAuth()
			if (!isAuthenticated) {
				router.replace('/auth')
				return
			}

			const response = await getMyProfile()
			if (response && response.data) {
				// Parse dates
				const data = response.data
				if (data.basicInfos?.birthDate) {
					data.basicInfos.birthDate = new Date(data.basicInfos.birthDate)
				}
				setUserData(data)
				setImageError(false)
			} else {
				throw new Error('No profile data received')
			}
		} catch (err: any) {
			logError(err, 'loadProfile')
			const errorInfo = parseError(err)
			setError({
				title: errorInfo.title,
				message: errorInfo.message,
				type: errorInfo.type
			})
			if (userData) {
				// Only show alert if we already have data (e.g. refresh failed)
				showAlert(errorInfo.title, errorInfo.message)
			}
		} finally {
			setLoading(false)
		}
	}

	useFocusEffect(
		useCallback(() => {
			loadProfile()
		}, [])
	)

	const saveUserData = async (sectionKey?: keyof typeof editMode) => {
		if (!userData) return

		try {
			// Prepare payload
			const payload = {
				name: userData.name,
				phone: userData.phone,
				backupPhones: userData.backupPhones,
				basicInfos: userData.basicInfos,
				address: userData.address,
				settings: userData.settings,
				socialMedia: userData.socialMedia,
				media: userData.media
			}

			await updateMyProfile(payload)
			if (sectionKey) {
				setEditMode((prev) => ({ ...prev, [sectionKey]: false }))
			}
			showAlert('Success', 'Profile updated successfully!')
			loadProfile() // Reload to ensure consistency
		} catch (error: any) {
			console.error('Error saving user data:', error)
			const errorMessage = error.response?.data?.message || 'Failed to save profile changes'
			showAlert('Error', errorMessage)
		}
	}

	const toggleEdit = (section: keyof typeof editMode, value: boolean) => {
		if (!value) {
			// If cancelling, reload to revert
			loadProfile()
		}
		setEditMode((prev) => ({ ...prev, [section]: value }))
	}

	const handlePastePhoto = async () => {
		const text = await Clipboard.getStringAsync()
		if (text) {
			updatePhotoUrl(text)
		}
	}

	const updatePhotoUrl = (url: string) => {
		if (!userData) return
		setUserData((prev) => {
			if (!prev) return null
			return {
				...prev,
				media: {
					...prev.media,
					thumbnail: {
						...(prev.media?.thumbnail || {}),
						url
					}
				}
			}
		})
		setImageError(false)
	}

	const updateField = (field: string, value: any, section?: keyof UserData) => {
		if (!userData) return

		setUserData((prev) => {
			if (!prev) return null

			if (section) {
				return {
					...prev,
					[section]: {
						...(prev[section] as any),
						[field]: value
					}
				}
			}
			return { ...prev, [field]: value }
		})
	}

	const updatePhone = (type: 'primary' | 'backup', field: 'countryCode' | 'shortNumber', value: string, index?: number) => {
		if (!userData) return

		let cleanValue = value
		if (field === 'shortNumber') {
			cleanValue = value.replace(/\D/g, '')
		} else {
			// Enforce one + at start and only digits after
			const digitsAndPlus = value.replace(/[^\d+]/g, '')
			const plusIndex = digitsAndPlus.indexOf('+')
			if (plusIndex !== -1) {
				cleanValue = '+' + digitsAndPlus.substring(plusIndex + 1).replace(/\+/g, '')
			} else if (digitsAndPlus.length > 0) {
				cleanValue = '+' + digitsAndPlus
			}
		}

		if (type === 'primary') {
			const currentPhone = userData.phone || { countryCode: '+216', shortNumber: '' }
			const newPhone = { ...currentPhone, [field]: cleanValue }
			newPhone.fullNumber = `${newPhone.countryCode || ''}${newPhone.shortNumber || ''}`
			updateField('phone', newPhone)
		} else {
			const currentBackups = [...(userData.backupPhones || [])]
			if (index === undefined) return
			const currentPhone = currentBackups[index] || { countryCode: '+216', shortNumber: '' }
			const newPhone = { ...currentPhone, [field]: cleanValue }
			newPhone.fullNumber = `${newPhone.countryCode || ''}${newPhone.shortNumber || ''}`
			currentBackups[index] = newPhone
			updateField('backupPhones', currentBackups)
		}
	}

	const onDateChange = (event: any, selectedDate?: Date) => {
		setShowDatePicker(Platform.OS === 'ios')
		if (selectedDate) {
			updateField('birthDate', selectedDate, 'basicInfos')
		}
	}

	const formatDate = (date: Date | string | null | undefined) => {
		if (!date) return 'Not set'
		return new Date(date).toLocaleDateString()
	}

	const handleSignOut = async () => {
		showConfirm('Sign Out', 'Are you sure you want to sign out?', async () => {
			try {
				await signOut()
				router.replace('/auth')
			} catch (error) {
				console.error('Sign out failed:', error)
				router.replace('/auth')
			}
		})
	}
	const handleSwitchUser = async () => {
		showConfirm('Switch User', 'This will clear your current session but keep your saved accounts.', async () => {
			try {
				await switchUser()
				router.replace('/auth')
			} catch (error) {
				console.error('Switch user failed:', error)
				router.replace('/auth')
			}
		})
	}

	const handleRequestBusiness = async () => {
		showConfirm('Request Business', 'Do you want to request to become a business owner?', async () => {
			try {
				await requestBusiness()
				showAlert('Success', 'Your request has been sent successfully!')
			} catch (error: any) {
				console.error('Request business failed:', error)
				const errorMessage = error.response?.data?.message || 'Failed to send business request'
				showAlert('Error', errorMessage)
			}
		})
	}

	if (loading && !userData) {
		return (
			<View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (error && !userData) {
		return (
			<View style={styles.container}>
				<ScreenHeader title="Profile" showBack={false} />
				<ErrorState title={error.title} message={error.message} onRetry={loadProfile} icon={error.type === 'network' || error.type === 'timeout' ? 'cloud-offline-outline' : 'alert-circle-outline'} />
			</View>
		)
	}

	if (!userData) return null

	return (
		<View style={styles.container}>
			<ScreenHeader
				title="Profile"
				showBack={false}
				rightActions={
					<View style={styles.headerActions}>
						{userData.role === 'customer' && (
							<TouchableOpacity style={[styles.headerIconButton, { borderColor: colors.primary + '40' }]} onPress={handleRequestBusiness}>
								<Ionicons name="briefcase-outline" size={22} color={colors.primary} />
							</TouchableOpacity>
						)}
						<TouchableOpacity style={styles.headerIconButton} onPress={handleSwitchUser}>
							<Ionicons name="people-outline" size={22} color={colors.text} />
						</TouchableOpacity>
						<TouchableOpacity style={[styles.headerIconButton, { borderColor: colors.error + '40' }]} onPress={handleSignOut}>
							<Ionicons name="log-out-outline" size={22} color={colors.error} />
						</TouchableOpacity>
					</View>
				}
			/>
			<ScrollView contentContainerStyle={styles.contentContainer}>
				{/* Profile Header Card */}
				<View style={styles.profileCard}>
					<View style={styles.photoContainer}>
						{userData.media?.thumbnail?.url && !imageError ? (
							<Image source={{ uri: userData.media.thumbnail.url }} style={styles.profilePhoto} onError={() => setImageError(true)} />
						) : (
							<View style={styles.placeholderPhoto}>
								<Text style={styles.placeholderText}>{(userData.name?.en || userData.slug || '').charAt(0).toUpperCase()}</Text>
							</View>
						)}
						<TouchableOpacity style={[styles.changePhotoButton, editMode.photo && { backgroundColor: colors.primary }]} onPress={() => setEditMode((prev) => ({ ...prev, photo: !prev.photo }))}>
							<Ionicons name={editMode.photo ? 'checkmark' : 'camera'} size={20} color="#fff" />
						</TouchableOpacity>
					</View>

					{editMode.photo && (
						<View style={[styles.inputGroup, { width: '100%', marginTop: 16, paddingHorizontal: 20 }]}>
							<Text style={styles.inputLabel}>Photo URL</Text>
							<View style={[styles.socialInputContainer, { borderColor: colors.primary + '40', backgroundColor: colors.card }]}>
								<TextInput
									style={[styles.socialInput, { fontSize: 13 }]}
									value={userData.media?.thumbnail?.url || ''}
									onChangeText={updatePhotoUrl}
									placeholder="https://example.com/photo.jpg"
									placeholderTextColor={colors.textTertiary}
									selectTextOnFocus
								/>
								<TouchableOpacity onPress={handlePastePhoto} style={[styles.socialIconBadge, { borderLeftWidth: 1, borderRightWidth: 0, borderLeftColor: colors.border + '20' }]}>
									<Ionicons name="clipboard-outline" size={18} color={colors.primary} />
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => saveUserData('photo')}
									style={[styles.socialIconBadge, { borderLeftWidth: 1, borderRightWidth: 0, borderLeftColor: colors.border + '20', backgroundColor: colors.primary + '10' }]}
								>
									<Ionicons name="save-outline" size={18} color={colors.primary} />
								</TouchableOpacity>
								<TouchableOpacity
									onPress={() => toggleEdit('photo', false)}
									style={[styles.socialIconBadge, { borderLeftWidth: 1, borderRightWidth: 0, borderLeftColor: colors.border + '20', backgroundColor: colors.error + '10' }]}
								>
									<Ionicons name="close-outline" size={18} color={colors.error} />
								</TouchableOpacity>
							</View>
						</View>
					)}

					<Text style={styles.profileName}>{userData.name?.en}</Text>
					{userData.name?.tn_latn && (
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
							<View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
								<View style={[styles.langIconBadge, { width: 22, height: 22, backgroundColor: colors.card, borderColor: colors.border, position: 'relative' }]}>
									<Text style={[styles.langIconText, { fontSize: 12, color: colors.text }]}>A</Text>
								</View>
							</View>
							<Text style={[styles.profileMeta, { marginBottom: 0 }]}>{userData.name.tn_latn}</Text>
						</View>
					)}
					{userData.name?.tn_arab && (
						<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
							<View style={{ width: 22, height: 22, justifyContent: 'center', alignItems: 'center' }}>
								<View style={[styles.langIconBadge, { width: 22, height: 22, backgroundColor: colors.card, borderColor: colors.border, position: 'relative' }]}>
									<Text style={[styles.langIconText, { fontSize: 12, color: colors.text }]}>ع</Text>
								</View>
							</View>
							<Text style={[styles.profileMetaArabic, { marginBottom: 0 }]}>{userData.name.tn_arab}</Text>
						</View>
					)}
					<Text style={[styles.profileMeta, { marginTop: 4 }]}>@{userData.slug}</Text>

					{userData.basicInfos?.biography && <Text style={styles.biography}>{userData.basicInfos.biography}</Text>}

					<View style={[styles.roleBadge, userData.role === 'shop_owner' ? styles.shopOwnerBadge : userData.role === 'super' ? styles.adminBadge : styles.customerBadge]}>
						<Text style={styles.roleBadgeText}>{userData.role === 'shop_owner' ? 'Shop Owner' : userData.role === 'super' ? 'Administrator' : 'Customer'}</Text>
					</View>

					{userData.state?.code && (
						<View style={[styles.stateBadge, { backgroundColor: userData.state.code === 'active' ? '#10B98120' : '#EF444420' }]}>
							<View style={[styles.stateDot, { backgroundColor: userData.state.code === 'active' ? '#10B981' : '#EF4444' }]} />
							<Text style={[styles.stateText, { color: userData.state.code === 'active' ? '#10B981' : '#EF4444' }]}>{userData.state.code.toUpperCase()}</Text>
						</View>
					)}
				</View>

				<Section
					title="👤 Basic Information"
					styles={styles}
					isEditing={editMode.basic}
					onEdit={() => toggleEdit('basic', true)}
					onSave={() => saveUserData('basic')}
					onCancel={() => toggleEdit('basic', false)}
				>
					{editMode.basic ? (
						<>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Name (English)</Text>
								<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
									<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05', width: 48 }]}>
										<Ionicons name="language-outline" size={20} color={colors.textSecondary} />
									</View>
									<TextInput
										style={[styles.socialInput, { color: colors.text }]}
										value={userData.name?.en}
										underlineColorAndroid="transparent"
										onChangeText={(value) => updateField('en', value, 'name')}
										placeholder="Name in English"
										placeholderTextColor={colors.textTertiary}
									/>
								</View>
							</View>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Name (Tunisian Arabic)</Text>
								<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
									<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05', width: 48 }]}>
										<View style={[styles.langIconBadge, { backgroundColor: colors.card, borderColor: colors.border, position: 'relative' }]}>
											<Text style={[styles.langIconText, { color: colors.text }]}>ع</Text>
										</View>
									</View>
									<TextInput
										style={[styles.socialInput, { color: colors.text, textAlign: 'right' }]}
										value={userData.name?.tn_arab}
										underlineColorAndroid="transparent"
										onChangeText={(value) => updateField('tn_arab', value, 'name')}
										placeholder="الاسم بالعربية"
										placeholderTextColor={colors.textTertiary}
									/>
								</View>
							</View>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Name (Tunisian Latin)</Text>
								<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
									<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05', width: 48 }]}>
										<View style={[styles.langIconBadge, { backgroundColor: colors.card, borderColor: colors.border, position: 'relative' }]}>
											<Text style={[styles.langIconText, { color: colors.text }]}>A</Text>
										</View>
									</View>
									<TextInput
										style={[styles.socialInput, { color: colors.text }]}
										value={userData.name?.tn_latn}
										underlineColorAndroid="transparent"
										onChangeText={(value) => updateField('tn_latn', value, 'name')}
										placeholder="Name in Tunisian (Latin)"
										placeholderTextColor={colors.textTertiary}
									/>
								</View>
							</View>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Biography</Text>
								<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
									<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
										<Ionicons name="document-text" size={20} color={colors.textSecondary} />
									</View>
									<TextInput
										style={[styles.socialInput, styles.textArea]}
										value={userData.basicInfos?.biography}
										underlineColorAndroid="transparent"
										onChangeText={(value) => updateField('biography', value, 'basicInfos')}
										placeholder="Tell us about yourself"
										placeholderTextColor={colors.textTertiary}
										multiline
									/>
								</View>
							</View>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Birth Date</Text>
								{Platform.OS === 'web' ? (
									<View style={styles.dateInput}>
										<DateTimePicker
											value={userData.basicInfos?.birthDate instanceof Date ? userData.basicInfos.birthDate : new Date()}
											mode="date"
											display="default"
											onChange={onDateChange}
											maximumDate={new Date()}
											style={{ width: '100%', opacity: 1 }}
										/>
									</View>
								) : (
									<TouchableOpacity style={styles.dateInput} onPress={() => setShowDatePicker(true)}>
										<Text style={styles.dateInputText}>{formatDate(userData.basicInfos?.birthDate)}</Text>
										<Ionicons name="calendar" size={20} color={colors.textSecondary} />
									</TouchableOpacity>
								)}
							</View>
						</>
					) : (
						<>
							<InfoItem label="Full Name" value={userData?.name?.en || 'Not set'} icon="person" styles={styles} iconColor={colors.primary} />
							<InfoItem label="Birth Date" value={formatDate(userData?.basicInfos?.birthDate)} icon="calendar" styles={styles} iconColor={colors.primary} />
						</>
					)}
				</Section>

				<Section
					title="📍 Address"
					styles={styles}
					isEditing={editMode.address}
					onEdit={() => toggleEdit('address', true)}
					onSave={() => saveUserData('address')}
					onCancel={() => toggleEdit('address', false)}
				>
					{editMode.address ? (
						<View style={styles.addressGrid}>
							<View style={styles.addressCol12}>
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Street</Text>
									<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
										<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
											<Ionicons name="home" size={20} color={colors.textSecondary} />
										</View>
										<TextInput
											style={[styles.socialInput, { textAlignVertical: 'top' }]}
											value={userData.address?.street}
											underlineColorAndroid="transparent"
											onChangeText={(value) => updateField('street', value, 'address')}
											placeholder="Street Address"
											placeholderTextColor={colors.textTertiary}
											multiline
										/>
									</View>
								</View>
							</View>

							<View style={styles.addressCol6}>
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>City</Text>
									<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
										<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
											<Ionicons name="business" size={20} color={colors.textSecondary} />
										</View>
										<TextInput
											style={[styles.socialInput, { color: colors.text }]}
											value={userData.address?.city}
											underlineColorAndroid="transparent"
											onChangeText={(value) => updateField('city', value, 'address')}
											placeholder="City"
											placeholderTextColor={colors.textTertiary}
										/>
									</View>
								</View>
							</View>

							<View style={styles.addressCol6}>
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>State</Text>
									<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
										<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
											<Ionicons name="map" size={20} color={colors.textSecondary} />
										</View>
										<TextInput
											style={[styles.socialInput, { color: colors.text }]}
											value={userData.address?.state}
											underlineColorAndroid="transparent"
											onChangeText={(value) => updateField('state', value, 'address')}
											placeholder="State"
											placeholderTextColor={colors.textTertiary}
										/>
									</View>
								</View>
							</View>

							<View style={styles.addressCol6}>
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Postal Code</Text>
									<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
										<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
											<Ionicons name="navigate" size={20} color={colors.textSecondary} />
										</View>
										<TextInput
											style={[styles.socialInput, { color: colors.text }]}
											value={userData.address?.postalCode}
											underlineColorAndroid="transparent"
											onChangeText={(value) => updateField('postalCode', value, 'address')}
											placeholder="ZIP Code"
											placeholderTextColor={colors.textTertiary}
										/>
									</View>
								</View>
							</View>

							<View style={styles.addressCol6}>
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>Country</Text>
									<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
										<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
											<Ionicons name="earth" size={20} color={colors.textSecondary} />
										</View>
										<TextInput
											style={[styles.socialInput, { color: colors.text }]}
											value={userData.address?.country}
											underlineColorAndroid="transparent"
											onChangeText={(value) => updateField('country', value, 'address')}
											placeholder="Country"
											placeholderTextColor={colors.textTertiary}
										/>
									</View>
								</View>
							</View>
						</View>
					) : (
						<InfoItem
							label="Full Address"
							value={[userData?.address?.street, userData?.address?.city, userData?.address?.state, userData?.address?.country].filter(Boolean).join(', ') || 'Not set'}
							icon="location"
							styles={styles}
							iconColor={colors.primary}
						/>
					)}
				</Section>

				<Section
					title="🌐 Social Media"
					styles={styles}
					isEditing={editMode.social}
					onEdit={() => toggleEdit('social', true)}
					onSave={() => saveUserData('social')}
					onCancel={() => toggleEdit('social', false)}
				>
					{editMode.social ? (
						SOCIAL_PLATFORMS.map((platform) => (
							<View key={platform.id} style={styles.inputGroup}>
								<Text style={styles.inputLabel}>{platform.label}</Text>
								<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
									<View style={[styles.socialIconBadge, { backgroundColor: platform.color + '15' }]}>
										<Ionicons name={platform.icon as any} size={20} color={platform.color} />
									</View>
									<TextInput
										style={[styles.socialInput, { color: colors.text }]}
										value={userData.socialMedia?.[platform.id as keyof typeof userData.socialMedia]?.url}
										underlineColorAndroid="transparent"
										onChangeText={(value) => {
											const prevSocial = userData.socialMedia || {}
											const prevPlatform = prevSocial[platform.id as keyof typeof prevSocial] || {}
											updateField('socialMedia', { ...prevSocial, [platform.id]: { ...prevPlatform, url: value } })
										}}
										placeholder={platform.prefix}
										placeholderTextColor={colors.textTertiary}
										autoCapitalize="none"
										keyboardType={platform.id === 'whatsapp' ? 'phone-pad' : 'default'}
									/>
								</View>
							</View>
						))
					) : (
						<>
							{SOCIAL_PLATFORMS.map((platform) => {
								const data = userData.socialMedia?.[platform.id as keyof typeof userData.socialMedia]
								const rawUrl = data?.url || data?.username || ''
								if (!rawUrl) return null

								return (
									<InfoItem
										key={platform.id}
										label={platform.label}
										value={rawUrl}
										icon={platform.icon}
										styles={styles}
										iconColor={platform.color}
										onPress={() => {
											let url = rawUrl.trim()
											if (!url.startsWith('http')) {
												url = 'https://' + url
											}
											Linking.openURL(url).catch((err) => showAlert('Error', 'Could not open URL: ' + err.message))
										}}
										onLongPress={async () => {
											let url = rawUrl.trim()
											if (!url.startsWith('http')) {
												url = 'https://' + url
											}
											await Clipboard.setStringAsync(url)
											showAlert('Copied', 'Link copied to clipboard')
										}}
										onCopy={async () => {
											let url = rawUrl.trim()
											if (!url.startsWith('http')) {
												url = 'https://' + url
											}
											await Clipboard.setStringAsync(url)
											showAlert('Copied', 'Link copied to clipboard')
										}}
									/>
								)
							})}
							{(!userData.socialMedia || Object.values(userData.socialMedia).every((v: any) => !v?.url && !v?.username)) && (
								<Text style={{ fontStyle: 'italic', color: colors.textTertiary, padding: 8 }}>No social media links set.</Text>
							)}
						</>
					)}
				</Section>

				<Section
					title="⚙️ Account Settings"
					styles={styles}
					isEditing={editMode.settings}
					onEdit={() => toggleEdit('settings', true)}
					onSave={() => saveUserData('settings')}
					onCancel={() => toggleEdit('settings', false)}
				>
					{editMode.settings ? (
						<>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>App Language (UI)</Text>
								<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
									{LANGUAGES.map((lang) => (
										<TouchableOpacity
											key={lang.code}
											style={[
												styles.langOption,
												{ borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' },
												userData.settings?.lang?.app === lang.code && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
											]}
											onPress={() => {
												const prevSettings = userData.settings || { lang: { app: 'en', content: 'en' }, currency: 'tnd' }
												updateField('settings', { ...prevSettings, lang: { ...prevSettings.lang, app: lang.code } })
											}}
										>
											<View style={styles.flagContainer}>
												<Text style={styles.flagText}>{lang.flag}</Text>
												{lang.icon && (
													<View style={[styles.langIconBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
														<Text style={[styles.langIconText, { color: colors.text }]}>{lang.icon}</Text>
													</View>
												)}
											</View>
											<Text style={[styles.langLabel, { color: colors.text }, userData.settings?.lang?.app === lang.code && { color: colors.primary, fontWeight: '700' }]}>{lang.label}</Text>
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Content Language (Products/Shops)</Text>
								<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
									{LANGUAGES.map((lang) => (
										<TouchableOpacity
											key={lang.code}
											style={[
												styles.langOption,
												{ borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' },
												userData.settings?.lang?.content === lang.code && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
											]}
											onPress={() => {
												const prevSettings = userData.settings || { lang: { app: 'en', content: 'en' }, currency: 'tnd' }
												updateField('settings', { ...prevSettings, lang: { ...prevSettings.lang, content: lang.code } })
											}}
										>
											<View style={styles.flagContainer}>
												<Text style={styles.flagText}>{lang.flag}</Text>
												{lang.icon && (
													<View style={[styles.langIconBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
														<Text style={[styles.langIconText, { color: colors.text }]}>{lang.icon}</Text>
													</View>
												)}
											</View>
											<Text style={[styles.langLabel, { color: colors.text }, userData.settings?.lang?.content === lang.code && { color: colors.primary, fontWeight: '700' }]}>{lang.label}</Text>
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Currency</Text>
								<ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingVertical: 4 }}>
									{CURRENCIES.map((currency) => (
										<TouchableOpacity
											key={currency.code}
											style={[
												styles.langOption,
												{ borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' },
												userData.settings?.currency === currency.code && { borderColor: colors.primary, backgroundColor: colors.primary + '15' }
											]}
											onPress={() => {
												const prevSettings = userData.settings || { lang: { app: 'en', content: 'en' }, currency: 'tnd' }
												updateField('settings', { ...prevSettings, currency: currency.code })
											}}
										>
											<View style={[styles.currencyBadge, { backgroundColor: colors.primary + '10' }]}>
												<Text style={[styles.currencySymbol, { color: colors.primary }]}>{currency.symbol}</Text>
											</View>
											<Text style={[styles.langLabel, { color: colors.text }, userData.settings?.currency === currency.code && { color: colors.primary, fontWeight: '700' }]}>{currency.label}</Text>
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>
						</>
					) : (
						<>
							<InfoItem
								label="App Language (UI)"
								value={(() => {
									const langCode = userData?.settings?.lang?.app || 'en'
									const lang = LANGUAGES.find((l) => l.code === langCode)
									return (
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
											<View style={{ position: 'relative', width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
												<Text style={{ fontSize: 20 }}>{lang?.flag}</Text>
												{lang?.icon && (
													<View style={[styles.langIconBadge, { width: 12, height: 12, bottom: -2, right: -2, backgroundColor: colors.card, borderColor: colors.border }]}>
														<Text style={[styles.langIconText, { fontSize: 8, color: colors.text }]}>{lang.icon}</Text>
													</View>
												)}
											</View>
											<Text style={[styles.infoValue, { color: colors.text }]}>{lang?.label}</Text>
										</View>
									)
								})()}
								icon="language"
								styles={styles}
								iconColor={colors.primary}
							/>
							<InfoItem
								label="Content Language"
								value={(() => {
									const langCode = userData?.settings?.lang?.content || 'en'
									const lang = LANGUAGES.find((l) => l.code === langCode)
									return (
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
											<View style={{ position: 'relative', width: 24, height: 24, justifyContent: 'center', alignItems: 'center' }}>
												<Text style={{ fontSize: 20 }}>{lang?.flag}</Text>
												{lang?.icon && (
													<View style={[styles.langIconBadge, { width: 12, height: 12, bottom: -2, right: -2, backgroundColor: colors.card, borderColor: colors.border }]}>
														<Text style={[styles.langIconText, { fontSize: 8, color: colors.text }]}>{lang.icon}</Text>
													</View>
												)}
											</View>
											<Text style={[styles.infoValue, { color: colors.text }]}>{lang?.label}</Text>
										</View>
									)
								})()}
								icon="globe"
								styles={styles}
								iconColor={colors.primary}
							/>
							<InfoItem
								label="Currency"
								value={(() => {
									const currencyCode = userData?.settings?.currency || 'tnd'
									const currency = CURRENCIES.find((c) => c.code === currencyCode)
									return (
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
											<View style={[styles.currencyBadge, { width: 24, height: 24, backgroundColor: colors.primary + '10' }]}>
												<Text style={[styles.currencySymbol, { fontSize: 10, color: colors.primary }]}>{currency?.symbol}</Text>
											</View>
											<Text style={[styles.infoValue, { color: colors.text }]}>{currency?.label}</Text>
										</View>
									)
								})()}
								icon="cash"
								styles={styles}
								iconColor={colors.primary}
							/>
						</>
					)}
				</Section>

				<Section
					title="📞 Phone Numbers"
					styles={styles}
					isEditing={editMode.phone}
					onEdit={() => toggleEdit('phone', true)}
					onSave={() => saveUserData('phone')}
					onCancel={() => toggleEdit('phone', false)}
				>
					{editMode.phone ? (
						<>
							<Text style={[styles.inputLabel, { marginBottom: 6, marginTop: 4 }]}>Primary Phone</Text>
							<View style={styles.inputGroup}>
								<View style={{ flexDirection: 'row', gap: 8 }}>
									<View style={[styles.socialInputContainer, { width: 90, borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
										<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05', width: 32 }]}>
											<Ionicons name="globe-outline" size={16} color={colors.textSecondary} />
										</View>
										<TextInput
											style={[styles.socialInput, { textAlign: 'center', paddingHorizontal: 4 }]}
											value={userData.phone?.countryCode || '+216'}
											underlineColorAndroid="transparent"
											onChangeText={(val) => updatePhone('primary', 'countryCode', val)}
											placeholder="+216"
											placeholderTextColor={colors.textTertiary}
											keyboardType="phone-pad"
										/>
									</View>
									<View style={[styles.socialInputContainer, { flex: 1, borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
										<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05', width: 36 }]}>
											<Ionicons name="call-outline" size={18} color={colors.textSecondary} />
										</View>
										<TextInput
											style={styles.socialInput}
											value={userData.phone?.shortNumber || ''}
											underlineColorAndroid="transparent"
											onChangeText={(val) => updatePhone('primary', 'shortNumber', val)}
											placeholder="99112619"
											placeholderTextColor={colors.textTertiary}
											keyboardType="phone-pad"
										/>
									</View>
								</View>
							</View>

							<Text style={[styles.inputLabel, { marginBottom: 6, marginTop: 12 }]}>Backup Phones</Text>
							{(userData.backupPhones || []).map((phone, index) => (
								<View key={index} style={[styles.inputGroup, { marginBottom: 10 }]}>
									<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
										<View style={[styles.socialInputContainer, { width: 90, borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
											<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05', width: 32 }]}>
												<Ionicons name="globe-outline" size={16} color={colors.textSecondary} />
											</View>
											<TextInput
												style={[styles.socialInput, { textAlign: 'center', paddingHorizontal: 4 }]}
												value={phone.countryCode || '+216'}
												underlineColorAndroid="transparent"
												onChangeText={(val) => updatePhone('backup', 'countryCode', val, index)}
												placeholder="+216"
												placeholderTextColor={colors.textTertiary}
												keyboardType="phone-pad"
											/>
										</View>
										<View style={[styles.socialInputContainer, { flex: 1, borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
											<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05', width: 36 }]}>
												<Ionicons name="call-outline" size={18} color={colors.textSecondary} />
											</View>
											<TextInput
												style={styles.socialInput}
												value={phone.shortNumber || ''}
												underlineColorAndroid="transparent"
												onChangeText={(val) => updatePhone('backup', 'shortNumber', val, index)}
												placeholder="99112645"
												placeholderTextColor={colors.textTertiary}
												keyboardType="phone-pad"
											/>
										</View>
										<TouchableOpacity
											onPress={() => {
												const newBackups = (userData.backupPhones || []).filter((_, i) => i !== index)
												updateField('backupPhones', newBackups)
											}}
											style={{ padding: 4 }}
										>
											<Ionicons name="trash-outline" size={22} color={colors.error} />
										</TouchableOpacity>
									</View>
								</View>
							))}
							<TouchableOpacity
								style={styles.addButton}
								onPress={() => {
									const newBackups = [...(userData.backupPhones || []), { countryCode: '+216', shortNumber: '', fullNumber: '+216' }]
									updateField('backupPhones', newBackups)
								}}
							>
								<Ionicons name="add-circle-outline" size={20} color={colors.primary} />
								<Text style={styles.addButtonText}>Add Backup Phone</Text>
							</TouchableOpacity>
						</>
					) : (
						<>
							<InfoItem label="Primary Phone" value={userData?.phone?.fullNumber || 'Not set'} icon="call" styles={styles} iconColor={colors.primary} />
							{(userData.backupPhones || []).length > 0 ? (
								userData.backupPhones!.map((phone, index) => (
									<InfoItem key={index} label={`Backup Phone ${index + 1}`} value={phone.fullNumber || 'Not set'} icon="call-outline" styles={styles} iconColor={colors.primary} />
								))
							) : (
								<Text style={{ fontStyle: 'italic', color: colors.textTertiary, padding: 8 }}>No backup phones set.</Text>
							)}
						</>
					)}
				</Section>
				{Platform.OS !== 'web' && showDatePicker && (
					<DateTimePicker value={(userData.basicInfos?.birthDate as Date) || new Date()} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />
				)}
			</ScrollView>
		</View>
	)
}

const createStyles = (colors: any, isDark: boolean, isWideScreen?: boolean, width?: number) =>
	StyleSheet.create({
		container: {
			flex: 1,
			backgroundColor: colors.background
		},
		contentContainer: {
			padding: 20,
			paddingBottom: 120,
			maxWidth: isWideScreen ? 800 : undefined,
			alignSelf: isWideScreen ? 'center' : undefined,
			width: '100%'
		},
		editButton: {
			backgroundColor: colors.primary + '20',
			paddingHorizontal: 16,
			paddingVertical: 8,
			borderRadius: 20
		},
		editButtonText: {
			color: colors.primary,
			fontWeight: '600',
			fontSize: 14
		},
		headerActions: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 8
		},
		headerIconButton: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: colors.card,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1,
			borderColor: colors.border
		},
		profileCard: {
			alignItems: 'center',
			marginBottom: 32,
			padding: 24,
			backgroundColor: colors.card,
			borderRadius: 24,
			borderWidth: 1,
			borderColor: colors.border
		},
		photoContainer: {
			position: 'relative',
			marginBottom: 16
		},
		profilePhoto: {
			width: 100,
			height: 100,
			borderRadius: 50,
			borderWidth: 4,
			borderColor: colors.background
		},
		placeholderPhoto: {
			width: 100,
			height: 100,
			borderRadius: 50,
			backgroundColor: colors.primary,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 4,
			borderColor: colors.background
		},
		placeholderText: {
			color: '#fff',
			fontSize: 36,
			fontWeight: 'bold'
		},
		changePhotoButton: {
			position: 'absolute',
			bottom: 0,
			right: 0,
			backgroundColor: colors.primary,
			width: 32,
			height: 32,
			borderRadius: 16,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 2,
			borderColor: colors.background
		},
		profileName: {
			fontSize: 24,
			fontWeight: 'bold',
			color: colors.text,
			marginBottom: 4
		},
		profileMeta: {
			fontSize: 14,
			color: colors.textSecondary,
			marginBottom: 12
		},
		profileMetaArabic: {
			fontSize: 16,
			color: colors.textSecondary,
			marginBottom: 12,
			fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
			writingDirection: 'rtl'
		},
		biography: {
			fontSize: 14,
			color: colors.text,
			textAlign: 'center',
			marginBottom: 16,
			paddingHorizontal: 10,
			fontStyle: 'italic'
		},
		roleBadge: {
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 12
		},
		shopOwnerBadge: {
			backgroundColor: '#3B82F6' + '20'
		},
		adminBadge: {
			backgroundColor: '#F59E0B' + '20'
		},
		customerBadge: {
			backgroundColor: '#10B981' + '20'
		},
		roleBadgeText: {
			fontSize: 12,
			fontWeight: '600',
			color: colors.text
		},
		stateBadge: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 10,
			marginTop: 12
		},
		stateDot: {
			width: 6,
			height: 6,
			borderRadius: 3,
			marginRight: 6
		},
		stateText: {
			fontSize: 11,
			fontWeight: '700',
			letterSpacing: 0.5
		},
		section: {
			marginBottom: 24
		},
		sectionTitle: {
			fontSize: 14,
			fontWeight: '600',
			color: colors.textSecondary,
			marginBottom: 12,
			textTransform: 'uppercase',
			letterSpacing: 0.5,
			marginLeft: 4
		},
		sectionContent: {
			backgroundColor: colors.card,
			borderRadius: 16,
			overflow: 'hidden',
			borderWidth: 1,
			borderColor: colors.border,
			padding: 8
		},
		infoItem: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 12
		},
		infoIconContainer: {
			width: 40,
			height: 40,
			borderRadius: 12,
			backgroundColor: colors.primary + '10',
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 16
		},
		infoContent: {
			flex: 1
		},
		infoLabel: {
			fontSize: 12,
			color: colors.textTertiary,
			marginBottom: 2
		},
		infoValue: {
			fontSize: 16,
			color: colors.text,
			fontWeight: '500'
		},
		row: {
			flexDirection: width && width < 600 ? 'column' : 'row',
			gap: 12
		},
		inputGroup: {
			marginBottom: 10,
			paddingHorizontal: 4
		},
		inputLabel: {
			fontSize: 13,
			fontWeight: '600',
			color: colors.textTertiary,
			marginBottom: 2
		},
		input: {
			backgroundColor: isDark ? colors.card : '#FAFBFC',
			color: colors.text,
			fontSize: 14,
			paddingHorizontal: 12,
			paddingVertical: Platform.OS === 'android' ? 0 : 6,
			height: 36,
			textAlignVertical: 'center',
			includeFontPadding: false,
			borderRadius: 12,
			borderWidth: 2,
			borderColor: isDark ? colors.border : '#E1E8ED',
			shadowColor: colors.primary,
			shadowOffset: { width: 0, height: 0 },
			shadowOpacity: 0,
			shadowRadius: 0,
			elevation: 0
		},
		textArea: {
			minHeight: 100,
			textAlignVertical: 'top',
			paddingTop: 12
		},
		dateInput: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			backgroundColor: colors.background,
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: colors.border
		},
		dateInputText: {
			fontSize: 16,
			color: colors.text
		},
		cancelButton: {
			backgroundColor: colors.error + '10',
			padding: 16,
			borderRadius: 16,
			alignItems: 'center',
			marginTop: 8,
			marginBottom: 32,
			borderWidth: 1,
			borderColor: colors.error + '20'
		},
		cancelButtonText: {
			color: colors.error,
			fontSize: 16,
			fontWeight: '600'
		},
		logoutButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			padding: 16,
			marginTop: 24,
			marginBottom: 40,
			borderRadius: 16,
			backgroundColor: colors.error + '10',
			borderWidth: 1,
			borderColor: colors.error + '20'
		},
		logoutButtonText: {
			color: colors.error,
			fontSize: 16,
			fontWeight: '600'
		},
		addButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			padding: 12,
			gap: 8
		},
		addButtonText: {
			color: colors.primary,
			fontWeight: '600',
			fontSize: 14
		},
		editModeHeader: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 12,
			paddingHorizontal: 20,
			paddingVertical: 16,
			backgroundColor: colors.primary + '10',
			borderRadius: 16,
			marginBottom: 24,
			borderWidth: 1,
			borderColor: colors.primary + '20'
		},
		editModeTitle: {
			fontSize: 18,
			fontWeight: '700',
			color: colors.primary
		},
		actionBar: {
			flexDirection: 'row',
			gap: 12,
			paddingTop: 24,
			paddingBottom: 16,
			marginTop: 8
		},
		cancelButtonNew: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 8,
			paddingVertical: 16,
			borderRadius: 14,
			backgroundColor: colors.error + '10',
			borderWidth: 2,
			borderColor: colors.error + '30'
		},
		cancelButtonTextNew: {
			color: colors.error,
			fontSize: 16,
			fontWeight: '700'
		},
		saveButton: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 8,
			paddingVertical: 16,
			borderRadius: 14,
			backgroundColor: colors.primary,
			shadowColor: colors.primary,
			shadowOffset: { width: 0, height: 4 },
			shadowOpacity: 0.3,
			shadowRadius: 8,
			elevation: 6
		},
		saveButtonText: {
			color: '#fff',
			fontSize: 16,
			fontWeight: '700'
		},
		langOption: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 12,
			paddingRight: 16,
			borderRadius: 12,
			borderWidth: 2,
			gap: 12,
			minWidth: 140
		},
		flagContainer: {
			position: 'relative',
			width: 32,
			height: 32,
			justifyContent: 'center',
			alignItems: 'center'
		},
		flagText: {
			fontSize: 24
		},
		langIconBadge: {
			position: 'absolute',
			bottom: -4,
			right: -4,
			width: 16,
			height: 16,
			borderRadius: 8,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.1,
			shadowRadius: 1,
			elevation: 1
		},
		langIconText: {
			fontSize: 10,
			fontWeight: '700'
		},
		langLabel: {
			fontSize: 14,
			fontWeight: '500'
		},
		socialInputContainer: {
			flexDirection: 'row',
			alignItems: 'stretch',
			borderRadius: 10,
			borderWidth: 1.5,
			overflow: 'hidden',
			minHeight: 40
		},
		socialIconBadge: {
			width: 40,
			alignItems: 'center',
			justifyContent: 'center',
			borderRightWidth: 1,
			borderRightColor: colors.border + '20'
		},
		socialInput: {
			flex: 1,
			paddingHorizontal: 12,
			paddingVertical: 10,
			fontSize: 16,
			color: colors.text,
			textAlignVertical: 'center'
		},
		currencyBadge: {
			width: 32,
			height: 32,
			borderRadius: 16,
			alignItems: 'center',
			justifyContent: 'center'
		},
		currencySymbol: {
			fontSize: 16,
			fontWeight: '700'
		},
		addressGrid: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			marginHorizontal: -4
		},
		addressCol: {
			paddingHorizontal: 4,
			width: width && width < 450 ? '100%' : width && width < 768 ? '50%' : '33.33%'
		},
		addressCol6: {
			paddingHorizontal: 4,
			width: width && width < 450 ? '100%' : '50%'
		},
		addressCol12: {
			paddingHorizontal: 4,
			width: '100%'
		}
	})
