import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import {
	View,
	Text,
	FlatList,
	StyleSheet,
	RefreshControl,
	TouchableOpacity,
	Modal,
	TextInput,
	Alert,
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	ViewStyle,
	TextInput as RNTextInput,
	TextStyle,
	Image
} from 'react-native'
import { useRouter } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { getMyBusinesses, createBusiness } from '../businesses/businesses.api'
import { Business, CreateBusinessRequest } from '../businesses/businesses.interface'
import { useUser } from '../../core/contexts/UserContext'
import { useScrollHandler } from '../../core/hooks/useScrollHandler'
import { uploadFile } from '../../core/fileHandler'
import { showAlert } from '../../core/helpers/popup'

type BusinessesStackParamList = {
	BusinessDetails: { businessId: string }
	// Add other screens in the businesses stack here
}

type MyBusinessesTabNavigationProp = NativeStackNavigationProp<BusinessesStackParamList, 'BusinessDetails'>

interface MyBusinessesTabProps {
	navigation?: MyBusinessesTabNavigationProp
}
import { useFocusEffect } from '@react-navigation/native'
import { useTheme } from '../../core/contexts/ThemeContext'
import { debounce } from 'lodash'

interface ThemeType {
	primary: string
	text: string
	textSecondary: string
	background: string
	card: string
	border: string
}

interface BusinessItemProps {
	business: Business
	isNavigating: boolean
	onPress: (business: Business) => void
	theme: ThemeType
}

interface CreateBusinessFormProps {
	visible: boolean
	loading: boolean
	businessNameEn: string
	businessNameTnLatn: string
	businessNameTnArab: string
	deliveryRadius: string
	photoUrl: string
	uploadingPhoto: boolean
	editMode: { photo: boolean }
	onBusinessNameEnChange: (text: string) => void
	onBusinessNameTnLatnChange: (text: string) => void
	onBusinessNameTnArabChange: (text: string) => void
	onDeliveryRadiusChange: (text: string) => void
	onPhotoUrlChange: (url: string) => void
	onUploadPhoto: () => void
	onToggleEditMode: (field: 'photo') => void
	onSubmit: () => void
	onDismiss: () => void
	theme: ThemeType & { textSecondary: string }
}

interface BusinessState {
	businesses: Business[]
	loading: boolean
	refreshing: boolean
	modalVisible: boolean
	businessNameEn: string
	businessNameTnLatn: string
	businessNameTnArab: string
	deliveryRadius: string
	photoUrl: string
	uploadingPhoto: boolean
	editMode: { photo: boolean }
	creating: boolean
	navigatingBusinessId: string | null
	error: string | null
	pagination: {
		totalDocs: number
		totalPages: number
		page: number
		limit: number
		hasNextPage: boolean
		hasPrevPage: boolean
	}
}

const DEBOUNCE_DELAY = 300
const MIN_SHOP_NAME_LENGTH = 3
const MAX_SHOP_NAME_LENGTH = 50

const BusinessItem: React.FC<BusinessItemProps> = React.memo(({ business, isNavigating, onPress, theme }) => {
	const { localize, translate } = useUser()

	const isActive = business.state?.code === 'active'
	const thumbnailUrl = business.media?.thumbnail?.url
	const rating = business.rating?.average || 0
	const ratingCount = business.rating?.count || 0
	const phone = business.contact?.phone?.fullNumber
	const whatsapp = business.contact?.whatsapp

	return (
		<TouchableOpacity onPress={() => onPress(business)} disabled={isNavigating} activeOpacity={0.8}>
			<View style={[styles.card, isNavigating && styles.disabledCard, { backgroundColor: theme.card, borderColor: theme.primary + '30' }]}>
				<LinearGradient colors={[`${theme.primary}10`, `transparent`]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardGradient} />

				<View style={styles.businessContent}>
					<View style={styles.businessHeader}>
						<View style={styles.businessIconContainer}>
							{thumbnailUrl ? (
								<Image source={{ uri: thumbnailUrl }} style={styles.businessThumbnail} />
							) : (
								<LinearGradient colors={[theme.primary, `${theme.primary}CC`]} style={styles.businessIconGradient}>
									<Ionicons name="storefront" size={24} color="#fff" />
								</LinearGradient>
							)}
						</View>
						<View style={styles.businessInfo}>
							<Text style={[styles.businessName, { color: theme.text }]} numberOfLines={1}>
								{localize(business.name) || translate('unnamed_business', 'Unnamed Business')}
							</Text>
							<Text style={[styles.businessSlug, { color: theme.textSecondary }]}>@{business.slug}</Text>
							{rating > 0 && (
								<View style={styles.ratingContainer}>
									<Ionicons name="star" size={12} color="#FFD700" />
									<Text style={[styles.ratingText, { color: theme.textSecondary }]}>{rating.toFixed(1)}</Text>
									<Text style={[styles.ratingCount, { color: theme.textSecondary }]}>({ratingCount})</Text>
								</View>
							)}
						</View>
						<View style={[styles.statusBadge, { backgroundColor: isActive ? '#10B98115' : '#EF444415' }]}>
							<View style={[styles.statusDot, { backgroundColor: isActive ? '#10B981' : '#EF4444' }]} />
							<Text style={[styles.statusText, { color: isActive ? '#10B981' : '#EF4444' }]}>{isActive ? 'Active' : 'Inactive'}</Text>
						</View>
					</View>

					<View style={styles.businessMetaGrid}>
						<View style={styles.metaItem}>
							<Ionicons name="location-outline" size={16} color={theme.textSecondary} />
							<Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
								{business.address?.city || 'No location set'}
							</Text>
						</View>
						{business.deliveryRadiusKm && (
							<View style={styles.metaItem}>
								<Ionicons name="navigate-outline" size={16} color={theme.textSecondary} />
								<Text style={[styles.metaText, { color: theme.textSecondary }]}>{business.deliveryRadiusKm} km radius</Text>
							</View>
						)}
					</View>

					{(phone || whatsapp) && (
						<View style={styles.contactRow}>
							{phone && (
								<View style={styles.contactItem}>
									<Ionicons name="call-outline" size={14} color={theme.textSecondary} />
									<Text style={[styles.contactText, { color: theme.textSecondary }]} numberOfLines={1}>
										{phone}
									</Text>
								</View>
							)}
							{whatsapp && (
								<View style={styles.contactItem}>
									<Ionicons name="logo-whatsapp" size={14} color="#25D366" />
									<Text style={[styles.contactText, { color: theme.textSecondary }]} numberOfLines={1}>
										WhatsApp
									</Text>
								</View>
							)}
						</View>
					)}

					<View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
						<Text style={[styles.tapHint, { color: theme.primary }]}>{isNavigating ? 'Opening...' : 'View Details'}</Text>
						{isNavigating ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name="arrow-forward" size={16} color={theme.primary} />}
					</View>
				</View>
			</View>
		</TouchableOpacity>
	)
})

