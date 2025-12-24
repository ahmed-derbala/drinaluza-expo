import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, Image, Alert, Platform, useWindowDimensions, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Picker } from '@react-native-picker/picker'
import { useRouter, useFocusEffect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { checkAuth, getMyProfile, updateMyProfile, signOut } from '../../core/auth/auth.api'
import { useTheme } from '../../contexts/ThemeContext'
import ScreenHeader from '../../components/common/ScreenHeader'

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

	const loadProfile = async () => {
		try {
			setLoading(true)
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
			}
		} catch (error) {
			console.error('Failed to load profile:', error)
			Alert.alert('Error', 'Failed to load profile data')
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
				basicInfos: userData.basicInfos,
				address: userData.address,
				settings: userData.settings
			}

			await updateMyProfile(payload)
			setIsEditing(false)
			Alert.alert('Success', 'Profile updated successfully!')
			loadProfile() // Reload to ensure consistency
		} catch (e) {
			console.error('Error saving user data:', e)
			Alert.alert('Error', 'Failed to save profile changes')
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
		const performSignOut = async () => {
			try {
				await signOut()
				router.replace('/auth')
			} catch (error) {
				console.error('Sign out failed:', error)
				router.replace('/auth')
			}
		}

		if (Platform.OS === 'web') {
			if (window.confirm('Are you sure you want to sign out?')) {
				await performSignOut()
			}
		} else {
			Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
				{
					text: 'Cancel',
					style: 'cancel'
				},
				{
					text: 'Sign Out',
					style: 'destructive',
					onPress: performSignOut
				}
			])
		}
	}

	if (loading && !userData) {
		return (
			<View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
				<ActivityIndicator size="large" color={colors.primary} />
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
					<>
						<TouchableOpacity style={styles.iconButton} onPress={() => router.push('/home/settings')}>
							<Ionicons name="settings-outline" size={24} color={colors.text} />
						</TouchableOpacity>
						<TouchableOpacity style={styles.editButton} onPress={() => (isEditing ? saveUserData() : setIsEditing(true))}>
							<Text style={styles.editButtonText}>{isEditing ? 'Save' : 'Edit'}</Text>
						</TouchableOpacity>
					</>
				}
			/>
			<ScrollView contentContainerStyle={styles.contentContainer}>
				{/* Profile Header Card */}
				<View style={styles.profileCard}>
					<View style={styles.photoContainer}>
						{userData.basicInfos?.photo?.url && !imageError ? (
							<Image source={{ uri: userData.basicInfos.photo.url }} style={styles.profilePhoto} onError={() => setImageError(true)} />
						) : (
							<View style={styles.placeholderPhoto}>
								<Text style={styles.placeholderText}>
									{userData.basicInfos?.firstName?.charAt(0) || userData.name?.charAt(0) || ''}
									{userData.basicInfos?.lastName?.charAt(0) || ''}
								</Text>
							</View>
						)}
						{isEditing && (
							<TouchableOpacity style={styles.changePhotoButton}>
								<Ionicons name="camera" size={20} color="#fff" />
							</TouchableOpacity>
						)}
					</View>
					<Text style={styles.profileName}>
						{userData.basicInfos?.firstName} {userData.basicInfos?.lastName}
					</Text>
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
								<Text style={styles.inputLabel}>First Name</Text>
								<TextInput
									style={styles.input}
									value={userData.basicInfos?.firstName}
									onChangeText={(value) => updateField('firstName', value, 'basicInfos')}
									placeholder="First Name"
									placeholderTextColor={colors.textTertiary}
								/>
							</View>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Last Name</Text>
								<TextInput
									style={styles.input}
									value={userData.basicInfos?.lastName}
									onChangeText={(value) => updateField('lastName', value, 'basicInfos')}
									placeholder="Last Name"
									placeholderTextColor={colors.textTertiary}
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
											value={userData.basicInfos?.birthDate || new Date()}
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
									<View style={styles.pickerContainer}>
										<Picker
											selectedValue={userData.address?.country}
											onValueChange={(value) => updateField('country', value, 'address')}
											style={{ color: colors.text }}
											dropdownIconColor={colors.text}
										>
											<Picker.Item label="Tunisia" value="Tunisia" />
											<Picker.Item label="France" value="France" />
											<Picker.Item label="Other" value="Other" />
										</Picker>
									</View>
								</View>
							</View>
						</Section>

						<Section title="Settings" styles={styles}>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Language</Text>
								<View style={styles.pickerContainer}>
									<Picker selectedValue={userData.settings?.lang} onValueChange={(value) => updateField('lang', value, 'settings')} style={{ color: colors.text }} dropdownIconColor={colors.text}>
										<Picker.Item label="English" value="en" />
										<Picker.Item label="Tunisian" value="tn" />
										<Picker.Item label="French" value="fr" />
									</Picker>
								</View>
							</View>
							<View style={styles.inputGroup}>
								<Text style={styles.inputLabel}>Currency</Text>
								<View style={styles.pickerContainer}>
									<Picker
										selectedValue={userData.settings?.currency}
										onValueChange={(value) => updateField('currency', value, 'settings')}
										style={{ color: colors.text }}
										dropdownIconColor={colors.text}
									>
										<Picker.Item label="TND" value="tnd" />
										<Picker.Item label="EUR" value="eur" />
										<Picker.Item label="USD" value="usd" />
									</Picker>
								</View>
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
							<InfoItem
								label="Full Name"
								value={`${userData?.basicInfos?.firstName || ''} ${userData?.basicInfos?.lastName || ''}`.trim() || 'Not set'}
								icon="person"
								styles={styles}
								iconColor={colors.primary}
							/>
							<InfoItem label="Birth Date" value={formatDate(userData?.basicInfos?.birthDate)} icon="calendar" styles={styles} iconColor={colors.primary} />
							<InfoItem label="Email" value={userData?.email || 'Not set'} icon="mail" styles={styles} iconColor={colors.primary} />
						</Section>

						<Section title="Address" styles={styles}>
							<InfoItem
								label="Full Address"
								value={[userData?.address?.street, userData?.address?.city, userData?.address?.state, userData?.address?.country].filter(Boolean).join(', ') || 'Not set'}
								icon="location"
								styles={styles}
								iconColor={colors.primary}
							/>
						</Section>

						<Section title="Preferences" styles={styles}>
							<InfoItem
								label="Language"
								value={userData?.settings?.lang === 'en' ? 'English' : userData?.settings?.lang === 'tn' ? 'Tunisian' : userData?.settings?.lang}
								icon="language"
								styles={styles}
								iconColor={colors.primary}
							/>
							<InfoItem label="Currency" value={userData?.settings?.currency?.toUpperCase()} icon="cash" styles={styles} iconColor={colors.primary} />
						</Section>
					</>
				)}

				<TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
					<Ionicons name="log-out-outline" size={20} color={colors.error} style={{ marginRight: 8 }} />
					<Text style={styles.logoutButtonText}>Log Out</Text>
				</TouchableOpacity>

				{Platform.OS !== 'web' && showDatePicker && (
					<DateTimePicker value={userData.basicInfos?.birthDate || new Date()} mode="date" display="default" onChange={onDateChange} maximumDate={new Date()} />
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
		iconButton: {
			padding: 8,
			borderRadius: 20,
			backgroundColor: colors.card,
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
		pickerContainer: {
			backgroundColor: colors.background,
			borderRadius: 12,
			borderWidth: 1,
			borderColor: colors.border,
			overflow: 'hidden'
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
