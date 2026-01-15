import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, Platform, useWindowDimensions, ActivityIndicator, Linking } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { checkAuth, getMyProfile, updateMyProfile, signOut, switchUser } from '../../core/auth/auth.api'
import { useTheme } from '../../contexts/ThemeContext'
import ScreenHeader from '../../components/common/ScreenHeader'
import ErrorState from '../../components/common/ErrorState'
import { showPopup, showAlert, showConfirm } from '../../utils/popup'
import { requestBusiness } from '../../components/business/business.api'
import { parseError, logError } from '../../utils/errorHandler'
import { useUser } from '../../contexts/UserContext'

import { UserData } from '../../components/profile/profile.interface'
import { LANGUAGES, CURRENCIES, SOCIAL_PLATFORMS } from '../../constants/settings'

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
	const { colors } = useTheme()
	const isDark = true
	const { refreshUser, translate } = useUser()
	const { width } = useWindowDimensions()
	const maxWidth = 800
	const isWideScreen = width > maxWidth
	const styles = createStyles(colors, isDark, isWideScreen, width)

	const [loading, setLoading] = useState(false)
	const [userData, setUserData] = useState<UserData | null>({
		_id: '6964f6381d9b566c103122c0',
		slug: 'c28',
		name: { en: 'c28' },
		role: 'customer',
		address: {
			street: 'street 1',
			city: 'ellouza',
			state: 'sfax',
			postalCode: '3016',
			country: 'Tunisia'
		},
		settings: {
			lang: {
				app: 'en',
				content: 'tn_arab'
			},
			currency: 'tnd'
		},
		state: {
			code: 'active',
			updatedAt: '2026-01-12T13:25:12.938Z'
		},
		createdAt: '2026-01-12T13:25:12.938Z',
		updatedAt: '2026-01-12T13:31:40.264Z',
		basicInfos: {
			birthDate: '2025-12-20T00:00:00.000Z',
			biography: 'hello im ahmed'
		},
		contact: {
			phone: {
				fullNumber: '+21699112619',
				countryCode: '+216',
				shortNumber: '99112619'
			},
			backupPhones: [
				{
					fullNumber: '+21699112645',
					countryCode: '+216',
					shortNumber: '99112645'
				}
			],
			whatsapp: '+21699112618',
			email: 'derbala.ahmed53@gmail.com'
		},
		media: {
			thumbnail: {
				url: 'https://scontent.ftun15-1.fna.fbcdn.net/v/t39.30808-6/480797900_9563147623771985_8782635803627400360_n.jpg?_nc_cat=111&ccb=1-7&_nc_sid=6ee11a&_nc_ohc=2-gC3oPiHS4Q7kNvwFY3O0G&_nc_oc=AdmlH6InV5Si-4qeF4tOdXPqDRv6f_GrylbaxqQ2BIWnM-nefUUvYmboLWW4yXXO8fO9OfHYQMtXrijmgv4CCldc&_nc_zt=23&_nc_ht=scontent.ftun15-1.fna&_nc_gid=hQZOtp4ueA685l1wgw6vsg&oh=00_AfqjHnRQKmgGRP9fMFwy4UPgBhMurmGTS8_afENErKefgQ&oe=6969E901'
			}
		},
		socialMedia: {
			facebook: {
				url: 'https://www.facebook.com/derbala.ahmed92',
				username: 'derbala.ahmed92'
			},
			instagram: {
				url: 'https://www.instagram.com/derbala.ahmed92',
				username: 'derbala.ahmed92'
			}
		}
	})
	const [editMode, setEditMode] = useState({
		name: false,
		basic: false,
		address: false,
		location: false,
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

			// Handle 401 Unauthorized - redirect to auth screen
			if (err.response?.status === 401) {
				showAlert('Session Expired', 'Please log in again to continue.')
				router.replace('/auth')
				return
			}

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
				contact: {
					phone: userData.contact?.phone || userData.phone,
					backupPhones: userData.contact?.backupPhones || userData.backupPhones,
					email: userData.contact?.email || userData.email,
					whatsapp: userData.contact?.whatsapp
				},
				basicInfos: userData.basicInfos,
				address: userData.address,
				location: userData.location,
				settings: userData.settings,
				socialMedia: userData.socialMedia,
				media: userData.media
			}

			await updateMyProfile(payload)
			if (sectionKey) {
				setEditMode((prev) => ({ ...prev, [sectionKey]: false }))
			}
			showAlert(translate('success', 'Success'), translate('profile_updated', 'Profile updated successfully!'))
			await refreshUser() // Update global user state
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

	// Helper functions to get phone/email with backward compatibility
	const getPhone = (userData: any) => userData?.contact?.phone || userData?.phone
	const getBackupPhones = (userData: any) => userData?.contact?.backupPhones || userData?.backupPhones || []
	const getEmail = (userData: any) => userData?.contact?.email || userData?.email

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
			const currentPhone = getPhone(userData) || { countryCode: '+216', shortNumber: '' }
			const newPhone = { ...currentPhone, [field]: cleanValue }
			newPhone.fullNumber = `${newPhone.countryCode || ''}${newPhone.shortNumber || ''}`

			setUserData((prev) => {
				if (!prev) return null
				return {
					...prev,
					contact: {
						...prev.contact,
						phone: newPhone
					}
				}
			})
		} else {
			const currentBackups = [...getBackupPhones(userData)]
			if (index === undefined) return
			const currentPhone = currentBackups[index] || { countryCode: '+216', shortNumber: '' }
			const newPhone = { ...currentPhone, [field]: cleanValue }
			newPhone.fullNumber = `${newPhone.countryCode || ''}${newPhone.shortNumber || ''}`
			currentBackups[index] = newPhone

			setUserData((prev) => {
				if (!prev) return null
				return {
					...prev,
					contact: {
						...prev.contact,
						backupPhones: currentBackups
					}
				}
			})
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
		showConfirm(translate('sign_out', 'Sign Out'), 'Are you sure you want to sign out?', async () => {
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
		showConfirm(translate('switch_account', 'Switch User'), 'This will clear your current session but keep your saved accounts.', async () => {
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
		showConfirm(translate('request_business', 'Request Business'), 'Do you want to request to become a business owner?', async () => {
			try {
				await requestBusiness()
				showAlert(translate('success', 'Success'), 'Your request has been sent successfully!')
			} catch (error: any) {
				console.error('Request business failed:', error)
				const errorMessage = error.response?.data?.message || 'Failed to send business request'
				showAlert(translate('error', 'Error'), errorMessage)
			}
		})
	}

	const handleGetCurrentLocation = async () => {
		try {
			// Request location permission
			const { status } = await Location.requestForegroundPermissionsAsync()
			if (status !== 'granted') {
				showAlert('Permission Denied', 'Location permission is required to get your current location.')
				return
			}

			// Get current location
			const location = await Location.getCurrentPositionAsync({
				accuracy: Location.Accuracy.Balanced
			})

			const { longitude, latitude } = location.coords

			// Update user data with new location and enable sharing
			updateField('location', {
				type: 'Point',
				coordinates: [longitude, latitude],
				sharingEnabled: true // Always enable sharing when getting current location
			})

			showAlert('Success', `Location updated: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
		} catch (error: any) {
			console.error('Error getting location:', error)
			showAlert('Error', 'Failed to get current location. Please make sure location services are enabled.')
		}
	}

	const handleToggleSharing = async () => {
		if (!userData) return
		const currentlyEnabled = userData.location?.sharingEnabled === true
		if (currentlyEnabled) {
			// Disable sharing: remove coordinates
			updateField('location', {
				type: userData?.location?.type || 'Point',
				sharingEnabled: false
			})
			return
		}

		// Enabling: request permission and fetch current location
		try {
			const { status } = await Location.requestForegroundPermissionsAsync()
			if (status !== 'granted') {
				showAlert('Permission Denied', 'Location permission is required to share your current location.')
				return
			}

			const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
			const { longitude, latitude } = location.coords

			updateField('location', {
				type: 'Point',
				coordinates: [longitude, latitude],
				sharingEnabled: true
			})
			showAlert('Success', `Location sharing enabled: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
		} catch (error: any) {
			console.error('Error enabling location sharing:', error)
			showAlert('Error', 'Failed to enable location sharing.')
		}
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
			<ScreenHeader title={translate('profile', 'Profile')} showBack={false} />
			<ScrollView contentContainerStyle={styles.contentContainer}>
				{/* Profile Header Card */}
				<View style={styles.profileCard}>
					<View style={styles.photoContainer}>
						{userData.media?.thumbnail?.url && !imageError ? (
							<Image source={{ uri: userData.media.thumbnail.url }} style={styles.profilePhoto} onError={() => setImageError(true)} />
						) : (
							<View style={styles.placeholderPhoto}>
								<Text style={styles.placeholderText}>{(userData.slug || '').charAt(0).toUpperCase()}</Text>
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

					<Text style={styles.profileName}>@{userData.slug}</Text>

					<View style={styles.roleStateContainer}>
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
				</View>

				<Section
					title={'✏️ ' + translate('name', 'Name')}
					styles={styles}
					isEditing={editMode.name}
					onEdit={() => toggleEdit('name', true)}
					onSave={() => saveUserData('name')}
					onCancel={() => toggleEdit('name', false)}
				>
					{editMode.name ? (
						<>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Name (English)</Text>
								<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
									<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05', width: 48 }]}>
										<Text style={styles.flagText}>{LANGUAGES.find((l) => l.code === 'en')?.flag}</Text>
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
										<View style={styles.flagContainer}>
											<Text style={styles.flagText}>{LANGUAGES.find((l) => l.code === 'tn_arab')?.flag}</Text>
											<View style={[styles.langIconBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
												<Text style={[styles.langIconText, { color: colors.text }]}>ع</Text>
											</View>
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
										<View style={styles.flagContainer}>
											<Text style={styles.flagText}>{LANGUAGES.find((l) => l.code === 'tn_latn')?.flag}</Text>
											<View style={[styles.langIconBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
												<Text style={[styles.langIconText, { color: colors.text }]}>A</Text>
											</View>
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
						</>
					) : (
						<>
							{userData?.name?.en && (
								<InfoItem
									label="Name (English)"
									value={
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
											<Text style={styles.flagText}>{LANGUAGES.find((l) => l.code === 'en')?.flag}</Text>
											<Text style={styles.infoValue}>{userData.name.en}</Text>
										</View>
									}
									icon="person"
									styles={styles}
									iconColor={colors.primary}
								/>
							)}
							{userData?.name?.tn_arab && (
								<InfoItem
									label="Name (Tunisian Arabic)"
									value={
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
											<View style={styles.flagContainer}>
												<Text style={styles.flagText}>{LANGUAGES.find((l) => l.code === 'tn_arab')?.flag}</Text>
												<View style={[styles.langIconBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
													<Text style={[styles.langIconText, { color: colors.text }]}>ع</Text>
												</View>
											</View>
											<Text style={[styles.infoValue, { textAlign: 'right', flex: 1 }]}>{userData.name.tn_arab}</Text>
										</View>
									}
									icon="person"
									styles={styles}
									iconColor={colors.primary}
								/>
							)}
							{userData?.name?.tn_latn && (
								<InfoItem
									label="Name (Tunisian Latin)"
									value={
										<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
											<View style={styles.flagContainer}>
												<Text style={styles.flagText}>{LANGUAGES.find((l) => l.code === 'tn_latn')?.flag}</Text>
												<View style={[styles.langIconBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
													<Text style={[styles.langIconText, { color: colors.text }]}>A</Text>
												</View>
											</View>
											<Text style={styles.infoValue}>{userData.name.tn_latn}</Text>
										</View>
									}
									icon="person"
									styles={styles}
									iconColor={colors.primary}
								/>
							)}
							{!userData?.name?.en && !userData?.name?.tn_arab && !userData?.name?.tn_latn && (
								<Text style={{ fontStyle: 'italic', color: colors.textTertiary, padding: 8 }}>No name information set.</Text>
							)}
						</>
					)}
				</Section>

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
							<InfoItem label="Birth Date" value={formatDate(userData?.basicInfos?.birthDate)} icon="calendar" styles={styles} iconColor={colors.primary} />
							{userData?.basicInfos?.biography && (
								<View style={styles.infoItem}>
									<View style={styles.infoIconContainer}>
										<Ionicons name="document-text" size={20} color={colors.primary} />
									</View>
									<View style={styles.infoContent}>
										<Text style={styles.infoLabel}>Biography</Text>
										<Text style={[styles.infoValue, { fontStyle: 'italic' }]}>{userData.basicInfos.biography}</Text>
									</View>
								</View>
							)}
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
						<>
							{userData?.address?.street && <InfoItem label="Street" value={userData.address.street} icon="home" styles={styles} iconColor={colors.primary} />}
							{(userData?.address?.city || userData?.address?.state || userData?.address?.postalCode) && (
								<InfoItem
									label="City/State/Postal Code"
									value={[userData?.address?.city, userData?.address?.state, userData?.address?.postalCode].filter(Boolean).join(', ') || 'Not set'}
									icon="business"
									styles={styles}
									iconColor={colors.primary}
								/>
							)}
							{userData?.address?.country && <InfoItem label="Country" value={userData.address.country} icon="earth" styles={styles} iconColor={colors.primary} />}
							{!userData?.address?.street && !userData?.address?.city && !userData?.address?.state && !userData?.address?.country && (
								<Text style={{ fontStyle: 'italic', color: colors.textTertiary, padding: 8 }}>No address information set.</Text>
							)}
						</>
					)}
				</Section>

				<Section
					title="📍 Location"
					styles={styles}
					isEditing={editMode.location}
					onEdit={() => toggleEdit('location', true)}
					onSave={() => saveUserData('location')}
					onCancel={() => toggleEdit('location', false)}
				>
					{editMode.location ? (
						<View style={styles.inputGroup}>
							<Text style={styles.inputLabel}>GPS Coordinates</Text>
							<View style={styles.locationGrid}>
								<View style={styles.locationCol}>
									<Text style={styles.locationSubLabel}>Longitude</Text>
									<View
										style={[
											styles.socialInputContainer,
											{ borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC', opacity: userData.location?.sharingEnabled === false ? 0.5 : 1 }
										]}
									>
										<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
											<Ionicons name="location" size={20} color={colors.textSecondary} />
										</View>
										<TextInput
											style={[styles.socialInput, { color: colors.text }]}
											value={userData.location?.coordinates?.[0]?.toString() || ''}
											onChangeText={(value) => {
												if (userData.location?.sharingEnabled === false) return
												const coords = userData.location?.coordinates || [0, 0]
												const newCoords: [number, number] = [parseFloat(value) || 0, coords[1]]
												updateField('location', {
													type: 'Point',
													coordinates: newCoords,
													sharingEnabled: userData.location?.sharingEnabled ?? true
												})
											}}
											placeholder="10.8045"
											placeholderTextColor={colors.textTertiary}
											keyboardType="numeric"
											editable={userData.location?.sharingEnabled !== false}
										/>
									</View>
								</View>
								<View style={styles.locationCol}>
									<Text style={styles.locationSubLabel}>Latitude</Text>
									<View
										style={[
											styles.socialInputContainer,
											{
												borderColor: isDark ? colors.border : '#E1E8ED',
												backgroundColor: isDark ? colors.card : '#FAFBFC',
												opacity: userData.location?.sharingEnabled === false ? 0.5 : 1
											}
										]}
									>
										<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
											<Ionicons name="location" size={20} color={colors.textSecondary} />
										</View>
										<TextInput
											style={[styles.socialInput, { color: colors.text }]}
											value={userData.location?.coordinates?.[1]?.toString() || ''}
											onChangeText={(value) => {
												if (userData.location?.sharingEnabled === false) return
												const coords = userData.location?.coordinates || [0, 0]
												const newCoords: [number, number] = [coords[0], parseFloat(value) || 0]
												updateField('location', {
													type: 'Point',
													coordinates: newCoords,
													sharingEnabled: userData.location?.sharingEnabled ?? true
												})
											}}
											placeholder="35.7905"
											placeholderTextColor={colors.textTertiary}
											keyboardType="numeric"
											editable={userData.location?.sharingEnabled !== false}
										/>
									</View>
								</View>
							</View>
							<View style={styles.inputGroup}>
								<View style={styles.switchContainer}>
									<Text style={styles.switchLabel}>Share Location</Text>
									<TouchableOpacity style={[styles.switch, userData.location?.sharingEnabled ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]} onPress={handleToggleSharing}>
										<View style={[styles.switchThumb, userData.location?.sharingEnabled ? { transform: [{ translateX: 20 }], backgroundColor: '#fff' } : { backgroundColor: '#fff' }]} />
									</TouchableOpacity>
								</View>
								<TouchableOpacity
									style={[
										styles.addButton,
										{
											borderColor: colors.primary,
											marginTop: 12,
											opacity: userData.location?.sharingEnabled === false ? 0.5 : 1
										}
									]}
									onPress={handleGetCurrentLocation}
									disabled={userData.location?.sharingEnabled === false}
								>
									<Ionicons name="location" size={20} color={colors.primary} />
									<Text style={[styles.addButtonText, { color: colors.primary }]}>Get Current Location</Text>
								</TouchableOpacity>
							</View>
						</View>
					) : (
						<>
							{userData.location?.coordinates && (
								<>
									<InfoItem
										label="GPS Coordinates"
										value={`${userData.location.coordinates[1].toFixed(4)}, ${userData.location.coordinates[0].toFixed(4)}`}
										icon="location"
										styles={styles}
										iconColor={colors.primary}
										onPress={() => {
											const [longitude, latitude] = userData.location.coordinates
											const mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
											Linking.openURL(mapUrl).catch(() => {})
										}}
										onCopy={async () => {
											const [longitude, latitude] = userData.location.coordinates
											await Clipboard.setStringAsync(`${latitude}, ${longitude}`)
											showAlert('Copied', 'Location coordinates copied to clipboard')
										}}
									/>
									<TouchableOpacity
										style={[styles.addButton, { borderColor: colors.primary, marginTop: 8 }]}
										onPress={() => {
											const [longitude, latitude] = userData.location.coordinates
											const mapUrl = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
											Linking.openURL(mapUrl).catch(() => {})
										}}
									>
										<Ionicons name="map" size={20} color={colors.primary} />
										<Text style={[styles.addButtonText, { color: colors.primary }]}>Open in Maps</Text>
									</TouchableOpacity>
								</>
							)}
							{userData.location?.sharingEnabled !== undefined && (
								<InfoItem
									label="Location Sharing"
									value={userData.location.sharingEnabled ? 'Enabled' : 'Disabled'}
									icon={userData.location.sharingEnabled ? 'share-social' : 'share-social-outline'}
									styles={styles}
									iconColor={userData.location.sharingEnabled ? colors.primary : colors.textSecondary}
								/>
							)}
							{!userData.location?.coordinates && <Text style={{ fontStyle: 'italic', color: colors.textTertiary, padding: 8 }}>No location information set.</Text>}
						</>
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
										value={userData.socialMedia?.[platform.id as keyof typeof userData.socialMedia]?.username || ''}
										underlineColorAndroid="transparent"
										onChangeText={(value) => {
											const prevSocial = userData.socialMedia || {}
											const prevPlatform = prevSocial[platform.id as keyof typeof prevSocial] || {}
											updateField('socialMedia', { ...prevSocial, [platform.id]: { ...prevPlatform, username: value } })
										}}
										placeholder={platform.prefix}
										placeholderTextColor={colors.textTertiary}
										autoCapitalize="none"
										keyboardType="default"
									/>
								</View>
							</View>
						))
					) : (
						<>
							{SOCIAL_PLATFORMS.map((platform) => {
								const data = userData.socialMedia?.[platform.id as keyof typeof userData.socialMedia]
								const username = data?.username || ''
								if (!username) return null

								// Construct URL from username for opening links
								const constructUrl = (platformId: string, username: string) => {
									if (platformId === 'facebook') {
										return `https://www.facebook.com/${username}`
									} else if (platformId === 'instagram') {
										return `https://www.instagram.com/${username}`
									}
									return username
								}

								const url = constructUrl(platform.id, username)

								return (
									<InfoItem
										key={platform.id}
										label={platform.label}
										value={username}
										icon={platform.icon}
										styles={styles}
										iconColor={platform.color}
										onPress={() => {
											Linking.openURL(url).catch((err) => showAlert('Error', 'Could not open URL: ' + err.message))
										}}
										onLongPress={async () => {
											await Clipboard.setStringAsync(url)
											showAlert('Copied', 'Link copied to clipboard')
										}}
										onCopy={async () => {
											await Clipboard.setStringAsync(url)
											showAlert('Copied', 'Link copied to clipboard')
										}}
									/>
								)
							})}
							{(!userData.socialMedia || Object.values(userData.socialMedia).every((v: any) => !v?.username)) && (
								<Text style={{ fontStyle: 'italic', color: colors.textTertiary, padding: 8 }}>No social media links set.</Text>
							)}
						</>
					)}
				</Section>

				<Section
					title="📞 Contact Information"
					styles={styles}
					isEditing={editMode.phone}
					onEdit={() => toggleEdit('phone', true)}
					onSave={() => saveUserData('phone')}
					onCancel={() => toggleEdit('phone', false)}
				>
					{editMode.phone ? (
						<>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Primary Phone</Text>
								<View style={[styles.phoneInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
									<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05', width: 80 }]}>
										<TextInput
											style={[styles.phoneCodeInput, { color: colors.text }]}
											value={getPhone(userData)?.countryCode || '+216'}
											onChangeText={(value) => updatePhone('primary', 'countryCode', value)}
											placeholder="+216"
											placeholderTextColor={colors.textTertiary}
											keyboardType="phone-pad"
											maxLength={5}
										/>
									</View>
									<TextInput
										style={[styles.phoneNumberInput, { color: colors.text }]}
										value={getPhone(userData)?.shortNumber || ''}
										onChangeText={(value) => updatePhone('primary', 'shortNumber', value)}
										placeholder="99112619"
										placeholderTextColor={colors.textTertiary}
										keyboardType="phone-pad"
										maxLength={15}
									/>
								</View>
								{getPhone(userData)?.fullNumber && <Text style={[styles.inputHint, { color: colors.textTertiary }]}>Full: {getPhone(userData)?.fullNumber}</Text>}
							</View>

							{getBackupPhones(userData).map((backupPhone: any, index: number) => (
								<View key={index} style={styles.inputGroup}>
									<View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
										<Text style={styles.inputLabel}>Backup Phone {index + 1}</Text>
										<TouchableOpacity
											onPress={() => {
												const backups = [...getBackupPhones(userData)]
												backups.splice(index, 1)
												setUserData((prev) => {
													if (!prev) return null
													return {
														...prev,
														contact: {
															...prev.contact,
															backupPhones: backups
														}
													}
												})
											}}
											style={{ padding: 4 }}
										>
											<Ionicons name="trash-outline" size={18} color={colors.error} />
										</TouchableOpacity>
									</View>
									<View style={[styles.phoneInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
										<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05', width: 80 }]}>
											<TextInput
												style={[styles.phoneCodeInput, { color: colors.text }]}
												value={backupPhone?.countryCode || '+216'}
												onChangeText={(value) => updatePhone('backup', 'countryCode', value, index)}
												placeholder="+216"
												placeholderTextColor={colors.textTertiary}
												keyboardType="phone-pad"
												maxLength={5}
											/>
										</View>
										<TextInput
											style={[styles.phoneNumberInput, { color: colors.text }]}
											value={backupPhone?.shortNumber || ''}
											onChangeText={(value) => updatePhone('backup', 'shortNumber', value, index)}
											placeholder="99112645"
											placeholderTextColor={colors.textTertiary}
											keyboardType="phone-pad"
											maxLength={15}
										/>
									</View>
									{backupPhone?.fullNumber && <Text style={[styles.inputHint, { color: colors.textTertiary }]}>Full: {backupPhone.fullNumber}</Text>}
								</View>
							))}

							<TouchableOpacity
								onPress={() => {
									const backups = [...getBackupPhones(userData)]
									backups.push({ countryCode: '+216', shortNumber: '', fullNumber: '+216' })
									setUserData((prev) => {
										if (!prev) return null
										return {
											...prev,
											contact: {
												...prev.contact,
												backupPhones: backups
											}
										}
									})
								}}
								style={[styles.addButton, { borderColor: colors.primary }]}
							>
								<Ionicons name="add-circle-outline" size={20} color={colors.primary} />
								<Text style={[styles.addButtonText, { color: colors.primary }]}>Add Backup Phone</Text>
							</TouchableOpacity>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Email</Text>
								<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
									<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
										<Ionicons name="mail-outline" size={20} color={colors.textSecondary} />
									</View>
									<TextInput
										style={[styles.socialInput, { color: colors.text }]}
										value={getEmail(userData) || ''}
										onChangeText={(value) => {
											setUserData((prev) => {
												if (!prev) return null
												return {
													...prev,
													contact: {
														...prev.contact,
														email: value
													}
												}
											})
										}}
										placeholder="email@example.com"
										placeholderTextColor={colors.textTertiary}
										keyboardType="email-address"
										autoCapitalize="none"
									/>
								</View>
							</View>

							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>WhatsApp</Text>
								<View style={[styles.socialInputContainer, { borderColor: isDark ? colors.border : '#E1E8ED', backgroundColor: isDark ? colors.card : '#FAFBFC' }]}>
									<View style={[styles.socialIconBadge, { backgroundColor: '#25D36615' }]}>
										<Ionicons name="logo-whatsapp" size={20} color="#25D366" />
									</View>
									<TextInput
										style={[styles.socialInput, { color: colors.text }]}
										value={userData.contact?.whatsapp || ''}
										onChangeText={(value) => {
											setUserData((prev) => {
												if (!prev) return null
												return {
													...prev,
													contact: {
														...prev.contact,
														whatsapp: value
													}
												}
											})
										}}
										placeholder="+21699112618"
										placeholderTextColor={colors.textTertiary}
										keyboardType="phone-pad"
									/>
								</View>
							</View>
						</>
					) : (
						<>
							{getPhone(userData)?.fullNumber && (
								<InfoItem
									label="Primary Phone"
									value={getPhone(userData)?.fullNumber || 'Not set'}
									icon="call"
									styles={styles}
									iconColor={colors.primary}
									onPress={() => Linking.openURL(`tel:${getPhone(userData)?.fullNumber}`).catch(() => {})}
									onCopy={async () => {
										await Clipboard.setStringAsync(getPhone(userData)?.fullNumber || '')
										showAlert('Copied', 'Phone number copied to clipboard')
									}}
								/>
							)}
							{getBackupPhones(userData).map((backupPhone: any, index: number) => (
								<InfoItem
									key={index}
									label={`Backup Phone ${index + 1}`}
									value={backupPhone?.fullNumber || 'Not set'}
									icon="call-outline"
									styles={styles}
									iconColor={colors.info}
									onPress={() => Linking.openURL(`tel:${backupPhone?.fullNumber}`).catch(() => {})}
									onCopy={async () => {
										await Clipboard.setStringAsync(backupPhone?.fullNumber || '')
										showAlert('Copied', 'Phone number copied to clipboard')
									}}
								/>
							))}
							{getEmail(userData) && (
								<InfoItem
									label="Email"
									value={getEmail(userData) || 'Not set'}
									icon="mail"
									styles={styles}
									iconColor={colors.primary}
									onPress={() => Linking.openURL(`mailto:${getEmail(userData)}`).catch(() => {})}
									onCopy={async () => {
										await Clipboard.setStringAsync(getEmail(userData) || '')
										showAlert('Copied', 'Email copied to clipboard')
									}}
								/>
							)}
							{userData.contact?.whatsapp && (
								<InfoItem
									label="WhatsApp"
									value={userData.contact.whatsapp}
									icon="logo-whatsapp"
									styles={styles}
									iconColor="#25D366"
									onPress={() => Linking.openURL(`https://wa.me/${userData.contact?.whatsapp?.replace(/[^0-9]/g, '')}`).catch(() => {})}
									onCopy={async () => {
										await Clipboard.setStringAsync(userData.contact?.whatsapp || '')
										showAlert('Copied', 'WhatsApp number copied to clipboard')
									}}
								/>
							)}
							{!getPhone(userData)?.fullNumber && !getEmail(userData) && !userData.contact?.whatsapp && getBackupPhones(userData).length === 0 && (
								<Text style={{ fontStyle: 'italic', color: colors.textTertiary, padding: 8 }}>No contact information set.</Text>
							)}
						</>
					)}
				</Section>

				<Section
					title={'⚙️ ' + translate('settings', 'Account Settings')}
					styles={styles}
					isEditing={editMode.settings}
					onEdit={() => toggleEdit('settings', true)}
					onSave={() => saveUserData('settings')}
					onCancel={() => toggleEdit('settings', false)}
				>
					{editMode.settings ? (
						<>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>{translate('app_lang', 'App Language (UI)')}</Text>
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
								<Text style={styles.inputLabel}>{translate('content_lang', 'Content Language (Products/Shops)')}</Text>
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
								<Text style={styles.inputLabel}>{translate('currency_label', 'Currency')}</Text>
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
											<View style={styles.flagContainer}>
												<Text style={styles.flagText}>{currency.symbol}</Text>
											</View>
											<Text style={styles.langLabel}>{currency.label}</Text>
										</TouchableOpacity>
									))}
								</ScrollView>
							</View>
						</>
					) : (
						<>
							<InfoItem
								label={translate('app_lang', 'App Language')}
								value={LANGUAGES.find((l) => l.code === userData.settings?.lang?.app)?.label || translate('not_set', 'Not set')}
								icon="globe"
								styles={styles}
								iconColor={colors.primary}
							/>
							<InfoItem
								label={translate('content_lang', 'Content Language')}
								value={LANGUAGES.find((l) => l.code === userData.settings?.lang?.content)?.label || translate('not_set', 'Not set')}
								icon="language"
								styles={styles}
								iconColor={colors.primary}
							/>
							<InfoItem
								label={translate('currency_label', 'Currency')}
								value={CURRENCIES.find((c) => c.code === userData.settings?.currency)?.label || translate('not_set', 'Not set')}
								icon="cash"
								styles={styles}
								iconColor={colors.primary}
							/>
						</>
					)}
				</Section>

				<Section title="🔐 Account Actions" styles={styles}>
					{userData.role === 'customer' && (
						<TouchableOpacity style={[styles.actionButton, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]} onPress={handleRequestBusiness}>
							<Ionicons name="briefcase-outline" size={20} color={colors.primary} style={{ marginRight: 8 }} />
							<Text style={[styles.actionButtonText, { color: colors.primary }]}>Request Business Account</Text>
						</TouchableOpacity>
					)}
					<TouchableOpacity style={[styles.actionButton, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={handleSwitchUser}>
						<Ionicons name="people-outline" size={20} color={colors.text} style={{ marginRight: 8 }} />
						<Text style={[styles.actionButtonText, { color: colors.text }]}>Switch Account</Text>
					</TouchableOpacity>
					<TouchableOpacity style={[styles.actionButton, styles.logoutButton]} onPress={handleSignOut}>
						<Ionicons name="log-out-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
						<Text style={styles.logoutButtonText}>Sign Out</Text>
					</TouchableOpacity>
				</Section>
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
		scrollView: {
			flex: 1
		},
		contentContainer: {
			padding: 20,
			paddingBottom: 40,
			maxWidth: isWideScreen ? 800 : '100%',
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
			marginBottom: 24,
			padding: 20,
			paddingBottom: 16,
			backgroundColor: colors.card,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: colors.border
		},
		photoContainer: {
			position: 'relative',
			marginBottom: 12
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
			fontSize: 22,
			fontWeight: '700',
			color: colors.text,
			marginBottom: 8
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
			fontSize: 13,
			color: colors.text,
			textAlign: 'center',
			marginBottom: 12,
			paddingHorizontal: 10,
			fontStyle: 'italic',
			lineHeight: 18
		},
		roleStateContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 8,
			marginTop: 4
		},
		roleBadge: {
			paddingHorizontal: 10,
			paddingVertical: 5,
			borderRadius: 10
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
			fontSize: 11,
			fontWeight: '600',
			color: colors.text
		},
		stateBadge: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingHorizontal: 8,
			paddingVertical: 5,
			borderRadius: 10
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
			marginBottom: 32,
			backgroundColor: colors.card,
			borderRadius: 16,
			padding: 20,
			borderWidth: 1,
			borderColor: colors.border
		},
		sectionTitle: {
			fontSize: 18,
			fontWeight: '600',
			color: colors.text,
			marginBottom: 16
		},
		infoItem: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 16
		},
		infoIcon: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: colors.background,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 16
		},
		infoLabel: {
			fontSize: 14,
			color: colors.textSecondary,
			marginBottom: 2
		},
		infoValue: {
			fontSize: 16,
			color: colors.text,
			fontWeight: '500'
		},
		editField: {
			marginBottom: 16
		},
		editInput: {
			padding: 12,
			borderRadius: 8,
			borderWidth: 1,
			borderColor: colors.border,
			color: colors.text,
			fontSize: 16
		},
		socialButton: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 12,
			borderRadius: 8,
			marginBottom: 8,
			borderWidth: 1,
			borderColor: colors.border
		},
		socialIcon: {
			width: 36,
			height: 36,
			borderRadius: 18,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 12
		},
		socialText: {
			fontSize: 16,
			color: colors.text,
			flex: 1
		},
		addButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			padding: 12,
			borderRadius: 8,
			borderWidth: 1,
			borderStyle: 'dashed',
			borderColor: colors.primary,
			marginTop: 8
		},
		addButtonText: {
			color: colors.primary,
			marginLeft: 8,
			fontWeight: '600'
		},
		languageOption: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 12,
			borderRadius: 8,
			marginBottom: 8,
			borderWidth: 1,
			borderColor: colors.border
		},
		languageText: {
			flex: 1,
			fontSize: 16,
			color: colors.text,
			marginLeft: 12
		},
		radioButton: {
			width: 20,
			height: 20,
			borderRadius: 10,
			borderWidth: 2,
			borderColor: colors.primary,
			justifyContent: 'center',
			alignItems: 'center'
		},
		radioButtonSelected: {
			width: 12,
			height: 12,
			borderRadius: 6,
			backgroundColor: colors.primary
		},
		loadingContainer: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			padding: 20
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
		actionButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			padding: 16,
			marginBottom: 12,
			borderRadius: 16,
			borderWidth: 1
		},
		actionButtonText: {
			fontSize: 16,
			fontWeight: '600'
		},
		logoutButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			padding: 16,
			marginTop: 0,
			marginBottom: 0,
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
		},
		phoneInputContainer: {
			flexDirection: 'row',
			alignItems: 'stretch',
			borderRadius: 10,
			borderWidth: 1.5,
			overflow: 'hidden',
			minHeight: 40
		},
		phoneCodeInput: {
			width: '100%',
			paddingHorizontal: 8,
			paddingVertical: 10,
			fontSize: 16,
			textAlign: 'center',
			textAlignVertical: 'center'
		},
		phoneNumberInput: {
			flex: 1,
			paddingHorizontal: 12,
			paddingVertical: 10,
			fontSize: 16,
			textAlignVertical: 'center'
		},
		inputHint: {
			fontSize: 12,
			marginTop: 4,
			marginLeft: 4
		},
		infoIconContainer: {
			width: 40,
			height: 40,
			borderRadius: 20,
			backgroundColor: colors.background,
			justifyContent: 'center',
			alignItems: 'center',
			marginRight: 16
		},
		infoContent: {
			flex: 1
		},
		sectionContent: {
			gap: 0
		},
		locationGrid: {
			flexDirection: 'row',
			gap: 12
		},
		locationCol: {
			flex: 1
		},
		locationSubLabel: {
			fontSize: 12,
			fontWeight: '600',
			color: colors.textTertiary,
			marginBottom: 4
		},
		switchContainer: {
			flexDirection: 'row',
			justifyContent: 'space-between',
			alignItems: 'center',
			marginTop: 8
		},
		switchLabel: {
			fontSize: 14,
			fontWeight: '600',
			color: colors.text
		},
		switch: {
			width: 48,
			height: 28,
			borderRadius: 14,
			backgroundColor: colors.border,
			position: 'relative'
		},
		switchThumb: {
			width: 24,
			height: 24,
			borderRadius: 12,
			backgroundColor: '#fff',
			position: 'absolute',
			top: 2,
			left: 2,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 2 },
			shadowOpacity: 0.2,
			shadowRadius: 2,
			elevation: 2
		}
	})