const CreateBusinessForm: React.FC<CreateBusinessFormProps> = React.memo(
	({
		visible,
		loading,
		businessNameEn,
		businessNameTnLatn,
		businessNameTnArab,
		deliveryRadius,
		photoUrl,
		uploadingPhoto,
		editMode,
		onBusinessNameEnChange,
		onBusinessNameTnLatnChange,
		onBusinessNameTnArabChange,
		onDeliveryRadiusChange,
		onPhotoUrlChange,
		onUploadPhoto,
		onToggleEditMode,
		onSubmit,
		onDismiss,
		theme
	}) => {
		const tnLatnInputRef = useRef<RNTextInput>(null)
		const tnArabInputRef = useRef<RNTextInput>(null)
		const deliveryRadiusInputRef = useRef<RNTextInput>(null)

		const isFormValid = businessNameEn.trim().length >= MIN_SHOP_NAME_LENGTH && businessNameEn.trim().length <= MAX_SHOP_NAME_LENGTH
		const deliveryRadiusNum = parseFloat(deliveryRadius) || 0
		const isDeliveryValid = deliveryRadiusNum > 0 && deliveryRadiusNum <= 100

		return (
			<Modal visible={visible} transparent animationType="slide" onRequestClose={onDismiss}>
				<KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
					<TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={onDismiss} />
					<View style={[styles.modalContent, { backgroundColor: theme.card }]}>
						{/* Header */}
						<View style={styles.modalHeader}>
							<View style={[styles.modalIconContainer, { backgroundColor: theme.primary + '15' }]}>
								<Text style={styles.modalIcon}>🏪</Text>
							</View>
							<Text style={[styles.modalTitle, { color: theme.text }]}>Create New Business</Text>
							<Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>Set up your business in multiple languages</Text>
						</View>

						<ScrollView style={styles.modalForm} showsVerticalScrollIndicator={false}>
							{/* Business Photo Upload */}
							<View style={[styles.photoUploadSection, { alignItems: 'center', marginBottom: 24 }]}>
								<View style={styles.photoContainer}>
									{photoUrl ? (
										<Image source={{ uri: photoUrl }} style={styles.profilePhoto} />
									) : (
										<LinearGradient colors={[theme.primary, `${theme.primary}CC`]} style={styles.profilePhoto}>
											<Ionicons name="storefront" size={40} color="#fff" />
										</LinearGradient>
									)}
									<TouchableOpacity style={[styles.changePhotoButton, editMode.photo && { backgroundColor: theme.primary }]} onPress={() => onToggleEditMode('photo')}>
										<Ionicons name={editMode.photo ? 'checkmark' : 'camera'} size={20} color="#fff" />
									</TouchableOpacity>
									<TouchableOpacity style={[styles.uploadPhotoButton, { backgroundColor: theme.primary }]} onPress={onUploadPhoto} disabled={uploadingPhoto}>
										{uploadingPhoto ? <ActivityIndicator size={16} color="#fff" /> : <Ionicons name="cloud-upload-outline" size={20} color="#fff" />}
									</TouchableOpacity>
								</View>

								{editMode.photo && (
									<View style={[styles.photoInputGroup, { width: '100%', paddingHorizontal: 20 }]}>
										<Text style={styles.photoInputLabel}>Photo URL</Text>
										<View style={[styles.socialInputContainer, { borderColor: theme.primary + '40', backgroundColor: theme.background }]}>
											<TextInput
												style={[styles.socialInput, { fontSize: 13, color: theme.text }]}
												value={photoUrl}
												onChangeText={onPhotoUrlChange}
												placeholder="https://example.com/photo.jpg"
												placeholderTextColor={theme.textSecondary}
												selectTextOnFocus
											/>
											<TouchableOpacity
												onPress={() => onToggleEditMode('photo')}
												style={[styles.socialIconBadge, { borderLeftWidth: 1, borderRightWidth: 0, borderLeftColor: theme.border + '20', backgroundColor: '#EF4444' + '10' }]}
											>
												<Ionicons name="close-outline" size={18} color="#EF4444" />
											</TouchableOpacity>
										</View>
									</View>
								)}
							</View>
							{/* English Name Input (Required) */}
							<View style={styles.inputContainer}>
								<View style={styles.inputLabelRow}>
									<Text style={[styles.inputLabel, { color: theme.text }]}>Business Name (English)</Text>
									<Text style={[styles.required, { color: '#EF4444' }]}>*</Text>
								</View>
								<View
									style={[
										styles.inputWrapper,
										{
											borderColor: businessNameEn.length > 0 ? (isFormValid ? '#10B981' : '#EF4444') : theme.border,
											backgroundColor: theme.background
										}
									]}
								>
									<View style={[styles.inputIcon, { backgroundColor: theme.primary + '10' }]}>
										<Text style={{ fontSize: 18 }}>🇺🇸</Text>
									</View>
									<TextInput
										style={[styles.textInput, { color: theme.text, flex: 1 }]}
										value={businessNameEn}
										onChangeText={onBusinessNameEnChange}
										placeholder="e.g., Fresh Seafood Market"
										placeholderTextColor={theme.textSecondary}
										maxLength={MAX_SHOP_NAME_LENGTH}
										autoFocus
										returnKeyType="next"
										onSubmitEditing={() => tnLatnInputRef.current?.focus()}
									/>
								</View>
								<View style={styles.inputFooter}>
									<Text style={[styles.inputHint, { color: businessNameEn.length > 0 ? (isFormValid ? '#10B981' : '#EF4444') : theme.textSecondary }]}>
										{businessNameEn.length < MIN_SHOP_NAME_LENGTH && businessNameEn.length > 0
											? `At least ${MIN_SHOP_NAME_LENGTH} characters required`
											: businessNameEn.length > 0 && isFormValid
												? '✓ Looks good!'
												: 'English name is required'}
									</Text>
									<Text style={[styles.characterCount, { color: theme.textSecondary }]}>
										{businessNameEn.length}/{MAX_SHOP_NAME_LENGTH}
									</Text>
								</View>
							</View>

							{/* Tunisian Latin Name Input (Optional) */}
							<View style={styles.inputContainer}>
								<View style={styles.inputLabelRow}>
									<Text style={[styles.inputLabel, { color: theme.text }]}>Business Name (Tunisian - Latin)</Text>
									<Text style={[styles.optional, { color: theme.textSecondary }]}>Optional</Text>
								</View>
								<View
									style={[
										styles.inputWrapper,
										{
											borderColor: theme.border,
											backgroundColor: theme.background
										}
									]}
								>
									<View style={[styles.inputIcon, { backgroundColor: theme.primary + '10' }]}>
										<View style={{ flexDirection: 'row', alignItems: 'center' }}>
											<Text style={{ fontSize: 14 }}>🇹🇳</Text>
											<Text style={{ fontSize: 12, marginLeft: 2, fontWeight: '600' }}>A</Text>
										</View>
									</View>
									<TextInput
										ref={tnLatnInputRef}
										style={[styles.textInput, { color: theme.text, flex: 1 }]}
										value={businessNameTnLatn}
										onChangeText={onBusinessNameTnLatnChange}
										placeholder="e.g., Souk el 7out"
										placeholderTextColor={theme.textSecondary}
										maxLength={MAX_SHOP_NAME_LENGTH}
										returnKeyType="next"
										onSubmitEditing={() => tnArabInputRef.current?.focus()}
									/>
								</View>
								<Text style={[styles.inputHint, { color: theme.textSecondary }]}>Tunisian name in Latin letters</Text>
							</View>

							{/* Tunisian Arabic Name Input (Optional) */}
							<View style={styles.inputContainer}>
								<View style={styles.inputLabelRow}>
									<Text style={[styles.inputLabel, { color: theme.text }]}>Business Name (Tunisian - Arabic)</Text>
									<Text style={[styles.optional, { color: theme.textSecondary }]}>Optional</Text>
								</View>
								<View
									style={[
										styles.inputWrapper,
										{
											borderColor: theme.border,
											backgroundColor: theme.background
										}
									]}
								>
									<View style={[styles.inputIcon, { backgroundColor: theme.primary + '10' }]}>
										<View style={{ flexDirection: 'row', alignItems: 'center' }}>
											<Text style={{ fontSize: 14 }}>🇹🇳</Text>
											<Text style={{ fontSize: 12, marginLeft: 2, fontWeight: '600' }}>ع</Text>
										</View>
									</View>
									<TextInput
										ref={tnArabInputRef}
										style={[styles.textInput, { color: theme.text, flex: 1, textAlign: 'right' }]}
										value={businessNameTnArab}
										onChangeText={onBusinessNameTnArabChange}
										placeholder="مثال: سوق الحوت"
										placeholderTextColor={theme.textSecondary}
										maxLength={MAX_SHOP_NAME_LENGTH}
										returnKeyType="next"
										onSubmitEditing={() => deliveryRadiusInputRef.current?.focus()}
									/>
								</View>
								<Text style={[styles.inputHint, { color: theme.textSecondary }]}>Tunisian name in Arabic letters</Text>
							</View>

							{/* Delivery Radius Input */}
							<View style={styles.inputContainer}>
								<View style={styles.inputLabelRow}>
									<Text style={[styles.inputLabel, { color: theme.text }]}>Delivery Radius</Text>
									<Text style={[styles.required, { color: '#EF4444' }]}>*</Text>
								</View>
								<View
									style={[
										styles.inputWrapper,
										{
											borderColor: deliveryRadius.length > 0 ? (isDeliveryValid ? '#10B981' : '#EF4444') : theme.border,
											backgroundColor: theme.background
										}
									]}
								>
									<View style={[styles.inputIcon, { backgroundColor: theme.primary + '10' }]}>
										<Text style={{ fontSize: 18 }}>📍</Text>
									</View>
									<TextInput
										ref={deliveryRadiusInputRef}
										style={[styles.textInput, { color: theme.text, flex: 1 }]}
										value={deliveryRadius}
										onChangeText={onDeliveryRadiusChange}
										placeholder="5"
										placeholderTextColor={theme.textSecondary}
										keyboardType="decimal-pad"
										returnKeyType="done"
										onSubmitEditing={isFormValid && isDeliveryValid ? onSubmit : undefined}
									/>
									<Text style={[styles.unitLabel, { color: theme.textSecondary }]}>km</Text>
								</View>
								<Text style={[styles.inputHint, { color: deliveryRadius.length > 0 ? (isDeliveryValid ? '#10B981' : '#EF4444') : theme.textSecondary }]}>
									{deliveryRadius.length > 0 && !isDeliveryValid
										? 'Please enter a valid radius (1-100 km)'
										: deliveryRadius.length > 0 && isDeliveryValid
											? `✓ Delivery area: ~${(Math.PI * Math.pow(deliveryRadiusNum, 2)).toFixed(1)} km²`
											: 'How far will you deliver? (in kilometers)'}
								</Text>
							</View>

							{/* Info Card */}
							<View style={[styles.infoCard, { backgroundColor: theme.primary + '08', borderColor: theme.primary + '20' }]}>
								<Text style={[styles.infoIcon, { color: theme.primary }]}>💡</Text>
								<View style={{ flex: 1 }}>
									<Text style={[styles.infoTitle, { color: theme.text }]}>Multi-language Support</Text>
									<Text style={[styles.infoText, { color: theme.textSecondary }]}>
										Providing names in multiple languages helps customers find your business more easily. You can update these later from business settings.
									</Text>
								</View>
							</View>
						</ScrollView>

						{/* Action Buttons */}
						<View style={[styles.modalActions, { borderTopColor: theme.border }]}>
							<TouchableOpacity style={[styles.actionButton, styles.cancelButton, { borderColor: theme.border }]} onPress={onDismiss} disabled={loading}>
								<Text style={[styles.actionButtonText, { color: theme.text }]}>Cancel</Text>
							</TouchableOpacity>
							<TouchableOpacity
								style={[
									styles.actionButton,
									styles.createButton,
									{
										backgroundColor: isFormValid && isDeliveryValid ? theme.primary : theme.border,
										opacity: isFormValid && isDeliveryValid ? 1 : 0.5
									}
								]}
								onPress={onSubmit}
								disabled={!isFormValid || !isDeliveryValid || loading}
							>
								{loading ? (
									<ActivityIndicator color="#fff" size="small" />
								) : (
									<>
										<Text style={styles.createButtonText}>Create Business</Text>
										<Text style={{ fontSize: 16 }}>→</Text>
									</>
								)}
							</TouchableOpacity>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		)
	}
)

