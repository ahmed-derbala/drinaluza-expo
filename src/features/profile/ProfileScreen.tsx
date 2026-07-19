import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import {
	View,
	Text,
	StyleSheet,
	ScrollView,
	TextInput,
	TouchableOpacity,
	Image,
	Alert,
	Platform,
	useWindowDimensions,
	ActivityIndicator,
	Linking,
	Modal,
	Animated,
	Easing,
	KeyboardAvoidingView
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import StateBadge from '@/features/common/StateBadge'
import * as Clipboard from 'expo-clipboard'
import { getItem } from '@/core/storage'
import AddressForm from '@/features/common/AddressForm'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useRouter, useFocusEffect, Tabs } from 'expo-router'
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import * as Location from 'expo-location'
import { LinearGradient } from 'expo-linear-gradient'
import { updateMyProfile, switchUser } from '@/features/auth/auth.api'
import { getGeoCoordinates, openDirections } from '@/core/helpers/maps'
import { getPersonalDashboard } from '@/features/dashboard/dashboard.api'
import { useTheme, createShadow, createColorShadow } from '@/core/theme'
import ErrorState from '@/features/common/ErrorState'
import SmartImage from '@/core/SmartImageViewer'
import { HeaderRefreshButton, HeaderActionButton, SmartHeader } from '@/core/smart-header'
import LocalizedFormInput from '@/features/common/LocalizedFormInput'
import MultilingualNameInput from '@/features/common/MultilingualNameInput'
import LoadingState from '@/features/common/LoadingState'
import EmptyState from '@/features/common/EmptyState'
import { showPopup, showAlert, showConfirm } from '@/core/helpers/popup'
import { CenteredModal } from '@/core/smart-modal'
import { requestBusiness } from '@/features/businesses/business.api'
import { useUser } from '@/core/contexts/UserContext'
import { useScrollHandler } from '@/core/hooks/useScrollHandler'
import ReviewSection from '@/features/reviews/Reviews'
import { uploadFile } from '@/core/file'
import { log } from '@/core/log'

