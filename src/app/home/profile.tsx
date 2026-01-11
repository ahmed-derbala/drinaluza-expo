import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, Platform, useWindowDimensions, ActivityIndicator } from 'react-native'
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

// Components moved outside to prevent re-creation on render
const Section = ({ title, children, styles }: { title: string; children: React.ReactNode; styles: any }) => (
	<View style={styles.section}>
		<Text style={styles.sectionTitle}>{title}</Text>
		<View style={styles.sectionContent}>{children}</View>
	</View>
)

const InfoItem = ({ label, value, icon, styles, iconColor }: { label: string; value: string; icon: any; styles: any; iconColor: string }) => (
	<View style={styles.infoItem}>
		<View style={styles.infoIconContainer}>
			<Ionicons name={icon} size={20} color={iconColor} />
		</View>
		<View style={styles.infoContent}>
			<Text style={styles.infoLabel}>{label}</Text>
			<Text style={styles.infoValue}>{value}</Text>
		</View>
	</View>
)

export default function ProfileScreen() {
	const router = useRouter()
	const { colors, isDark } = useTheme()
	const { width } = useWindowDimensions()
	const maxWidth = 800
	const isWideScreen = width > maxWidth
	const styles = createStyles(colors, isDark, isWideScreen, width)

	const [loading, setLoading] = useState(true)
	const [userData, setUserData] = useState<UserData | null>(null)
	const [isEditing, setIsEditing] = useState(false)
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

	const saveUserData = async () => {
		if (!userData) return

		try {
			// Prepare payload
			const payload = {
				name: userData.name,
				phone: userData.phone,
				basicInfos: userData.basicInfos,
				address: userData.address,
				settings: userData.settings,
				socialMedia: userData.socialMedia
			}

			await updateMyProfile(payload)
			setIsEditing(false)
			showAlert('Success', 'Profile updated successfully!')
			loadProfile() // Reload to ensure consistency
		} catch (error: any) {
			console.error('Error saving user data:', error)
			const errorMessage = error.response?.data?.message || 'Failed to save profile changes'
			showAlert('Error', errorMessage)
		}
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
						<TouchableOpacity style={styles.editButton} onPress={() => (isEditing ? saveUserData() : setIsEditing(true))}>
							<Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
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
						{isEditing && (
							<TouchableOpacity style={styles.changePhotoButton}>
								<Ionicons name="camera" size={20} color="#fff" />
							</TouchableOpacity>
						)}
					</View>
					<Text style={styles.profileName}>{userData.name?.en}</Text>
					{userData.name?.tn_latn && <Text style={styles.profileMeta}>{userData.name.tn_latn}</Text>}
					<Text style={styles.profileMeta}>@{userData.slug}</Text>

					{userData.basicInfos?.biography && <Text style={styles.biography}>{userData.basicInfos.biography}</Text>}

					<View style={[styles.roleBadge, userData.role === 'shop_owner' ? styles.shopOwnerBadge : userData.role === 'super' ? styles.adminBadge : styles.customerBadge]}>
						<Text style={styles.roleBadgeText}>{userData.role === 'shop_owner' ? 'Shop Owner' : userData.role === 'super' ? 'Administrator' : 'Customer'}</Text>
					</View>
				</View>

				{isEditing ? (
					// Edit Mode
					<>
						<Section title="Basic Information" styles={styles}>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Name (English)</Text>
								<TextInput
									style={styles.input}
									value={userData.name?.en}
									onChangeText={(value) => updateField('en', value, 'name')}
									placeholder="Name in English"
									placeholderTextColor={colors.textTertiary}
								/>
							</View>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Name (Tunisian Latin)</Text>
								<TextInput
									style={styles.input}
									value={userData.name?.tn_latn}
									onChangeText={(value) => updateField('tn_latn', value, 'name')}
									placeholder="Name in Tunisian (Latin)"
									placeholderTextColor={colors.textTertiary}
								/>
							</View>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Phone Number</Text>
								<TextInput
									style={styles.input}
									value={userData.phone?.fullNumber}
									onChangeText={(value) => updateField('fullNumber', value, 'phone')}
									placeholder="e.g. +216 12 345 678"
									placeholderTextColor={colors.textTertiary}
									keyboardType="phone-pad"
								/>
							</View>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Biography</Text>
								<TextInput
									style={[styles.input, styles.textArea]}
									value={userData.basicInfos?.biography}
									onChangeText={(value) => updateField('biography', value, 'basicInfos')}
									placeholder="Tell us about yourself"
									placeholderTextColor={colors.textTertiary}
									multiline
								/>
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
						</Section>

						<Section title="Address" styles={styles}>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Street</Text>
								<TextInput
									style={styles.input}
									value={userData.address?.street}
									onChangeText={(value) => updateField('street', value, 'address')}
									placeholder="Street Address"
									placeholderTextColor={colors.textTertiary}
								/>
							</View>
							<View style={styles.row}>
								<View style={[styles.inputGroup, { flex: 1 }]}>
									<Text style={styles.inputLabel}>City</Text>
									<TextInput
										style={styles.input}
										value={userData.address?.city}
										onChangeText={(value) => updateField('city', value, 'address')}
										placeholder="City"
										placeholderTextColor={colors.textTertiary}
									/>
								</View>
								<View style={[styles.inputGroup, { flex: 1 }]}>
									<Text style={styles.inputLabel}>State</Text>
									<TextInput
										style={styles.input}
										value={userData.address?.state}
										onChangeText={(value) => updateField('state', value, 'address')}
										placeholder="State"
										placeholderTextColor={colors.textTertiary}
									/>
								</View>
							</View>
							<View style={styles.row}>
								<View style={[styles.inputGroup, { flex: 1 }]}>
									<Text style={styles.inputLabel}>Postal Code</Text>
									<TextInput
										style={styles.input}
										value={userData.address?.postalCode}
										onChangeText={(value) => updateField('postalCode', value, 'address')}
										placeholder="ZIP Code"
										placeholderTextColor={colors.textTertiary}
									/>
								</View>
								<View style={[styles.inputGroup, { flex: 1 }]}>
									<Text style={styles.inputLabel}>Country</Text>
									<TextInput
										style={styles.input}
										value={userData.address?.country}
										onChangeText={(value) => updateField('country', value, 'address')}
										placeholder="Country"
										placeholderTextColor={colors.textTertiary}
									/>
								</View>
							</View>
						</Section>

						<Section title="Social Media" styles={styles}>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Facebook Username</Text>
								<TextInput
									style={styles.input}
									value={userData.socialMedia?.facebook?.username}
									onChangeText={(value) => {
										const prevSocial = userData.socialMedia || {}
										updateField('socialMedia', { ...prevSocial, facebook: { ...prevSocial.facebook, username: value } })
									}}
									placeholder="Facebook Username"
									placeholderTextColor={colors.textTertiary}
								/>
							</View>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Instagram Username</Text>
								<TextInput
									style={styles.input}
									value={userData.socialMedia?.instagram?.username}
									onChangeText={(value) => {
										const prevSocial = userData.socialMedia || {}
										updateField('socialMedia', { ...prevSocial, instagram: { ...prevSocial.instagram, username: value } })
									}}
									placeholder="Instagram Username"
									placeholderTextColor={colors.textTertiary}
								/>
							</View>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>WhatsApp Number</Text>
								<TextInput
									style={styles.input}
									value={userData.socialMedia?.whatsapp?.username}
									onChangeText={(value) => {
										const prevSocial = userData.socialMedia || {}
										updateField('socialMedia', { ...prevSocial, whatsapp: { ...prevSocial.whatsapp, username: value } })
									}}
									placeholder="WhatsApp Number"
									placeholderTextColor={colors.textTertiary}
									keyboardType="phone-pad"
								/>
							</View>
						</Section>

						<TouchableOpacity
							style={styles.cancelButton}
							onPress={() => {
								setIsEditing(false)
								loadProfile()
							}}
						>
							<Text style={styles.cancelButtonText}>Cancel Changes</Text>
						</TouchableOpacity>
					</>
				) : (
					// View Mode
					<>
						<Section title="Personal Information" styles={styles}>
							<InfoItem label="Full Name" value={userData?.name?.en || 'Not set'} icon="person" styles={styles} iconColor={colors.primary} />
							<InfoItem label="Birth Date" value={formatDate(userData?.basicInfos?.birthDate)} icon="calendar" styles={styles} iconColor={colors.primary} />
							<InfoItem label="Email" value={userData?.email || 'Not set'} icon="mail" styles={styles} iconColor={colors.primary} />
							<InfoItem label="Phone" value={userData?.phone?.fullNumber || 'Not set'} icon="call" styles={styles} iconColor={colors.primary} />
						</Section>

						{userData.socialMedia && (
							<Section title="Social Media" styles={styles}>
								{userData.socialMedia.facebook?.username && <InfoItem label="Facebook" value={userData.socialMedia.facebook.username} icon="logo-facebook" styles={styles} iconColor="#1877F2" />}
								{userData.socialMedia.instagram?.username && <InfoItem label="Instagram" value={userData.socialMedia.instagram.username} icon="logo-instagram" styles={styles} iconColor="#E4405F" />}
								{userData.socialMedia.whatsapp?.username && <InfoItem label="WhatsApp" value={userData.socialMedia.whatsapp.username} icon="logo-whatsapp" styles={styles} iconColor="#25D366" />}
							</Section>
						)}

						<Section title="Address" styles={styles}>
							<InfoItem
								label="Full Address"
								value={[userData?.address?.street, userData?.address?.city, userData?.address?.state, userData?.address?.country].filter(Boolean).join(', ') || 'Not set'}
								icon="location"
								styles={styles}
								iconColor={colors.primary}
							/>
						</Section>
					</>
				)}

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
			paddingBottom: 40,
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
			flexDirection: 'row',
			gap: 12
		},
		inputGroup: {
			marginBottom: 16,
			paddingHorizontal: 8
		},
		inputLabel: {
			fontSize: 14,
			fontWeight: '500',
			color: colors.textSecondary,
			marginBottom: 8
		},
		input: {
			backgroundColor: colors.background,
			color: colors.text,
			fontSize: 16,
			paddingHorizontal: 16,
			paddingVertical: 12,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: colors.border
		},
		textArea: {
			height: 80,
			textAlignVertical: 'top'
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
		}
	})