import ScreenHeader from '../common/ScreenHeader'

const MyBusinessesTab: React.FC<MyBusinessesTabProps> = ({ navigation }) => {
	const router = useRouter()
	const { colors } = useTheme()
	const { localize, translate } = useUser()
	const { onScroll } = useScrollHandler()
	const [state, setState] = useState<BusinessState>({
		businesses: [],
		loading: true,
		refreshing: false,
		modalVisible: false,
		businessNameEn: '',
		businessNameTnLatn: '',
		businessNameTnArab: '',
		deliveryRadius: '5',
		photoUrl: '',
		uploadingPhoto: false,
		editMode: { photo: false },
		creating: false,
		navigatingBusinessId: null,
		error: null,
		pagination: {
			totalDocs: 0,
			totalPages: 0,
			page: 1,
			limit: 10,
			hasNextPage: false,
			hasPrevPage: false
		}
	})

	const {
		businesses,
		loading,
		refreshing,
		modalVisible,
		businessNameEn,
		businessNameTnLatn,
		businessNameTnArab,
		deliveryRadius,
		photoUrl,
		uploadingPhoto,
		editMode,
		creating,
		navigatingBusinessId,
		error,
		pagination
	} = state

	const updateState = useCallback((updates: Partial<BusinessState>) => {
		setState((prev) => ({ ...prev, ...updates }))
	}, [])

	const loadBusinesses = useCallback(
		async (showRefreshing = false) => {
			try {
				updateState(showRefreshing ? { refreshing: true } : { loading: true, error: null })
				const response = await getMyBusinesses()
				// Access the businesses array from the nested data property
				const businesses = response?.data?.docs || []
				const paginationData = response?.data?.pagination || {
					totalDocs: 0,
					totalPages: 0,
					page: 1,
					limit: 10,
					hasNextPage: false,
					hasPrevPage: false
				}
				updateState({
					businesses: businesses.sort((a: Business, b: Business) => localize(a.name).localeCompare(localize(b.name))),
					loading: false,
					refreshing: false,
					error: null,
					pagination: paginationData
				})
			} catch (err) {
				console.error('Failed to load businesses:', err)
				updateState({
					loading: false,
					refreshing: false,
					error: 'Failed to load businesses. Please try again.'
				})
			}
		},
		[updateState]
	)

	const debouncedLoadBusinesss = useMemo(() => debounce(loadBusinesses, DEBOUNCE_DELAY), [loadBusinesses])

	useFocusEffect(
		useCallback(() => {
			debouncedLoadBusinesss(false)
			return () => debouncedLoadBusinesss.cancel()
		}, [debouncedLoadBusinesss])
	)

	const handleRefresh = useCallback(() => {
		debouncedLoadBusinesss(true)
	}, [debouncedLoadBusinesss])

	const handleUploadPhoto = useCallback(async () => {
		try {
			let DocumentPicker: any
			try {
				DocumentPicker = require('expo-document-picker')
			} catch (e) {
				console.error('expo-document-picker not installed:', e)
				showAlert('Error', 'expo-document-picker is not installed.')
				return
			}

			const result = await DocumentPicker.getDocumentAsync({
				type: ['image/*'],
				copyToCacheDirectory: true
			})

			if (result.canceled) return

			const file = result.assets[0]
			if (!file) return

			updateState({ uploadingPhoto: true })

			const uploadResult = await uploadFile({
				uri: file.uri,
				name: file.name,
				type: file.mimeType || 'image/jpeg',
				fileType: 'image',
				fileObj: file
			})

			if (uploadResult.success && uploadResult.file) {
				updateState({ photoUrl: uploadResult.file.url || '', uploadingPhoto: false })
				showAlert('Success', 'Photo uploaded successfully!')
			} else if (uploadResult.success && uploadResult.fileUrl) {
				updateState({ photoUrl: uploadResult.fileUrl, uploadingPhoto: false })
				showAlert('Success', 'Photo uploaded successfully!')
			} else {
				updateState({ uploadingPhoto: false })
				showAlert('Error', uploadResult.error || 'Failed to upload photo')
			}
		} catch (error: any) {
			console.error('Error uploading photo:', error)
			updateState({ uploadingPhoto: false })
			showAlert('Error', error.message || 'Failed to upload photo')
		}
	}, [updateState])

	const handleCreateBusiness = useCallback(async () => {
		if (businessNameEn.trim().length < MIN_SHOP_NAME_LENGTH || businessNameEn.trim().length > MAX_SHOP_NAME_LENGTH) {
			return
		}

		try {
			updateState({ creating: true, error: null })

			const newBusiness: CreateBusinessRequest = {
				name: {
					en: businessNameEn.trim(),
					...(businessNameTnLatn.trim() && { tn_latn: businessNameTnLatn.trim() }),
					...(businessNameTnArab.trim() && { tn_arab: businessNameTnArab.trim() })
				},
				address: {
					street: '',
					city: '',
					state: '',
					postalCode: '',
					country: 'Tunisia'
				},
				location: {
					coordinates: undefined
				},
				deliveryRadiusKm: parseFloat(deliveryRadius) || 5,
				...(photoUrl && { media: { thumbnail: { url: photoUrl } } })
			}

			console.log('=== CREATE SHOP DEBUG ===')
			console.log('businessNameEn:', businessNameEn)
			console.log('businessNameTnLatn:', businessNameTnLatn)
			console.log('businessNameTnArab:', businessNameTnArab)
			console.log('photoUrl:', photoUrl)
			console.log('newBusiness object:', newBusiness)
			console.log('newBusiness.name:', newBusiness.name)
			console.log('newBusiness.name type:', typeof newBusiness.name)
			console.log('newBusiness.name.en:', newBusiness.name.en)
			console.log('newBusiness stringified:', JSON.stringify(newBusiness, null, 2))
			console.log('========================')

			await createBusiness(newBusiness)
			await loadBusinesses()
			updateState({
				modalVisible: false,
				businessNameEn: '',
				businessNameTnLatn: '',
				businessNameTnArab: '',
				deliveryRadius: '5',
				photoUrl: '',
				uploadingPhoto: false,
				editMode: { photo: false },
				creating: false
			})
			Alert.alert('Success', 'Business created successfully! You can update the address and location from business settings.')
		} catch (err) {
			console.error('Failed to create business:', err)
			updateState({
				creating: false,
				error: 'Failed to create business. Please try again.'
			})
			Alert.alert('Error', 'Failed to create business. Please try again.')
		}
	}, [businessNameEn, businessNameTnLatn, businessNameTnArab, deliveryRadius, photoUrl, updateState, loadBusinesses])

	const handleBusinessPress = useCallback(
		(business: Business) => {
			if (!business?._id) return

			updateState({ navigatingBusinessId: business._id })

			// Navigate to the business business details using expo-router
			if (router) {
				router.push({
					pathname: '/(home)/business/[businessSlug]',
					params: { businessSlug: business.slug }
				} as any)
			}

			// Reset navigation state after a delay in case navigation fails
			const timeoutId = setTimeout(() => {
				setState((prevState) => ({
					...prevState,
					navigatingBusinessId: null
				}))
			}, 5000)

			// Clean up the timeout if the component unmounts
			return () => clearTimeout(timeoutId)
		},
		[router, updateState]
	)

	const sortedBusinesss = useMemo(() => {
		return [...businesses].sort((a, b) => {
			// Sort by active status first, then by name
			if (a.isActive !== b.isActive) {
				return a.isActive ? -1 : 1
			}
			return localize(a.name).localeCompare(localize(b.name))
		})
	}, [businesses, localize])

	return (
		<View style={[styles.container, { backgroundColor: colors.background }]}>
			<ScreenHeader title={translate('business.my_businesses', 'My Businesss')} showBack={true} onRefresh={handleRefresh} isRefreshing={refreshing} />
			<FlatList
				data={sortedBusinesss}
				keyExtractor={(item) => item._id}
				contentContainerStyle={styles.listContent}
				refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
				onScroll={onScroll}
				scrollEventThrottle={16}
				ListEmptyComponent={
					!refreshing ? (
						<View style={styles.emptyContainer}>
							<LinearGradient colors={[`${colors.primary}15`, `${colors.primary}05`]} style={styles.emptyIconContainer}>
								<Ionicons name="storefront-outline" size={48} color={colors.primary} />
							</LinearGradient>
							<Text style={[styles.emptyTitleText, { color: colors.text }]}>{error || translate('business.no_businesses', 'Manage Your Businesss')}</Text>
							<Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
								{error
									? translate('error_occurred', 'Wait, something went wrong...')
									: translate('business.no_businesses_desc', 'Create your first business to start selling seafood and managing inventory.')}
							</Text>
							<TouchableOpacity onPress={() => (error ? loadBusinesses() : updateState({ modalVisible: true }))} style={[styles.emptyButton, { backgroundColor: colors.primary }]}>
								<Ionicons name={error ? 'refresh' : 'add'} size={32} color="#fff" />
							</TouchableOpacity>
						</View>
					) : null
				}
				renderItem={({ item }) => (
					<BusinessItem
						business={item}
						isNavigating={navigatingBusinessId === item._id}
						onPress={handleBusinessPress}
						theme={{
							primary: colors.primary,
							text: colors.text,
							textSecondary: colors.textSecondary,
							background: colors.background,
							card: colors.card || colors.background,
							border: colors.border || '#444'
						}}
					/>
				)}
			/>

			<TouchableOpacity style={styles.fabContainer} onPress={() => updateState({ modalVisible: true })}>
				<LinearGradient colors={[colors.primary, `${colors.primary}E6`]} style={styles.fab}>
					<Ionicons name="add" size={30} color="#fff" />
				</LinearGradient>
			</TouchableOpacity>

			<CreateBusinessForm
				visible={modalVisible}
				loading={creating}
				businessNameEn={businessNameEn}
				businessNameTnLatn={businessNameTnLatn}
				businessNameTnArab={businessNameTnArab}
				deliveryRadius={deliveryRadius}
				photoUrl={photoUrl}
				uploadingPhoto={uploadingPhoto}
				editMode={editMode}
				onBusinessNameEnChange={(text: string) => updateState({ businessNameEn: text })}
				onBusinessNameTnLatnChange={(text: string) => updateState({ businessNameTnLatn: text })}
				onBusinessNameTnArabChange={(text: string) => updateState({ businessNameTnArab: text })}
				onDeliveryRadiusChange={(text) => updateState({ deliveryRadius: text })}
				onPhotoUrlChange={(url) => updateState({ photoUrl: url })}
				onUploadPhoto={handleUploadPhoto}
				onToggleEditMode={(field) => updateState({ editMode: { ...editMode, [field]: !editMode[field] } })}
				onSubmit={handleCreateBusiness}
				onDismiss={() =>
					updateState({
						modalVisible: false,
						businessNameEn: '',
						businessNameTnLatn: '',
						businessNameTnArab: '',
						deliveryRadius: '5',
						photoUrl: '',
						uploadingPhoto: false,
						editMode: { photo: false },
						error: null
					})
				}
				theme={{
					primary: colors.primary,
					text: colors.text,
					textSecondary: colors.textSecondary,
					background: colors.background,
					card: colors.card || colors.background,
					border: colors.border || '#444'
				}}
			/>
		</View>
	)
}