import { UserData } from '@/features/profile/profile.interface'
import { PersonalDashboard } from '@/features/dashboard/dashboard.interface'
import { LocalizedName } from '@/features/businesses/businesses.interface'
import { useMyProfile } from '@/features/profile/useMyProfile'
import { LANGUAGES, SOCIAL_PLATFORMS } from '@/core/constants/settings'

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
	const { refreshUser, translate, localize } = useUser()
	const { width } = useWindowDimensions()
	const insets = useSafeAreaInsets()
	const maxWidth = 800
	const isWideScreen = width > maxWidth
	const styles = createStyles(colors, isDark, isWideScreen, width)
	const { onScroll } = useScrollHandler()

	const [userData, setUserData] = useState<UserData | null>(null)
	const [cart, setCart] = useState<any[]>([])
	const [personalDashboard, setPersonalDashboard] = useState<PersonalDashboard | null>(null)

	// ── Cache-first profile ──
	const { profile: cachedProfile, isInitialLoading, isRefreshing, isOffline, refresh: refreshProfile } = useMyProfile()

	const applyProfileToState = useCallback((profile: UserData) => {
		const data = { ...profile }
		if (data.basicInfos?.birthDate) {
			data.basicInfos.birthDate = new Date(data.basicInfos.birthDate)
		}
		setUserData(data)
		setImageError(false)
	}, [])

	const loadCart = async () => {
		try {
			const storedCart = await getItem<any[]>('cart')
			if (storedCart) {
				setCart(storedCart)
			} else {
				setCart([])
			}
		} catch (error) {
			console.error('Failed to load cart:', error)
		}
	}
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
	const [showBusinessModal, setShowBusinessModal] = useState(false)
	const [showSwitchAccountModal, setShowSwitchAccountModal] = useState(false)
	const [businessName, setBusinessName] = useState<LocalizedName>({ en: '', tn_latn: '', tn_arab: '' })
	const [businessLoading, setBusinessLoading] = useState(false)
	const [uploadingPhoto, setUploadingPhoto] = useState(false)
	const [showUrlInput, setShowUrlInput] = useState(false)
	const tnLatnInputRef = useRef<TextInput>(null)
	const tnArabInputRef = useRef<TextInput>(null)

	const loadDashboard = useCallback(async () => {
		try {
			const dashboardRes = await getPersonalDashboard()
			if (dashboardRes?.data?.kind === 'personal') {
				setPersonalDashboard(dashboardRes.data)
			}
		} catch (dashboardErr) {
			console.log('Failed to fetch personal dashboard', dashboardErr)
		}
	}, [])

	// Sync cached profile into editable state as soon as it is available.
	useEffect(() => {
		if (cachedProfile) {
			applyProfileToState(cachedProfile)
		}
	}, [cachedProfile, applyProfileToState])

	useFocusEffect(
		useCallback(() => {
			loadDashboard()
			loadCart()
		}, [loadDashboard])
	)

	const saveUserData = async (sectionKey?: keyof typeof editMode) => {
		if (!userData) return

		try {
			let payload: Record<string, any> = {}

			switch (sectionKey) {
				case 'name': {
					const namePayload: Record<string, string> = {}
					if (userData.name?.en) namePayload.en = userData.name.en
					if (userData.name?.tn_latn) namePayload.tn_latn = userData.name.tn_latn
					if (userData.name?.tn_arab) namePayload.tn_arab = userData.name.tn_arab
					payload = { name: namePayload }
					break
				}
				case 'basic':
					payload = { basicInfos: userData.basicInfos }
					break
				case 'address':
					payload = { address: userData.address }
					break
				case 'location': {
					const locationPayload: any = { ...userData.location }
					if (locationPayload && 'coordinates' in locationPayload && !locationPayload.geo) {
						locationPayload.geo = {
							type: (locationPayload as any).type || 'Point',
							coordinates: (locationPayload as any).coordinates
						}
						delete (locationPayload as any).type
						delete (locationPayload as any).coordinates
					}
					payload = { location: locationPayload }
					break
				}
				case 'social':
					payload = { socialMedia: userData.socialMedia }
					break
				case 'settings':
					payload = { settings: userData.settings }
					break
				case 'phone':
					payload = {
						contact: {
							phone: userData.contact?.phone || userData.phone,
							backupPhones: userData.contact?.backupPhones || userData.backupPhones,
							email: userData.contact?.email || userData.email,
							whatsapp: userData.contact?.whatsapp
						}
					}
					break
				case 'photo':
					payload = { media: userData.media }
					break
				default: {
					const locationPayloadFull: any = { ...userData.location }
					if (locationPayloadFull && 'coordinates' in locationPayloadFull && !locationPayloadFull.geo) {
						locationPayloadFull.geo = {
							type: (locationPayloadFull as any).type || 'Point',
							coordinates: (locationPayloadFull as any).coordinates
						}
						delete (locationPayloadFull as any).type
						delete (locationPayloadFull as any).coordinates
					}
					const defaultNamePayload: Record<string, string> = {}
					if (userData.name?.en) defaultNamePayload.en = userData.name.en
					if (userData.name?.tn_latn) defaultNamePayload.tn_latn = userData.name.tn_latn
					if (userData.name?.tn_arab) defaultNamePayload.tn_arab = userData.name.tn_arab
					payload = {
						name: defaultNamePayload,
						contact: {
							phone: userData.contact?.phone || userData.phone,
							backupPhones: userData.contact?.backupPhones || userData.backupPhones,
							email: userData.contact?.email || userData.email,
							whatsapp: userData.contact?.whatsapp
						},
						basicInfos: userData.basicInfos,
						address: userData.address,
						location: locationPayloadFull,
						settings: userData.settings,
						socialMedia: userData.socialMedia,
						media: userData.media
					}
				}
			}

			const res = await updateMyProfile(payload)
			if (res?.data) {
				applyProfileToState(res.data as UserData)
			}
			if (sectionKey) {
				setEditMode((prev) => ({ ...prev, [sectionKey]: false }))
				if (sectionKey === 'photo') {
					setShowUrlInput(false)
				}
			}
			showAlert(translate('success', 'Success'), translate('profile_updated', 'Profile updated successfully!'))
			await refreshUser()
		} catch (error: any) {
			console.error('Error saving user data:', error)
			const errorMessage = error.response?.data?.message || 'Failed to save profile changes'
			showAlert('Error', errorMessage)
		}
	}

	const toggleEdit = (section: keyof typeof editMode, value: boolean) => {
		if (!value) {
			// If cancelling, revert to cached profile
			if (cachedProfile) {
				applyProfileToState(cachedProfile)
			}
			if (section === 'photo') {
				setShowUrlInput(false)
			}
		}
		setEditMode((prev) => ({ ...prev, [section]: value }))
	}

	const handlePastePhoto = async () => {
		const text = await Clipboard.getStringAsync()
		if (text) {
			updatePhotoUrl(text)
		}
	}

	const handleUploadPhoto = async () => {
		try {
			// Try to dynamically import expo-document-picker
			let DocumentPicker: any
			try {
				DocumentPicker = require('expo-document-picker')
			} catch (e) {
				console.error('expo-document-picker not installed:', e)
				showAlert('Error', 'expo-document-picker is not installed. Install it to enable photo upload.')
				return
			}

			const result = await DocumentPicker.getDocumentAsync({
				type: ['image/*'],
				copyToCacheDirectory: true
			})

			console.log('Document picker result:', result)

			if (result.canceled) {
				return
			}

			const file = result.assets[0]
			if (!file) {
				console.error('No file selected')
				return
			}

			console.log('Selected file:', file)
			setUploadingPhoto(true)

			const uploadResult = await uploadFile({
				uri: file.uri,
				name: file.name,
				type: file.mimeType || 'image/jpeg',
				fileType: 'image',
				fileObj: file, // Pass the actual file object for web
				onProgress: (progress) => {
					console.log(`Upload progress: ${progress}%`)
				}
			})

			console.log('Upload result:', uploadResult)

			if (uploadResult.success && uploadResult.file) {
				// Update the local state with the full file object returned by the upload API
				setUserData((prev) => {
					if (!prev) return null
					return {
						...prev,
						media: {
							...prev.media,
							thumbnail: uploadResult.file
						}
					}
				})
				showAlert('Success', 'Photo uploaded successfully!')

				// We need a slight delay to ensure the state is updated before saveUserData is called,
				// or we can pass the specific payload to saveUserData or updateMyProfile directly.
				// Since saveUserData reads from `userData`, and setState is asynchronous, we will call the API directly here for the photo update.
				try {
					const updatedMedia = {
						...(userData?.media || {}),
						thumbnail: uploadResult.file
					}
					const res = await updateMyProfile({ media: updatedMedia })
					if (res?.data) {
						applyProfileToState(res.data as UserData)
					}
					setEditMode((prev) => ({ ...prev, photo: false }))
					await refreshUser()
				} catch (e) {
					console.error('Error saving profile photo:', e)
				}
			} else if (uploadResult.success && uploadResult.fileUrl) {
				// Fallback if file object is not available but url is
				updatePhotoUrl(uploadResult.fileUrl)
				showAlert('Success', 'Photo uploaded successfully!')
				await saveUserData('photo')
			} else {
				console.error('Upload failed:', uploadResult.error)
				showAlert('Error', uploadResult.error || 'Failed to upload photo')
			}
		} catch (error: any) {
			console.error('Error uploading photo:', error)
			showAlert('Error', error.message || 'Failed to upload photo')
		} finally {
			setUploadingPhoto(false)
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

	const handleSwitchUser = () => {
		setShowSwitchAccountModal(true)
	}

	const confirmSwitchUser = async () => {
		try {
			await switchUser()
			await refreshUser()
			setShowSwitchAccountModal(false)
			router.replace('/auth')
		} catch (error) {
			log({ level: 'error', label: 'profile', message: 'Switch user failed', error })
			await refreshUser()
			setShowSwitchAccountModal(false)
			router.replace('/auth')
		}
	}

	const handleRequestBusiness = () => {
		setBusinessName({ en: '', tn_latn: '', tn_arab: '' })
		setShowBusinessModal(true)
	}

	const updateBusinessName = (field: keyof LocalizedName, value: string) => {
		setBusinessName((prev) => ({ ...prev, [field]: value }))
	}

	const handleSubmitBusinessRequest = async () => {
		if (!businessName.en.trim()) {
			showAlert(translate('error', 'Error'), translate('business_name_required', 'Please enter a business name in English'))
			return
		}
		try {
			setBusinessLoading(true)
			const nameData: LocalizedName = {
				en: businessName.en.trim(),
				tn_latn: businessName.tn_latn?.trim() || undefined,
				tn_arab: businessName.tn_arab?.trim() || undefined
			}
			await requestBusiness(nameData)
			setShowBusinessModal(false)
			showAlert(translate('success', 'Success'), 'Your business request has been sent successfully!')
		} catch (error: any) {
			console.error('Request business failed:', error)
			const errorMessage = error.response?.data?.message || 'Failed to send business request'
			showAlert(translate('error', 'Error'), errorMessage)
		} finally {
			setBusinessLoading(false)
		}
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
				accuracy: Location.Accuracy.Highest
			})

			const { longitude, latitude, accuracy, heading, speed, altitude } = location.coords

			// Update user data with new location and enable sharing
			// Coordinates order: [longitude, latitude] as per GeoJSON spec
			updateField('location', {
				geo: {
					type: 'Point',
					coordinates: [longitude, latitude]
				},
				accuracy,
				heading,
				speed,
				altitude,
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
				geo: {
					type: 'Point',
					coordinates: []
				},
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
			const { longitude, latitude, accuracy, heading, speed, altitude } = location.coords

			// Coordinates order: [longitude, latitude] as per GeoJSON spec
			updateField('location', {
				geo: {
					type: 'Point',
					coordinates: [longitude, latitude]
				},
				accuracy,
				heading,
				speed,
				altitude,
				sharingEnabled: true
			})
			showAlert('Success', `Location sharing enabled: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`)
		} catch (error: any) {
			console.error('Error enabling location sharing:', error)
			showAlert('Error', 'Failed to enable location sharing.')
		}
	}

	const headerActions = useMemo(() => {
		const actions: any[] = []
		if (userData?.role === 'customer') {
			actions.push({
				key: 'request-business',
				iconName: 'briefcase',
				onPress: handleRequestBusiness,
				accessibilityLabel: 'Request Business'
			})
		}
		actions.push({
			key: 'switch-user',
			iconName: 'people',
			iconColor: colors.text,
			backgroundColor: colors.text + '05',
			onPress: handleSwitchUser,
			accessibilityLabel: 'Switch User Account'
		})

		actions.push({
			key: 'cart',
			iconName: 'cart-outline',
			badgeCount: cart.length,
			onPress: () => router.push('/purchases?status=cart'),
			accessibilityLabel: 'View Cart'
		})
		actions.push({
			key: 'refresh',
			onPress: refreshProfile,
			isRefreshing: isRefreshing,
			isOffline: isOffline,
			accessibilityLabel: 'Refresh'
		})
		return actions
	}, [userData?.role, handleRequestBusiness, handleSwitchUser, cart.length, refreshProfile, isRefreshing, isOffline, colors, router])

	if (isInitialLoading) {
		return (
			<View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
			</View>
		)
	}

	if (isOffline && !userData) {
		return (
			<View style={styles.container}>
				<Tabs.Screen options={{ title: 'Profile', headerLeft: () => null }} />
				<ErrorState icon="cloud-offline-outline" iconOnly={true} />
			</View>
		)
	}

	if (!userData) return null

	return (
		<View style={styles.container}>
			<Tabs.Screen options={{ title: translate('profile', 'Profile'), headerLeft: () => null, headerActions: headerActions } as any} />
			<KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
				<SmartHeader.ScrollView
					style={styles.scrollView}
					contentContainerStyle={[styles.contentContainer, { paddingBottom: 120 + insets.bottom }]}
					onScroll={onScroll}
					scrollEventThrottle={16}
					keyboardShouldPersistTaps="handled"
					showsVerticalScrollIndicator={false}
				>
					{/* Profile Header Card */}
					<View style={styles.profileCard}>
						<LinearGradient colors={[colors.primary, colors.primary + '10']} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.profileBanner} />

						<View style={styles.profileCardContent}>
							<View style={styles.photoContainer}>
								<SmartImage source={userData.media?.thumbnail?.url} style={styles.profilePhoto} resizeMode="cover" entityType="user" enableFullscreenPreview={true} />
								<TouchableOpacity style={styles.changePhotoButton} onPress={() => toggleEdit('photo', !editMode.photo)} accessibilityLabel="Change profile photo">
									<Ionicons name={editMode.photo ? 'close' : 'camera'} size={18} color="#fff" />
								</TouchableOpacity>
							</View>

							{editMode.photo && (
								<View style={styles.photoActionsPanel}>
									<TouchableOpacity
										style={[styles.photoPanelButton, { backgroundColor: colors.primary + '15', borderColor: colors.primary + '30' }]}
										onPress={handleUploadPhoto}
										disabled={uploadingPhoto}
										accessibilityLabel="Upload photo from library"
									>
										{uploadingPhoto ? <ActivityIndicator size={16} color={colors.primary} /> : <Ionicons name="cloud-upload-outline" size={16} color={colors.primary} />}
										<Text style={[styles.photoPanelButtonText, { color: colors.primary }]}>{uploadingPhoto ? translate('uploading', 'Uploading...') : translate('upload_image', 'Upload Image')}</Text>
									</TouchableOpacity>

									<TouchableOpacity
										style={[styles.photoPanelButton, { backgroundColor: colors.border + '15', borderColor: colors.border + '30' }]}
										onPress={() => setShowUrlInput(!showUrlInput)}
										accessibilityLabel="Enter photo URL"
									>
										<Ionicons name="link-outline" size={16} color={colors.text} />
										<Text style={[styles.photoPanelButtonText, { color: colors.text }]}>{showUrlInput ? translate('hide_url', 'Hide URL') : translate('enter_url', 'Enter URL')}</Text>
									</TouchableOpacity>
								</View>
							)}

							{editMode.photo && showUrlInput && (
								<View style={styles.urlInputGroup}>
									<Text style={styles.inputLabel}>{translate('photo_url', 'Photo URL')}</Text>
									<View style={[styles.socialInputContainer, { borderColor: colors.primary + '40', backgroundColor: colors.background }]}>
										<TextInput
											style={[styles.socialInput, { fontSize: 13 }]}
											value={userData.media?.thumbnail?.url || ''}
											onChangeText={updatePhotoUrl}
											placeholder="https://example.com/photo.jpg"
											placeholderTextColor={colors.textTertiary}
											selectTextOnFocus
										/>
										<TouchableOpacity
											onPress={handlePastePhoto}
											style={[styles.socialIconBadge, { borderLeftWidth: 1, borderRightWidth: 0, borderLeftColor: colors.border + '20' }]}
											accessibilityLabel="Paste clipboard content"
										>
											<Ionicons name="clipboard-outline" size={18} color={colors.primary} />
										</TouchableOpacity>
										<TouchableOpacity
											onPress={() => saveUserData('photo')}
											style={[styles.socialIconBadge, { borderLeftWidth: 1, borderRightWidth: 0, borderLeftColor: colors.border + '20', backgroundColor: colors.primary + '10' }]}
											accessibilityLabel="Save photo URL"
										>
											<Ionicons name="save-outline" size={18} color={colors.primary} />
										</TouchableOpacity>
										<TouchableOpacity
											onPress={() => toggleEdit('photo', false)}
											style={[styles.socialIconBadge, { borderLeftWidth: 1, borderRightWidth: 0, borderLeftColor: colors.border + '20', backgroundColor: colors.error + '10' }]}
											accessibilityLabel="Cancel URL edit"
										>
											<Ionicons name="close-outline" size={18} color={colors.error} />
										</TouchableOpacity>
									</View>
								</View>
							)}

							<Text style={styles.profileFullName}>{localize(userData.name) || 'User'}</Text>
							<Text style={styles.profileSlug}>@{userData.slug}</Text>

							{userData.basicInfos?.biography && (
								<Text style={styles.profileBio} numberOfLines={2}>
									{userData.basicInfos.biography}
								</Text>
							)}

							{(() => {
								const JoinYear = userData.createdAt ? new Date(userData.createdAt).getFullYear() : null

								if (!JoinYear) return null

								return (
									<View style={styles.metaRow}>
										<View style={styles.metaItem}>
											<Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
											<Text style={styles.metaText}>Joined {JoinYear}</Text>
										</View>
									</View>
								)
							})()}

							<View style={styles.roleStateContainer}>
								<View style={[styles.roleBadge, userData.role === 'business_owner' ? styles.businessOwnerBadge : userData.role === 'super' ? styles.adminBadge : styles.customerBadge]}>
									<Ionicons
										name={userData.role === 'business_owner' ? 'briefcase-outline' : userData.role === 'super' ? 'shield-checkmark-outline' : 'person-outline'}
										size={14}
										color={userData.role === 'business_owner' ? colors.primary : userData.role === 'super' ? colors.warning : colors.success}
									/>
									<Text
										style={[styles.roleBadgeText, userData.role === 'business_owner' ? styles.businessOwnerBadgeText : userData.role === 'super' ? styles.adminBadgeText : styles.customerBadgeText]}
									>
										{userData.role === 'business_owner' ? 'Business Owner' : userData.role === 'super' ? 'Administrator' : 'Customer'}
									</Text>
								</View>
								{userData.state?.code && <StateBadge stateCode={userData.state.code} />}
							</View>
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
								<MultilingualNameInput
									nameEn={userData.name?.en || ''}
									setNameEn={(value) => updateField('en', value, 'name')}
									nameTnLatn={userData.name?.tn_latn || ''}
									setNameTnLatn={(value) => updateField('tn_latn', value, 'name')}
									nameTnArab={userData.name?.tn_arab || ''}
									setNameTnArab={(value) => updateField('tn_arab', value, 'name')}
									labelPrefix="Name"
								/>
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
									<View style={[styles.socialInputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
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
							<AddressForm
								street={userData.address?.street || ''}
								setStreet={(val) => updateField('street', val, 'address')}
								city={userData.address?.city || ''}
								setCity={(val) => updateField('city', val, 'address')}
								region={userData.address?.state || ''}
								setRegion={(val) => updateField('state', val, 'address')}
								postalCode={userData.address?.postalCode || ''}
								setPostalCode={(val) => updateField('postalCode', val, 'address')}
								country={userData.address?.country || ''}
								setCountry={(val) => updateField('country', val, 'address')}
							/>
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
										<View style={[styles.socialInputContainer, { borderColor: colors.border, backgroundColor: colors.card, opacity: userData.location?.sharingEnabled === false ? 0.5 : 1 }]}>
											<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
												<Ionicons name="location" size={20} color={colors.textSecondary} />
											</View>
											<TextInput
												style={[styles.socialInput, { color: colors.text }]}
												value={userData.location?.geo?.coordinates?.[0]?.toString() || ''}
												onChangeText={(value) => {
													if (userData.location?.sharingEnabled === false) return
													const coords = userData.location?.geo?.coordinates || [0, 0]
													const newCoords: [number, number] = [parseFloat(value) || 0, coords[1]]
													// Preserve all location fields, only update coordinates
													updateField('location', {
														...userData.location,
														geo: {
															type: 'Point',
															coordinates: newCoords
														}
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
													borderColor: colors.border,
													backgroundColor: colors.card,
													opacity: userData.location?.sharingEnabled === false ? 0.5 : 1
												}
											]}
										>
											<View style={[styles.socialIconBadge, { backgroundColor: colors.text + '05' }]}>
												<Ionicons name="location" size={20} color={colors.textSecondary} />
											</View>
											<TextInput
												style={[styles.socialInput, { color: colors.text }]}
												value={userData.location?.geo?.coordinates?.[1]?.toString() || ''}
												onChangeText={(value) => {
													if (userData.location?.sharingEnabled === false) return
													const coords = userData.location?.geo?.coordinates || [0, 0]
													const newCoords: [number, number] = [coords[0], parseFloat(value) || 0]
													// Preserve all location fields, only update coordinates
													updateField('location', {
														...userData.location,
														geo: {
															type: 'Point',
															coordinates: newCoords
														}
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
										<TouchableOpacity
											style={[styles.switch, userData.location?.sharingEnabled ? { backgroundColor: colors.primary } : { backgroundColor: colors.border }]}
											onPress={handleToggleSharing}
										>
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
								{getGeoCoordinates(userData.location) && (
									<>
										<InfoItem
											label="GPS Coordinates"
											value={(() => {
												const coords = getGeoCoordinates(userData.location)
												return coords ? `${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}` : translate('not_set', 'Not set')
											})()}
											icon="location"
											styles={styles}
											iconColor={colors.primary}
											onPress={() => openDirections(userData.location, userData.address)}
											onCopy={async () => {
												const coords = getGeoCoordinates(userData.location)
												if (coords) {
													const [longitude, latitude] = coords
													await Clipboard.setStringAsync(`${latitude}, ${longitude}`)
													showAlert('Copied', 'Location coordinates copied to clipboard')
												}
											}}
										/>
										<TouchableOpacity style={[styles.iconButton, { alignSelf: 'center', marginTop: 16 }]} onPress={() => openDirections(userData.location, userData.address)}>
											<Ionicons name="map" size={24} color={colors.primary} />
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
								{!getGeoCoordinates(userData.location) && <Text style={{ fontStyle: 'italic', color: colors.textTertiary, padding: 8 }}>No location information set.</Text>}
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
									<View style={[styles.socialInputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
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
									<View style={[styles.phoneInputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
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
										<View style={[styles.phoneInputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
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
									<View style={[styles.socialInputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
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
									<View style={[styles.socialInputContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
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
									<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 4 }}>
										{LANGUAGES.map((lang) => (
											<TouchableOpacity
												key={lang.code}
												style={[
													styles.langOption,
													{ borderColor: colors.border, backgroundColor: colors.card },
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
									</View>
								</View>
								<View style={styles.inputGroup}>
									<Text style={styles.inputLabel}>{translate('content_lang', 'Content Language (Products/Businesses)')}</Text>
									<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingVertical: 4 }}>
										{LANGUAGES.map((lang) => (
											<TouchableOpacity
												key={lang.code}
												style={[
													styles.langOption,
													{ borderColor: colors.border, backgroundColor: colors.card },
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
									</View>
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
							</>
						)}
					</Section>

					{/* Customer Dashboard Data */}
					{personalDashboard && (
						<Section title={'📊 ' + translate('dashboard.top_businesses', 'Your Top Businesses')} styles={styles}>
							<View style={{ gap: 16 }}>
								<View style={[styles.rankPanel, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]}>
									<Text style={[styles.rankPanelTitle, { color: colors.text }]}>{translate('dashboard.top_businesses_frequent', 'Most Frequent')}</Text>
									{personalDashboard.topBusinesses.frequent.length === 0 ? (
										<Text style={[styles.rankEmpty, { color: colors.textTertiary }]}>{translate('dashboard.no_businesses_yet', 'No businesses yet')}</Text>
									) : (
										personalDashboard.topBusinesses.frequent.slice(0, 3).map((item, index) => (
											<View
												key={item._id || index}
												style={[styles.rankRow, { borderColor: `${colors.border}60` }, index === Math.min(personalDashboard.topBusinesses.frequent.length, 3) - 1 && { borderBottomWidth: 0 }]}
											>
												<SmartImage source={item.media?.thumbnail?.url} style={styles.rankAvatar} entityType="business" />
												<Text style={[styles.rankName, { color: colors.text }]} numberOfLines={1}>
													{item.name ? localize(item.name) : item.slug || '—'}
												</Text>
												{item.count !== undefined && (
													<View style={[styles.rankMetric, { backgroundColor: `${colors.primary}15` }]}>
														<Text style={[styles.rankMetricText, { color: colors.primary }]}>{item.count}</Text>
													</View>
												)}
											</View>
										))
									)}
								</View>
								<View style={[styles.rankPanel, { backgroundColor: colors.card, borderColor: colors.info || '#3B82F6' }]}>
									<Text style={[styles.rankPanelTitle, { color: colors.text }]}>{translate('dashboard.top_businesses_new', 'Recently Discovered')}</Text>
									{personalDashboard.topBusinesses.new.length === 0 ? (
										<Text style={[styles.rankEmpty, { color: colors.textTertiary }]}>{translate('dashboard.no_businesses_yet', 'No businesses yet')}</Text>
									) : (
										personalDashboard.topBusinesses.new.slice(0, 3).map((item, index) => (
											<View
												key={item._id || index}
												style={[styles.rankRow, { borderColor: `${colors.border}60` }, index === Math.min(personalDashboard.topBusinesses.new.length, 3) - 1 && { borderBottomWidth: 0 }]}
											>
												<SmartImage source={item.media?.thumbnail?.url} style={styles.rankAvatar} entityType="business" />
												<Text style={[styles.rankName, { color: colors.text }]} numberOfLines={1}>
													{item.name ? localize(item.name) : item.slug || '—'}
												</Text>
											</View>
										))
									)}
								</View>
							</View>
						</Section>
					)}

					{/* Reviews Section */}
					{userData._id && <ReviewSection targetResource="users" targetId={userData._id} targetName={localize(userData.name)} />}
				</SmartHeader.ScrollView>
			</KeyboardAvoidingView>

			{/* Business Name Modal */}
			<Modal visible={showBusinessModal} transparent animationType="fade" onRequestClose={() => !businessLoading && setShowBusinessModal(false)}>
				<View style={styles.modalOverlay}>
					<TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => !businessLoading && setShowBusinessModal(false)} />
					<KeyboardAvoidingView style={{ width: '100%' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
						<ScrollView
							style={{ width: '100%' }}
							contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }}
							keyboardShouldPersistTaps="handled"
							showsVerticalScrollIndicator={false}
						>
							<View style={[styles.businessModalContent, { backgroundColor: colors.card }]}>
								<View style={styles.businessModalHeader}>
									<View style={[styles.businessModalIcon, { backgroundColor: colors.primary + '15' }]}>
										<Ionicons name="briefcase" size={32} color={colors.primary} />
									</View>
									<Text style={[styles.businessModalTitle, { color: colors.text }]}>{translate('create_business', 'Create Business')}</Text>
									<Text style={[styles.businessModalSubtitle, { color: colors.textSecondary }]}>{translate('enter_business_name', 'Enter a name for your business in multiple languages')}</Text>
								</View>
								<View style={styles.businessInputContainer}>
									{/* English Name (Required) */}
									<View style={styles.languageInputGroup}>
										<View style={styles.inputLabelRow}>
											<Text style={[styles.inputLabel, { color: colors.text }]}>English</Text>
											<Text style={[styles.required, { color: '#EF4444' }]}>*</Text>
										</View>
										<View style={[styles.languageInputWrapper, { borderColor: businessName.en ? colors.primary : colors.border, backgroundColor: colors.background }]}>
											<View style={[styles.languageIcon, { backgroundColor: colors.primary + '10' }]}>
												<Text style={styles.flagText}>🇺🇸</Text>
											</View>
											<TextInput
												style={[styles.languageInput, { color: colors.text }]}
												value={businessName.en}
												onChangeText={(text) => updateBusinessName('en', text)}
												placeholder="e.g., Fresh Seafood Market"
												placeholderTextColor={colors.textSecondary}
												autoFocus
												maxLength={50}
												editable={!businessLoading}
												returnKeyType="next"
												onSubmitEditing={() => tnLatnInputRef.current?.focus()}
											/>
										</View>
									</View>

									{/* Tunisian Latin (Optional) */}
									<View style={styles.languageInputGroup}>
										<View style={styles.inputLabelRow}>
											<Text style={[styles.inputLabel, { color: colors.text }]}>Tunisian (Latin)</Text>
											<Text style={[styles.optional, { color: colors.textSecondary }]}>(optional)</Text>
										</View>
										<View style={[styles.languageInputWrapper, { borderColor: businessName.tn_latn ? colors.primary : colors.border, backgroundColor: colors.background }]}>
											<View style={[styles.languageIcon, { backgroundColor: colors.primary + '10' }]}>
												<Text style={styles.flagText}>🇹🇳</Text>
											</View>
											<TextInput
												ref={tnLatnInputRef}
												style={[styles.languageInput, { color: colors.text }]}
												value={businessName.tn_latn}
												onChangeText={(text) => updateBusinessName('tn_latn', text)}
												placeholder="e.g., Souk el 7out"
												placeholderTextColor={colors.textSecondary}
												maxLength={50}
												editable={!businessLoading}
												returnKeyType="next"
												onSubmitEditing={() => tnArabInputRef.current?.focus()}
											/>
										</View>
									</View>

									{/* Tunisian Arabic (Optional) */}
									<View style={styles.languageInputGroup}>
										<View style={styles.inputLabelRow}>
											<Text style={[styles.inputLabel, { color: colors.text }]}>Tunisian (Arabic)</Text>
											<Text style={[styles.optional, { color: colors.textSecondary }]}>(optional)</Text>
										</View>
										<View style={[styles.languageInputWrapper, { borderColor: businessName.tn_arab ? colors.primary : colors.border, backgroundColor: colors.background }]}>
											<View style={[styles.languageIcon, { backgroundColor: colors.primary + '10' }]}>
												<Text style={styles.flagText}>🇹🇳</Text>
											</View>
											<TextInput
												ref={tnArabInputRef}
												style={[styles.languageInput, { color: colors.text, textAlign: 'right' }]}
												value={businessName.tn_arab}
												onChangeText={(text) => updateBusinessName('tn_arab', text)}
												placeholder="مثال: سوق الحوت"
												placeholderTextColor={colors.textSecondary}
												maxLength={50}
												editable={!businessLoading}
												returnKeyType="done"
												onSubmitEditing={handleSubmitBusinessRequest}
											/>
										</View>
									</View>
								</View>
								<View style={styles.businessModalActions}>
									<TouchableOpacity
										style={[styles.businessModalButton, styles.businessModalCancelButton, { borderColor: colors.border }]}
										onPress={() => setShowBusinessModal(false)}
										disabled={businessLoading}
									>
										<Text style={[styles.businessModalButtonText, { color: colors.textSecondary }]}>{translate('cancel', 'Cancel')}</Text>
									</TouchableOpacity>
									<TouchableOpacity
										style={[styles.businessModalButton, styles.businessModalSubmitButton, { backgroundColor: businessName.en.trim() ? colors.primary : colors.primary + '50' }]}
										onPress={handleSubmitBusinessRequest}
										disabled={businessLoading || !businessName.en.trim()}
									>
										{businessLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={[styles.businessModalButtonText, { color: '#fff' }]}>{translate('submit', 'Submit')}</Text>}
									</TouchableOpacity>
								</View>
							</View>
						</ScrollView>
					</KeyboardAvoidingView>
				</View>
			</Modal>

			{/* Switch Account Modal */}
			<CenteredModal
				visible={showSwitchAccountModal}
				onClose={() => setShowSwitchAccountModal(false)}
				title={translate('switch_account', 'Switch User')}
				headerIcon={
					<View style={[styles.switchAccountModalIcon, { backgroundColor: colors.primary + '15' }]}>
						<Ionicons name="people" size={24} color={colors.primary} />
					</View>
				}
				footer={
					<View style={styles.switchAccountModalActions}>
						<TouchableOpacity style={[styles.switchAccountModalButton, styles.switchAccountModalCancelButton, { borderColor: colors.border }]} onPress={() => setShowSwitchAccountModal(false)}>
							<Text style={[styles.switchAccountModalButtonText, { color: colors.textSecondary }]}>{translate('cancel', 'Cancel')}</Text>
						</TouchableOpacity>
						<TouchableOpacity style={[styles.switchAccountModalButton, styles.switchAccountModalSubmitButton, { backgroundColor: colors.primary }]} onPress={confirmSwitchUser}>
							<Text style={[styles.switchAccountModalButtonText, { color: '#fff' }]}>{translate('switch', 'Switch')}</Text>
						</TouchableOpacity>
					</View>
				}
			>
				<View style={styles.switchAccountModalContent}>
					<Text style={[styles.switchAccountModalDescription, { color: colors.text }]}>
						{translate('switch_account_description', 'You will be redirected to the login screen where you can select a different account or sign in with a new one.')}
					</Text>
				</View>
			</CenteredModal>
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
			paddingBottom: 90,
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
			justifyContent: 'center',
			alignItems: 'center'
		},
		headerActionButton: {
			width: 36,
			height: 36,
			borderRadius: 10,
			justifyContent: 'center',
			alignItems: 'center'
		},
		profileCard: {
			alignItems: 'center',
			marginBottom: 24,
			backgroundColor: colors.card,
			borderRadius: 20,
			borderWidth: 1,
			borderColor: colors.info || '#3B82F6',
			overflow: 'hidden'
		},
		profileBanner: {
			height: 120,
			width: '100%'
		},
		profileCardContent: {
			alignItems: 'center',
			paddingHorizontal: 20,
			paddingBottom: 20,
			width: '100%'
		},
		photoContainer: {
			position: 'relative',
			marginTop: -55,
			marginBottom: 16
		},
		profilePhoto: {
			width: 100,
			height: 100,
			borderRadius: 50
		},
		placeholderPhoto: {
			width: 100,
			height: 100,
			borderRadius: 50,
			backgroundColor: colors.primary,
			justifyContent: 'center',
			alignItems: 'center'
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
			width: 36,
			height: 36,
			borderRadius: 18,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 3,
			borderColor: colors.card,
			...createShadow({ offsetY: 2, opacity: 0.25, radius: 3, elevation: 3 })
		},
		photoActionsPanel: {
			flexDirection: 'row',
			justifyContent: 'center',
			gap: 12,
			width: '100%',
			marginBottom: 16,
			paddingHorizontal: 20
		},
		photoPanelButton: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 8,
			flex: 1,
			paddingVertical: 10,
			borderRadius: 12,
			borderWidth: 1,
			minHeight: 40
		},
		photoPanelButtonText: {
			fontSize: 13,
			fontWeight: '600'
		},
		urlInputGroup: {
			width: '100%',
			marginBottom: 16,
			paddingHorizontal: 20
		},
		profileFullName: {
			fontSize: 22,
			fontWeight: '700',
			color: colors.text,
			textAlign: 'center',
			marginBottom: 4
		},
		profileSlug: {
			fontSize: 14,
			fontWeight: '500',
			color: colors.textSecondary,
			textAlign: 'center',
			marginBottom: 12
		},
		profileBio: {
			fontSize: 14,
			color: colors.textSecondary,
			textAlign: 'center',
			paddingHorizontal: 16,
			marginBottom: 16,
			fontStyle: 'italic',
			lineHeight: 20
		},
		metaRow: {
			flexDirection: 'row',
			flexWrap: 'wrap',
			justifyContent: 'center',
			alignItems: 'center',
			gap: 16,
			marginBottom: 16
		},
		metaItem: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6
		},
		metaText: {
			fontSize: 12,
			color: colors.textSecondary,
			fontWeight: '500'
		},
		roleStateContainer: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'center',
			gap: 10,
			marginTop: 4
		},
		roleBadge: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 6,
			paddingHorizontal: 12,
			paddingVertical: 6,
			borderRadius: 12,
			borderWidth: 1
		},
		businessOwnerBadge: {
			backgroundColor: colors.primary + '15',
			borderColor: colors.primary + '30'
		},
		businessOwnerBadgeText: {
			color: colors.primary
		},
		adminBadge: {
			backgroundColor: colors.warning + '15',
			borderColor: colors.warning + '30'
		},
		adminBadgeText: {
			color: colors.warning
		},
		customerBadge: {
			backgroundColor: colors.success + '15',
			borderColor: colors.success + '30'
		},
		customerBadgeText: {
			color: colors.success
		},
		roleBadgeText: {
			fontSize: 12,
			fontWeight: '600'
		},
		section: {
			marginBottom: 32,
			backgroundColor: colors.card,
			borderRadius: 16,
			padding: 20,
			borderWidth: 1,
			borderColor: colors.info || '#3B82F6'
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
			backgroundColor: colors.card,
			color: colors.text,
			fontSize: 14,
			paddingHorizontal: 12,
			paddingVertical: Platform.OS === 'android' ? 0 : 6,
			height: 36,
			textAlignVertical: 'center',
			includeFontPadding: false,
			borderRadius: 12,
			borderWidth: 2,
			borderColor: colors.border,
			...createColorShadow({ color: colors.primary, offsetY: 0, opacity: 0, radius: 0, elevation: 0 })
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
		actionRow: {
			flexDirection: 'row',
			justifyContent: 'center',
			gap: 20,
			marginTop: 8
		},
		iconButton: {
			width: 60,
			height: 60,
			borderRadius: 30,
			justifyContent: 'center',
			alignItems: 'center',
			borderWidth: 1,
			borderColor: 'rgba(0,0,0,0.05)'
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
			...createShadow({ offsetY: 1, opacity: 0.1, radius: 1, elevation: 1 })
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
			...createShadow({ offsetY: 2, opacity: 0.2, radius: 2, elevation: 2 })
		},
		// Business Modal Styles
		modalOverlay: {
			flex: 1,
			justifyContent: 'center',
			alignItems: 'center',
			backgroundColor: 'rgba(0, 0, 0, 0.5)'
		},
		modalBackdrop: {
			position: 'absolute',
			top: 0,
			left: 0,
			right: 0,
			bottom: 0
		},
		businessModalContent: {
			width: isWideScreen ? 500 : (width || 400) - 40,
			maxWidth: 500,
			borderRadius: 16,
			padding: 24,
			...createShadow({ offsetY: 4, opacity: 0.3, radius: 8, elevation: 8 })
		},
		businessModalHeader: {
			alignItems: 'center',
			marginBottom: 20
		},
		businessModalIcon: {
			width: 64,
			height: 64,
			borderRadius: 32,
			justifyContent: 'center',
			alignItems: 'center',
			marginBottom: 16
		},
		businessModalTitle: {
			fontSize: 20,
			fontWeight: '700',
			marginBottom: 8
		},
		businessModalSubtitle: {
			fontSize: 14,
			textAlign: 'center'
		},
		businessInputContainer: {
			marginBottom: 20,
			maxHeight: 300
		},
		languageInputGroup: {
			marginBottom: 16
		},
		inputLabelRow: {
			flexDirection: 'row',
			alignItems: 'center',
			marginBottom: 8
		},
		required: {
			marginLeft: 4,
			fontSize: 14,
			fontWeight: '600'
		},
		optional: {
			marginLeft: 4,
			fontSize: 12,
			fontWeight: '500'
		},
		languageInputWrapper: {
			flexDirection: 'row',
			alignItems: 'center',
			borderWidth: 1,
			borderRadius: 12,
			overflow: 'hidden'
		},
		languageIcon: {
			width: 48,
			height: 48,
			justifyContent: 'center',
			alignItems: 'center'
		},
		languageInput: {
			flex: 1,
			padding: 12,
			fontSize: 16,
			fontWeight: '500'
		},
		businessModalActions: {
			flexDirection: 'row',
			gap: 12
		},
		businessModalButton: {
			flex: 1,
			padding: 16,
			borderRadius: 12,
			alignItems: 'center',
			justifyContent: 'center',
			minHeight: 48
		},
		businessModalCancelButton: {
			borderWidth: 1,
			backgroundColor: 'transparent'
		},
		businessModalSubmitButton: {
			// backgroundColor set dynamically
		},
		businessModalButtonText: {
			fontSize: 16,
			fontWeight: '600'
		},
		// Switch Account Modal Styles
		switchAccountModalContent: {
			alignItems: 'center',
			paddingTop: 20,
			paddingBottom: 12,
			width: '100%'
		},
		switchAccountModalIcon: {
			width: 40,
			height: 40,
			borderRadius: 20,
			justifyContent: 'center',
			alignItems: 'center'
		},
		switchAccountModalDescription: {
			fontSize: 16,
			fontWeight: '500',
			lineHeight: 22,
			textAlign: 'center',
			width: '100%'
		},
		switchAccountModalActions: {
			flexDirection: isWideScreen ? 'row' : 'column',
			gap: 12,
			width: '100%'
		},
		switchAccountModalButton: {
			flex: isWideScreen ? 1 : undefined,
			padding: 16,
			borderRadius: 12,
			alignItems: 'center',
			justifyContent: 'center',
			minHeight: 48
		},
		switchAccountModalCancelButton: {
			borderWidth: 1,
			backgroundColor: 'transparent'
		},
		switchAccountModalSubmitButton: {
			// backgroundColor set dynamically
		},
		switchAccountModalButtonText: {
			fontSize: 16,
			fontWeight: '600'
		},
		rankPanel: {
			flex: 1,
			borderRadius: 16,
			borderWidth: 1,
			padding: 16,
			minHeight: 120,
			marginBottom: 12
		},
		rankPanelTitle: {
			fontSize: 14,
			fontWeight: '700',
			marginBottom: 12
		},
		rankEmpty: {
			fontSize: 12,
			lineHeight: 20,
			paddingVertical: 10,
			fontStyle: 'italic'
		},
		rankRow: {
			flexDirection: 'row',
			alignItems: 'center',
			gap: 10,
			paddingVertical: 10,
			borderBottomWidth: 1
		},
		rankAvatar: {
			width: 32,
			height: 32,
			borderRadius: 8
		},
		rankName: {
			flex: 1,
			fontSize: 13,
			fontWeight: '600'
		},
		rankMetric: {
			paddingHorizontal: 10,
			paddingVertical: 4,
			borderRadius: 10
		},
		rankMetricText: {
			fontSize: 11,
			fontWeight: '800'
		}
	})