const styles = StyleSheet.create({
	container: {
		flex: 1
	},
	listContent: {
		padding: 20,
		paddingBottom: 100
	},
	card: {
		borderRadius: 24,
		marginBottom: 16,
		borderWidth: 1,
		overflow: 'hidden',
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.1,
				shadowRadius: 12
			},
			android: {
				elevation: 4
			}
		})
	},
	cardGradient: {
		...StyleSheet.absoluteFillObject
	},
	businessContent: {
		padding: 20
	},
	disabledCard: {
		opacity: 0.7
	},
	businessHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20
	},
	businessIconContainer: {
		width: 52,
		height: 52,
		borderRadius: 16,
		overflow: 'hidden'
	},
	businessIconGradient: {
		width: '100%',
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center'
	},
	businessThumbnail: {
		width: '100%',
		height: '100%',
		borderRadius: 16
	},
	businessInfo: {
		flex: 1,
		marginLeft: 16
	},
	businessName: {
		fontSize: 18,
		fontWeight: '700',
		letterSpacing: -0.5
	},
	businessSlug: {
		fontSize: 13,
		marginTop: 2
	},
	ratingContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 4
	},
	ratingText: {
		fontSize: 13,
		fontWeight: '600'
	},
	ratingCount: {
		fontSize: 12
	},
	statusBadge: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 10,
		paddingVertical: 6,
		borderRadius: 12,
		gap: 6
	},
	statusDot: {
		width: 6,
		height: 6,
		borderRadius: 3
	},
	statusText: {
		fontSize: 11,
		fontWeight: '800',
		textTransform: 'uppercase'
	},
	businessMetaGrid: {
		flexDirection: 'row',
		marginBottom: 20,
		gap: 20
	},
	contactRow: {
		flexDirection: 'row',
		marginBottom: 20,
		gap: 16
	},
	contactItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 6
	},
	contactText: {
		fontSize: 13,
		fontWeight: '500'
	},
	metaItem: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		flex: 1
	},
	metaText: {
		fontSize: 14,
		fontWeight: '500'
	},
	cardFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 16,
		borderTopWidth: 1
	},
	tapHint: {
		fontSize: 14,
		fontWeight: '700'
	},
	fabContainer: {
		position: 'absolute',
		right: 24,
		bottom: 24,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 8 },
				shadowOpacity: 0.25,
				shadowRadius: 12
			},
			android: {
				elevation: 8
			}
		})
	},
	fab: {
		width: 64,
		height: 64,
		borderRadius: 32,
		alignItems: 'center',
		justifyContent: 'center'
	},
	fabText: {
		color: '#fff',
		fontSize: 24,
		lineHeight: 24
	},
	modalOverlay: {
		flex: 1,
		backgroundColor: 'rgba(0, 0, 0, 0.6)',
		justifyContent: 'flex-end'
	},
	modalBackdrop: {
		position: 'absolute',
		top: 0,
		left: 0,
		right: 0,
		bottom: 0
	},
	modalContent: {
		backgroundColor: '#fff',
		borderTopLeftRadius: 24,
		borderTopRightRadius: 24,
		maxHeight: '90%',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: -4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
		elevation: 8
	},
	modalHeader: {
		alignItems: 'center',
		paddingTop: 32,
		paddingHorizontal: 24,
		paddingBottom: 24,
		borderBottomWidth: 1,
		borderBottomColor: 'rgba(0,0,0,0.05)'
	},
	modalIconContainer: {
		width: 64,
		height: 64,
		borderRadius: 32,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 16
	},
	modalIcon: {
		fontSize: 32
	},
	modalTitle: {
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 8,
		textAlign: 'center'
	},
	modalSubtitle: {
		fontSize: 14,
		textAlign: 'center',
		lineHeight: 20
	},
	modalForm: {
		paddingHorizontal: 24,
		paddingVertical: 20
	},
	inputContainer: {
		marginBottom: 24
	},
	inputLabelRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8
	},
	inputLabel: {
		fontSize: 15,
		fontWeight: '600'
	},
	required: {
		marginLeft: 4,
		fontSize: 15,
		fontWeight: '600'
	},
	optional: {
		marginLeft: 4,
		fontSize: 13,
		fontWeight: '500'
	},
	inputWrapper: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 2,
		borderRadius: 16,
		paddingHorizontal: 16,
		paddingVertical: 12,
		gap: 12
	},
	inputIcon: {
		width: 40,
		height: 40,
		borderRadius: 10,
		justifyContent: 'center',
		alignItems: 'center',
		marginRight: 12
	},
	textInput: {
		fontSize: 16,
		fontWeight: '600'
	},
	unitLabel: {
		fontSize: 15,
		fontWeight: '600',
		marginLeft: 8
	},
	inputFooter: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginTop: 6,
		paddingHorizontal: 4
	},
	inputHint: {
		fontSize: 12,
		flex: 1,
		marginRight: 8
	},
	characterCount: {
		fontSize: 12,
		fontWeight: '500'
	},
	infoCard: {
		flexDirection: 'row',
		padding: 16,
		borderRadius: 12,
		borderWidth: 1,
		gap: 12,
		marginTop: 8
	},
	infoIcon: {
		fontSize: 20
	},
	infoTitle: {
		fontSize: 14,
		fontWeight: '600',
		marginBottom: 4
	},
	infoText: {
		fontSize: 13,
		lineHeight: 20
	},
	modalActions: {
		flexDirection: 'row',
		gap: 12,
		padding: 20,
		borderTopWidth: 1,
		backgroundColor: 'rgba(0,0,0,0.02)'
	},
	actionButton: {
		flex: 1,
		paddingVertical: 16,
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		flexDirection: 'row',
		gap: 8
	},
	cancelButton: {
		borderWidth: 2,
		backgroundColor: 'transparent'
	},
	createButton: {
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.2,
		shadowRadius: 8,
		elevation: 4
	},
	actionButtonText: {
		fontSize: 16,
		fontWeight: '600'
	},
	createButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700'
	},
	input: {
		borderWidth: 1,
		borderColor: '#ddd',
		borderRadius: 4,
		padding: 10,
		marginBottom: 16
	},
	modalButtons: {
		flexDirection: 'row',
		justifyContent: 'flex-end',
		marginTop: 16
	},
	modalButton: {
		padding: 10
	},
	photoUploadSection: {
		alignItems: 'center'
	},
	photoContainer: {
		position: 'relative',
		width: 120,
		height: 120,
		marginBottom: 16
	},
	profilePhoto: {
		width: 120,
		height: 120,
		borderRadius: 60,
		borderWidth: 4,
		borderColor: '#fff',
		justifyContent: 'center',
		alignItems: 'center'
	},
	changePhotoButton: {
		position: 'absolute',
		right: 0,
		bottom: 0,
		backgroundColor: '#1F2937',
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: '#fff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
		elevation: 4
	},
	uploadPhotoButton: {
		position: 'absolute',
		left: 0,
		bottom: 0,
		width: 36,
		height: 36,
		borderRadius: 18,
		justifyContent: 'center',
		alignItems: 'center',
		borderWidth: 3,
		borderColor: '#fff',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 4,
		elevation: 4
	},
	photoInputGroup: {
		marginBottom: 16
	},
	photoInputLabel: {
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 6,
		color: '#6B7280',
		textTransform: 'uppercase',
		letterSpacing: 0.5
	},
	socialInputContainer: {
		flexDirection: 'row',
		alignItems: 'center',
		borderWidth: 1,
		borderRadius: 12,
		overflow: 'hidden'
	},
	socialInput: {
		flex: 1,
		padding: 12,
		fontSize: 15
	},
	socialIconBadge: {
		width: 44,
		height: '100%',
		justifyContent: 'center',
		alignItems: 'center'
	},
	modalButtonText: {
		fontWeight: '500'
	},
	errorText: {
		color: '#f44336',
		marginBottom: 16
	},
	emptyContainer: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		padding: 40,
		marginTop: 60
	},
	emptyIconContainer: {
		width: 100,
		height: 100,
		borderRadius: 50,
		justifyContent: 'center',
		alignItems: 'center',
		marginBottom: 24
	},
	emptyTitleText: {
		fontSize: 22,
		fontWeight: '800',
		marginBottom: 12,
		textAlign: 'center'
	},
	emptySubtext: {
		fontSize: 15,
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: 32
	},
	emptyButton: {
		paddingHorizontal: 28,
		paddingVertical: 14,
		borderRadius: 16,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 4 },
				shadowOpacity: 0.2,
				shadowRadius: 8
			},
			android: {
				elevation: 4
			}
		})
	},
	emptyButtonText: {
		color: '#fff',
		fontSize: 16,
		fontWeight: '700'
	}
})

export default MyBusinessesTab
